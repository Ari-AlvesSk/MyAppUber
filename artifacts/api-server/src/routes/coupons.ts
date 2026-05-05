import { Router } from "express";
import { CouponModel } from "@workspace/db";
import { z } from "zod";

const router = Router();

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function normalizeCoupon(raw: Record<string, unknown>) {
  const { _id, createdAt, expiresAt, ...rest } = raw;
  return {
    id: String(_id),
    ...rest,
    createdAt: createdAt instanceof Date ? createdAt.getTime() : typeof createdAt === "string" ? new Date(createdAt).getTime() : Date.now(),
    expiresAt: expiresAt instanceof Date ? expiresAt.getTime() : expiresAt ? new Date(String(expiresAt)).getTime() : null,
  };
}

router.get("/", async (req, res) => {
  try {
    const rows = await CouponModel.find({}).sort({ createdAt: -1 }).limit(200).lean();
    return res.json(rows.map((r) => normalizeCoupon(r as unknown as Record<string, unknown>)));
  } catch (err) { req.log.error(err); return res.status(500).json({ error: "Internal error" }); }
});

const createSchema = z.object({
  code: z.string().min(2).max(20),
  description: z.string().min(1),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().positive(),
  minOrderCents: z.number().min(0).default(0),
  maxUses: z.number().min(0).default(0),
  expiresAt: z.number().nullable().optional(),
  active: z.boolean().default(true),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data" });
  try {
    const code = parsed.data.code.toUpperCase().replace(/\s+/g, "");
    const existing = await CouponModel.findOne({ code }).lean();
    if (existing) return res.status(409).json({ error: "Código já existe" });
    const id = genId();
    await CouponModel.create({
      _id: id,
      code,
      description: parsed.data.description,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      minOrderCents: parsed.data.minOrderCents,
      maxUses: parsed.data.maxUses,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      active: parsed.data.active,
      usedCount: 0,
    });
    return res.json({ ok: true, id });
  } catch (err) { req.log.error(err); return res.status(500).json({ error: "Internal error" }); }
});

router.patch("/:id", async (req, res) => {
  try {
    const { active } = req.body as { active?: boolean };
    const set: Record<string, unknown> = {};
    if (typeof active === "boolean") set["active"] = active;
    await CouponModel.findByIdAndUpdate(req.params.id, { $set: set });
    return res.json({ ok: true });
  } catch (err) { req.log.error(err); return res.status(500).json({ error: "Internal error" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    await CouponModel.findByIdAndDelete(req.params.id);
    return res.json({ ok: true });
  } catch (err) { req.log.error(err); return res.status(500).json({ error: "Internal error" }); }
});

const validateSchema = z.object({
  code: z.string().min(1),
  orderCents: z.number().positive(),
});

router.post("/validate", async (req, res) => {
  const parsed = validateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });
  try {
    const code = parsed.data.code.toUpperCase().trim();
    const coupon = await CouponModel.findOne({ code, active: true }).lean();
    if (!coupon) return res.status(404).json({ error: "Cupom não encontrado ou inativo" });
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ error: "Cupom expirado" });
    }
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ error: "Cupom esgotado" });
    }
    if (coupon.minOrderCents > 0 && parsed.data.orderCents < coupon.minOrderCents) {
      return res.status(400).json({ error: `Pedido mínimo de R$ ${(coupon.minOrderCents / 100).toFixed(2).replace(".", ",")}` });
    }
    let discountCents = 0;
    if (coupon.discountType === "percent") {
      discountCents = Math.round(parsed.data.orderCents * (coupon.discountValue / 100));
    } else {
      discountCents = Math.min(coupon.discountValue, parsed.data.orderCents);
    }
    return res.json({
      ok: true,
      couponId: String(coupon._id),
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountCents,
    });
  } catch (err) { req.log.error(err); return res.status(500).json({ error: "Internal error" }); }
});

export default router;
