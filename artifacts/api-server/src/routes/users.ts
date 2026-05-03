import { Router } from "express";
import { UserModel } from "@workspace/db";
import { z } from "zod";

const router = Router();

// GET /api/users/:id
router.get("/:id", async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    const { passwordHash: _, ...safe } = user as unknown as Record<string, unknown>;
    return res.json(safe);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

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

// PUT /api/users/:id
router.put("/:id", async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  try {
    await UserModel.findByIdAndUpdate(
      req.params.id,
      { _id: req.params.id, ...parsed.data },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
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
    await UserModel.findByIdAndUpdate(req.params.id, { passwordHash: parsed.data.passwordHash });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

export default router;
