import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, paymentsTable } from "@workspace/db";
import { z } from "zod";

const router = Router();

// GET /api/payments?userId=xxx
router.get("/", async (req, res) => {
  const userId = req.query["userId"] as string | undefined;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const rows = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.userId, userId));
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
    await db
      .insert(paymentsTable)
      .values({ ...parsed.data, isDefault: parsed.data.isDefault ?? false })
      .onConflictDoUpdate({
        target: paymentsTable.id,
        set: { label: parsed.data.label, detail: parsed.data.detail },
      });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// DELETE /api/payments/:id
router.delete("/:id", async (req, res) => {
  const userId = req.query["userId"] as string | undefined;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    await db
      .delete(paymentsTable)
      .where(and(eq(paymentsTable.id, req.params.id), eq(paymentsTable.userId, userId)));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

export default router;
