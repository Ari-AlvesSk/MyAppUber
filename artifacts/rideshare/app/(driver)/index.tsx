import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MapCanvas } from "@/components/MapCanvas";
import { useAuth } from "@/context/AuthContext";
import { formatPrice, RIDE_OPTIONS } from "@/data/mock";
import { useColors } from "@/hooks/useColors";
import { api } from "@/utils/api";
import type { Driver } from "@/types";

type PendingRide = {
  id: string;
  pickupLabel: string;
  pickupAddress: string;
  dropoffLabel: string;
  dropoffAddress: string;
  distanceKm: number;
  priceCents: number;
  tier: string;
  durationMinutes: number;
};

type ActiveRide = PendingRide & {
  status: "matched" | "arriving" | "in_progress";
};

export default function DriverHomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [online, setOnline] = useState(false);
  const [pendingRide, setPendingRide] = useState<PendingRide | null>(null);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [completedToday, setCompletedToday] = useState(0);
  const [earnedTodayCents, setEarnedTodayCents] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top + 8;
  const bottomPad = isWeb ? 84 + 24 : insets.bottom + 88;

  const pulse = useRef(new Animated.Value(1)).current;

  const vehicleLabel = user?.vehicleType === "moto" ? "Moto" : "Carro";
  const vehicleIcon: keyof typeof MaterialCommunityIcons.glyphMap =
    user?.vehicleType === "moto" ? "motorbike" : "car-side";
  const firstName = (user?.name ?? "Motorista").split(" ")[0];

  useEffect(() => {
    if (!online) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [online, pulse]);

  // Load today's stats from API
  useEffect(() => {
    if (!user?.id) return;
    api.getDriverRides(user.id).then((rows) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTs = today.getTime();
      let count = 0;
      let earned = 0;
      for (const r of rows as Record<string, unknown>[]) {
        if (r["status"] !== "completed") continue;
        const completedAt = r["completedAt"];
        const ts = completedAt instanceof Date
          ? completedAt.getTime()
          : typeof completedAt === "string"
          ? new Date(completedAt).getTime()
          : typeof completedAt === "number"
          ? completedAt
          : 0;
        if (ts >= todayTs) {
          count++;
          earned += typeof r["priceCents"] === "number" ? r["priceCents"] : 0;
        }
      }
      setCompletedToday(count);
      setEarnedTodayCents(earned);
    }).catch(() => {});
  }, [user?.id]);

  const fetchPending = useCallback(async () => {
    if (!user?.vehicleType || activeRide) return;
    try {
      const rows = await api.getPendingRides(user.vehicleType) as Record<string, unknown>[];
      if (rows.length > 0) {
        const r = rows[0]!;
        const newRide: PendingRide = {
          id: String(r["_id"] ?? r["id"] ?? ""),
          pickupLabel: String(r["pickupLabel"] ?? ""),
          pickupAddress: String(r["pickupAddress"] ?? ""),
          dropoffLabel: String(r["dropoffLabel"] ?? ""),
          dropoffAddress: String(r["dropoffAddress"] ?? ""),
          distanceKm: typeof r["distanceKm"] === "number" ? r["distanceKm"] : 0,
          priceCents: typeof r["priceCents"] === "number" ? r["priceCents"] : 0,
          tier: String(r["tier"] ?? "car"),
          durationMinutes: typeof r["durationMinutes"] === "number" ? r["durationMinutes"] : 5,
        };
        setPendingRide((prev) => {
          if (prev?.id === newRide.id) return prev;
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          }
          return newRide;
        });
      } else {
        setPendingRide(null);
      }
    } catch {}
  }, [user?.vehicleType, activeRide]);

  // Poll for pending rides when online
  useEffect(() => {
    if (!online || activeRide) {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }
    fetchPending();
    pollingRef.current = setInterval(fetchPending, 6000);
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [online, activeRide, fetchPending]);

  const handleToggleOnline = (val: boolean) => {
    setOnline(val);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (!val) { setPendingRide(null); setActiveRide(null); }
  };

  const handleAccept = async () => {
    if (!pendingRide || !user) return;
    const rideOption = RIDE_OPTIONS.find((o) => o.tier === pendingRide.tier);
    const driverObj: Driver = {
      id: user.id,
      name: user.name,
      rating: 5.0,
      trips: completedToday,
      vehicleType: (user.vehicleType as "moto" | "car") ?? "car",
      car: user.vehicleModel ?? "",
      plate: user.vehiclePlate ?? "",
      color: "",
      photoSeed: user.name,
    };
    try {
      await api.updateRide(pendingRide.id, {
        status: "matched",
        driver: driverObj,
        driverId: user.id,
      });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setActiveRide({ ...pendingRide, status: "matched" });
      setPendingRide(null);
    } catch {}
  };

  const handleReject = () => {
    setPendingRide(null);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  };

  const handleStatusAdvance = async () => {
    if (!activeRide) return;
    const next: ActiveRide["status"] | "completed" =
      activeRide.status === "matched" ? "arriving"
      : activeRide.status === "arriving" ? "in_progress"
      : "completed";

    if (next === "completed") {
      try {
        await api.updateRide(activeRide.id, { status: "completed", completedAt: Date.now() });
        setCompletedToday((c) => c + 1);
        setEarnedTodayCents((e) => e + activeRide.priceCents);
        setActiveRide(null);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}
    } else {
      try {
        await api.updateRide(activeRide.id, { status: next });
        setActiveRide({ ...activeRide, status: next });
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } catch {}
    }
  };

  const nextButtonLabel =
    activeRide?.status === "matched" ? "A caminho do passageiro"
    : activeRide?.status === "arriving" ? "Passageiro a bordo"
    : "Finalizar corrida";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greet, { color: colors.mutedForeground }]}>Olá,</Text>
            <Text style={[styles.name, { color: colors.foreground }]}>{firstName}</Text>
          </View>
          <View style={[styles.vehiclePill, { backgroundColor: colors.muted }]}>
            <MaterialCommunityIcons name={vehicleIcon} size={16} color={colors.foreground} />
            <Text style={[styles.vehiclePillTxt, { color: colors.foreground }]}>{vehicleLabel}</Text>
          </View>
        </View>

        {/* Map */}
        <View style={[styles.mapWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <MapCanvas height={260} showRoute={activeRide?.status === "arriving" || activeRide?.status === "in_progress"} />
          <View style={styles.pulseWrap} pointerEvents="none">
            {online && (
              <Animated.View style={[styles.pulse, { backgroundColor: colors.accent, transform: [{ scale: pulse }], opacity: pulse.interpolate({ inputRange: [1, 1.5], outputRange: [0.5, 0] }) }]} />
            )}
            <View style={[styles.pulseDot, { backgroundColor: online ? colors.accent : colors.muted, borderColor: colors.background }]}>
              <MaterialCommunityIcons name={vehicleIcon} size={16} color={online ? colors.accentForeground : colors.foreground} />
            </View>
          </View>
          <View style={[styles.statusOverlay, { backgroundColor: colors.background }]}>
            <View style={[styles.statusDot, { backgroundColor: online ? colors.accent : colors.mutedForeground }]} />
            <Text style={[styles.statusTxt, { color: colors.foreground }]}>{online ? "Online" : "Offline"}</Text>
          </View>
        </View>

        {/* Toggle */}
        <View style={[styles.toggleCard, { backgroundColor: colors.foreground }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleTitle, { color: colors.background }]}>
              {online ? (activeRide ? "Corrida em andamento" : "Aceitando corridas") : "Você está offline"}
            </Text>
            <Text style={[styles.toggleSub, { color: colors.background, opacity: 0.7 }]}>
              {online
                ? activeRide ? `${activeRide.dropoffLabel}` : "Aguarde uma solicitação por perto"
                : "Ative para começar a receber corridas"}
            </Text>
          </View>
          <Switch
            value={online}
            onValueChange={handleToggleOnline}
            trackColor={{ false: colors.muted, true: colors.accent }}
            thumbColor={colors.background}
          />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBlock label="Hoje" value={formatPrice(earnedTodayCents)} icon="dollar-sign" accent />
          <StatBlock label="Corridas" value={completedToday.toString()} icon="check-circle" />
        </View>

        {/* Active ride management */}
        {activeRide && (
          <View style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.accent }]}>
            <View style={styles.requestHeader}>
              <View style={[styles.requestBadge, { backgroundColor: colors.accent }]}>
                <Feather name="navigation" size={12} color={colors.accentForeground} />
                <Text style={[styles.requestBadgeTxt, { color: colors.accentForeground }]}>
                  {activeRide.status === "matched" ? "Aceita" : activeRide.status === "arriving" ? "A caminho" : "Em viagem"}
                </Text>
              </View>
              <Text style={[styles.requestPrice, { color: colors.foreground }]}>{formatPrice(activeRide.priceCents)}</Text>
            </View>

            <View style={styles.routeBlock}>
              <View style={styles.routeIconCol}>
                <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
                <View style={[styles.square, { backgroundColor: colors.foreground }]} />
              </View>
              <View style={{ flex: 1, gap: 14 }}>
                <View>
                  <Text style={[styles.routeLabel, { color: colors.foreground }]}>Embarque</Text>
                  <Text style={[styles.routeSub, { color: colors.mutedForeground }]} numberOfLines={1}>{activeRide.pickupAddress}</Text>
                </View>
                <View>
                  <Text style={[styles.routeLabel, { color: colors.foreground }]}>Destino</Text>
                  <Text style={[styles.routeSub, { color: colors.mutedForeground }]} numberOfLines={1}>{activeRide.dropoffAddress}</Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={handleStatusAdvance}
              style={({ pressed }) => [styles.fullBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
            >
              <Feather name={activeRide.status === "in_progress" ? "check" : "navigation"} size={18} color={colors.accentForeground} />
              <Text style={[styles.fullBtnTxt, { color: colors.accentForeground }]}>{nextButtonLabel}</Text>
            </Pressable>
          </View>
        )}

        {/* Pending ride request */}
        {!activeRide && pendingRide && (
          <View style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.requestHeader}>
              <View style={[styles.requestBadge, { backgroundColor: colors.foreground }]}>
                <Feather name="bell" size={12} color={colors.background} />
                <Text style={[styles.requestBadgeTxt, { color: colors.background }]}>Nova corrida</Text>
              </View>
              <Text style={[styles.requestPrice, { color: colors.foreground }]}>{formatPrice(pendingRide.priceCents)}</Text>
            </View>

            <View style={styles.routeBlock}>
              <View style={styles.routeIconCol}>
                <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
                <View style={[styles.square, { backgroundColor: colors.foreground }]} />
              </View>
              <View style={{ flex: 1, gap: 14 }}>
                <View>
                  <Text style={[styles.routeLabel, { color: colors.foreground }]}>Embarque</Text>
                  <Text style={[styles.routeSub, { color: colors.mutedForeground }]} numberOfLines={1}>{pendingRide.pickupAddress}</Text>
                </View>
                <View>
                  <Text style={[styles.routeLabel, { color: colors.foreground }]}>Destino · {pendingRide.distanceKm.toFixed(1).replace(".", ",")} km</Text>
                  <Text style={[styles.routeSub, { color: colors.mutedForeground }]} numberOfLines={1}>{pendingRide.dropoffAddress}</Text>
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable onPress={handleReject} style={({ pressed }) => [styles.secondaryBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}>
                <Text style={[styles.secondaryBtnTxt, { color: colors.foreground }]}>Recusar</Text>
              </Pressable>
              <Pressable onPress={handleAccept} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}>
                <Feather name="check" size={16} color={colors.accentForeground} />
                <Text style={[styles.primaryBtnTxt, { color: colors.accentForeground }]}>Aceitar</Text>
              </Pressable>
            </View>
          </View>
        )}

        {!activeRide && !pendingRide && online && (
          <View style={[styles.waiting, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.waitingIcon, { backgroundColor: colors.muted }]}>
              <Feather name="search" size={20} color={colors.foreground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.waitingTitle, { color: colors.foreground }]}>Procurando passageiros</Text>
              <Text style={[styles.waitingSub, { color: colors.mutedForeground }]}>Mantenha-se em uma área movimentada</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

type StatBlockProps = {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  accent?: boolean;
};

function StatBlock({ label, value, icon, accent }: StatBlockProps) {
  const colors = useColors();
  return (
    <View style={[styles.statBlock, { backgroundColor: accent ? colors.foreground : colors.card, borderColor: accent ? colors.foreground : colors.border }]}>
      <Feather name={icon} size={16} color={accent ? colors.accent : colors.mutedForeground} />
      <Text style={[styles.statValue, { color: accent ? colors.background : colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: accent ? colors.background : colors.mutedForeground, opacity: accent ? 0.7 : 1 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greet: { fontSize: 14, fontFamily: "Inter_500Medium" },
  name: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  vehiclePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  vehiclePillTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  mapWrap: { marginHorizontal: 20, borderRadius: 22, overflow: "hidden", borderWidth: 1, position: "relative" },
  pulseWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  pulse: { position: "absolute", width: 64, height: 64, borderRadius: 32 },
  pulseDot: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 3 },
  statusOverlay: { position: "absolute", top: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  toggleCard: { marginHorizontal: 20, marginTop: 16, flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 22 },
  toggleTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  toggleSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginTop: 16 },
  statBlock: { flex: 1, padding: 14, borderRadius: 18, borderWidth: 1, gap: 6 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6 },
  requestCard: { marginHorizontal: 20, marginTop: 18, padding: 18, borderRadius: 22, borderWidth: 2, gap: 16 },
  requestHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  requestBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  requestBadgeTxt: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.6 },
  requestPrice: { fontSize: 22, fontFamily: "Inter_700Bold" },
  routeBlock: { flexDirection: "row", gap: 14 },
  routeIconCol: { alignItems: "center", paddingTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  square: { width: 12, height: 12, borderRadius: 3 },
  routeLine: { width: 2, flex: 1, marginVertical: 4, minHeight: 22 },
  routeLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  routeSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  actions: { flexDirection: "row", gap: 10 },
  primaryBtn: { flex: 1.4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 14 },
  primaryBtnTxt: { fontSize: 15, fontFamily: "Inter_700Bold" },
  secondaryBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14 },
  secondaryBtnTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  fullBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  fullBtnTxt: { fontSize: 15, fontFamily: "Inter_700Bold" },
  waiting: { marginHorizontal: 20, marginTop: 18, padding: 16, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 14 },
  waitingIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  waitingTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  waitingSub: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
});
