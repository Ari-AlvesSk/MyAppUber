import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
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
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { useRides } from "@/context/RideContext";
import { SAVED_PLACES, SUGGESTED_PLACES } from "@/data/mock";
import { useColors } from "@/hooks/useColors";

const { height: SCREEN_H } = Dimensions.get("window");
const MAP_H = Math.min(SCREEN_H * 0.52, 380);

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeRide, rides } = useRides();
  const { user } = useAuth();
  const { address, granted, loading: locLoading, requestPermission } = useLocation();

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top;
  const bottomPad = isWeb ? 84 + 24 : insets.bottom + 88;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Boa madrugada";
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const firstName = (user?.name ?? "Passageiro").split(" ")[0];
  const avatarColor = user?.avatarColor ?? "#00D26A";
  const completedCount = rides.filter((r) => r.status === "completed").length;

  // Pulse animation for active ride dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!activeRide) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [activeRide]);

  const handleLocationPress = async () => {
    if (!granted) {
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
      await requestPermission();
    }
  };

  const handleSearch = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    router.push("/booking");
  };

  return (
    <View style={styles.root}>
      {/* ── MAP HERO ── */}
      <View style={[styles.mapHero, { height: MAP_H }]}>
        <MapCanvas height={MAP_H} showRoute showCar={!!activeRide} carProgress={0.54} />

        {/* gradient header overlay */}
        <LinearGradient
          colors={["rgba(10,10,10,0.92)", "rgba(10,10,10,0.6)", "transparent"]}
          style={[styles.headerGradient, { paddingTop: topPad + 10 }]}
          pointerEvents="box-none"
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greetTxt}>{greeting} 👋</Text>
              <Text style={styles.nameTxt}>{firstName}</Text>
            </View>
            <Pressable
              onPress={() => router.push("/(tabs)/account")}
              style={[styles.avatar, { backgroundColor: avatarColor }]}
            >
              <Text style={styles.avatarTxt}>{firstName.charAt(0).toUpperCase()}</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* location pill */}
        <Pressable
          onPress={handleLocationPress}
          style={styles.locationPill}
        >
          <View style={styles.locationPillInner}>
            <View style={[styles.locationIconBg, { backgroundColor: granted !== false ? "#00D26A" : "#6b7280" }]}>
              <Feather name="map-pin" size={12} color="#0a0a0a" />
            </View>
            <Text style={styles.locationTxt} numberOfLines={1}>
              {locLoading ? "Localizando…" : address}
            </Text>
            {granted === false && (
              <View style={styles.allowBadge}>
                <Text style={styles.allowTxt}>Permitir</Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      {/* ── BOTTOM SHEET ── */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomPad }}
        >
          {/* drag handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Active ride banner */}
          {activeRide && (
            <Pressable
              onPress={() => router.push(`/ride/${activeRide.id}`)}
              style={({ pressed }) => [styles.activeBanner, { opacity: pressed ? 0.9 : 1 }]}
            >
              <LinearGradient colors={["#00D26A", "#00b359"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.activeBannerGradient}>
                <View style={styles.activeBannerLeft}>
                  <View style={styles.pulseOuter}>
                    <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
                    <View style={styles.pulseDot} />
                  </View>
                  <View>
                    <Text style={styles.activeBannerTitle}>Corrida em andamento</Text>
                    <Text style={styles.activeBannerSub} numberOfLines={1}>Para {activeRide.dropoff.label}</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color="#0a0a0a" />
              </LinearGradient>
            </Pressable>
          )}

          {/* Search CTA */}
          <Pressable onPress={handleSearch} style={({ pressed }) => [styles.searchCTA, { opacity: pressed ? 0.9 : 1 }]}>
            <LinearGradient colors={["#0f1117", "#0a0a0a"]} style={styles.searchCTAInner}>
              <View style={styles.searchLeft}>
                <View style={styles.searchIconWrap}>
                  <Feather name="search" size={18} color="#0a0a0a" />
                </View>
                <View>
                  <Text style={styles.searchMain}>Para onde?</Text>
                  <Text style={styles.searchSub}>Informe seu destino</Text>
                </View>
              </View>
              <View style={styles.nowPill}>
                <Feather name="clock" size={11} color="#0a0a0a" />
                <Text style={styles.nowTxt}>Agora</Text>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Quick destinations */}
          <View style={styles.quickRow}>
            {SAVED_PLACES.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                  router.push({ pathname: "/booking", params: { destinationId: p.id } });
                }}
                style={({ pressed }) => [styles.quickCard, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={styles.quickIconWrap}>
                  <Feather name={(p.icon as keyof typeof Feather.glyphMap | undefined) ?? "map-pin"} size={16} color="#0a0a0a" />
                </View>
                <Text style={styles.quickLabel}>{p.label}</Text>
                <Text style={styles.quickAddr} numberOfLines={1}>{p.address.split("–")[0]?.trim()}</Text>
              </Pressable>
            ))}
          </View>

          {/* Ride types */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tipos de corrida</Text>
            <View style={styles.rideTypeRow}>
              <RideTypeCard
                icon="car-side"
                label="Carro"
                sub="Até 4 pessoas"
                eta="~4 min"
                onPress={() => router.push("/booking")}
              />
              <RideTypeCard
                icon="motorbike"
                label="Moto"
                sub="Rápido e econômico"
                eta="~2 min"
                onPress={() => router.push("/booking")}
              />
            </View>
          </View>

          {/* Suggested places */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Perto de você</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {SUGGESTED_PLACES.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push({ pathname: "/booking", params: { destinationId: p.id } })}
                  style={({ pressed }) => [styles.suggestCard, { opacity: pressed ? 0.75 : 1 }]}
                >
                  <LinearGradient colors={["#f9fafb", "#f3f4f6"]} style={styles.suggestGrad}>
                    <View style={styles.suggestIconWrap}>
                      <Feather name="map-pin" size={14} color="#00D26A" />
                    </View>
                    <Text style={styles.suggestLabel}>{p.label}</Text>
                    <Text style={styles.suggestAddr} numberOfLines={2}>{p.address}</Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Stats */}
          <View style={styles.section}>
            <View style={styles.statsRow}>
              <StatCard icon="check-circle" label="Corridas feitas" value={completedCount.toString()} accent />
              <StatCard icon="shield" label="Segurança" value="Ativa" />
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function RideTypeCard({
  icon, label, sub, eta, onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  sub: string;
  eta: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.rideCard, { opacity: pressed ? 0.8 : 1 }]}>
      <View style={styles.rideCardInner}>
        <View style={styles.rideIconWrap}>
          <MaterialCommunityIcons name={icon} size={28} color="#0a0a0a" />
        </View>
        <Text style={styles.rideLabel}>{label}</Text>
        <Text style={styles.rideSub}>{sub}</Text>
        <View style={styles.etaPill}>
          <Feather name="clock" size={10} color="#00D26A" />
          <Text style={styles.etaTxt}>{eta}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function StatCard({ icon, label, value, accent }: { icon: keyof typeof Feather.glyphMap; label: string; value: string; accent?: boolean }) {
  return (
    <View style={[styles.statCard, accent && styles.statCardAccent]}>
      <Feather name={icon} size={18} color={accent ? "#00D26A" : "#6b7280"} />
      <Text style={[styles.statValue, { color: accent ? "#0a0a0a" : "#0a0a0a" }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: accent ? "#374151" : "#6b7280" }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ffffff" },

  // Map hero
  mapHero: { position: "relative", width: "100%" },
  headerGradient: {
    position: "absolute", top: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 32,
    zIndex: 10,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { gap: 2 },
  greetTxt: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
  nameTxt: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#ffffff", letterSpacing: -0.4 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2.5, borderColor: "#00D26A",
  },
  avatarTxt: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#0a0a0a" },

  // Location pill
  locationPill: {
    position: "absolute", bottom: 18, left: 20, right: 20, zIndex: 10,
  },
  locationPillInner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  locationIconBg: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  locationTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0a0a0a" },
  allowBadge: { backgroundColor: "#00D26A", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  allowTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#0a0a0a" },

  // Bottom sheet
  sheet: {
    flex: 1, backgroundColor: "#ffffff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -28,
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 }, elevation: 14,
  },
  handleWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb" },

  // Active ride banner
  activeBanner: { marginHorizontal: 16, marginBottom: 14, borderRadius: 20, overflow: "hidden" },
  activeBannerGradient: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 16,
  },
  activeBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  pulseOuter: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
  pulseRing: {
    position: "absolute", width: 20, height: 20, borderRadius: 10,
    backgroundColor: "rgba(10,10,10,0.25)",
  },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#0a0a0a" },
  activeBannerTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0a0a0a" },
  activeBannerSub: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(10,10,10,0.7)", marginTop: 2 },

  // Search CTA
  searchCTA: { marginHorizontal: 16, marginBottom: 14, borderRadius: 22, overflow: "hidden" },
  searchCTAInner: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 16,
  },
  searchLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  searchIconWrap: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: "#00D26A",
    alignItems: "center", justifyContent: "center",
  },
  searchMain: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#ffffff" },
  searchSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", marginTop: 2 },
  nowPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
  },
  nowTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#00D26A" },

  // Quick destinations
  quickRow: { flexDirection: "row", gap: 12, marginHorizontal: 16, marginBottom: 4 },
  quickCard: {
    flex: 1, backgroundColor: "#f9fafb", borderRadius: 20,
    padding: 14, borderWidth: 1.5, borderColor: "#f3f4f6",
  },
  quickIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "#00D26A",
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  quickLabel: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0a0a0a" },
  quickAddr: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#6b7280", marginTop: 3 },

  // Sections
  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionLabel: {
    fontSize: 13, fontFamily: "Inter_700Bold", color: "#6b7280",
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 12,
  },

  // Ride type cards
  rideTypeRow: { flexDirection: "row", gap: 12 },
  rideCard: { flex: 1, borderRadius: 22, overflow: "hidden" },
  rideCardInner: {
    backgroundColor: "#f9fafb", borderWidth: 1.5, borderColor: "#f3f4f6",
    borderRadius: 22, padding: 16,
  },
  rideIconWrap: {
    width: 52, height: 52, borderRadius: 18,
    backgroundColor: "#00D26A",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  rideLabel: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0a0a0a" },
  rideSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6b7280", marginTop: 3 },
  etaPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginTop: 12, alignSelf: "flex-start",
    backgroundColor: "#f0fdf7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
  },
  etaTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#00D26A" },

  // Horizontal scroll
  hScroll: { gap: 12, paddingRight: 4 },
  suggestCard: { width: 148, borderRadius: 20, overflow: "hidden" },
  suggestGrad: { padding: 14 },
  suggestIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "#f0fdf7",
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  suggestLabel: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#0a0a0a" },
  suggestAddr: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#6b7280", marginTop: 3, lineHeight: 15 },

  // Stats
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1, backgroundColor: "#f9fafb",
    borderRadius: 20, padding: 16, gap: 6,
    borderWidth: 1.5, borderColor: "#f3f4f6",
  },
  statCardAccent: { backgroundColor: "#f0fdf7", borderColor: "#bbf7d0" },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
