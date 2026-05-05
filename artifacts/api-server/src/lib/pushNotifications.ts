import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { UserModel } from "@workspace/db";

const expo = new Expo();

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!Expo.isExpoPushToken(pushToken)) return;

  const message: ExpoPushMessage = {
    to: pushToken,
    title,
    body,
    sound: "default",
    data: data ?? {},
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch {
    // Push failure must never break main flow
  }
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    const user = await UserModel.findById(userId).select("pushToken").lean();
    if (!user || !user.pushToken) return;
    await sendPushNotification(user.pushToken, title, body, data);
  } catch {
    // Silently fail — push notifications are best-effort
  }
}

export async function sendPushToAdmins(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    const admins = await UserModel.find({ role: "admin" }).select("pushToken").lean();
    const tokens = admins.map((a) => a.pushToken).filter(Boolean) as string[];
    await Promise.all(tokens.map((t) => sendPushNotification(t, title, body, data)));
  } catch {
    // Silently fail
  }
}
