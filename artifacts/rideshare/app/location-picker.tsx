import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LeafletMap } from "@/components/LeafletMap";
import { useLocation } from "@/context/LocationContext";
import { useColors } from "@/hooks/useColors";

type PickerResult = { label: string; address: string; lat?: number; lng?: number };

export let _locationPickerCallback: ((r: PickerResult) => void) | null = null;
export function registerLocationPickerCallback(fn: (r: PickerResult) => void) {
  _locationPickerCallback = fn;
}

export default function LocationPickerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { address: gpsAddress, granted, requestPermission, coords } = useLocation();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PickerResult[]>([]);
  const [selected, setSelected] = useState<PickerResult | null>(null);
  const [tapAddress, setTapAddress] = useState<string>("");
  const [reversing, setReversing] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top;

  const mapLat = selected?.lat ?? coords?.latitude ?? -16.0028;
  const mapLng = selected?.lng ?? coords?.longitude ?? -49.7903;

  const handleMapTap = useCallback(async (lat: number, lng: number) => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    setReversing(true);
    setTapAddress("Obtendo endereço…");
    try {
      const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const r = rev[0];
      const label = r
        ? [r.street, r.streetNumber].filter(Boolean).join(", ") || r.district || r.city || "Local selecionado"
        : "Local selecionado";
      const addr = r
        ? [r.district ?? r.subregion, r.city, r.region].filter(Boolean).join(", ")
        : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      const result: PickerResult = { label, address: addr, lat, lng };
      setSelected(result);
      setTapAddress(addr);
    } catch {
      const result: PickerResult = {
        label: "Local selecionado",
        address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        lat, lng,
      };
      setSelected(result);
      setTapAddress(result.address);
    } finally {
      setReversing(false);
    }
  }, []);

  const searchAddress = useCallback(async (text: string) => {
    if (text.trim().length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const raw = await Location.geocodeAsync(text + ", Paraúna, Goiás, Brasil");
      const found: PickerResult[] = [];
      for (const r of raw.slice(0, 6)) {
        const rev = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
        const rr = rev[0];
        if (rr) {
          found.push({
            label: [rr.street, rr.streetNumber].filter(Boolean).join(", ") || rr.district || text,
            address: [rr.district ?? rr.subregion, rr.city, rr.region].filter(Boolean).join(", "),
            lat: r.latitude,
            lng: r.longitude,
          });
        }
      }
      setResults(found.length > 0 ? found : [{ label: text, address: "Paraúna, GO" }]);
    } catch {
      setResults([{ label: text, address: "Paraúna, GO" }]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) searchAddress(query);
      else setResults([]);
    }, 600);
    return () => clearTimeout(timer);
  }, [query, searchAddress]);

  const selectResult = (result: PickerResult) => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    setSelected(result);
    setQuery("");
    setResults([]);
    Keyboard.dismiss();
  };

  const useGps = async () => {
    if (!granted) {
      const ok = await requestPermission();
      if (!ok) return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const rev = await Location.reverseGeocodeAsync(pos.coords);
      const r = rev[0];
      const result: PickerResult = r
        ? {
            label: "Localização atual",
            address: [r.district ?? r.subregion, r.city, r.region].filter(Boolean).join(", "),
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }
        : { label: "Localização atual", address: gpsAddress, lat: pos.coords.latitude, lng: pos.coords.longitude };
      setSelected(result);
    } catch {
      if (gpsAddress) setSelected({ label: "Localização atual", address: gpsAddress });
    }
  };

  const confirmSelection = () => {
    if (!selected) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    _locationPickerCallback?.(selected);
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.6 : 1 }]}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Escolher localização</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Map */}
      <View style={styles.mapWrap}>
        <LeafletMap
          lat={mapLat}
          lng={mapLng}
          height={260}
          interactive
          onTap={handleMapTap}
          destLat={selected?.lat}
          destLng={selected?.lng}
        />

        {/* Address bubble */}
        {(selected || reversing) && (
          <View style={[styles.addressBubble, { backgroundColor: colors.background }]}>
            {reversing
              ? <ActivityIndicator size="small" color="#00D26A" />
              : <Feather name="map-pin" size={13} color="#00D26A" />}
            <Text style={[styles.addressBubbleTxt, { color: colors.foreground }]} numberOfLines={1}>
              {reversing ? "Obtendo endereço…" : selected?.label ?? tapAddress}
            </Text>
          </View>
        )}

        {/* Tap hint */}
        {!selected && !reversing && (
          <View style={[styles.tapHint, { backgroundColor: "rgba(0,0,0,0.65)" }]}>
            <Feather name="map-pin" size={12} color="#00D26A" />
            <Text style={styles.tapHintTxt}>Toque no mapa para selecionar</Text>
          </View>
        )}

        {/* Confirm button */}
        {selected && !reversing && (
          <Pressable onPress={confirmSelection} style={({ pressed }) => [styles.confirmBtn, { opacity: pressed ? 0.85 : 1 }]}>
            <Feather name="check" size={16} color="#0a0a0a" />
            <Text style={styles.confirmTxt}>Confirmar local</Text>
          </Pressable>
        )}
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar endereço em Paraúna..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
          returnKeyType="search"
        />
        {searching && <ActivityIndicator size="small" color="#00D26A" />}
        {query.length > 0 && !searching && (
          <Pressable onPress={() => { setQuery(""); setResults([]); }}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* GPS row */}
        <Pressable onPress={useGps} style={({ pressed }) => [styles.gpsRow, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
          <View style={[styles.gpsIcon, { backgroundColor: "#00D26A" + "22" }]}>
            <Feather name="navigation" size={18} color="#00D26A" />
          </View>
          <View>
            <Text style={[styles.gpsLabel, { color: colors.foreground }]}>Usar minha localização</Text>
            <Text style={[styles.gpsSub, { color: colors.mutedForeground }]}>Detectar via GPS</Text>
          </View>
        </Pressable>

        {/* Results */}
        {results.length > 0 && (
          <>
            <Text style={[styles.resultTitle, { color: colors.mutedForeground }]}>Resultados</Text>
            {results.map((r, i) => (
              <Pressable key={i} onPress={() => selectResult(r)} style={({ pressed }) => [styles.resultRow, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
                <View style={[styles.resultIcon, { backgroundColor: colors.muted }]}>
                  <Feather name="map-pin" size={16} color={colors.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultLabel, { color: colors.foreground }]}>{r.label}</Text>
                  <Text style={[styles.resultAddr, { color: colors.mutedForeground }]} numberOfLines={1}>{r.address}</Text>
                </View>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  mapWrap: { position: "relative" },
  addressBubble: {
    position: "absolute", bottom: 56, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
    maxWidth: "80%",
  },
  addressBubbleTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  tapHint: {
    position: "absolute", bottom: 16, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
  },
  tapHintTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#ffffff" },
  confirmBtn: {
    position: "absolute", bottom: 14, right: 14,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#00D26A",
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
  },
  confirmTxt: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#0a0a0a" },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 20, marginVertical: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 16, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", paddingVertical: 0 },
  gpsRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  gpsIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  gpsLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  gpsSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  resultTitle: {
    fontSize: 11, fontFamily: "Inter_700Bold",
    letterSpacing: 1.2, textTransform: "uppercase",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  resultRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  resultIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  resultLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  resultAddr: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
