import { Router } from "express";
import { UserModel } from "@workspace/db";
import { Expo } from "expo-server-sdk";
import { z } from "zod";

const router = Router();

const tokenSchema = z.object({
  userId: z.string().min(1),
  pushToken: z.string().min(1),
});

// POST /api/notifications/token — save or update a user's Expo push token
router.post("/token", async (req, res) => {
  const parsed = tokenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  if (!Expo.isExpoPushToken(parsed.data.pushToken)) {
    return res.status(400).json({ error: "Token de push inválido." });
  }

  try {
    await UserModel.findByIdAndUpdate(parsed.data.userId, {
      pushToken: parsed.data.pushToken,
    });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// DELETE /api/notifications/token — remove push token on logout
router.delete("/token", async (req, res) => {
  const body = z.object({ userId: z.string().min(1) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "userId required" });

  try {
    await UserModel.findByIdAndUpdate(body.data.userId, {
      $unset: { pushToken: "" },
    });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

export default router;
