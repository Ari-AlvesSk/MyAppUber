import { Router } from "express";
import { UserModel } from "@workspace/db";
import { z } from "zod";

const router = Router();

function normalizeUser(raw: Record<string, unknown>) {
  const { _id, passwordHash: _ph, createdAt, updatedAt, ...rest } = raw;
  return {
    id: String(_id),
    ...rest,
    createdAt: createdAt instanceof Date ? createdAt.getTime() : typeof createdAt === "string" ? new Date(createdAt).getTime() : Date.now(),
    updatedAt: updatedAt instanceof Date ? updatedAt.getTime() : typeof updatedAt === "string" ? new Date(updatedAt).getTime() : Date.now(),
  };
}

router.post("/login", async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
  try {
    const email = body.data.email.toLowerCase();
    const expectedHash = `hashed_${body.data.password}`;
    const user = await UserModel.findOne({ email }).lean();
    if (!user) return res.status(401).json({ error: "Usuário não cadastrado. Faça o registro primeiro." });
    if (user.passwordHash !== expectedHash) return res.status(401).json({ error: "Senha incorreta." });
    return res.json({ ok: true, user: normalizeUser(user as unknown as Record<string, unknown>) });
  } catch (err) { req.log.error(err); return res.status(500).json({ error: "Erro interno. Tente novamente." }); }
});

router.get("/lookup/check", async (req, res) => {
  const email = String(req.query.email ?? "").trim().toLowerCase();
  const phone = String(req.query.phone ?? "").trim();
  const cpf = String(req.query.cpf ?? "").trim();
  if (!email && !phone && !cpf) return res.status(400).json({ error: "email, phone or cpf required" });
  try { const conditions: Record<string, string>[] = []; if (email) conditions.push({ email }); if (phone) conditions.push({ phone }); if (cpf) conditions.push({ cpf }); const user = await UserModel.findOne({ $or: conditions }).lean(); if (!user) return res.json({ exists: false }); return res.json({ exists: true, user: normalizeUser(user as unknown as Record<string, unknown>) }); } catch (err) { req.log.error(err); return res.status(500).json({ error: "Internal error" }); }
});

router.get("/:id", async (req, res) => {
  try { const user = await UserModel.findById(req.params.id).lean(); if (!user) return res.status(404).json({ error: "User not found" }); return res.json(normalizeUser(user as unknown as Record<string, unknown>)); } catch (err) { req.log.error(err); return res.status(500).json({ error: "Internal error" }); }
});

const upsertSchema = z.object({ name: z.string().min(1), email: z.string().email(), phone: z.string().min(1), cpf: z.string().min(1), role: z.string().optional(), avatarColor: z.string().optional(), driverStatus: z.string().optional(), driverRejectionReason: z.string().optional(), vehicleType: z.string().optional(), vehicleModel: z.string().optional(), vehiclePlate: z.string().optional(), usuario_ativo: z.boolean().optional() });

router.put("/:id", async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });
  try { await UserModel.findByIdAndUpdate(req.params.id, { _id: req.params.id, ...parsed.data, email: parsed.data.email.toLowerCase() }, { upsert: true, new: true, setDefaultsOnInsert: true }); return res.json({ ok: true }); } catch (err) { req.log.error(err); return res.status(500).json({ error: "Internal error" }); }
});

const pwdSchema = z.object({ passwordHash: z.string().min(1) });
router.patch("/:id/password", async (req, res) => {
  const parsed = pwdSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });
  try { await UserModel.findByIdAndUpdate(req.params.id, { passwordHash: parsed.data.passwordHash }); return res.json({ ok: true }); } catch (err) { req.log.error(err); return res.status(500).json({ error: "Internal error" }); }
});

router.post("/admin-seed", async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(6) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error });
  try { const email = body.data.email.toLowerCase(); await UserModel.findByIdAndUpdate("admin", { _id: "admin", role: "admin", name: "Administrador", email, phone: "00000000000", cpf: "00000000000", passwordHash: `hashed_${body.data.password}`, usuario_ativo: true }, { upsert: true, new: true, setDefaultsOnInsert: true }); return res.json({ ok: true }); } catch (err) { req.log.error(err); return res.status(500).json({ error: "Internal error" }); }
});

router.post("/bulk-approve", async (req, res) => {
  const body = z.object({ driverIds: z.array(z.string()).min(1) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "driverIds array required" });
  try {
    const result = await UserModel.updateMany({ _id: { $in: body.data.driverIds } }, { driverStatus: "approved" });
    return res.json({ ok: true, modifiedCount: result.modifiedCount });
  } catch (err) { req.log.error(err); return res.status(500).json({ error: "Internal error" }); }
});

export default router;
