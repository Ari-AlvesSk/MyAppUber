import { Router } from "express";
import Stripe from "stripe";
import { RideModel, PaymentSettingsModel } from "@workspace/db";
import { z } from "zod";

const router = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada");
  return new Stripe(key, { apiVersion: "2025-04-30" });
}

// POST /api/stripe/payment-intent
// Cria um PaymentIntent para cartão ou Pix
const intentSchema = z.object({
  rideId: z.string(),
  amountCents: z.number().int().min(100),
  paymentType: z.enum(["card", "pix"]),
  paymentMethodId: z.string().optional(), // apenas para cartão
});

router.post("/payment-intent", async (req, res) => {
  const parsed = intentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  try {
    const stripe = getStripe();
    const { rideId, amountCents, paymentType, paymentMethodId } = parsed.data;

    const intentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountCents,
      currency: "brl",
      metadata: { rideId },
      ...(paymentType === "card"
        ? {
            payment_method_types: ["card"],
            payment_method: paymentMethodId,
            confirm: !!paymentMethodId,
            capture_method: "automatic",
          }
        : {
            payment_method_types: ["pix"],
            payment_method_data: { type: "pix" },
            confirm: true,
            pix: { expires_after_seconds: 3600 },
          }),
    };

    const intent = await stripe.paymentIntents.create(intentParams as any);

    // Salva o paymentIntentId na corrida para reembolso futuro
    await RideModel.findByIdAndUpdate(rideId, { $set: { stripePaymentIntentId: intent.id } });

    return res.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      status: intent.status,
      // Para Pix: dados do QR code
      pixData: paymentType === "pix"
        ? (intent.next_action as any)?.pix_display_qr_code ?? null
        : null,
    });
  } catch (err: any) {
    req.log?.error?.(err);
    return res.status(500).json({ error: err?.message ?? "Erro ao criar pagamento" });
  }
});

// POST /api/stripe/refund
// Reembolsa um PaymentIntent já pago
const refundSchema = z.object({
  rideId: z.string(),
  reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).optional(),
});

router.post("/refund", async (req, res) => {
  const parsed = refundSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  try {
    const stripe = getStripe();
    const ride = await RideModel.findById(parsed.data.rideId).lean();
    if (!ride) return res.status(404).json({ error: "Corrida não encontrada" });

    const intentId = (ride as any).stripePaymentIntentId;
    if (!intentId) {
      // Sem pagamento Stripe registrado — pode ser dinheiro/corrida sem cobrança
      return res.json({ ok: true, refunded: false, reason: "no_payment_intent" });
    }

    const refund = await stripe.refunds.create({
      payment_intent: intentId,
      reason: parsed.data.reason ?? "requested_by_customer",
    });

    // Marca a corrida como reembolsada
    await RideModel.findByIdAndUpdate(parsed.data.rideId, {
      $set: { stripeRefundId: refund.id, refundedAt: Date.now() },
    });

    return res.json({ ok: true, refunded: true, refundId: refund.id, status: refund.status });
  } catch (err: any) {
    req.log?.error?.(err);
    return res.status(500).json({ error: err?.message ?? "Erro ao reembolsar" });
  }
});

// GET /api/stripe/publishable-key
router.get("/publishable-key", async (_req, res) => {
  const key = process.env.STRIPE_PUBLISHABLE_KEY ?? "";
  return res.json({ publishableKey: key });
});

export default router;
