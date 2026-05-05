import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export type NotifType =
  | "ride_accepted"
  | "driver_arriving"
  | "ride_completed"
  | "ride_request"
  | "ride_cancelled"
  | "withdrawal_approved"
  | "withdrawal_rejected"
  | "info";

type Notif = {
  id: string;
  type: NotifType;
  title: string;
  message: string;
};

type NotifCtx = {
  addNotification: (type: NotifType, title: string, message: string) => void;
};

const NotificationContext = createContext<NotifCtx | null>(null);

const ICONS: Record<NotifType, { name: keyof typeof Feather.glyphMap; color: string }> = {
  ride_accepted:      { name: "check-circle",  color: "#00D26A" },
  driver_arriving:    { name: "navigation",     color: "#3B82F6" },
  ride_completed:     { name: "flag",           color: "#8B5CF6" },
  ride_request:       { name: "bell",           color: "#F59E0B" },
  ride_cancelled:     { name: "x-circle",       color: "#EF4444" },
  withdrawal_approved:{ name: "dollar-sign",    color: "#00D26A" },
  withdrawal_rejected:{ name: "alert-circle",   color: "#EF4444" },
  info:               { name: "info",           color: "#06B6D4" },
};

const AUTO_DISMISS_MS = 4500;

function Toast({ notif, onDismiss }: { notif: Notif; onDismiss: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const icon = ICONS[notif.type];
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top + 8;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => onDismiss());
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDismiss());
  };

  return (
    <Animated.View
      style={[
        toast.wrap,
        {
          top: topPad,
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.foreground,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) }],
        },
      ]}
    >
      <View style={[toast.iconBox, { backgroundColor: icon.color + "22" }]}>
        <Feather name={icon.name} size={18} color={icon.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[toast.title, { color: colors.foreground }]} numberOfLines={1}>{notif.title}</Text>
        <Text style={[toast.message, { color: colors.mutedForeground }]} numberOfLines={2}>{notif.message}</Text>
      </View>
      <Pressable onPress={dismiss} style={toast.closeBtn} hitSlop={8}>
        <Feather name="x" size={14} color={colors.mutedForeground} />
      </Pressable>
    </Animated.View>
  );
}

const toast = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    zIndex: 9999,
    elevation: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: -0.1 },
  message: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 },
  closeBtn: { padding: 4 },
});

let _counter = 0;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Notif[]>([]);

  const addNotification = useCallback((type: NotifType, title: string, message: string) => {
    const id = `notif_${Date.now()}_${_counter++}`;
    setQueue((prev) => [...prev.slice(-2), { id, type, title, message }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setQueue((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      {queue.map((n, i) => (
        <View key={n.id} style={{ position: "absolute", left: 0, right: 0, top: i * 4, zIndex: 9999 + i }} pointerEvents="box-none">
          <Toast notif={n} onDismiss={() => dismiss(n.id)} />
        </View>
      ))}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be inside NotificationProvider");
  return ctx;
}
