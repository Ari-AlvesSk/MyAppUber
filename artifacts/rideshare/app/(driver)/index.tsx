import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LeafletMap } from "@/components/LeafletMap";
import { useLocation } from "@/context/LocationContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/data/mock";
import { useColors } from "@/hooks/useColors";
import { api, type ChatMessage } from "@/utils/api";
import type { Driver } from "@/types";

type PendingRide = {
  id: string;
  pickupLabel: string;
  pickupAddress: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLabel: string;
  dropoffAddress: string;
  dropoffLat: number | null;
  dropoffLng: number | null;
  distanceKm: number;
  priceCents: number;
  tier: string;
  durationMinutes: number;
};

type ActiveRide = PendingRide & {
  status: "matched" | "arriving" | "in_progress";
};

const QUICK_REPLIES = [
  "Estou a caminho! 🚗",
  "Cheguei ao ponto de embarque",
  "Aguardando você",
  "Tudo certo! 👍",
  "Um momento, já chego",
  "Passageiro a bordo ✓",
];

const CANCEL_REASONS = [
  "Passageiro não encontrado",
  "Problema no veículo",
  "Endereço incorreto",
  "Emergência pessoal",
  "Passageiro cancelou",
  "Outro motivo",
];

export default function DriverHomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { coords, distanceMeters } = useLocation();
  const [online, setOnline] = useState(false);
  const [pendingRide, setPendingRide] = useState<PendingRide | null>(null);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [completedToday, setCompletedToday] = useState(0);
  const [earnedTodayCents, setEarnedTodayCents] = useState(0);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // For ride map: track current route target
  const [routeBLat, setRouteBLat] = useState<number | null>(null);
  const [routeBLng, setRouteBLng] = useState<number | null>(null);
  const rideMapIframeRef = useRef<any>(null);

  // Chat state
  const [driverChatVisible, setDriverChatVisible] = useState(false);
  const [driverChatMessages, setDriverChatMessages] = useState<ChatMessage[]>([]);
  const [driverChatText, setDriverChatText] = useState("");
  const [driverChatSending, setDriverChatSending] = useState(false);
  const [driverChatUnread, setDriverChatUnread] = useState(0);
  const driverChatScrollRef = useRef<any>(null);
  const driverSeenCountRef = useRef(0);

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

  const postLocation = useCallback(() => {
    if (!user?.id || !coords) return;
    // Guard against invalid (0,0) coordinates — GPS not ready yet
    if (Math.abs(coords.latitude) < 0.001 && Math.abs(coords.longitude) < 0.001) return;
    api.postDriverLocation({
      driverId: user.id,
      driverName: user.name,
      vehicleType: user.vehicleType ?? "car",
      lat: coords.latitude,
      lng: coords.longitude,
      online: true,
      rideId: activeRide?.id,
    }).catch(() => {});
  }, [user, coords, activeRide?.id]);

  // Update route A when driver moves during active ride
  useEffect(() => {
    if (!activeRide || !coords || !rideMapIframeRef.current) return;
    const target = activeRide.status === "in_progress"
      ? { lat: activeRide.dropoffLat, lng: activeRide.dropoffLng }
      : { lat: activeRide.pickupLat, lng: activeRide.pickupLng };
    if (target.lat == null) return;
    try {
      rideMapIframeRef.current.contentWindow?.postMessage(
        JSON.stringify({
          type: "updateRoute",
          aLat: coords.latitude, aLng: coords.longitude,
          bLat: target.lat, bLng: target.lng,
        }),
        "*",
      );
    } catch {}
  }, [coords?.latitude, coords?.longitude]);

  useEffect(() => {
    if (online && user?.id) {
      postLocation();
      // Post location every 5s during active ride, 10s otherwise
      const interval = activeRide ? 5000 : 10000;
      locationRef.current = setInterval(postLocation, interval);
    } else {
      if (locationRef.current) { clearInterval(locationRef.current); locationRef.current = null; }
      if (user?.id) {
        api.postDriverLocation({
          driverId: user.id,
          driverName: user.name ?? "",
          vehicleType: user.vehicleType ?? "car",
          lat: coords?.latitude ?? 0,
          lng: coords?.longitude ?? 0,
          online: false,
        }).catch(() => {});
      }
    }
    return () => {
      if (locationRef.current) { clearInterval(locationRef.current); locationRef.current = null; }
    };
  }, [online, user?.id, !!activeRide]);

  // Driver chat polling — active during an active ride
  useEffect(() => {
    if (!activeRide?.id) return;
    const fetchMsgs = async () => {
      try {
        const msgs = await api.getChatMessages(activeRide.id);
        setDriverChatMessages(msgs);
        if (!driverChatVisible && msgs.length > driverSeenCountRef.current) {
          setDriverChatUnread(msgs.length - driverSeenCountRef.current);
        }
        if (driverChatVisible) {
          driverSeenCountRef.current = msgs.length;
          setDriverChatUnread(0);
          setTimeout(() => driverChatScrollRef.current?.scrollToEnd({ animated: true }), 50);
        }
      } catch {}
    };
    fetchMsgs();
    const interval = setInterval(fetchMsgs, 4000);
    return () => clearInterval(interval);
  }, [activeRide?.id, driverChatVisible]);

  // Scroll to bottom and mark read when driver opens chat
  useEffect(() => {
    if (driverChatVisible) {
      driverSeenCountRef.current = driverChatMessages.length;
      setDriverChatUnread(0);
      setTimeout(() => driverChatScrollRef.current?.scrollToEnd({ animated: false }), 120);
    }
  }, [driverChatVisible]);

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
          pickupLat: typeof r["pickupLat"] === "number" ? r["pickupLat"] : null,
          pickupLng: typeof r["pickupLng"] === "number" ? r["pickupLng"] : null,
          dropoffLabel: String(r["dropoffLabel"] ?? ""),
          dropoffAddress: String(r["dropoffAddress"] ?? ""),
          dropoffLat: typeof r["dropoffLat"] === "number" ? r["dropoffLat"] : null,
          dropoffLng: typeof r["dropoffLng"] === "number" ? r["dropoffLng"] : null,
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

  const handleDriverSendChatMessage = useCallback(async (quickReply?: string) => {
    const text = (quickReply ?? driverChatText).trim();
    if (!text || !user?.id || driverChatSending || !activeRide?.id) return;
    setDriverChatSending(true);
    if (!quickReply) setDriverChatText("");
    try {
      await api.sendChatMessage(activeRide.id, { senderId: user.id, senderRole: "driver", text });
      const msgs = await api.getChatMessages(activeRide.id);
      setDriverChatMessages(msgs);
      driverSeenCountRef.current = msgs.length;
      setTimeout(() => driverChatScrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch {} finally {
      setDriverChatSending(false);
    }
  }, [driverChatText, user?.id, driverChatSending, activeRide?.id]);

  const handleToggleOnline = (val: boolean) => {
    setOnline(val);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (!val) { setPendingRide(null); setActiveRide(null); }
  };

  const handleAccept = async () => {
    if (!pendingRide || !user) return;
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
      const acceptPayload: Record<string, unknown> = {
        status: "matched",
        driver: driverObj,
        driverId: user.id,
      };
      // Include driver's current GPS position so passenger sees it immediately
      if (coords && !(Math.abs(coords.latitude) < 0.001 && Math.abs(coords.longitude) < 0.001)) {
        acceptPayload["driverLat"] = coords.latitude;
        acceptPayload["driverLng"] = coords.longitude;
      }
      await api.updateRide(pendingRide.id, acceptPayload);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const ride = { ...pendingRide, status: "matched" as const };
      setActiveRide(ride);
      setRouteBLat(pendingRide.pickupLat);
      setRouteBLng(pendingRide.pickupLng);
      setPendingRide(null);
    } catch {}
  };

  const handleReject = () => {
    setPendingRide(null);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  };

  const handleStatusAdvance = async () => {
    if (!activeRide) return;

    if (activeRide.status === "matched") {
      // Chegou ao passageiro → arriving
      try {
        await api.updateRide(activeRide.id, { status: "arriving" });
        setActiveRide({ ...activeRide, status: "arriving" });
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } catch {}
    } else if (activeRide.status === "arriving") {
      // Passageiro a bordo → in_progress, route changes to destination
      try {
        await api.updateRide(activeRide.id, { status: "in_progress" });
        setActiveRide({ ...activeRide, status: "in_progress" });
        setRouteBLat(activeRide.dropoffLat);
        setRouteBLng(activeRide.dropoffLng);
        // Update the destination pin on map
        if (rideMapIframeRef.current && activeRide.dropoffLat != null) {
          try {
            rideMapIframeRef.current.contentWindow?.postMessage(
              JSON.stringify({ type: "setTap", lat: activeRide.dropoffLat, lng: activeRide.dropoffLng, color: "#0a0a0a", innerColor: "#00D26A" }),
              "*",
            );
            rideMapIframeRef.current.contentWindow?.postMessage(
              JSON.stringify({ type: "updateRoute", aLat: coords?.latitude, aLng: coords?.longitude, bLat: activeRide.dropoffLat, bLng: activeRide.dropoffLng }),
              "*",
            );
          } catch {}
        }
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } catch {}
    } else if (activeRide.status === "in_progress") {
      // Finalizar corrida
      try {
        await api.updateRide(activeRide.id, { status: "completed", completedAt: Date.now() });
        setCompletedToday((c) => c + 1);
        setEarnedTodayCents((e) => e + activeRide.priceCents);
        setActiveRide(null);
        setRouteBLat(null);
        setRouteBLng(null);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}
    }
  };

  const handleCancelRide = async () => {
    if (!activeRide || !selectedReason) return;
    try {
      await api.updateRide(activeRide.id, { status: "cancelled", cancelReason: selectedReason, completedAt: Date.now() });
      setActiveRide(null);
      setRouteBLat(null);
      setRouteBLng(null);
      setCancelModalVisible(false);
      setSelectedReason(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } catch {}
  };

  // Distance check for finalize button
  const distToDestination = (() => {
    if (!activeRide || activeRide.status !== "in_progress" || !coords) return Infinity;
    if (activeRide.dropoffLat == null || activeRide.dropoffLng == null) return 0;
    return distanceMeters(
      { latitude: coords.latitude, longitude: coords.longitude },
      { latitude: activeRide.dropoffLat, longitude: activeRide.dropoffLng },
    );
  })();

  const canFinalize =
    activeRide?.status === "in_progress" &&
    (activeRide.dropoffLat == null || distToDestination <= 300);

  const phaseLabel =
    activeRide?.status === "matched" ? "Indo ao passageiro"
    : activeRide?.status === "arriving" ? "Aguardando embarque"
    : activeRide?.status === "in_progress" ? "Em viagem"
    : "";

  const nextButtonLabel =
    activeRide?.status === "matched" ? "Cheguei ao passageiro"
    : activeRide?.status === "arriving" ? "Passageiro a bordo"
    : canFinalize ? "Finalizar corrida"
    : "Chegue ao destino para finalizar";

  const nextButtonIcon =
    activeRide?.status === "matched" ? "map-pin"
    : activeRide?.status === "arriving" ? "user-check"
    : "check-circle";

  // Ride map props: driver's own GPS as the moving car
  const rideMapLat = coords?.latitude ?? -16.0028;
  const rideMapLng = coords?.longitude ?? -49.7903;

  if (activeRide) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Full-screen map */}
        <View style={styles.rideMapWrap}>
          <LeafletMap
            key={activeRide.id}
            height={null}
            lat={rideMapLat}
            lng={rideMapLng}
            showAsVehicle={true}
            vehicleType={user?.vehicleType ?? "car"}
            destLat={activeRide.status === "in_progress" ? (activeRide.dropoffLat ?? undefined) : (activeRide.pickupLat ?? undefined)}
            destLng={activeRide.status === "in_progress" ? (activeRide.dropoffLng ?? undefined) : (activeRide.pickupLng ?? undefined)}
            routeALat={rideMapLat}
            routeALng={rideMapLng}
            routeBLat={routeBLat}
            routeBLng={routeBLng}
            interactive={false}
          />
          {/* Store reference to iframe for imperative postMessages */}
          <IframeCapture onCapture={(el) => { rideMapIframeRef.current = el; }} />

          {/* Phase overlay */}
          <View style={[styles.phaseOverlay, { top: insets.top + 12, backgroundColor: colors.background }]}>
            <View style={[styles.phaseDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.phaseOverlayTxt, { color: colors.foreground }]}>{phaseLabel}</Text>
          </View>

          {/* Earnings overlay */}
          <View style={[styles.earningsOverlay, { top: insets.top + 12, backgroundColor: colors.foreground }]}>
            <Text style={[styles.earningsOverlayTxt, { color: colors.background }]}>{formatPrice(activeRide.priceCents)}</Text>
          </View>
        </View>

        {/* Bottom panel */}
        <View style={[styles.rideBottomPanel, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.rideHandle, { backgroundColor: colors.border }]} />

          {/* Route summary */}
          <View style={[styles.routeRow, { borderColor: colors.border }]}>
            <View style={styles.routeIconCol}>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <View style={[styles.routeDivider, { backgroundColor: colors.border }]} />
              <View style={[styles.square, { backgroundColor: colors.foreground }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.routeLabel, { color: colors.foreground }]} numberOfLines={1}>{activeRide.pickupLabel}</Text>
              <Text style={[styles.routeSub, { color: colors.mutedForeground }]} numberOfLines={1}>{activeRide.pickupAddress}</Text>
              <View style={{ height: 12 }} />
              <Text style={[styles.routeLabel, { color: colors.foreground }]} numberOfLines={1}>{activeRide.dropoffLabel}</Text>
              <Text style={[styles.routeSub, { color: colors.mutedForeground }]} numberOfLines={1}>{activeRide.dropoffAddress}</Text>
            </View>
            <Text style={[styles.distTxt, { color: colors.mutedForeground }]}>{activeRide.distanceKm.toFixed(1).replace(".", ",")} km</Text>
          </View>

          {/* Distance to destination indicator when in progress */}
          {activeRide.status === "in_progress" && activeRide.dropoffLat != null && (
            <View style={[styles.distBar, { backgroundColor: colors.muted }]}>
              <Feather name="navigation" size={12} color={canFinalize ? colors.accent : colors.mutedForeground} />
              <Text style={[styles.distBarTxt, { color: canFinalize ? colors.accent : colors.mutedForeground }]}>
                {canFinalize
                  ? "Você chegou ao destino!"
                  : `${Math.round(distToDestination)}m até o destino`}
              </Text>
            </View>
          )}

          {/* Chat button */}
          <Pressable
            onPress={() => setDriverChatVisible(true)}
            style={({ pressed }) => [
              styles.chatBtn,
              { backgroundColor: colors.card, borderColor: driverChatUnread > 0 ? colors.accent : colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="message-circle" size={18} color={driverChatUnread > 0 ? colors.accent : colors.foreground} />
            <Text style={[styles.chatBtnTxt, { color: driverChatUnread > 0 ? colors.accent : colors.foreground }]}>
              Chat com passageiro
            </Text>
            {driverChatUnread > 0 && (
              <View style={[styles.chatBadge, { backgroundColor: colors.accent }]}>
                <Text style={[styles.chatBadgeTxt, { color: colors.accentForeground }]}>{driverChatUnread}</Text>
              </View>
            )}
          </Pressable>

          {/* Action button */}
          <Pressable
            onPress={handleStatusAdvance}
            disabled={activeRide.status === "in_progress" && !canFinalize}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: (activeRide.status === "in_progress" && !canFinalize) ? colors.muted : colors.accent,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name={nextButtonIcon as any} size={18} color={(activeRide.status === "in_progress" && !canFinalize) ? colors.mutedForeground : colors.accentForeground} />
            <Text style={[styles.actionBtnTxt, { color: (activeRide.status === "in_progress" && !canFinalize) ? colors.mutedForeground : colors.accentForeground }]}>
              {nextButtonLabel}
            </Text>
          </Pressable>

          {/* Cancel button */}
          <Pressable
            onPress={() => { setSelectedReason(null); setCancelModalVisible(true); }}
            style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="x-circle" size={14} color={colors.mutedForeground} />
            <Text style={[styles.cancelBtnTxt, { color: colors.mutedForeground }]}>Cancelar corrida</Text>
          </Pressable>
        </View>

        {/* Cancel reason modal */}
        <Modal
          visible={cancelModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setCancelModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Motivo do cancelamento</Text>
              <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>Selecione o motivo para prosseguir</Text>

              <View style={styles.reasonList}>
                {CANCEL_REASONS.map((reason) => (
                  <Pressable
                    key={reason}
                    onPress={() => setSelectedReason(reason)}
                    style={({ pressed }) => [
                      styles.reasonBtn,
                      {
                        backgroundColor: selectedReason === reason ? colors.accent : colors.card,
                        borderColor: selectedReason === reason ? colors.accent : colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.reasonRadio, { borderColor: selectedReason === reason ? colors.accentForeground : colors.mutedForeground }]}>
                      {selectedReason === reason && <View style={[styles.reasonRadioInner, { backgroundColor: colors.accentForeground }]} />}
                    </View>
                    <Text style={[styles.reasonTxt, { color: selectedReason === reason ? colors.accentForeground : colors.foreground }]}>
                      {reason}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setCancelModalVisible(false)}
                  style={({ pressed }) => [styles.modalSecBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[styles.modalSecBtnTxt, { color: colors.foreground }]}>Voltar</Text>
                </Pressable>
                <Pressable
                  onPress={handleCancelRide}
                  disabled={!selectedReason}
                  style={({ pressed }) => [
                    styles.modalPriBtn,
                    { backgroundColor: selectedReason ? "#EF4444" : colors.muted, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={[styles.modalPriBtnTxt, { color: selectedReason ? "#fff" : colors.mutedForeground }]}>
                    Confirmar cancelamento
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Chat modal */}
        <Modal
          visible={driverChatVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDriverChatVisible(false)}
        >
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.chatOverlay}>
              <View style={[styles.chatSheet, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <View style={[styles.chatHandle, { backgroundColor: colors.border }]} />
                <View style={[styles.chatHeaderRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.chatHeaderLeft}>
                    <View style={[styles.chatAvatar, { backgroundColor: colors.accent }]}>
                      <Feather name="user" size={18} color={colors.accentForeground} />
                    </View>
                    <View>
                      <Text style={[styles.chatName, { color: colors.foreground }]}>Passageiro</Text>
                      <Text style={[styles.chatSub, { color: colors.mutedForeground }]}>Chat da corrida</Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => setDriverChatVisible(false)}
                    style={({ pressed }) => [styles.chatClose, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Feather name="x" size={18} color={colors.foreground} />
                  </Pressable>
                </View>
                <ScrollView
                  ref={driverChatScrollRef}
                  style={styles.chatMsgs}
                  contentContainerStyle={styles.chatMsgsContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {driverChatMessages.length === 0 ? (
                    <View style={styles.chatEmpty}>
                      <Feather name="message-circle" size={32} color={colors.mutedForeground} />
                      <Text style={[styles.chatEmptyTxt, { color: colors.mutedForeground }]}>
                        Nenhuma mensagem ainda.{"\n"}Use as respostas rápidas abaixo!
                      </Text>
                    </View>
                  ) : (
                    driverChatMessages.map((msg, i) => {
                      const isMe = msg.senderRole === "driver";
                      return (
                        <View key={msg._id ?? String(i)} style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
                          <View style={[styles.msgBubble, isMe ? { backgroundColor: colors.accent } : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                            <Text style={[styles.msgText, { color: isMe ? colors.accentForeground : colors.foreground }]}>{msg.text}</Text>
                            <Text style={[styles.msgTime, { color: isMe ? colors.accentForeground : colors.mutedForeground, opacity: 0.7 }]}>
                              {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={[styles.quickRepliesRow, { borderTopColor: colors.border }]}
                  contentContainerStyle={styles.quickRepliesContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {QUICK_REPLIES.map((qr) => (
                    <Pressable
                      key={qr}
                      onPress={() => handleDriverSendChatMessage(qr)}
                      style={({ pressed }) => [
                        styles.quickReply,
                        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Text style={[styles.quickReplyTxt, { color: colors.foreground }]}>{qr}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={[styles.chatInputRow, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                  <TextInput
                    style={[styles.chatInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                    value={driverChatText}
                    onChangeText={setDriverChatText}
                    placeholder="Mensagem..."
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    maxLength={500}
                  />
                  <Pressable
                    onPress={() => handleDriverSendChatMessage()}
                    disabled={!driverChatText.trim() || driverChatSending}
                    style={({ pressed }) => [
                      styles.chatSendBtn,
                      { backgroundColor: driverChatText.trim() ? colors.accent : colors.muted, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Feather name="send" size={18} color={driverChatText.trim() ? colors.accentForeground : colors.mutedForeground} />
                  </Pressable>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
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

        <View style={[styles.mapWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <LeafletMap
            height={260}
            lat={coords?.latitude ?? -16.0028}
            lng={coords?.longitude ?? -49.7903}
            interactive={false}
            showRoute={false}
            vehicleType={user?.vehicleType ?? "car"}
            showAsVehicle={true}
          />
          <View style={[styles.statusOverlay, { backgroundColor: colors.background }]}>
            <View style={[styles.statusDot, { backgroundColor: online ? colors.accent : colors.mutedForeground }]} />
            <Text style={[styles.statusTxt, { color: colors.foreground }]}>{online ? "Online" : "Offline"}</Text>
          </View>
          {online && (
            <View style={[styles.pulseRing, { borderColor: colors.accent }]} pointerEvents="none" />
          )}
        </View>

        <View style={[styles.toggleCard, { backgroundColor: colors.foreground }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleTitle, { color: colors.background }]}>
              {online ? "Aceitando corridas" : "Você está offline"}
            </Text>
            <Text style={[styles.toggleSub, { color: colors.background, opacity: 0.7 }]}>
              {online
                ? "Aguarde uma solicitação por perto"
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

        <View style={styles.statsRow}>
          <StatBlock label="Hoje" value={formatPrice(earnedTodayCents)} icon="dollar-sign" accent />
          <StatBlock label="Corridas" value={completedToday.toString()} icon="check-circle" />
        </View>

        {pendingRide && (
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
                <View style={[styles.routeDivider, { backgroundColor: colors.border }]} />
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

            <View style={styles.twoActions}>
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

        {!pendingRide && online && (
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

// Helper component to capture iframe ref from LeafletMap's rendered iframe
function IframeCapture({ onCapture }: { onCapture: (el: HTMLIFrameElement | null) => void }) {
  useEffect(() => {
    if (Platform.OS !== "web") {
      onCapture(null);
      return () => onCapture(null);
    }
    // Find the most recently rendered iframe (the ride map iframe)
    const iframes = (document as Document).querySelectorAll("iframe[title='Mapa']");
    const last = iframes[iframes.length - 1] as HTMLIFrameElement | null;
    onCapture(last ?? null);
    return () => onCapture(null);
  }, [onCapture]);
  return null;
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
  // Idle view
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greet: { fontSize: 14, fontFamily: "Inter_500Medium" },
  name: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  vehiclePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  vehiclePillTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  mapWrap: { marginHorizontal: 20, borderRadius: 22, overflow: "hidden", borderWidth: 1, position: "relative" },
  pulseRing: { position: "absolute", top: 12, right: 12, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
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
  routeDivider: { width: 2, flex: 1, marginVertical: 4, minHeight: 22 },
  routeLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  routeSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  twoActions: { flexDirection: "row", gap: 10 },
  primaryBtn: { flex: 1.4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 14 },
  primaryBtnTxt: { fontSize: 15, fontFamily: "Inter_700Bold" },
  secondaryBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14 },
  secondaryBtnTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  waiting: { marginHorizontal: 20, marginTop: 18, padding: 16, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 14 },
  waitingIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  waitingTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  waitingSub: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  // Active ride view
  rideMapWrap: { flex: 1, position: "relative" },
  phaseOverlay: { position: "absolute", left: 16, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  phaseDot: { width: 8, height: 8, borderRadius: 4 },
  phaseOverlayTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  earningsOverlay: { position: "absolute", right: 16, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  earningsOverlayTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
  rideBottomPanel: { borderTopWidth: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  rideHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 4 },
  routeRow: { flexDirection: "row", gap: 14, paddingVertical: 12, borderBottomWidth: 1 },
  distTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold", alignSelf: "center" },
  distBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  distBarTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16 },
  actionBtnTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cancelBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 },
  cancelBtnTxt: { fontSize: 14, fontFamily: "Inter_500Medium" },
  // Cancel modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36, gap: 12 },
  modalHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  modalSub: { fontSize: 14, fontFamily: "Inter_500Medium" },
  reasonList: { gap: 10, marginTop: 4 },
  reasonBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  reasonRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  reasonRadioInner: { width: 10, height: 10, borderRadius: 5 },
  reasonTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalSecBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14 },
  modalSecBtnTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalPriBtn: { flex: 2, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14 },
  modalPriBtnTxt: { fontSize: 15, fontFamily: "Inter_700Bold" },
  chatBtn: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  chatBtnTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  chatBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  chatBadgeTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  chatOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  chatSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, maxHeight: "90%" as any },
  chatHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginTop: 10, marginBottom: 8 },
  chatHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  chatHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  chatName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  chatSub: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  chatClose: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  chatMsgs: { flex: 1, paddingHorizontal: 16 },
  chatMsgsContent: { paddingVertical: 16, gap: 8, flexGrow: 1, justifyContent: "flex-end" as any },
  chatEmpty: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 12 },
  chatEmptyTxt: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
  msgRow: { maxWidth: "80%" as any },
  msgRowRight: { alignSelf: "flex-end" },
  msgRowLeft: { alignSelf: "flex-start" },
  msgBubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  msgText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  msgTime: { fontSize: 11, fontFamily: "Inter_400Regular", alignSelf: "flex-end" },
  quickRepliesRow: { borderTopWidth: 1, maxHeight: 60 },
  quickRepliesContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: "center" },
  quickReply: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  quickReplyTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  chatInputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1 },
  chatInput: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_500Medium", borderWidth: 1 },
  chatSendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
