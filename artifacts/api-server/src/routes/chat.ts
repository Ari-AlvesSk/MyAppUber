import { Router } from "express";
import { z } from "zod";
import { ChatModel, RideModel } from "@workspace/db";
import { sendPushToUser } from "../lib/pushNotifications";

const router = Router();

// GET /api/chat/:rideId — get all messages
router.get("/:rideId", async (req, res) => {
  try {
    const msgs = await ChatModel.find({ rideId: req.params.rideId })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();
    return res.json(msgs);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// POST /api/chat/:rideId — send a message
router.post("/:rideId", async (req, res) => {
  const schema = z.object({
    senderId: z.string().min(1),
    senderRole: z.enum(["passenger", "driver"]),
    text: z.string().min(1).max(500).trim(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  try {
    const msg = await ChatModel.create({
      rideId: req.params.rideId,
      senderId: parsed.data.senderId,
      senderRole: parsed.data.senderRole,
      text: parsed.data.text,
    });

    // Push notification to the other party
    const ride = await RideModel.findById(req.params.rideId).lean() as Record<string, unknown> | null;
    if (ride) {
      const isDriver = parsed.data.senderRole === "driver";
      const notifyId = isDriver
        ? (ride["userId"] as string | undefined)
        : (ride["driverId"] as string | undefined);
      const label = isDriver ? "Motorista" : "Passageiro";
      const preview = parsed.data.text.length > 45
        ? parsed.data.text.substring(0, 45) + "…"
        : parsed.data.text;
      if (notifyId) {
        sendPushToUser(notifyId, `💬 ${label}`, preview).catch(() => {});
      }
    }

    return res.json(msg);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

export default router;
