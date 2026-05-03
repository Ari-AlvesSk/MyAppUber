import { Router } from "express";
import { RideModel } from "@workspace/db";
import { z } from "zod";

const router = Router();

// GET /api/rides/all — admin: all rides (register before /:id)
router.get("/all", async (req, res) => {
  try {
    const rows = await RideModel.find().sort({ createdAt: -1 }).limit(200).lean();
    return res.json(rows);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// GET /api/rides?userId=xxx
router.get("/", async (req, res) => {
  const userId = req.query["userId"] as string | undefined;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const rows = await RideModel.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
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
  completedAt: z.number().optional(),
});

router.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  try {
    const set: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) set["status"] = parsed.data.status;
    if (parsed.data.driver !== undefined) set["driver"] = parsed.data.driver;
    if (parsed.data.completedAt !== undefined)
      set["completedAt"] = new Date(parsed.data.completedAt);

    await RideModel.findByIdAndUpdate(req.params.id, { $set: set });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

export default router;
