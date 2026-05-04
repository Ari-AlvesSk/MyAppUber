import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MapCanvas } from "@/components/MapCanvas";
import { PlaceRow } from "@/components/PlaceRow";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { useRides } from "@/context/RideContext";
import { RECENT_PLACES, SAVED_PLACES, SUGGESTED_PLACES } from "@/data/mock";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeRide, rides } = useRides();
  const { user } = useAuth();
  const { address, granted, loading: locLoading, requestPermission, coords, distanceMeters } = useLocation();

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = isWeb ? 84 + 24 : insets.bottom + 88;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Boa madrugada";
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const firstName = (user?.name ?? "Passageiro").split(" ")[0];
  const avatarColor = user?.avatarColor ?? colors.foreground;
  const completedCount = rides.filter((r) => r.status === "completed").length;
  const rideDistanceOk = useMemo(() => {
    return { samePickup: false, sameDropoff: false };
  }, []);

  const handleLocationPress = async () => {
    if (!granted) {
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
      await requestPermission();
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}> 
      <ScrollView contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.greet, { color: colors.mutedForeground }]}>{greeting},</Text>
            <Text style={[styles.name, { color: colors.foreground }]}>{firstName}</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/account")} style={[styles.avatar, { backgroundColor: avatarColor }]}> 
            <Text style={[styles.avatarTxt, { color: avatarColor === colors.foreground ? colors.background : "#fff" }]}>{firstName.charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>

        <View style={[styles.mapWrap, { borderColor: colors.border, backgroundColor: colors.card }]}> 
          <MapCanvas height={220} showRoute showCar={!!activeRide} carProgress={0.54} />
          <Pressable onPress={handleLocationPress} style={[styles.mapOverlay, { backgroundColor: colors.background }]}> 
            {locLoading ? <ActivityIndicator size="small" color={colors.accent} /> : <Feather name="map-pin" size={14} color={granted === false ? colors.mutedForeground : colors.accent} />}
            <Text style={[styles.mapOverlayTxt, { color: granted === false ? colors.mutedForeground : colors.foreground }]} numberOfLines={1}>{locLoading ? "Localizando..." : address}</Text>
            {granted === false && <View style={[styles.permBadge, { backgroundColor: colors.accent }]}><Text style={[styles.permTxt, { color: colors.accentForeground }]}>Permitir</Text></View>}
          </Pressable>
        </View>

        <Pressable onPress={() => router.push("/booking")} style={({ pressed }) => [styles.searchBar, { backgroundColor: colors.foreground, opacity: pressed ? 0.85 : 1 }]}>
          <View style={[styles.searchIcon, { backgroundColor: colors.accent }]}><Feather name="search" size={16} color={colors.accentForeground} /></View>
          <Text style={[styles.searchTxt, { color: colors.background }]}>Para onde?</Text>
          <View style={[styles.nowChip, { backgroundColor: colors.background }]}><Feather name="clock" size={12} color={colors.foreground} /><Text style={[styles.nowTxt, { color: colors.foreground }]}>Agora</Text></View>
        </Pressable>

        {activeRide && (
          <View style={[styles.guideBox, { borderColor: colors.border, backgroundColor: colors.card }]}> 
            <Text style={[styles.guideTitle, { color: colors.foreground }]}>Corrida ativa</Text>
            <Text style={[styles.guideTxt, { color: colors.mutedForeground }]}>Iniciar só quando motorista e passageiro estiverem no local de origem.</Text>
            <Text style={[styles.guideTxt, { color: colors.mutedForeground }]}>Finalizar só quando o motorista estiver no destino final.</Text>
            <Text style={[styles.guideOk, { color: rideDistanceOk.samePickup ? colors.accent : colors.destructive }]}>Origem: {rideDistanceOk.samePickup ? "pronto para iniciar" : "aguarde no local"}</Text>
            <Text style={[styles.guideOk, { color: rideDistanceOk.sameDropoff ? colors.accent : colors.destructive }]}>Destino: {rideDistanceOk.sameDropoff ? "pronto para finalizar" : "vá até o destino"}</Text>
          </View>
        )}

        {activeRide && (
          <Pressable onPress={() => router.push(`/ride/${activeRide.id}`)} style={({ pressed }) => [styles.activeBanner, { backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1 }]}> 
            <View style={styles.activeLeft}><View style={[styles.dot, { backgroundColor: colors.accentForeground }]} /><View><Text style={[styles.activeTitle, { color: colors.accentForeground }]}>Corrida em andamento</Text><Text style={[styles.activeSub, { color: colors.accentForeground, opacity: 0.7 }]} numberOfLines={1}>Para {activeRide.dropoff.label}</Text></View></View>
            <Feather name="chevron-right" size={22} color={colors.accentForeground} />
          </Pressable>
        )}

        <View style={styles.section}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Locais salvos</Text><View style={styles.savedGrid}>{SAVED_PLACES.map((p) => (<Pressable key={p.id} onPress={() => router.push({ pathname: "/booking", params: { destinationId: p.id } })} style={({ pressed }) => [styles.savedCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}><View style={[styles.savedIcon, { backgroundColor: colors.background }]}><Feather name={(p.icon as keyof typeof Feather.glyphMap | undefined) ?? "map-pin"} size={18} color={colors.foreground} /></View><Text style={[styles.savedLabel, { color: colors.foreground }]}>{p.label}</Text><Text style={[styles.savedAddr, { color: colors.mutedForeground }]} numberOfLines={1}>{p.address.split("–")[0]?.trim()}</Text></Pressable>))}</View></View>

        <View style={styles.section}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recentes</Text>{RECENT_PLACES.slice(0, 4).map((p) => (<PlaceRow key={p.id} place={p} iconName="clock" onPress={() => router.push({ pathname: "/booking", params: { destinationId: p.id } })} />))}</View>

        <View style={styles.section}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Perto de você</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>{SUGGESTED_PLACES.map((p) => (<Pressable key={p.id} onPress={() => router.push({ pathname: "/booking", params: { destinationId: p.id } })} style={({ pressed }) => [styles.suggestCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}><View style={[styles.suggestIcon, { backgroundColor: colors.accent }]}><Feather name="map-pin" size={16} color={colors.accentForeground} /></View><Text style={[styles.suggestLabel, { color: colors.foreground }]}>{p.label}</Text><Text style={[styles.suggestAddr, { color: colors.mutedForeground }]} numberOfLines={2}>{p.address}</Text></Pressable>))}</ScrollView></View>

        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.statItem}><Text style={[styles.statValue, { color: colors.foreground }]}>{completedCount}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Corridas</Text></View></View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greet: { fontSize: 14, fontFamily: "Inter_500Medium" },
  name: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },
  mapWrap: { marginHorizontal: 20, borderRadius: 22, overflow: "hidden", borderWidth: 1, position: "relative" },
  mapOverlay: { position: "absolute", left: 14, right: 14, bottom: 14, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  mapOverlayTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  permBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  permTxt: { fontSize: 11, fontFamily: "Inter_700Bold" },
  searchBar: { marginHorizontal: 20, marginTop: 14, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  searchIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  searchTxt: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold" },
  nowChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  nowTxt: { fontSize: 11, fontFamily: "Inter_700Bold" },
  guideBox: { marginHorizontal: 20, marginTop: 14, borderRadius: 18, borderWidth: 1, padding: 14, gap: 6 },
  guideTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  guideTxt: { fontSize: 12, fontFamily: "Inter_500Medium" },
  guideOk: { fontSize: 12, fontFamily: "Inter_700Bold" },
  activeBanner: { marginHorizontal: 20, marginTop: 14, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  activeLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  activeTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  activeSub: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 12 },
  savedGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  savedCard: { width: "48%", borderRadius: 18, borderWidth: 1, padding: 14 },
  savedIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  savedLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  savedAddr: { marginTop: 4, fontSize: 12, fontFamily: "Inter_400Regular" },
  hScroll: { gap: 12, paddingRight: 20 },
  suggestCard: { width: 150, borderRadius: 18, borderWidth: 1, padding: 14 },
  suggestIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  suggestLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  suggestAddr: { marginTop: 4, fontSize: 12, fontFamily: "Inter_400Regular" },
  statCard: { marginHorizontal: 20, marginTop: 20, borderRadius: 20, borderWidth: 1, paddingVertical: 18, flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  divider: { width: 1, height: 32 },
});
