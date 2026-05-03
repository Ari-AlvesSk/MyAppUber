import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLocation } from "@/context/LocationContext";
import { useColors } from "@/hooks/useColors";

type PickerResult = { label: string; address: string };

export let _locationPickerCallback: ((r: PickerResult) => void) | null = null;
export function registerLocationPickerCallback(fn: (r: PickerResult) => void) {
  _locationPickerCallback = fn;
}

function InteractiveMap({ address, loading }: { address: string; loading: boolean }) {
  const colors = useColors();
  const isDark = colors.background === "#0a0a0a";
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 900, easing: Easing.in(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);
  const p = isDark
    ? { base: "#0f1419", baseTo: "#1a1f26", road: "#2a313a", roadMajor: "#3a424d", park: "#16291f", water: "#13283d", building: "#1a2028", accent: "#00D26A" }
    : { base: "#eef2f5", baseTo: "#e3e8ed", road: "#ffffff", roadMajor: "#f7f9fb", park: "#cfeacb", water: "#bcd9ee", building: "#dbe2e8", accent: "#00D26A" };
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  return (
    <View style={{ height: 240, position: "relative" }}>
      <Svg width="100%" height="240" viewBox="0 0 400 240">
        <Defs><LinearGradient id="bg2" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={p.base} /><Stop offset="1" stopColor={p.baseTo} /></LinearGradient></Defs>
        <Rect x="0" y="0" width="400" height="240" fill="url(#bg2)" />
        <Path d="M 24 36 Q 90 -6 150 28 Q 200 56 152 90 Q 86 118 36 84 Q 4 66 24 36 Z" fill={p.park} opacity={0.85} />
        <Path d="M 260 160 Q 340 140 400 170 L 400 240 L 240 240 Q 250 190 260 160 Z" fill={p.water} opacity={0.85} />
        <G opacity={0.5}><Rect x="180" y="30" width="36" height="42" rx="3" fill={p.building} /><Rect x="222" y="40" width="28" height="32" rx="3" fill={p.building} /><Rect x="256" y="28" width="44" height="48" rx="3" fill={p.building} /><Rect x="60" y="130" width="40" height="30" rx="3" fill={p.building} /><Rect x="106" y="136" width="34" height="24" rx="3" fill={p.building} /></G>
        <Line x1="0" y1="100" x2="400" y2="100" stroke={p.roadMajor} strokeWidth={14} /><Line x1="0" y1="168" x2="400" y2="168" stroke={p.roadMajor} strokeWidth={10} /><Line x1="166" y1="0" x2="166" y2="240" stroke={p.roadMajor} strokeWidth={12} />
        <G stroke={p.road} strokeWidth={6} opacity={0.9}><Line x1="60" y1="0" x2="60" y2="240" /><Line x1="244" y1="0" x2="244" y2="240" /><Line x1="320" y1="0" x2="320" y2="240" /><Line x1="0" y1="60" x2="400" y2="60" /><Line x1="0" y1="200" x2="400" y2="200" /></G>
        <Circle cx="200" cy="120" r="16" fill={p.accent} opacity={0.2} /><Circle cx="200" cy="120" r="8" fill={p.accent} /><Circle cx="200" cy="120" r="3" fill="#fff" />
      </Svg>
      <Animated.View style={[styles.pulseRing, { left: "50%", top: 120, marginLeft: -24, marginTop: -24, borderColor: p.accent, transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
      <View style={[styles.addressBubble, { backgroundColor: colors.background }]}>{loading ? <ActivityIndicator size="small" color={p.accent} /> : <Feather name="map-pin" size={13} color={p.accent} />}<Text style={[styles.addressBubbleTxt, { color: colors.foreground }]} numberOfLines={1}>{loading ? "Obtendo endereço..." : address || "Localização atual"}</Text></View>
    </View>
  );
}

export default function LocationPickerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { address: gpsAddress, granted, requestPermission } = useLocation();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PickerResult[]>([]);
  const [mapAddress, setMapAddress] = useState(gpsAddress);
  const [mapLoading, setMapLoading] = useState(false);
  const [selected, setSelected] = useState<PickerResult | null>(null);
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top;
  useEffect(() => { if (gpsAddress && gpsAddress !== "Permitir localização" && gpsAddress !== "Buscando localização...") setMapAddress(gpsAddress); }, [gpsAddress]);
  const searchAddress = useCallback(async (text: string) => {
    if (text.trim().length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const raw = await Location.geocodeAsync(text + ", Brasil");
      const found: PickerResult[] = [];
      for (const r of raw.slice(0, 6)) {
        const rev = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
        const rr = rev[0];
        if (rr) found.push({ label: [rr.street, rr.district ?? rr.subregion].filter(Boolean).join(", ") || text, address: [rr.district ?? rr.subregion, rr.city, rr.region].filter(Boolean).join(", ") });
      }
      setResults(found.length > 0 ? found : [{ label: text, address: "Brasil" }]);
    } catch { setResults([{ label: text, address: "Endereço digitado" }]); } finally { setSearching(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => { if (query.trim()) searchAddress(query); else setResults([]); }, 600); return () => clearTimeout(timer); }, [query, searchAddress]);
  const selectResult = (result: PickerResult) => { if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); setSelected(result); setMapAddress(result.address); };
  const confirmSelection = () => { if (!selected) return; if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); _locationPickerCallback?.(selected); router.back(); };
  const useGps = async () => {
    if (!granted) { const ok = await requestPermission(); if (!ok) return; }
    setMapLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const rev = await Location.reverseGeocodeAsync(pos.coords);
      const r = rev[0];
      const result = r ? { label: "Localização atual", address: [r.district ?? r.subregion, r.city, r.region].filter(Boolean).join(", ") } : { label: "Localização atual", address: gpsAddress };
      setSelected(result); setMapAddress(result.address);
    } catch { if (gpsAddress) { const result = { label: "Localização atual", address: gpsAddress }; setSelected(result); setMapAddress(result.address); } } finally { setMapLoading(false); }
  };
  return (<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.root, { backgroundColor: colors.background }]}><View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}><Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.6 : 1 }]}><Feather name="arrow-left" size={20} color={colors.foreground} /></Pressable><Text style={[styles.headerTitle, { color: colors.foreground }]}>Escolher localização</Text><View style={{ width: 40 }} /></View><View style={[styles.mapWrap, { borderBottomColor: colors.border }]}><InteractiveMap address={mapAddress} loading={mapLoading} /><Pressable onPress={confirmSelection} disabled={!selected} style={({ pressed }) => [styles.selectMapBtn, { backgroundColor: selected ? colors.accent : colors.muted, opacity: pressed || !selected ? 0.8 : 1 }]}><Feather name="check" size={16} color={selected ? colors.accentForeground : colors.mutedForeground} /><Text style={[styles.selectMapTxt, { color: selected ? colors.accentForeground : colors.mutedForeground }]}>Selecionar</Text></Pressable></View><View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="search" size={16} color={colors.mutedForeground} /><TextInput value={query} onChangeText={setQuery} placeholder="Digite um endereço ou bairro..." placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} autoFocus returnKeyType="search" />{searching && <ActivityIndicator size="small" color={colors.accent} />}{query.length > 0 && !searching && <Pressable onPress={() => { setQuery(""); setResults([]); }}><Feather name="x" size={16} color={colors.mutedForeground} /></Pressable>}</View><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}><Pressable onPress={useGps} style={({ pressed }) => [styles.gpsRow, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}><View style={[styles.gpsIcon, { backgroundColor: colors.accent + "22" }]}>{mapLoading ? <ActivityIndicator size="small" color={colors.accent} /> : <Feather name="navigation" size={18} color={colors.accent} />}</View><View><Text style={[styles.gpsLabel, { color: colors.accent }]}>Usar localização atual</Text><Text style={[styles.gpsSub, { color: colors.mutedForeground }]}>{gpsAddress && gpsAddress !== "Permitir localização" ? gpsAddress : "Permitir acesso ao GPS"}</Text></View></Pressable>{results.length > 0 && <View><Text style={[styles.resultTitle, { color: colors.mutedForeground }]}>RESULTADOS</Text>{results.map((r, i) => (<Pressable key={i} onPress={() => selectResult(r)} style={({ pressed }) => [styles.resultRow, { borderBottomColor: colors.border, backgroundColor: pressed ? colors.muted : "transparent" }]}><View style={[styles.resultIcon, { backgroundColor: colors.muted }]}><Feather name="map-pin" size={16} color={colors.foreground} /></View><View style={{ flex: 1 }}><Text style={[styles.resultLabel, { color: colors.foreground }]} numberOfLines={1}>{r.label}</Text><Text style={[styles.resultAddress, { color: colors.mutedForeground }]} numberOfLines={1}>{r.address}</Text></View><Feather name="chevron-right" size={16} color={colors.mutedForeground} /></Pressable>))}</View>}{query.length === 0 && results.length === 0 && <View style={styles.hint}><Feather name="info" size={18} color={colors.mutedForeground} /><Text style={[styles.hintTxt, { color: colors.mutedForeground }]}>Toque no mapa, selecione um endereço e confirme em Selecionar</Text></View>}</ScrollView></KeyboardAvoidingView>);
}

const styles = StyleSheet.create({ root: { flex: 1 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 }, iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" }, mapWrap: { borderBottomWidth: 1, overflow: "hidden" }, pulseRing: { position: "absolute", width: 48, height: 48, borderRadius: 24, borderWidth: 2 }, addressBubble: { position: "absolute", bottom: 14, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, elevation: 4, maxWidth: "80%" }, addressBubbleTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold", flexShrink: 1 }, selectMapBtn: { position: "absolute", right: 14, bottom: 14, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 }, selectMapTxt: { fontSize: 12, fontFamily: "Inter_700Bold" }, searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20, marginVertical: 14, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1 }, searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", paddingVertical: 0 }, gpsRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 }, gpsIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, gpsLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" }, gpsSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 }, resultTitle: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.2, textTransform: "uppercase", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }, resultRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 }, resultIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }, resultLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" }, resultAddress: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 }, hint: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 20, paddingTop: 28 }, hintTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 } });
