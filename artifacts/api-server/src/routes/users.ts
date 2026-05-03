import { Router } from "express";
import { UserModel } from "@workspace/db";
import { z } from "zod";

const router = Router();

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

router.get("/lookup/check", async (req, res) => {
  const email = String(req.query.email ?? "").trim().toLowerCase();
  const phone = String(req.query.phone ?? "").trim();
  const cpf = String(req.query.cpf ?? "").trim();

  if (!email && !phone && !cpf) {
    return res.status(400).json({ error: "email, phone or cpf required" });
  }

  try {
    const conditions = [] as Array<Record<string, string>>;
    if (email) conditions.push({ email });
    if (phone) conditions.push({ phone });
    if (cpf) conditions.push({ cpf });
    const user = await UserModel.findOne({ $or: conditions }).lean();

    if (!user) return res.json({ exists: false });
    const { passwordHash: _, ...safe } = user as unknown as Record<string, unknown>;
    return res.json({ exists: true, user: safe });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

const upsertSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  cpf: z.string().min(11),
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
    await UserModel.findByIdAndUpdate(
      req.params.id,
      { _id: req.params.id, ...parsed.data, email: parsed.data.email.toLowerCase() },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

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
