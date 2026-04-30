import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
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
import {
  RECENT_PLACES,
  SAVED_PLACES,
  computePriceCents,
  estimateDistanceKm,
  formatDistanceKm,
  formatPrice,
  RIDE_OPTIONS,
} from "@/data/mock";
import { useColors } from "@/hooks/useColors";
import type { Place } from "@/types";

type Request = {
  id: string;
  pickup: Place;
  dropoff: Place;
  distanceKm: number;
  pickupKm: number;
  priceCents: number;
};

const POOL: Place[] = [...SAVED_PLACES, ...RECENT_PLACES];

function generateRequest(vehicle: "moto" | "car"): Request {
  const pickup = POOL[Math.floor(Math.random() * POOL.length)]!;
  let dropoff = POOL[Math.floor(Math.random() * POOL.length)]!;
  let guard = 0;
  while (dropoff.id === pickup.id && guard++ < 5) {
    dropoff = POOL[Math.floor(Math.random() * POOL.length)]!;
  }
  const option = RIDE_OPTIONS.find((o) => o.tier === vehicle)!;
  const distanceKm = estimateDistanceKm(dropoff.id);
  const pickupKm = 0.4 + Math.random() * 2.6;
  const priceCents = computePriceCents(
    distanceKm,
    option.pricePerKmCents,
    option.minPriceCents,
  );
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    pickup,
    dropoff,
    distanceKm,
    pickupKm,
    priceCents,
  };
}

export default function DriverHomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [online, setOnline] = useState(false);
  const [request, setRequest] = useState<Request | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [completedToday, setCompletedToday] = useState(7);
  const [earnedTodayCents, setEarnedTodayCents] = useState(13740);
  const [hoursOnline, setHoursOnline] = useState(4.2);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top + 8;
  const bottomPad = isWeb ? 84 + 24 : insets.bottom + 88;

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!online) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.5,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [online, pulse]);

  // Generate a new request after going online
  useEffect(() => {
    if (!online || request) return;
    const t = setTimeout(() => {
      const vehicle = user?.vehicleType ?? "car";
      setRequest(generateRequest(vehicle));
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        ).catch(() => {});
      }
    }, 3500);
    return () => clearTimeout(t);
  }, [online, request, user]);

  const handleToggleOnline = (val: boolean) => {
    setOnline(val);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    if (!val) {
      setRequest(null);
      setAccepted(false);
    }
  };

  const handleAccept = () => {
    if (!request) return;
    setAccepted(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    }
  };

  const handleComplete = () => {
    if (!request) return;
    setCompletedToday((c) => c + 1);
    setEarnedTodayCents((e) => e + request.priceCents);
    setHoursOnline((h) => Math.min(12, h + request.distanceKm * 0.04));
    setRequest(null);
    setAccepted(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    }
  };

  const handleReject = () => {
    setRequest(null);
    setAccepted(false);
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const firstName = (user?.name ?? "Motorista").split(" ")[0];
  const vehicleLabel =
    user?.vehicleType === "moto" ? "Moto" : "Carro";
  const vehicleIcon: keyof typeof MaterialCommunityIcons.glyphMap =
    user?.vehicleType === "moto" ? "motorbike" : "car-side";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingBottom: bottomPad,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greet, { color: colors.mutedForeground }]}>
              Olá,
            </Text>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {firstName}
            </Text>
          </View>
          <View
            style={[
              styles.vehiclePill,
              { backgroundColor: colors.muted },
            ]}
          >
            <MaterialCommunityIcons
              name={vehicleIcon}
              size={16}
              color={colors.foreground}
            />
            <Text
              style={[styles.vehiclePillTxt, { color: colors.foreground }]}
            >
              {vehicleLabel}
            </Text>
          </View>
        </View>

        {/* Map + online overlay */}
        <View
          style={[
            styles.mapWrap,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <MapCanvas height={260} showRoute={accepted} />

          {/* Pulse marker */}
          <View
            style={styles.pulseWrap}
            pointerEvents="none"
          >
            {online && (
              <Animated.View
                style={[
                  styles.pulse,
                  {
                    backgroundColor: colors.accent,
                    transform: [{ scale: pulse }],
                    opacity: pulse.interpolate({
                      inputRange: [1, 1.5],
                      outputRange: [0.5, 0],
                    }),
                  },
                ]}
              />
            )}
            <View
              style={[
                styles.pulseDot,
                {
                  backgroundColor: online ? colors.accent : colors.muted,
                  borderColor: colors.background,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={vehicleIcon}
                size={16}
                color={online ? colors.accentForeground : colors.foreground}
              />
            </View>
          </View>

          <View
            style={[
              styles.statusOverlay,
              { backgroundColor: colors.background },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: online ? colors.accent : colors.mutedForeground,
                },
              ]}
            />
            <Text style={[styles.statusTxt, { color: colors.foreground }]}>
              {online ? "Online" : "Offline"}
            </Text>
          </View>
        </View>

        {/* Toggle */}
        <View
          style={[
            styles.toggleCard,
            { backgroundColor: colors.foreground },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.toggleTitle, { color: colors.background }]}
            >
              {online ? "Aceitando corridas" : "Você está offline"}
            </Text>
            <Text
              style={[
                styles.toggleSub,
                { color: colors.background, opacity: 0.7 },
              ]}
            >
              {online
                ? "Aguarde uma solicitação por perto"
                : "Ative para começar a receber corridas"}
            </Text>
          </View>
          <Switch
            value={online}
            onValueChange={handleToggleOnline}
            trackColor={{
              false: colors.muted,
              true: colors.accent,
            }}
            thumbColor={colors.background}
          />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBlock
            label="Hoje"
            value={formatPrice(earnedTodayCents)}
            icon="dollar-sign"
            accent
          />
          <StatBlock
            label="Corridas"
            value={completedToday.toString()}
            icon="check-circle"
          />
          <StatBlock
            label="Horas"
            value={`${hoursOnline.toFixed(1)}h`}
            icon="clock"
          />
        </View>

        {/* Live request */}
        {request && (
          <View
            style={[
              styles.requestCard,
              {
                backgroundColor: colors.card,
                borderColor: accepted ? colors.accent : colors.border,
              },
            ]}
          >
            <View style={styles.requestHeader}>
              <View
                style={[
                  styles.requestBadge,
                  { backgroundColor: accepted ? colors.accent : colors.foreground },
                ]}
              >
                <Feather
                  name={accepted ? "navigation" : "bell"}
                  size={12}
                  color={
                    accepted ? colors.accentForeground : colors.background
                  }
                />
                <Text
                  style={[
                    styles.requestBadgeTxt,
                    {
                      color: accepted
                        ? colors.accentForeground
                        : colors.background,
                    },
                  ]}
                >
                  {accepted ? "Em rota" : "Nova corrida"}
                </Text>
              </View>
              <Text
                style={[styles.requestPrice, { color: colors.foreground }]}
              >
                {formatPrice(request.priceCents)}
              </Text>
            </View>

            <View style={styles.routeBlock}>
              <View style={styles.routeIconCol}>
                <View
                  style={[styles.dot, { backgroundColor: colors.accent }]}
                />
                <View
                  style={[styles.routeLine, { backgroundColor: colors.border }]}
                />
                <View
                  style={[styles.square, { backgroundColor: colors.foreground }]}
                />
              </View>
              <View style={{ flex: 1, gap: 14 }}>
                <View>
                  <Text
                    style={[
                      styles.routeLabel,
                      { color: colors.foreground },
                    ]}
                  >
                    Embarque · {request.pickupKm.toFixed(1).replace(".", ",")} km
                  </Text>
                  <Text
                    style={[styles.routeSub, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {request.pickup.address}
                  </Text>
                </View>
                <View>
                  <Text
                    style={[
                      styles.routeLabel,
                      { color: colors.foreground },
                    ]}
                  >
                    Destino · {formatDistanceKm(request.distanceKm)}
                  </Text>
                  <Text
                    style={[styles.routeSub, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {request.dropoff.address}
                  </Text>
                </View>
              </View>
            </View>

            {accepted ? (
              <Pressable
                onPress={handleComplete}
                style={({ pressed }) => [
                  styles.fullBtn,
                  {
                    backgroundColor: colors.accent,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather name="check" size={18} color={colors.accentForeground} />
                <Text
                  style={[styles.fullBtnTxt, { color: colors.accentForeground }]}
                >
                  Finalizar corrida
                </Text>
              </Pressable>
            ) : (
              <View style={styles.actions}>
                <Pressable
                  onPress={handleReject}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    {
                      backgroundColor: colors.muted,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.secondaryBtnTxt,
                      { color: colors.foreground },
                    ]}
                  >
                    Recusar
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleAccept}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    {
                      backgroundColor: colors.accent,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Feather
                    name="check"
                    size={16}
                    color={colors.accentForeground}
                  />
                  <Text
                    style={[
                      styles.primaryBtnTxt,
                      { color: colors.accentForeground },
                    ]}
                  >
                    Aceitar
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {!request && online && (
          <View
            style={[
              styles.waiting,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[styles.waitingIcon, { backgroundColor: colors.muted }]}
            >
              <Feather name="search" size={20} color={colors.foreground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.waitingTitle, { color: colors.foreground }]}>
                Procurando passageiros
              </Text>
              <Text
                style={[styles.waitingSub, { color: colors.mutedForeground }]}
              >
                Mantenha-se em uma área movimentada
              </Text>
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
    <View
      style={[
        styles.statBlock,
        {
          backgroundColor: accent ? colors.foreground : colors.card,
          borderColor: accent ? colors.foreground : colors.border,
        },
      ]}
    >
      <Feather
        name={icon}
        size={16}
        color={accent ? colors.accent : colors.mutedForeground}
      />
      <Text
        style={[
          styles.statValue,
          { color: accent ? colors.background : colors.foreground },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.statLabel,
          {
            color: accent ? colors.background : colors.mutedForeground,
            opacity: accent ? 0.7 : 1,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greet: { fontSize: 14, fontFamily: "Inter_500Medium" },
  name: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  vehiclePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  vehiclePillTxt: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  mapWrap: {
    marginHorizontal: 20,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  pulseWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  pulseDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
  statusOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTxt: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  toggleCard: {
    marginHorizontal: 20,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 22,
  },
  toggleTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  toggleSub: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  statBlock: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  requestCard: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 18,
    borderRadius: 22,
    borderWidth: 2,
    gap: 16,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  requestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  requestBadgeTxt: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  requestPrice: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  routeBlock: {
    flexDirection: "row",
    gap: 14,
  },
  routeIconCol: {
    alignItems: "center",
    paddingTop: 4,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  square: { width: 12, height: 12, borderRadius: 3 },
  routeLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
    minHeight: 22,
  },
  routeLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  routeSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  primaryBtn: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnTxt: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  secondaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
  },
  secondaryBtnTxt: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  fullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  fullBtnTxt: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  waiting: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  waitingIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  waitingTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  waitingSub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
});
