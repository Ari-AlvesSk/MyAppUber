import { Router } from "express";
import { z } from "zod";
import { ReportModel } from "@workspace/db";
import { randomUUID } from "crypto";

const router = Router();

// POST /api/reports — create a new report
const createSchema = z.object({
  rideId: z.string(),
  userId: z.string(),
  driverId: z.string().optional().nullable(),
  driverName: z.string().optional().nullable(),
  reason: z.string(),
  details: z.string().optional().nullable(),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  try {
    await ReportModel.create({
      _id: randomUUID(),
      rideId: parsed.data.rideId,
      userId: parsed.data.userId,
      driverId: parsed.data.driverId ?? null,
      driverName: parsed.data.driverName ?? null,
      reason: parsed.data.reason,
      details: parsed.data.details ?? null,
      status: "pending",
    });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// GET /api/reports — admin: list all reports
router.get("/", async (req, res) => {
  try {
    const rows = await ReportModel.find().sort({ createdAt: -1 }).limit(200).lean();
    return res.json(rows);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// PATCH /api/reports/:id — admin: update status
router.patch("/:id", async (req, res) => {
  const { status } = req.body as { status?: string };
  if (!status) return res.status(400).json({ error: "status required" });
  try {
    await ReportModel.findByIdAndUpdate(req.params.id, { $set: { status } });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

export default router;
