import { Router } from "express";
import { PaymentModel } from "@workspace/db";
import { z } from "zod";

const router = Router();

// GET /api/payments?userId=xxx
router.get("/", async (req, res) => {
  const userId = req.query["userId"] as string | undefined;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const rows = await PaymentModel.find({ userId }).lean();
    return res.json(rows);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

const paySchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  label: z.string(),
  detail: z.string(),
  isDefault: z.boolean().optional(),
});

// POST /api/payments
router.post("/", async (req, res) => {
  const parsed = paySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  try {
    await PaymentModel.findByIdAndUpdate(
      parsed.data.id,
      {
        _id: parsed.data.id,
        userId: parsed.data.userId,
        type: parsed.data.type,
        label: parsed.data.label,
        detail: parsed.data.detail,
        isDefault: parsed.data.isDefault ?? false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// DELETE /api/payments/:id?userId=xxx
router.delete("/:id", async (req, res) => {
  const userId = req.query["userId"] as string | undefined;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    await PaymentModel.findOneAndDelete({ _id: req.params.id, userId });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

export default router;
