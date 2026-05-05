import { Router } from "express";
import { RideModel } from "@workspace/db";
import { z } from "zod";

const router = Router();

// GET /api/rides/all — admin: all rides
router.get("/all", async (req, res) => {
  try {
    const rows = await RideModel.find().sort({ createdAt: -1 }).limit(200).lean();
    return res.json(rows);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// GET /api/rides/pending?tier= — driver: open ride requests
router.get("/pending", async (req, res) => {
  const tier = req.query["tier"] as string | undefined;
  if (!tier) return res.status(400).json({ error: "tier required" });
  try {
    const rows = await RideModel.find({ status: "searching", tier })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    return res.json(rows);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// GET /api/rides/:id — get single ride (for polling)
router.get("/:id", async (req, res) => {
  try {
    const ride = await RideModel.findById(req.params.id).lean();
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    return res.json(ride);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// GET /api/rides?userId= or ?driverId=
router.get("/", async (req, res) => {
  const userId = req.query["userId"] as string | undefined;
  const driverId = req.query["driverId"] as string | undefined;

  if (!userId && !driverId) return res.status(400).json({ error: "userId or driverId required" });

  try {
    const query = userId ? { userId } : { driverId };
    const rows = await RideModel.find(query).sort({ createdAt: -1 }).limit(100).lean();
    return res.json(rows);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

const rideSchema = z.object({
  id: z.string(),
  userId: z.string(),
  pickupLabel: z.string(),
  pickupAddress: z.string(),
  dropoffLabel: z.string(),
  dropoffAddress: z.string(),
  tier: z.string(),
  tierName: z.string(),
  priceCents: z.number().int(),
  distanceKm: z.number(),
  durationMinutes: z.number().int(),
  status: z.string().optional(),
  paymentMethod: z.string().optional(),
  pixPaymentStatus: z.string().optional(),
  driver: z.unknown().optional(),
});

// POST /api/rides
router.post("/", async (req, res) => {
  const parsed = rideSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  try {
    await RideModel.findByIdAndUpdate(
      parsed.data.id,
      {
        _id: parsed.data.id,
        userId: parsed.data.userId,
        pickupLabel: parsed.data.pickupLabel,
        pickupAddress: parsed.data.pickupAddress,
        dropoffLabel: parsed.data.dropoffLabel,
        dropoffAddress: parsed.data.dropoffAddress,
        tier: parsed.data.tier,
        tierName: parsed.data.tierName,
        priceCents: parsed.data.priceCents,
        distanceKm: parsed.data.distanceKm,
        durationMinutes: parsed.data.durationMinutes,
        status: parsed.data.status ?? "searching",
        paymentMethod: parsed.data.paymentMethod ?? null,
        pixPaymentStatus: parsed.data.pixPaymentStatus ?? null,
        driver: (parsed.data.driver as Record<string, unknown>) ?? null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// PATCH /api/rides/:id
const patchSchema = z.object({
  status: z.string().optional(),
  driver: z.unknown().optional(),
  driverId: z.string().optional(),
  completedAt: z.number().optional(),
  pixPaymentStatus: z.string().optional(),
  mpPaymentId: z.string().optional(),
});

router.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  try {
    const set: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) set["status"] = parsed.data.status;
    if (parsed.data.driver !== undefined) set["driver"] = parsed.data.driver;
    if (parsed.data.driverId !== undefined) set["driverId"] = parsed.data.driverId;
    if (parsed.data.completedAt !== undefined)
      set["completedAt"] = new Date(parsed.data.completedAt);
    if (parsed.data.pixPaymentStatus !== undefined) set["pixPaymentStatus"] = parsed.data.pixPaymentStatus;
    if (parsed.data.mpPaymentId !== undefined) set["mpPaymentId"] = parsed.data.mpPaymentId;

    const ride = await RideModel.findByIdAndUpdate(req.params.id, { $set: set }, { new: false }).lean();

    // Reembolso automático quando motorista cancela e há pagamento Stripe registrado
    if (parsed.data.status === "cancelled" && ride) {
      const intentId = (ride as any).stripePaymentIntentId;
      if (intentId) {
        try {
          const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
          if (stripeKey) {
            const { default: Stripe } = await import("stripe");
            const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30" });
            const refund = await stripe.refunds.create({
              payment_intent: intentId,
              reason: "requested_by_customer",
            });
            await RideModel.findByIdAndUpdate(req.params.id, {
              $set: { stripeRefundId: refund.id, refundedAt: Date.now() },
            });
            req.log.info({ rideId: req.params.id, refundId: refund.id }, "Reembolso Stripe automático processado");
          }
        } catch (refundErr) {
          req.log.error({ err: refundErr, rideId: req.params.id }, "Erro ao processar reembolso automático");
          // Não bloqueia a atualização do status
        }
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

export default router;
