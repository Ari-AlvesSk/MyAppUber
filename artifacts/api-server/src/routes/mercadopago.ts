import { Router } from "express";
import crypto from "crypto";
import { PaymentSettingsModel, RideModel } from "@workspace/db";

const router = Router();

const getMpToken = async (): Promise<string> => {
  const doc = await PaymentSettingsModel.findById("singleton").lean();
  const token = doc?.mercadoPagoAccessToken ?? "";
  if (!token) throw new Error("Mercado Pago Access Token não configurado. Configure em Admin → Config.");
  return token;
};

// POST /api/mp/pix — cria pagamento Pix via Mercado Pago
router.post("/pix", async (req, res) => {
  const { rideId, amountCents, description, payerEmail } = req.body as {
    rideId?: string; amountCents?: number; description?: string; payerEmail?: string;
  };
  if (!rideId || !amountCents) {
    return res.status(400).json({ error: "rideId e amountCents são obrigatórios" });
  }

  try {
    const token = await getMpToken();
    const idempotencyKey = crypto.randomUUID();
    const amount = amountCents / 100;

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description: description ?? "Corrida ParaunaMobi",
        payment_method_id: "pix",
        payer: {
          email: payerEmail ?? "passageiro@paraunamobi.com",
          first_name: "Passageiro",
          last_name: "ParaunaMobi",
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      req.log.error({ err }, "Mercado Pago API error on create");
      return res.status(502).json({ error: "Erro ao criar pagamento Pix no Mercado Pago", details: err });
    }

    const data = await response.json() as Record<string, unknown>;
    const mpPaymentId = String((data as any).id ?? "");
    const txData = (data as any).point_of_interaction?.transaction_data ?? {};
    const qrCode: string = txData.qr_code ?? "";
    const qrCodeBase64: string = txData.qr_code_base64 ?? "";
    const ticketUrl: string = txData.ticket_url ?? "";

    if (rideId && mpPaymentId) {
      await RideModel.findByIdAndUpdate(rideId, { $set: { mpPaymentId, paymentMethod: "pix" } });
    }

    req.log.info({ rideId, mpPaymentId }, "Pix MP criado");
    return res.json({ mpPaymentId, qrCode, qrCodeBase64, ticketUrl, status: (data as any).status });
  } catch (err: any) {
    req.log.error({ err }, "Erro ao criar pagamento MP Pix");
    return res.status(500).json({ error: err.message ?? "Internal error" });
  }
});

// GET /api/mp/pix/:mpPaymentId/status — verifica status e auto-atualiza corrida
router.get("/pix/:mpPaymentId/status", async (req, res) => {
  const { mpPaymentId } = req.params;
  try {
    const token = await getMpToken();
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Erro ao verificar pagamento" });
    }

    const data = await response.json() as Record<string, unknown>;
    const status = String((data as any).status ?? "pending");

    if (status === "approved") {
      const result = await RideModel.findOneAndUpdate(
        { mpPaymentId, status: "awaiting_pix" },
        { $set: { status: "searching", pixPaymentStatus: "confirmed" } },
        { new: false },
      );
      if (result) {
        req.log.info({ mpPaymentId }, "Pix aprovado — corrida liberada para motoristas");
      }
    }

    return res.json({ status, approved: status === "approved" });
  } catch (err: any) {
    req.log.error({ err }, "Erro ao verificar status MP");
    return res.status(500).json({ error: err.message ?? "Internal error" });
  }
});

// POST /api/mp/webhook — notificações do Mercado Pago
router.post("/webhook", async (req, res) => {
  try {
    const body = req.body as { action?: string; data?: { id?: string | number } };
    const action = body.action ?? "";
    const paymentId = String(body.data?.id ?? "");

    req.log.info({ action, paymentId }, "Webhook MP recebido");

    if ((action === "payment.updated" || action === "payment.created") && paymentId) {
      const token = await getMpToken().catch(() => "");
      if (token) {
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const payment = await response.json() as Record<string, unknown>;
          if ((payment as any).status === "approved") {
            await RideModel.findOneAndUpdate(
              { mpPaymentId: paymentId, status: "awaiting_pix" },
              { $set: { status: "searching", pixPaymentStatus: "confirmed" } },
            );
            req.log.info({ paymentId }, "Pix confirmado via webhook MP");
          }
        }
      }
    }
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Erro no webhook MP");
    return res.json({ ok: true });
  }
});

export default router;
