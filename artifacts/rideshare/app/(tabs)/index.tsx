import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
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

import { LeafletMap } from "@/components/LeafletMap";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { useRides } from "@/context/RideContext";
import { SAVED_PLACES, SUGGESTED_PLACES } from "@/data/mock";

const { height: SCREEN_H } = Dimensions.get("window");
const MAP_H = SCREEN_H; // full screen map

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeRide, rides } = useRides();
  const { user } = useAuth();
  const { address, granted, loading: locLoading, requestPermission, coords } = useLocation();

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top;
  const bottomPad = isWeb ? 84 + 16 : insets.bottom + 88;

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

  // Recent destinations from completed rides
  const recentDropoffs = useMemo(() => {
    const seen = new Set<string>();
    return rides
      .filter((r) => r.status === "completed")
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      .filter((r) => {
        if (seen.has(r.dropoff.label)) return false;
        seen.add(r.dropoff.label);
        return true;
      })
      .slice(0, 3)
      .map((r) => r.dropoff);
  }, [rides]);

  // Pulse animation for active ride
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sheetAnim = useRef(new Animated.Value(40)).current;
  const fadAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(sheetAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fadAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!activeRide) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.7, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [activeRide]);

  const handleSearch = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    router.push("/booking");
  };

  const handleLocationPress = async () => {
    if (!granted) {
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
      await requestPermission();
    }
  };

  const lat = coords?.latitude ?? -16.0028;
  const lng = coords?.longitude ?? -49.7903;

  return (
    <View style={styles.root}>
      {/* ══ FULL SCREEN MAP ══ */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" } as any]}>
        <LeafletMap
          lat={lat}
          lng={lng}
          height={MAP_H}
          interactive={false}
        />
      </View>

      {/* ══ TOP GRADIENT HEADER ══ */}
      <LinearGradient
        colors={["rgba(10,10,10,0.88)", "rgba(10,10,10,0.5)", "transparent"]}
        style={[styles.topGradient, { paddingTop: topPad + 10, pointerEvents: "box-none" } as any]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greetTxt}>{greeting}</Text>
            <Text style={styles.nameTxt}>{firstName} 👋</Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/account")}
            style={[styles.avatar, { backgroundColor: avatarColor }]}
          >
            <Text style={styles.avatarTxt}>{firstName.charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* ══ BOTTOM SHEET OVERLAY ══ */}
      <View style={[styles.bottomArea, { paddingBottom: bottomPad }]}>

        {/* Active ride banner */}
        {activeRide && (
          <Pressable
            onPress={() => router.push(`/ride/${activeRide.id}`)}
            style={({ pressed }) => [styles.activeBanner, { opacity: pressed ? 0.9 : 1 }]}
          >
            <LinearGradient colors={["#00D26A", "#00b35a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.activeBannerGrad}>
              <View style={styles.activeBannerLeft}>
                <View style={styles.pulseWrap}>
                  <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
                  <View style={styles.pulseDot} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeBannerTitle}>Corrida em andamento</Text>
                  <Text style={styles.activeBannerSub} numberOfLines={1}>Para {activeRide.dropoff.label}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color="#0a0a0a" />
            </LinearGradient>
          </Pressable>
        )}

        {/* Card branco flutuante */}
        <Animated.View style={[styles.card, { transform: [{ translateY: sheetAnim }], opacity: fadAnim }]}>

          {/* Location pill */}
          <Pressable onPress={handleLocationPress} style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: granted !== false ? "#00D26A" : "#9ca3af" }]} />
            <Text style={styles.locationTxt} numberOfLines={1}>
              {locLoading ? "Obtendo localização…" : address}
            </Text>
            {granted === false && (
              <View style={styles.allowBadge}>
                <Text style={styles.allowTxt}>Permitir</Text>
              </View>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerLine} />

          {/* Search CTA */}
          <Pressable onPress={handleSearch} style={({ pressed }) => [styles.searchBtn, { opacity: pressed ? 0.88 : 1 }]}>
            <View style={styles.searchIcon}>
              <Feather name="search" size={17} color="#0a0a0a" />
            </View>
            <Text style={styles.searchTxt}>Para onde?</Text>
            <View style={styles.schedPill}>
              <Feather name="clock" size={11} color="#6b7280" />
              <Text style={styles.schedTxt}>Agora</Text>
            </View>
          </Pressable>

          {/* Quick shortcuts: Casa / Trabalho */}
          <View style={styles.shortcutRow}>
            {SAVED_PLACES.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                  router.push({ pathname: "/booking", params: { destinationId: p.id } });
                }}
                style={({ pressed }) => [styles.shortcutCard, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={styles.shortcutIcon}>
                  <Feather name={(p.icon as keyof typeof Feather.glyphMap | undefined) ?? "map-pin"} size={15} color="#0a0a0a" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shortcutLabel}>{p.label}</Text>
                  <Text style={styles.shortcutAddr} numberOfLines={1}>{p.address.split("–")[0]?.trim()}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Recentes + Sugestões */}
        <Animated.View style={{ opacity: fadAnim }}>
          {recentDropoffs.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionLabel}>Recentes</Text>
              {recentDropoffs.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push({ pathname: "/booking", params: { destinationId: p.id } })}
                  style={({ pressed }) => [styles.recentRow, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={styles.recentIcon}>
                    <Feather name="clock" size={14} color="#6b7280" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentLabel}>{p.label}</Text>
                    <Text style={styles.recentAddr} numberOfLines={1}>{p.address}</Text>
                  </View>
                  <Feather name="arrow-up-left" size={16} color="#9ca3af" />
                </Pressable>
              ))}
            </View>
          )}

          {/* Sugestões horizontais */}
          <View style={styles.suggestSection}>
            <Text style={styles.sectionLabel}>Perto de você</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestScroll}>
              {SUGGESTED_PLACES.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push({ pathname: "/booking", params: { destinationId: p.id } })}
                  style={({ pressed }) => [styles.suggestCard, { opacity: pressed ? 0.75 : 1 }]}
                >
                  <View style={styles.suggestIconWrap}>
                    <Feather name="map-pin" size={13} color="#00D26A" />
                  </View>
                  <Text style={styles.suggestLabel}>{p.label}</Text>
                  <Text style={styles.suggestAddr} numberOfLines={2}>{p.address}</Text>
                </Pressable>
              ))}
              {completedCount > 0 && (
                <View style={[styles.suggestCard, styles.statCard]}>
                  <View style={[styles.suggestIconWrap, { backgroundColor: "#f0fdf7" }]}>
                    <Feather name="check-circle" size={13} color="#00D26A" />
                  </View>
                  <Text style={styles.suggestLabel}>{completedCount} corrida{completedCount !== 1 ? "s" : ""}</Text>
                  <Text style={styles.suggestAddr}>realizadas</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#eef2f5" },

  // Header
  topGradient: {
    position: "absolute", top: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 40, zIndex: 20,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greetTxt: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.65)" },
  nameTxt: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#ffffff", letterSpacing: -0.3 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2.5, borderColor: "#00D26A",
  },
  avatarTxt: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#0a0a0a" },

  // Bottom area
  bottomArea: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    zIndex: 20, gap: 10,
  },

  // Active banner
  activeBanner: { marginHorizontal: 16, borderRadius: 20, overflow: "hidden" },
  activeBannerGrad: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14,
  },
  activeBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  pulseWrap: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
  pulseRing: {
    position: "absolute", width: 20, height: 20, borderRadius: 10,
    backgroundColor: "rgba(10,10,10,0.2)",
  },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#0a0a0a" },
  activeBannerTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0a0a0a" },
  activeBannerSub: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(10,10,10,0.65)", marginTop: 1 },

  // Main white card
  card: {
    marginHorizontal: 16,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },

  // Location row
  locationRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  locationDot: { width: 10, height: 10, borderRadius: 5 },
  locationTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#6b7280" },
  allowBadge: { backgroundColor: "#00D26A", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  allowTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#0a0a0a" },

  dividerLine: { height: 1, backgroundColor: "#f3f4f6", marginHorizontal: 18 },

  // Search button
  searchBtn: {
    flexDirection: "row", alignItems: "center", gap: 14,
    marginHorizontal: 12, marginVertical: 10,
    backgroundColor: "#0f1117",
    borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14,
  },
  searchIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "#00D26A",
    alignItems: "center", justifyContent: "center",
  },
  searchTxt: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold", color: "#ffffff" },
  schedPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  schedTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.6)" },

  // Shortcuts
  shortcutRow: { flexDirection: "row", paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  shortcutCard: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#f9fafb", borderRadius: 16, padding: 12,
  },
  shortcutIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center", justifyContent: "center",
  },
  shortcutLabel: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#0a0a0a" },
  shortcutAddr: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#9ca3af", marginTop: 1 },

  // Recent section
  recentSection: {
    marginHorizontal: 16, backgroundColor: "#ffffff",
    borderRadius: 20, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 }, elevation: 6,
    paddingVertical: 6,
  },
  sectionLabel: {
    fontSize: 11, fontFamily: "Inter_700Bold", color: "#9ca3af",
    textTransform: "uppercase", letterSpacing: 1,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6,
  },
  recentRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: "#f9fafb",
  },
  recentIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "#f9fafb",
    alignItems: "center", justifyContent: "center",
  },
  recentLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#0a0a0a" },
  recentAddr: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#9ca3af", marginTop: 1 },

  // Suggestions
  suggestSection: { marginHorizontal: 16 },
  suggestScroll: { gap: 10, paddingRight: 4 },
  suggestCard: {
    width: 140, backgroundColor: "#ffffff", borderRadius: 18,
    padding: 14, gap: 4,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  statCard: { borderWidth: 1.5, borderColor: "#bbf7d0" },
  suggestIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: "#f0fdf7",
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  suggestLabel: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#0a0a0a" },
  suggestAddr: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#9ca3af", lineHeight: 15 },
});
