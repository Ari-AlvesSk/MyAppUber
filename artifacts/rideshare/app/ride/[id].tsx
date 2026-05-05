import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LeafletMap } from "@/components/LeafletMap";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useRides } from "@/context/RideContext";
import { formatDistanceKm, formatPrice } from "@/data/mock";
import { useColors } from "@/hooks/useColors";
import { api } from "@/utils/api";
import type { Driver, Ride } from "@/types";

const CANCEL_REASONS_PASSENGER = [
  "Motorista demorando muito",
  "Erro no endereço",
  "Emergência pessoal",
  "Mudei de planos",
  "Pedi por engano",
  "Outro motivo",
];

export default function RideScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const { getRide, updateRide, cancelRide } = useRides();

  const ride = params.id ? getRide(params.id) : undefined;

  const pulse = useRef(new Animated.Value(0)).current;
  const [etaSeconds, setEtaSeconds] = useState<number>(180);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [mpPaymentId, setMpPaymentId] = useState<string | null>(null);

  // Live driver tracking state
  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);
  const [driverVehicleType, setDriverVehicleType] = useState<"moto" | "car">("car");

  // Determine the current route target (where the car is heading)
  const routeTarget = (() => {
    if (!ride) return null;
    if (ride.status === "arriving" || ride.status === "matched") {
      return { lat: ride.pickup.lat, lng: ride.pickup.lng };
    }
    if (ride.status === "in_progress") {
      return { lat: ride.dropoff.lat, lng: ride.dropoff.lng };
    }
    return null;
  })();

  // Poll for ride status updates from server
  useEffect(() => {
    if (!params.id) return;
    if (!ride) return;
    if (ride.status === "completed" || ride.status === "cancelled") return;

    const poll = async () => {
      try {
        const serverRide = await api.getRideById(params.id) as Record<string, unknown>;
        const serverStatus = String(serverRide["status"] ?? "");
        const serverDriver = serverRide["driver"] as Driver | null | undefined;

        const serverMpId = serverRide["mpPaymentId"] as string | null | undefined;
        if (serverMpId && !mpPaymentId) setMpPaymentId(serverMpId);

        if (serverStatus && serverStatus !== ride.status) {
          const patch: Partial<Ride> = { status: serverStatus as Ride["status"] };
          if (serverDriver) patch.driver = serverDriver;
          if (serverRide["completedAt"]) {
            const ca = serverRide["completedAt"];
            patch.completedAt = ca instanceof Date ? ca.getTime() : typeof ca === "string" ? new Date(ca).getTime() : typeof ca === "number" ? ca : null;
          }
          updateRide(params.id, patch);
          if (Platform.OS !== "web") {
            if (serverStatus === "matched" || serverStatus === "arriving") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            } else if (serverStatus === "in_progress") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            } else if (serverStatus === "completed") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }
          }
        } else if (serverDriver && !ride.driver) {
          updateRide(params.id, { driver: serverDriver });
        }
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [params.id, ride?.status, updateRide, mpPaymentId]);

  // Poll driver location (real-time car tracking)
  useEffect(() => {
    if (!ride?.driver?.id) return;
    if (ride.status !== "matched" && ride.status !== "arriving" && ride.status !== "in_progress") return;

    const driverId = ride.driver.id;
    const vType = (ride.driver.vehicleType === "moto" ? "moto" : "car") as "moto" | "car";

    const pollLocation = async () => {
      try {
        const loc = await api.getDriverLocation(driverId);
        setDriverLat(loc.lat);
        setDriverLng(loc.lng);
        setDriverVehicleType(vType);
      } catch {}
    };

    pollLocation();
    const interval = setInterval(pollLocation, 5000);
    return () => clearInterval(interval);
  }, [ride?.driver?.id, ride?.status]);


  // Poll Mercado Pago to auto-confirm Pix payment
  useEffect(() => {
    if (!mpPaymentId) return;
    if (ride?.status !== "awaiting_pix") return;

    const pollMp = async () => {
      try {
        const result = await api.getMpPixStatus(mpPaymentId);
        if (result.approved) {
          updateRide(params.id, { status: "searching" });
        }
      } catch {}
    };

    pollMp();
    const interval = setInterval(pollMp, 5000);
    return () => clearInterval(interval);
  }, [mpPaymentId, ride?.status, params.id, updateRide]);

  useEffect(() => {
    if (!ride) return;
    if (ride.status !== "arriving" && ride.status !== "in_progress") return;
    setEtaSeconds(ride.status === "arriving" ? 180 : ride.durationMinutes * 60);
    const t = setInterval(() => setEtaSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [ride?.id, ride?.status, ride?.durationMinutes]);

  useEffect(() => {
    if (ride?.status !== "searching") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [ride?.status, pulse]);


  if (!ride) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.center, { paddingTop: insets.top + 40, paddingBottom: insets.bottom }]}>
          <Feather name="alert-circle" size={28} color={colors.mutedForeground} />
          <Text style={[styles.notFound, { color: colors.foreground }]}>Corrida não encontrada</Text>
          <PrimaryButton label="Voltar ao início" onPress={() => router.replace("/(tabs)")} />
        </View>
      </View>
    );
  }

  const handleCancel = () => {
    setSelectedReason(null);
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedReason || !ride) return;
    setCancelModalVisible(false);
    try {
      await api.updateRide(ride.id, {
        status: "cancelled",
        cancelReason: selectedReason,
        completedAt: Date.now(),
      });
    } catch {}
    updateRide(ride.id, { status: "cancelled", completedAt: Date.now() });
    router.replace("/(tabs)");
  };

  const formatEta = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m}:${ss.toString().padStart(2, "0")}`;
  };

  // Map center: passenger's pickup location (fixed pin for passenger)
  const mapCenterLat = ride.pickup.lat ?? -16.0028;
  const mapCenterLng = ride.pickup.lng ?? -49.7903;

  // Live route: driver → pickup (arriving), driver → dropoff (in_progress)
  const showLiveTracking = (ride.status === "matched" || ride.status === "arriving" || ride.status === "in_progress") && driverLat != null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.mapWrap, { paddingTop: insets.top }]}>
        <LeafletMap
          height={420}
          lat={mapCenterLat}
          lng={mapCenterLng}
          interactive={false}
          // Destination pin: pickup during search/arriving, dropoff once in_progress
          destLat={ride.status === "in_progress" ? (ride.dropoff.lat ?? undefined) : (ride.pickup.lat ?? undefined)}
          destLng={ride.status === "in_progress" ? (ride.dropoff.lng ?? undefined) : (ride.pickup.lng ?? undefined)}
          // Driver car marker (moves in real-time; null = hidden)
          driverCarLat={driverLat}
          driverCarLng={driverLng}
          driverCarVehicleType={driverVehicleType}
          // Live dashed route: driver position → current target
          routeALat={driverLat}
          routeALng={driverLng}
          routeBLat={routeTarget?.lat ?? undefined}
          routeBLng={routeTarget?.lng ?? undefined}
        />
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={({ pressed }) => [styles.backBtn, { top: insets.top + 12, backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>

        {/* Live tracking indicator */}
        {showLiveTracking && (
          <View style={[styles.trackingBadge, { top: insets.top + 12, right: 16, backgroundColor: colors.accent }]}>
            <View style={[styles.trackingDot, { backgroundColor: colors.accentForeground }]} />
            <Text style={[styles.trackingTxt, { color: colors.accentForeground }]}>Ao vivo</Text>
          </View>
        )}
      </View>

      <View style={[styles.sheet, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 14 }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
          {ride.status === "awaiting_pix" && (
            <View style={styles.searchBlock}>
              <View style={[styles.pulseCore, { backgroundColor: "#F59E0B", width: 56, height: 56, borderRadius: 28 }]}>
                <Feather name="zap" size={24} color="#fff" />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>Aguardando confirmação do Pix</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Seu pagamento Pix está sendo verificado pelo administrador. O motorista será acionado em breve.
              </Text>
            </View>
          )}

          {ride.status === "searching" && (
            <View style={styles.searchBlock}>
              <View style={styles.pulseWrap}>
                <Animated.View style={[styles.pulseRing, { backgroundColor: colors.accent, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }], opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }) }]} />
                <View style={[styles.pulseCore, { backgroundColor: colors.accent }]}>
                  <Feather name="navigation" size={20} color={colors.accentForeground} />
                </View>
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>Encontrando seu motorista</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Aguarde — um motorista irá aceitar sua corrida em breve…</Text>
            </View>
          )}

          {(ride.status === "matched" || ride.status === "arriving" || ride.status === "in_progress") && ride.driver && (
            <View style={styles.driverBlock}>
              <View style={styles.statusRow}>
                <View style={[styles.statusPill, { backgroundColor: colors.accent }]}>
                  <View style={[styles.statusDot, { backgroundColor: colors.accentForeground }]} />
                  <Text style={[styles.statusTxt, { color: colors.accentForeground }]}>
                    {ride.status === "matched" ? "Motorista encontrado"
                      : ride.status === "arriving" ? "Motorista a caminho"
                      : "Em viagem 🚗"}
                  </Text>
                </View>
                {(ride.status === "arriving" || ride.status === "in_progress") && (
                  <Text style={[styles.eta, { color: colors.foreground }]}>{formatEta(etaSeconds)}</Text>
                )}
              </View>

              <View style={[styles.driverCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.driverAvatar, { backgroundColor: colors.foreground }]}>
                  <Text style={[styles.driverInitial, { color: colors.background }]}>{ride.driver.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.driverName, { color: colors.foreground }]}>{ride.driver.name}</Text>
                  <View style={styles.driverMeta}>
                    <Feather name="star" size={11} color={colors.foreground} />
                    <Text style={[styles.driverMetaTxt, { color: colors.mutedForeground }]}>
                      {ride.driver.rating.toFixed(1)} · {ride.driver.vehicleType === "moto" ? "Moto" : "Carro"}
                    </Text>
                  </View>
                </View>
                <View style={styles.driverBtns}>
                  <Pressable style={({ pressed }) => [styles.driverBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.6 : 1 }]}>
                    <Feather name="message-circle" size={16} color={colors.foreground} />
                  </Pressable>
                  <Pressable style={({ pressed }) => [styles.driverBtn, { backgroundColor: colors.foreground, opacity: pressed ? 0.7 : 1 }]}>
                    <Feather name="phone" size={16} color={colors.background} />
                  </Pressable>
                </View>
              </View>

              {ride.driver.car && (
                <View style={[styles.carCard, { borderColor: colors.border }]}>
                  <View>
                    <Text style={[styles.carLabel, { color: colors.mutedForeground }]}>{ride.tierName}</Text>
                    <Text style={[styles.carName, { color: colors.foreground }]}>{ride.driver.car}</Text>
                  </View>
                  {ride.driver.plate ? (
                    <View style={[styles.plate, { backgroundColor: colors.foreground }]}>
                      <Text style={[styles.plateTxt, { color: colors.background }]}>{ride.driver.plate}</Text>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Price row */}
              <View style={[styles.priceRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.priceLeft}>
                  <Feather name="dollar-sign" size={15} color={colors.accent} />
                  <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Valor da corrida</Text>
                </View>
                <Text style={[styles.priceValue, { color: colors.accent }]}>{formatPrice(ride.priceCents)}</Text>
              </View>

              {/* Phase message */}
              {ride.status === "in_progress" && (
                <View style={[styles.phaseMsg, { backgroundColor: colors.card, borderColor: colors.accent }]}>
                  <Feather name="navigation" size={14} color={colors.accent} />
                  <Text style={[styles.phaseMsgTxt, { color: colors.foreground }]}>
                    A caminho do seu destino
                  </Text>
                </View>
              )}
              {ride.status === "arriving" && (
                <View style={[styles.phaseMsg, { backgroundColor: colors.card, borderColor: colors.accent }]}>
                  <Feather name="map-pin" size={14} color={colors.accent} />
                  <Text style={[styles.phaseMsgTxt, { color: colors.foreground }]}>
                    Motorista chegando ao ponto de embarque
                  </Text>
                </View>
              )}
            </View>
          )}

          {ride.status === "completed" && (
            <View style={styles.completedBlock}>
              <View style={[styles.completedIcon, { backgroundColor: colors.accent }]}>
                <Feather name="check" size={28} color={colors.accentForeground} />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>Você chegou!</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Esperamos que tenha gostado da corrida.</Text>

              <View style={[styles.receiptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: colors.mutedForeground }]}>Tarifa</Text>
                  <Text style={[styles.receiptValue, { color: colors.foreground }]}>{formatPrice(ride.priceCents)}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: colors.mutedForeground }]}>Distância</Text>
                  <Text style={[styles.receiptValue, { color: colors.foreground }]}>{formatDistanceKm(ride.distanceKm)}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: colors.mutedForeground }]}>Duração</Text>
                  <Text style={[styles.receiptValue, { color: colors.foreground }]}>{ride.durationMinutes} min</Text>
                </View>
              </View>

              <Text style={[styles.rateLabel, { color: colors.foreground }]}>Avalie sua corrida</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => { if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); }} style={({ pressed }) => [styles.star, { opacity: pressed ? 0.6 : 1 }]}>
                    <Feather name="star" size={28} color={colors.accent} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {ride.status === "cancelled" && (
            <View style={styles.completedBlock}>
              <View style={[styles.completedIcon, { backgroundColor: colors.muted }]}>
                <Feather name="x" size={28} color={colors.destructive} />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>Corrida cancelada</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Nenhuma cobrança foi realizada.</Text>
            </View>
          )}

          <View style={[styles.routeSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.routeIconCol}>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
              <View style={[styles.square, { backgroundColor: colors.foreground }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.routeLabel, { color: colors.foreground }]} numberOfLines={1}>{ride.pickup.label}</Text>
              <Text style={[styles.routeSub, { color: colors.mutedForeground }]} numberOfLines={1}>{ride.pickup.address}</Text>
              <View style={styles.routeGap} />
              <Text style={[styles.routeLabel, { color: colors.foreground }]} numberOfLines={1}>{ride.dropoff.label}</Text>
              <Text style={[styles.routeSub, { color: colors.mutedForeground }]} numberOfLines={1}>{ride.dropoff.address}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          {(ride.status === "searching" || ride.status === "matched" || ride.status === "arriving") && (
            <PrimaryButton
              label="Cancelar corrida"
              variant="secondary"
              onPress={handleCancel}
            />
          )}
          {ride.status === "in_progress" && (
            <PrimaryButton label="Compartilhar status da viagem" variant="secondary" onPress={() => {}} />
          )}
          {(ride.status === "completed" || ride.status === "cancelled") && (
            <PrimaryButton label="Concluir" variant="primary" onPress={() => router.replace("/(tabs)")} />
          )}
        </View>
      </View>

      {/* Cancel reason modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Cancelar corrida</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>Selecione o motivo para prosseguir</Text>

            <View style={styles.reasonList}>
              {CANCEL_REASONS_PASSENGER.map((reason) => (
                <Pressable
                  key={reason}
                  onPress={() => setSelectedReason(reason)}
                  style={({ pressed }) => [
                    styles.reasonRow,
                    {
                      backgroundColor: selectedReason === reason ? colors.accent + "22" : colors.card,
                      borderColor: selectedReason === reason ? colors.accent : colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View style={[styles.reasonRadio, { borderColor: selectedReason === reason ? colors.accent : colors.border }]}>
                    {selectedReason === reason && (
                      <View style={[styles.reasonRadioInner, { backgroundColor: colors.accent }]} />
                    )}
                  </View>
                  <Text style={[styles.reasonTxt, { color: colors.foreground }]}>{reason}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <PrimaryButton
                label="Confirmar cancelamento"
                variant="destructive"
                onPress={handleConfirmCancel}
              />
              <PrimaryButton
                label="Voltar"
                variant="secondary"
                onPress={() => setCancelModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  notFound: { fontSize: 17, fontFamily: "Inter_700Bold" },
  mapWrap: { position: "relative" },
  backBtn: { position: "absolute", left: 16, width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  trackingBadge: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  trackingDot: { width: 7, height: 7, borderRadius: 3.5 },
  trackingTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  sheet: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, marginTop: -28, paddingHorizontal: 20, paddingTop: 8 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  searchBlock: { alignItems: "center", paddingVertical: 24, gap: 10 },
  pulseWrap: { width: 88, height: 88, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  pulseRing: { position: "absolute", width: 60, height: 60, borderRadius: 30 },
  pulseCore: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", paddingHorizontal: 16 },
  driverBlock: { gap: 14, paddingVertical: 16 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  eta: { fontSize: 20, fontFamily: "Inter_700Bold" },
  driverCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, borderWidth: 1 },
  driverAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  driverInitial: { fontSize: 18, fontFamily: "Inter_700Bold" },
  driverName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  driverMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  driverMetaTxt: { fontSize: 12, fontFamily: "Inter_500Medium" },
  driverBtns: { flexDirection: "row", gap: 8 },
  driverBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  carCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  carLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  carName: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 2 },
  plate: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  plateTxt: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  phaseMsg: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  phaseMsgTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  completedBlock: { alignItems: "center", paddingVertical: 24, gap: 10 },
  completedIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  receiptCard: { width: "100%", borderRadius: 18, borderWidth: 1, marginTop: 8 },
  receiptRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  receiptLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  receiptValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  rateLabel: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 16 },
  stars: { flexDirection: "row", gap: 8 },
  star: { padding: 4 },
  routeSummary: { flexDirection: "row", gap: 14, padding: 16, borderRadius: 18, borderWidth: 1, marginTop: 8 },
  routeIconCol: { alignItems: "center", paddingTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  square: { width: 12, height: 12, borderRadius: 3 },
  routeLine: { width: 2, flex: 1, marginVertical: 6, minHeight: 24 },
  routeGap: { height: 16 },
  routeLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  routeSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  actions: { gap: 10, paddingTop: 12 },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  priceLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
  priceLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  priceValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36 },
  modalHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  modalSub: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 20 },
  reasonList: { gap: 10, marginBottom: 24 },
  reasonRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  reasonRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  reasonRadioInner: { width: 10, height: 10, borderRadius: 5 },
  reasonTxt: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  modalActions: { gap: 10 },
});
