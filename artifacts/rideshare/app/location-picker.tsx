import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

export type PickerResult = { label: string; address: string; lat?: number; lng?: number };

// Separate callbacks for pickup vs destination — this fixes the bug
let _pickupCb: ((r: PickerResult) => void) | null = null;
let _destinationCb: ((r: PickerResult) => void) | null = null;

export function registerPickupCallback(fn: (r: PickerResult) => void) { _pickupCb = fn; }
export function registerDestinationCallback(fn: (r: PickerResult) => void) { _destinationCb = fn; }

// Legacy compat — kept so other files that import it don't break
export let _locationPickerCallback: ((r: PickerResult) => void) | null = null;
export function registerLocationPickerCallback(fn: (r: PickerResult) => void) {
  _locationPickerCallback = fn;
  _pickupCb = fn;
}

export default function LocationPickerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; pickupLat?: string; pickupLng?: string }>();
  const mode = params.mode === "destination" ? "destination" : "pickup";
  const { address: gpsAddress, granted, requestPermission, coords } = useLocation();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PickerResult[]>([]);
  const [selected, setSelected] = useState<PickerResult | null>(null);
  const [reversing, setReversing] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top;

  // For pickup mode: start centered on GPS. For destination mode: start centered on pickup location.
  const defaultLat = mode === "destination"
    ? (params.pickupLat ? parseFloat(params.pickupLat) : (coords?.latitude ?? -16.0028))
    : (coords?.latitude ?? -16.0028);
  const defaultLng = mode === "destination"
    ? (params.pickupLng ? parseFloat(params.pickupLng) : (coords?.longitude ?? -49.7903))
    : (coords?.longitude ?? -49.7903);

  // Center map on selected or default
  const mapLat = selected?.lat ?? defaultLat;
  const mapLng = selected?.lng ?? defaultLng;

  // For destination mode: show pickup as fixed origin dot
  const pickupLat = mode === "destination" && params.pickupLat ? parseFloat(params.pickupLat) : undefined;
  const pickupLng = mode === "destination" && params.pickupLng ? parseFloat(params.pickupLng) : undefined;

  const title = mode === "pickup" ? "Escolher origem" : "Escolher destino";
  const placeholder = mode === "pickup" ? "Buscar origem em Paraúna..." : "Buscar destino em Paraúna...";
  const hint = mode === "pickup" ? "Toque para mudar a origem" : "Toque para escolher o destino";

  const handleMapTap = useCallback(async (lat: number, lng: number) => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    setReversing(true);
    try {
      const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const r = rev[0];
      const label = r
        ? [r.street, r.streetNumber].filter(Boolean).join(", ") || r.district || r.city || "Local selecionado"
        : "Local selecionado";
      const addr = r
        ? [r.district ?? r.subregion, r.city, r.region].filter(Boolean).join(", ") || "Paraúna, GO"
        : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setSelected({ label, address: addr, lat, lng });
    } catch {
      setSelected({ label: "Local selecionado", address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
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
            address: [rr.district ?? rr.subregion, rr.city, rr.region].filter(Boolean).join(", ") || "Paraúna, GO",
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
            address: [r.district ?? r.subregion, r.city, r.region].filter(Boolean).join(", ") || gpsAddress,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }
        : { label: "Localização atual", address: gpsAddress, lat: pos.coords.latitude, lng: pos.coords.longitude };
      setSelected(result);
    } catch {
      if (coords) setSelected({ label: "Localização atual", address: gpsAddress, lat: coords.latitude, lng: coords.longitude });
    }
  };

  const confirmSelection = () => {
    if (!selected) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // Call the correct callback based on mode
    if (mode === "pickup") {
      _pickupCb?.(selected);
      _locationPickerCallback?.(selected);
    } else {
      _destinationCb?.(selected);
    }
    router.back();
  };

  const accentColor = mode === "pickup" ? "#00D26A" : "#0a0a0a";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.6 : 1 }]}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={[styles.modeBadge, { backgroundColor: mode === "pickup" ? "#00D26A22" : "#0a0a0a11" }]}>
            <Feather name={mode === "pickup" ? "navigation" : "map-pin"} size={12} color={accentColor} />
            <Text style={[styles.modeBadgeTxt, { color: accentColor }]}>
              {mode === "pickup" ? "ORIGEM" : "DESTINO"}
            </Text>
          </View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text>
        </View>
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
          originLat={pickupLat}
          originLng={pickupLng}
          mode={mode}
        />

        {/* Selected address bubble */}
        {(selected || reversing) && (
          <View style={[styles.addressBubble, { backgroundColor: colors.background }]}>
            {reversing
              ? <ActivityIndicator size="small" color={accentColor} />
              : <Feather name="map-pin" size={13} color={accentColor} />}
            <Text style={[styles.addressBubbleTxt, { color: colors.foreground }]} numberOfLines={1}>
              {reversing ? "Obtendo endereço…" : selected?.label}
            </Text>
          </View>
        )}

        {/* Tap hint (when nothing selected yet) */}
        {!selected && !reversing && (
          <View style={[styles.tapHint, { backgroundColor: "rgba(0,0,0,0.65)" }]}>
            <Feather name="map-pin" size={12} color={accentColor} />
            <Text style={styles.tapHintTxt}>{hint}</Text>
          </View>
        )}

        {/* Confirm button */}
        {selected && !reversing && (
          <Pressable
            onPress={confirmSelection}
            style={({ pressed }) => [styles.confirmBtn, { backgroundColor: accentColor, opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="check" size={15} color={mode === "pickup" ? "#0a0a0a" : "#ffffff"} />
            <Text style={[styles.confirmTxt, { color: mode === "pickup" ? "#0a0a0a" : "#ffffff" }]}>
              Confirmar {mode === "pickup" ? "origem" : "destino"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
          returnKeyType="search"
        />
        {searching && <ActivityIndicator size="small" color={accentColor} />}
        {query.length > 0 && !searching && (
          <Pressable onPress={() => { setQuery(""); setResults([]); }}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* GPS row */}
        <Pressable
          onPress={useGps}
          style={({ pressed }) => [styles.gpsRow, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[styles.gpsIcon, { backgroundColor: "#00D26A22" }]}>
            <Feather name="navigation" size={18} color="#00D26A" />
          </View>
          <View>
            <Text style={[styles.gpsLabel, { color: colors.foreground }]}>Usar minha localização</Text>
            <Text style={[styles.gpsSub, { color: colors.mutedForeground }]}>
              {gpsAddress || "Detectar via GPS"}
            </Text>
          </View>
        </Pressable>

        {/* Search results */}
        {results.length > 0 && (
          <>
            <Text style={[styles.resultTitle, { color: colors.mutedForeground }]}>Resultados</Text>
            {results.map((r, i) => (
              <Pressable
                key={i}
                onPress={() => selectResult(r)}
                style={({ pressed }) => [styles.resultRow, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              >
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
  headerCenter: { flex: 1, alignItems: "center", gap: 4 },
  modeBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  modeBadgeTxt: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  mapWrap: { position: "relative" },
  addressBubble: {
    position: "absolute", bottom: 54, alignSelf: "center",
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
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
  },
  confirmTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
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
