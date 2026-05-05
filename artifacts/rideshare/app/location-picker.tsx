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
import { SAVED_PLACES, SUGGESTED_PLACES } from "@/data/mock";

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

  // ── Nominatim helpers (much more accurate than expo-location geocoding on web) ──

  const nominatimReverse = useCallback(async (lat: number, lng: number): Promise<{ label: string; address: string }> => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=pt-BR`;
    const res = await fetch(url, { headers: { "User-Agent": "ParaunaMobi/1.0" } });
    if (!res.ok) throw new Error("nominatim error");
    const data = await res.json() as {
      address?: {
        road?: string; house_number?: string;
        suburb?: string; neighbourhood?: string; quarter?: string;
        village?: string; town?: string; city?: string; municipality?: string; county?: string;
        state?: string;
      };
    };
    const a = data.address ?? {};
    const street = [a.road, a.house_number].filter(Boolean).join(", ");
    const neighborhood = a.suburb ?? a.neighbourhood ?? a.quarter ?? "";
    const city = a.village ?? a.town ?? a.city ?? a.municipality ?? a.county ?? "Paraúna";
    const stateRaw = a.state ?? "Goiás";
    const stateAbbr = stateRaw === "Goiás" ? "GO" : stateRaw.slice(0, 2).toUpperCase();
    const label = street || neighborhood || city;
    const addrParts = [neighborhood || city, stateAbbr].filter(Boolean);
    return { label, address: addrParts.join(", ") };
  }, []);

  const handleMapTap = useCallback(async (lat: number, lng: number) => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    setReversing(true);
    try {
      const { label, address: addr } = await nominatimReverse(lat, lng);
      setSelected({ label, address: addr, lat, lng });
    } catch {
      setSelected({ label: "Local selecionado", address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
    } finally {
      setReversing(false);
    }
  }, [nominatimReverse]);

  const searchAddress = useCallback(async (text: string) => {
    if (text.trim().length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      // Viewbox ~40 km ao redor de Paraúna, GO — bounded=1 garante que só volta resultados dessa área
      const viewbox = "-50.2,-15.65,-49.35,-16.35";
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(text + " Paraúna Goiás")}&viewbox=${viewbox}&bounded=1&limit=6&accept-language=pt-BR&addressdetails=1`;
      const res = await fetch(url, { headers: { "User-Agent": "ParaunaMobi/1.0" } });
      const raw = await res.json() as Array<{
        lat: string; lon: string; display_name: string;
        address?: {
          road?: string; house_number?: string;
          suburb?: string; neighbourhood?: string; quarter?: string;
          village?: string; town?: string; city?: string; municipality?: string; county?: string;
          state?: string;
        };
      }>;

      if (raw.length === 0) {
        // Fallback sem bounded — tenta achar algo em Goiás/Brasil
        const url2 = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(text + ", Paraúna, Goiás, Brasil")}&limit=4&accept-language=pt-BR&addressdetails=1`;
        const res2 = await fetch(url2, { headers: { "User-Agent": "ParaunaMobi/1.0" } });
        const raw2 = await res2.json() as typeof raw;

        // Filtra resultados a no máximo ~60 km de Paraúna
        const PARAUNA_LAT = -16.0028;
        const PARAUNA_LNG = -49.7903;
        const nearby = raw2.filter((r) => {
          const dlat = parseFloat(r.lat) - PARAUNA_LAT;
          const dlng = parseFloat(r.lon) - PARAUNA_LNG;
          return Math.sqrt(dlat * dlat + dlng * dlng) < 0.6; // ~60 km
        });

        if (nearby.length > 0) {
          setResults(nearby.map((r) => {
            const a = r.address ?? {};
            const street = [a.road, a.house_number].filter(Boolean).join(", ");
            const neighborhood = a.suburb ?? a.neighbourhood ?? a.quarter ?? "";
            const city = a.village ?? a.town ?? a.city ?? a.municipality ?? "Paraúna";
            const stateRaw = a.state ?? "Goiás";
            const stateAbbr = stateRaw === "Goiás" ? "GO" : stateRaw.slice(0, 2).toUpperCase();
            return {
              label: street || neighborhood || city || text,
              address: [neighborhood || city, stateAbbr].filter(Boolean).join(", "),
              lat: parseFloat(r.lat),
              lng: parseFloat(r.lon),
            };
          }));
        } else {
          setResults([]);
        }
        return;
      }

      setResults(raw.map((r) => {
        const a = r.address ?? {};
        const street = [a.road, a.house_number].filter(Boolean).join(", ");
        const neighborhood = a.suburb ?? a.neighbourhood ?? a.quarter ?? "";
        const city = a.village ?? a.town ?? a.city ?? a.municipality ?? "Paraúna";
        const stateRaw = a.state ?? "Goiás";
        const stateAbbr = stateRaw === "Goiás" ? "GO" : stateRaw.slice(0, 2).toUpperCase();
        return {
          label: street || neighborhood || city || text,
          address: [neighborhood || city, stateAbbr].filter(Boolean).join(", "),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        };
      }));
    } catch {
      setResults([]);
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
      let addrStr = gpsAddress;
      try {
        const { address: nominatimAddr } = await nominatimReverse(pos.coords.latitude, pos.coords.longitude);
        addrStr = nominatimAddr || gpsAddress;
      } catch {}
      setSelected({ label: "Localização atual", address: addrStr, lat: pos.coords.latitude, lng: pos.coords.longitude });
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

        {/* Nearby suggestions when no query entered */}
        {query.trim().length === 0 && results.length === 0 && (
          <>
            <Text style={[styles.resultTitle, { color: colors.mutedForeground }]}>Perto de você</Text>
            {[...SAVED_PLACES, ...SUGGESTED_PLACES].map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                  selectResult({ label: p.label, address: p.address, lat: p.lat, lng: p.lng });
                }}
                style={({ pressed }) => [styles.resultRow, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[styles.resultIcon, { backgroundColor: "#00D26A22" }]}>
                  <Feather name={(p.icon as any) ?? "map-pin"} size={16} color="#00D26A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultLabel, { color: colors.foreground }]}>{p.label}</Text>
                  <Text style={[styles.resultAddr, { color: colors.mutedForeground }]} numberOfLines={1}>{p.address}</Text>
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
