import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { api } from "@/utils/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications(userId: string | null) {
  useEffect(() => {
    if (!userId || Platform.OS === "web") return;

    let cancelled = false;

    (async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;

        if (existing !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted" || cancelled) return;

        const tokenData = await Notifications.getExpoPushTokenAsync();
        if (!cancelled) {
          await api.savePushToken(userId, tokenData.data).catch(() => {});
        }
      } catch {
        // Permission denied or unavailable — silently skip
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
