import { Router } from "express";
import { PaymentSettingsModel } from "@workspace/db";
import { z } from "zod";

const router = Router();

const DEFAULT_SETTINGS = {
  _id: "singleton",
  pixKey: "",
  pixKeyType: "cpf",
  pixEnabled: true,
  cardEnabled: true,
  cashEnabled: true,
  cardFeePercent: 3.5,
  commissionPercent: 20,
  pricePerKmCar: 2.5,
  pricePerKmMoto: 1.8,
  stripePublishableKey: "",
  stripeSecretKey: "",
  updatedAt: Date.now(),
};

// GET /api/admin/payment-settings
router.get("/", async (req, res) => {
  try {
    let doc = await PaymentSettingsModel.findById("singleton").lean();
    if (!doc) {
      doc = await PaymentSettingsModel.create(DEFAULT_SETTINGS);
    }
    const safe = { ...doc, stripeSecretKey: doc.stripeSecretKey ? "***" : "" };
    return res.json(safe);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

const settingsSchema = z.object({
  pixKey: z.string().optional(),
  pixKeyType: z.enum(["cpf", "cnpj", "telefone", "email", "aleatoria"]).optional(),
  pixEnabled: z.boolean().optional(),
  cardEnabled: z.boolean().optional(),
  cashEnabled: z.boolean().optional(),
  cardFeePercent: z.number().min(0).max(20).optional(),
  commissionPercent: z.number().min(0).max(50).optional(),
  pricePerKmCar: z.number().min(0).optional(),
  pricePerKmMoto: z.number().min(0).optional(),
  stripePublishableKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
});

// PUT /api/admin/payment-settings
router.put("/", async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  try {
    const update: Record<string, unknown> = { ...parsed.data, updatedAt: Date.now() };
    if (parsed.data.stripeSecretKey === "***") {
      delete update.stripeSecretKey;
    }
    const doc = await PaymentSettingsModel.findByIdAndUpdate(
      "singleton",
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    return res.json({ ok: true, settings: { ...doc, stripeSecretKey: doc?.stripeSecretKey ? "***" : "" } });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// GET /api/admin/payment-settings/public — stripped version for passenger app
router.get("/public", async (req, res) => {
  try {
    let doc = await PaymentSettingsModel.findById("singleton").lean();
    if (!doc) doc = await PaymentSettingsModel.create(DEFAULT_SETTINGS);
    return res.json({
      pixKey: doc.pixKey,
      pixKeyType: doc.pixKeyType,
      pixEnabled: doc.pixEnabled,
      cardEnabled: doc.cardEnabled,
      cashEnabled: doc.cashEnabled,
      stripePublishableKey: doc.stripePublishableKey,
      pricePerKmCar: doc.pricePerKmCar ?? DEFAULT_SETTINGS.pricePerKmCar,
      pricePerKmMoto: doc.pricePerKmMoto ?? DEFAULT_SETTINGS.pricePerKmMoto,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

export default router;
