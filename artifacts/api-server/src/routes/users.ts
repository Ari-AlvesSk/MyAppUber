import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { z } from "zod";

const router = Router();

// GET /api/users/:id
router.get("/:id", async (req, res) => {
  try {
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.params.id))
      .limit(1);
    if (!user[0]) return res.status(404).json({ error: "User not found" });
    const { passwordHash: _, ...safe } = user[0];
    return res.json(safe);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// PUT /api/users/:id — upsert user (called on login/register and profile edits)
const upsertSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.string().optional(),
  avatarColor: z.string().optional(),
  driverStatus: z.string().optional(),
  vehicleType: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehiclePlate: z.string().optional(),
});

router.put("/:id", async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  try {
    const now = new Date();
    await db
      .insert(usersTable)
      .values({ id: req.params.id, ...parsed.data, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: usersTable.id,
        set: { ...parsed.data, updatedAt: now },
      });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// PATCH /api/users/:id/password
const pwdSchema = z.object({ passwordHash: z.string().min(1) });

router.patch("/:id/password", async (req, res) => {
  const parsed = pwdSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  try {
    await db
      .update(usersTable)
      .set({ passwordHash: parsed.data.passwordHash, updatedAt: new Date() })
      .where(eq(usersTable.id, req.params.id));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

export default router;
