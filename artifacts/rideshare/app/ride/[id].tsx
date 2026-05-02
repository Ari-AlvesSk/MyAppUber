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

  useEffect(() => {
    if (!ride) return;
    if (ride.status !== "arriving" && ride.status !== "in_progress") return;
    setEtaSeconds(ride.status === "arriving" ? 180 : ride.durationMinutes * 60);
    const t = setInterval(() => {
      setEtaSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [ride?.id, ride?.status, ride?.durationMinutes]);

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
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom },
          ]}
        >
          <Feather
            name="alert-circle"
            size={28}
            color={colors.mutedForeground}
          />
          <Text style={[styles.notFound, { color: colors.foreground }]}>
            Corrida não encontrada
          </Text>
          <PrimaryButton
            label="Voltar ao início"
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
      <View style={[styles.mapWrap, { paddingTop: insets.top }]}>
        <MapCanvas
          height={420}
          showRoute={ride.status !== "completed"}
          showCar={
            ride.status === "arriving" || ride.status === "in_progress"
          }
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
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

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
                Encontrando seu motorista
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                Conectando você ao melhor motorista próximo…
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
                        ? "Motorista a caminho"
                        : "Em viagem"}
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
                        {ride.driver.trips.toLocaleString("pt-BR")} corridas
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
                  style={[styles.carCard, { borderColor: colors.border }]}
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
                      { backgroundColor: colors.foreground },
                    ]}
                  >
                    <Text
                      style={[styles.plateTxt, { color: colors.background }]}
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
                Você chegou!
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                Esperamos que tenha gostado da corrida. O recibo foi enviado.
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
                    Tarifa
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
                    Distância
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
                    Duração
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

              <Text style={[styles.rateLabel, { color: colors.foreground }]}>
                Avalie sua corrida
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
                Corrida cancelada
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                Nenhuma cobrança foi realizada.
              </Text>
            </View>
          )}

          {/* Resumo da rota */}
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
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <View
                style={[styles.routeLine, { backgroundColor: colors.border }]}
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

        <View style={styles.actions}>
          {(ride.status === "searching" ||
            ride.status === "arriving" ||
            ride.status === "matched") && (
            <PrimaryButton
              label={
                confirmingCancel
                  ? "Toque novamente para confirmar"
                  : "Cancelar corrida"
              }
              variant={confirmingCancel ? "destructive" : "secondary"}
              onPress={handleCancel}
            />
          )}
          {ride.status === "in_progress" && (
            <PrimaryButton
              label="Compartilhar status da viagem"
              variant="secondary"
              onPress={() => {}}
            />
          )}
          {(ride.status === "completed" || ride.status === "cancelled") && (
            <PrimaryButton
              label="Concluir"
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
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  notFound: { fontSize: 17, fontFamily: "Inter_700Bold" },
  mapWrap: { position: "relative" },
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
  searchBlock: { alignItems: "center", paddingVertical: 24, gap: 10 },
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
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  driverBlock: { gap: 14, paddingVertical: 16 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  eta: { fontSize: 22, fontFamily: "Inter_700Bold" },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  driverAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  driverInitial: { fontSize: 18, fontFamily: "Inter_700Bold" },
  driverName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  driverMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  driverMetaTxt: { fontSize: 12, fontFamily: "Inter_500Medium" },
  driverBtns: { flexDirection: "row", gap: 8 },
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
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  carLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  carName: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 2 },
  plate: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  plateTxt: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  completedBlock: { alignItems: "center", paddingVertical: 20, gap: 10 },
  completedIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  receiptCard: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: 6,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  receiptLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  receiptValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  rateLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginTop: 12,
  },
  stars: { flexDirection: "row", gap: 8 },
  star: { padding: 4 },
  routeSummary: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 4,
  },
  routeIconCol: { alignItems: "center", paddingTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  routeLine: { width: 2, flex: 1, marginVertical: 4, minHeight: 22 },
  square: { width: 12, height: 12, borderRadius: 3 },
  routeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  routeSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  routeGap: { height: 14 },
  actions: { paddingTop: 8, gap: 8 },
});
