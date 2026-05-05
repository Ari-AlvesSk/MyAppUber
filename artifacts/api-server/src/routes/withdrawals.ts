import { Router } from "express";
import { WithdrawalModel } from "@workspace/db";
import { z } from "zod";
import { sendPushToUser } from "../lib/pushNotifications";

const router = Router();

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function normalizeW(raw: Record<string, unknown>) {
  const { _id, createdAt, processedAt, ...rest } = raw;
  return {
    id: String(_id),
    ...rest,
    createdAt: createdAt instanceof Date ? createdAt.getTime() : typeof createdAt === "string" ? new Date(createdAt).getTime() : Date.now(),
    processedAt: processedAt instanceof Date ? processedAt.getTime() : null,
  };
}

router.get("/", async (req, res) => {
  try {
    const driverId = req.query["driverId"] as string | undefined;
    const query = driverId ? { driverId } : {};
    const rows = await WithdrawalModel.find(query).sort({ createdAt: -1 }).limit(200).lean();
    return res.json(rows.map((r) => normalizeW(r as unknown as Record<string, unknown>)));
  } catch (err) { req.log.error(err); return res.status(500).json({ error: "Internal error" }); }
});

const createSchema = z.object({
  driverId: z.string().min(1),
  driverName: z.string().min(1),
  pixKey: z.string().min(3),
  amountCents: z.number().int().positive(),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });
  try {
    const id = genId();
    await WithdrawalModel.create({
      _id: id,
      driverId: parsed.data.driverId,
      driverName: parsed.data.driverName,
      pixKey: parsed.data.pixKey,
      amountCents: parsed.data.amountCents,
      status: "pending",
    });
    return res.json({ ok: true, id });
  } catch (err) { req.log.error(err); return res.status(500).json({ error: "Internal error" }); }
});

const patchSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().optional(),
});

router.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });
  try {
    const set: Record<string, unknown> = { status: parsed.data.status, processedAt: new Date() };
    if (parsed.data.rejectionReason) set["rejectionReason"] = parsed.data.rejectionReason;
    const withdrawal = await WithdrawalModel.findByIdAndUpdate(req.params.id, { $set: set }, { new: false }).lean();
    if (withdrawal) {
      const driverId = (withdrawal as Record<string, unknown>)["driverId"] as string | undefined;
      if (driverId) {
        if (parsed.data.status === "approved") {
          sendPushToUser(driverId, "Saque aprovado! 💸", "Seu pedido de saque foi aprovado e será processado em breve.").catch(() => {});
        } else if (parsed.data.status === "rejected") {
          const reason = parsed.data.rejectionReason ? `: ${parsed.data.rejectionReason}` : ".";
          sendPushToUser(driverId, "Saque recusado", `Seu pedido de saque foi recusado${reason}`).catch(() => {});
        }
      }
    }
    return res.json({ ok: true });
  } catch (err) { req.log.error(err); return res.status(500).json({ error: "Internal error" }); }
});

export default router;
