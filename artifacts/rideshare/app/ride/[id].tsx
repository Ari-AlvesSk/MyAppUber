import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MapCanvas } from "@/components/MapCanvas";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useRides } from "@/context/RideContext";
import { formatDistanceKm, formatPrice, pickRandomDriver } from "@/data/mock";
import { useColors } from "@/hooks/useColors";
import type { Ride } from "@/types";

const STAGE_DELAYS = {
  searching: 2800,
  arriving: 4200,
  in_progress: 5200,
};

export default function RideScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const { getRide, updateRide, cancelRide } = useRides();

  const ride = params.id ? getRide(params.id) : undefined;

  const pulse = useRef(new Animated.Value(0)).current;
  const [etaSeconds, setEtaSeconds] = useState<number>(180);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  // Drive the ride state machine forward
  useEffect(() => {
    if (!ride) return;
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    if (ride.status === "searching") {
      timeouts.push(
        setTimeout(() => {
          if (cancelled) return;
          const driver = pickRandomDriver(ride.tier);
          updateRide(ride.id, { status: "arriving", driver });
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            ).catch(() => {});
          }
        }, STAGE_DELAYS.searching),
      );
    } else if (ride.status === "arriving") {
      timeouts.push(
        setTimeout(() => {
          if (cancelled) return;
          updateRide(ride.id, { status: "in_progress" });
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
              () => {},
            );
          }
        }, STAGE_DELAYS.arriving),
      );
    } else if (ride.status === "in_progress") {
      timeouts.push(
        setTimeout(() => {
          if (cancelled) return;
          updateRide(ride.id, {
            status: "completed",
            completedAt: Date.now(),
          });
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            ).catch(() => {});
          }
        }, STAGE_DELAYS.in_progress),
      );
    }

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [ride?.id, ride?.status, updateRide]);

  // ETA countdown for arriving / in_progress
  useEffect(() => {
    if (!ride) return;
    if (ride.status !== "arriving" && ride.status !== "in_progress") return;
    setEtaSeconds(ride.status === "arriving" ? 180 : ride.durationMinutes * 60);
    const t = setInterval(() => {
      setEtaSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [ride?.id, ride?.status, ride?.durationMinutes]);

  // Pulse animation for searching
  useEffect(() => {
    if (ride?.status !== "searching") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [ride?.status, pulse]);

  if (!ride) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.center,
            {
              paddingTop: insets.top + 40,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <Feather name="alert-circle" size={28} color={colors.mutedForeground} />
          <Text style={[styles.notFound, { color: colors.foreground }]}>
            Ride not found
          </Text>
          <PrimaryButton
            label="Back to home"
            onPress={() => router.replace("/(tabs)")}
          />
        </View>
      </View>
    );
  }

  const handleCancel = () => {
    if (confirmingCancel) {
      cancelRide(ride.id);
      router.replace("/(tabs)");
    } else {
      setConfirmingCancel(true);
      setTimeout(() => setConfirmingCancel(false), 3500);
    }
  };

  const formatEta = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m}:${ss.toString().padStart(2, "0")}`;
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Map */}
      <View
        style={[
          styles.mapWrap,
          { paddingTop: insets.top },
        ]}
      >
        <MapCanvas
          height={420}
          showRoute={ride.status !== "completed"}
          showCar={ride.status === "arriving" || ride.status === "in_progress"}
        />
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={({ pressed }) => [
            styles.backBtn,
            {
              top: insets.top + 12,
              backgroundColor: colors.background,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Bottom card */}
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 14,
          },
        ]}
      >
        <View
          style={[styles.handle, { backgroundColor: colors.border }]}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 4 }}
        >
          {ride.status === "searching" && (
            <View style={styles.searchBlock}>
              <View style={styles.pulseWrap}>
                <Animated.View
                  style={[
                    styles.pulseRing,
                    {
                      backgroundColor: colors.accent,
                      transform: [
                        {
                          scale: pulse.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 2.2],
                          }),
                        },
                      ],
                      opacity: pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 0],
                      }),
                    },
                  ]}
                />
                <View
                  style={[
                    styles.pulseCore,
                    { backgroundColor: colors.accent },
                  ]}
                >
                  <Feather
                    name="navigation"
                    size={20}
                    color={colors.accentForeground}
                  />
                </View>
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Finding your driver
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                Connecting you with the best nearby driver…
              </Text>
            </View>
          )}

          {(ride.status === "arriving" ||
            ride.status === "in_progress" ||
            ride.status === "matched") &&
            ride.driver && (
              <View style={styles.driverBlock}>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: colors.accentForeground },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusTxt,
                        { color: colors.accentForeground },
                      ]}
                    >
                      {ride.status === "arriving"
                        ? "Driver on the way"
                        : "On trip"}
                    </Text>
                  </View>
                  <Text style={[styles.eta, { color: colors.foreground }]}>
                    {formatEta(etaSeconds)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.driverCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.driverAvatar,
                      { backgroundColor: colors.foreground },
                    ]}
                  >
                    <Text
                      style={[
                        styles.driverInitial,
                        { color: colors.background },
                      ]}
                    >
                      {ride.driver.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.driverName,
                        { color: colors.foreground },
                      ]}
                    >
                      {ride.driver.name}
                    </Text>
                    <View style={styles.driverMeta}>
                      <Feather
                        name="star"
                        size={11}
                        color={colors.foreground}
                      />
                      <Text
                        style={[
                          styles.driverMetaTxt,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {ride.driver.rating.toFixed(2)} ·{" "}
                        {ride.driver.trips.toLocaleString()} trips
                      </Text>
                    </View>
                  </View>
                  <View style={styles.driverBtns}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.driverBtn,
                        {
                          backgroundColor: colors.muted,
                          opacity: pressed ? 0.6 : 1,
                        },
                      ]}
                    >
                      <Feather
                        name="message-circle"
                        size={16}
                        color={colors.foreground}
                      />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.driverBtn,
                        {
                          backgroundColor: colors.foreground,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Feather
                        name="phone"
                        size={16}
                        color={colors.background}
                      />
                    </Pressable>
                  </View>
                </View>

                <View
                  style={[
                    styles.carCard,
                    { borderColor: colors.border },
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        styles.carLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {ride.driver.color} · {ride.tierName}
                    </Text>
                    <Text
                      style={[styles.carName, { color: colors.foreground }]}
                    >
                      {ride.driver.car}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.plate,
                      {
                        backgroundColor: colors.foreground,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.plateTxt,
                        { color: colors.background },
                      ]}
                    >
                      {ride.driver.plate}
                    </Text>
                  </View>
                </View>
              </View>
            )}

          {ride.status === "completed" && (
            <View style={styles.completedBlock}>
              <View
                style={[
                  styles.completedIcon,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Feather
                  name="check"
                  size={28}
                  color={colors.accentForeground}
                />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                You've arrived
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                Hope you enjoyed the ride. Your receipt has been sent.
              </Text>

              <View
                style={[
                  styles.receiptCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.receiptRow}>
                  <Text
                    style={[
                      styles.receiptLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Fare
                  </Text>
                  <Text
                    style={[
                      styles.receiptValue,
                      { color: colors.foreground },
                    ]}
                  >
                    {formatPrice(ride.priceCents)}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text
                    style={[
                      styles.receiptLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Distance
                  </Text>
                  <Text
                    style={[
                      styles.receiptValue,
                      { color: colors.foreground },
                    ]}
                  >
                    {formatDistanceKm(ride.distanceKm)}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text
                    style={[
                      styles.receiptLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Duration
                  </Text>
                  <Text
                    style={[
                      styles.receiptValue,
                      { color: colors.foreground },
                    ]}
                  >
                    {ride.durationMinutes} min
                  </Text>
                </View>
              </View>

              <Text
                style={[styles.rateLabel, { color: colors.foreground }]}
              >
                Rate your trip
              </Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => {
                      if (Platform.OS !== "web") {
                        Haptics.selectionAsync().catch(() => {});
                      }
                    }}
                    style={({ pressed }) => [
                      styles.star,
                      { opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <Feather name="star" size={28} color={colors.accent} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {ride.status === "cancelled" && (
            <View style={styles.completedBlock}>
              <View
                style={[
                  styles.completedIcon,
                  { backgroundColor: colors.muted },
                ]}
              >
                <Feather name="x" size={28} color={colors.destructive} />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Trip cancelled
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                No charges were applied.
              </Text>
            </View>
          )}

          {/* Route summary */}
          <View
            style={[
              styles.routeSummary,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.routeIconCol}>
              <View
                style={[styles.dot, { backgroundColor: colors.accent }]}
              />
              <View
                style={[
                  styles.routeLine,
                  { backgroundColor: colors.border },
                ]}
              />
              <View
                style={[
                  styles.square,
                  { backgroundColor: colors.foreground },
                ]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.routeLabel, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {ride.pickup.label}
              </Text>
              <Text
                style={[styles.routeSub, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {ride.pickup.address}
              </Text>
              <View style={styles.routeGap} />
              <Text
                style={[styles.routeLabel, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {ride.dropoff.label}
              </Text>
              <Text
                style={[styles.routeSub, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {ride.dropoff.address}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action button */}
        <View style={styles.actions}>
          {(ride.status === "searching" ||
            ride.status === "arriving" ||
            ride.status === "matched") && (
            <PrimaryButton
              label={confirmingCancel ? "Tap again to confirm" : "Cancel ride"}
              variant={confirmingCancel ? "destructive" : "secondary"}
              onPress={handleCancel}
            />
          )}
          {ride.status === "in_progress" && (
            <PrimaryButton
              label="Share trip status"
              variant="secondary"
              onPress={() => {}}
            />
          )}
          {(ride.status === "completed" || ride.status === "cancelled") && (
            <PrimaryButton
              label="Done"
              variant="primary"
              onPress={() => router.replace("/(tabs)")}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  notFound: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  mapWrap: {
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    marginTop: -28,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  searchBlock: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 10,
  },
  pulseWrap: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  pulseRing: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  pulseCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  driverBlock: {
    paddingTop: 8,
    gap: 14,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTxt: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  eta: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  driverInitial: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  driverName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  driverMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  driverMetaTxt: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  driverBtns: {
    flexDirection: "row",
    gap: 6,
  },
  driverBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  carCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  carLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  carName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  plate: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  plateTxt: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  completedBlock: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 10,
  },
  completedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  receiptCard: {
    width: "100%",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginTop: 12,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  receiptLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  receiptValue: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  rateLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginTop: 16,
  },
  stars: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  star: {
    padding: 4,
  },
  routeSummary: {
    marginTop: 18,
    flexDirection: "row",
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  routeIconCol: {
    alignItems: "center",
    paddingTop: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
    minHeight: 20,
  },
  square: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  routeLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  routeSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  routeGap: {
    height: 10,
  },
  actions: {
    paddingTop: 12,
  },
});
