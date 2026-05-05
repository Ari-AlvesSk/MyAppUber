import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { PlaceRow } from "@/components/PlaceRow";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RideOptionRow } from "@/components/RideOptionRow";
import { useLocation } from "@/context/LocationContext";
import { useRides } from "@/context/RideContext";
import {
  registerPickupCallback,
  registerDestinationCallback,
} from "@/app/location-picker";
import {
  RECENT_PLACES,
  RIDE_OPTIONS,
  SAVED_PLACES,
  SUGGESTED_PLACES,
  computePriceCents,
  estimateDistanceKm,
  haversineDistanceKm,
  formatDistanceKm,
  formatPrice,
} from "@/data/mock";
import { useColors } from "@/hooks/useColors";
import type { Place, Ride } from "@/types";

const ALL_PLACES: Place[] = [...SAVED_PLACES, ...RECENT_PLACES, ...SUGGESTED_PLACES];

function findPlace(id?: string): Place | null {
  if (!id) return null;
  return ALL_PLACES.find((p) => p.id === id) ?? null;
}

export default function BookingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ destinationId?: string }>();
  const { addRide, defaultPaymentId, payments, rides } = useRides();
  const { address, coords, granted, loading: locLoading, requestPermission } = useLocation();

  // ── pickup: starts at real GPS, can be changed via map ──
  const [customPickup, setCustomPickup] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(() => findPlace(params.destinationId));
  const [query, setQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState(RIDE_OPTIONS[0]!.tier);
  const [requesting, setRequesting] = useState(false);

  // Auto-set pickup from GPS as soon as coords arrive (only once)
  const gpsSetRef = useRef(false);
  useEffect(() => {
    if (gpsSetRef.current || !coords || customPickup) return;
    gpsSetRef.current = true;
    setCustomPickup({
      id: "current",
      label: "Localização atual",
      address: address || "Paraúna, GO",
      lat: coords.latitude,
      lng: coords.longitude,
    });
  }, [coords, address, customPickup]);

  const pickup = useMemo<Place>(() => customPickup ?? {
    id: "current",
    label: "Localização atual",
    address: address || "Paraúna, GO",
    lat: coords?.latitude ?? -16.0028,
    lng: coords?.longitude ?? -49.7903,
  }, [customPickup, address, coords]);

  // Register SEPARATE callbacks — this is the fix for the bug
  useEffect(() => {
    registerPickupCallback((result) => {
      setCustomPickup({
        id: "current",
        label: result.label,
        address: result.address,
        lat: result.lat,
        lng: result.lng,
      });
    });
    registerDestinationCallback((result) => {
      setDestination({
        id: `map-${Date.now()}`,
        label: result.label,
        address: result.address,
        lat: result.lat,
        lng: result.lng,
      });
      setQuery("");
    });
  }, []);

  useEffect(() => {
    const p = findPlace(params.destinationId);
    if (p) setDestination(p);
  }, [params.destinationId]);

  const openPickupPicker = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    router.push({
      pathname: "/location-picker",
      params: {
        mode: "pickup",
        pickupLat: String(pickup.lat ?? -16.0028),
        pickupLng: String(pickup.lng ?? -49.7903),
      },
    });
  };

  const openDestinationPicker = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    router.push({
      pathname: "/location-picker",
      params: {
        mode: "destination",
        pickupLat: String(pickup.lat ?? -16.0028),
        pickupLng: String(pickup.lng ?? -49.7903),
      },
    });
  };

  const filtered = useMemo(() => {
    const completedRecent = rides
      .filter((r) => r.status === "completed")
      .map((r) => r.dropoff);
    const pool = [...SAVED_PLACES, ...completedRecent, ...SUGGESTED_PLACES];
    if (!query.trim()) return pool;
    const q = query.toLowerCase();
    return pool.filter(
      (p) => p.label.toLowerCase().includes(q) || p.address.toLowerCase().includes(q),
    );
  }, [query, rides]);

  const selectedOption = useMemo(
    () => RIDE_OPTIONS.find((o) => o.tier === selectedTier)!,
    [selectedTier],
  );
  const distanceKm = useMemo(() => {
    if (!destination) return 0;
    // Use real GPS coordinates when available
    if (
      pickup.lat != null && pickup.lng != null &&
      destination.lat != null && destination.lng != null
    ) {
      return haversineDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng);
    }
    return estimateDistanceKm(destination.id);
  }, [destination, pickup.lat, pickup.lng]);
  const tripDurationMin = Math.max(3, Math.round(distanceKm * 2.4));
  const selectedPriceCents = useMemo(
    () => computePriceCents(distanceKm, selectedOption.pricePerKmCents, selectedOption.minPriceCents),
    [distanceKm, selectedOption],
  );
  const defaultPayment = payments.find((p) => p.id === defaultPaymentId) ?? payments[0];

  const handleSelectDestination = (p: Place) => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    setDestination(p);
    setQuery("");
  };

  const handleConfirm = async () => {
    if (!destination) return;
    setRequesting(true);
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 6);
    const ride: Ride = {
      id,
      pickup,
      dropoff: destination,
      tier: selectedOption.tier,
      tierName: selectedOption.name,
      priceCents: selectedPriceCents,
      distanceKm,
      durationMinutes: tripDurationMin,
      status: "searching",
      driver: null,
      createdAt: Date.now(),
      completedAt: null,
    };
    await addRide(ride);
    router.replace(`/ride/${id}`);
  };

  const topInset = Platform.OS === "web" ? Math.max(insets.top, 24) : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const payIcon = defaultPayment?.id === "pix" ? "zap" : "dollar-sign";

  const showMap = !!destination && query === "";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topInset + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="x" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Planejar corrida</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 200 + bottomInset }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Route box ── */}
        <View style={[styles.routeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.routeIconCol}>
            <View style={[styles.dotGreen, { backgroundColor: colors.accent }]} />
            <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
            <View style={[styles.dotDark, { backgroundColor: colors.foreground }]} />
          </View>
          <View style={{ flex: 1 }}>
            {/* Pickup row */}
            <Pressable onPress={openPickupPicker} style={styles.routeRow}>
              <View style={styles.pickupRow}>
                <Text style={[styles.routeLabel, { color: colors.foreground }]} numberOfLines={1}>
                  {pickup.label}
                </Text>
                {locLoading && !customPickup && (
                  <ActivityIndicator size="small" color={colors.accent} />
                )}
                <View style={[styles.editBadge, { backgroundColor: colors.accent + "20", borderColor: colors.accent + "50" }]}>
                  <Feather name="edit-2" size={10} color={colors.accent} />
                  <Text style={[styles.editBadgeTxt, { color: colors.accent }]}>Mudar</Text>
                </View>
              </View>
              <Text style={[styles.routeSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {pickup.address}
              </Text>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Destination row */}
            <Pressable onPress={openDestinationPicker} style={styles.routeRow}>
              <Text
                style={[styles.routeLabel, { color: destination ? colors.foreground : colors.mutedForeground }]}
                numberOfLines={1}
              >
                {destination?.label ?? "Selecionar destino"}
              </Text>
              <Text style={[styles.routeSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {destination?.address ?? "Toque para escolher no mapa ou buscar"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Search input for destination ── */}
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar destino em Paraúna..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* ── Results / suggestions ── */}
        {(!destination || query.length > 0) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              {query ? "Resultados" : "Salvos e próximos"}
            </Text>
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="search" size={22} color={colors.mutedForeground} />
                <Text style={[styles.emptyTxt, { color: colors.mutedForeground }]}>
                  Nenhum resultado para "{query}"
                </Text>
              </View>
            ) : (
              filtered.map((p) => (
                <PlaceRow key={p.id} place={p} onPress={() => handleSelectDestination(p)} />
              ))
            )}
          </View>
        )}

        {/* ── Map preview + ride options (after destination selected) ── */}
        {showMap && (
          <>
            {/* Real map showing route */}
            <View style={[styles.mapBox, { borderColor: colors.border }]}>
              <LeafletMap
                lat={pickup.lat ?? -16.0028}
                lng={pickup.lng ?? -49.7903}
                destLat={destination?.lat}
                destLng={destination?.lng}
                originLat={pickup.lat}
                originLng={pickup.lng}
                mode="destination"
                height={200}
                interactive={false}
                showRoute
              />
              <View style={[styles.tripStats, { backgroundColor: colors.background }]}>
                <View style={styles.tripStat}>
                  <Feather name="clock" size={13} color={colors.foreground} />
                  <Text style={[styles.tripStatTxt, { color: colors.foreground }]}>
                    {tripDurationMin} min
                  </Text>
                </View>
                <View style={[styles.tripStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.tripStat}>
                  <Feather name="map" size={13} color={colors.foreground} />
                  <Text style={[styles.tripStatTxt, { color: colors.foreground }]}>
                    {formatDistanceKm(distanceKm)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Ride type selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Tipo de corrida</Text>
              <View style={styles.options}>
                {RIDE_OPTIONS.map((o) => (
                  <RideOptionRow
                    key={o.tier}
                    option={o}
                    distanceKm={distanceKm}
                    selected={o.tier === selectedTier}
                    onPress={() => {
                      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                      setSelectedTier(o.tier);
                    }}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Bottom bar: payment + confirm ── */}
      {destination && query === "" && (
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomInset + 12 },
          ]}
        >
          <Pressable
            style={({ pressed }) => [styles.payRow, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name={payIcon} size={16} color={colors.foreground} />
            <Text style={[styles.payTxt, { color: colors.foreground }]}>
              {defaultPayment?.label ?? "Pix"}
            </Text>
            <Text style={[styles.payDetail, { color: colors.mutedForeground }]}>
              {defaultPayment?.detail ?? "Transferência instantânea"}
            </Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
          <PrimaryButton
            label={`Confirmar ${selectedOption.name} · ${formatPrice(selectedPriceCents)}`}
            variant="accent"
            onPress={handleConfirm}
            loading={requesting}
          />
        </View>
      )}
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
  scroll: { flex: 1 },

  routeBox: {
    margin: 20, flexDirection: "row", gap: 14,
    padding: 16, borderRadius: 20, borderWidth: 1,
  },
  routeIconCol: { alignItems: "center", paddingTop: 8 },
  dotGreen: { width: 13, height: 13, borderRadius: 7 },
  routeLine: { width: 2, flex: 1, marginVertical: 6, minHeight: 22 },
  dotDark: { width: 13, height: 13, borderRadius: 4 },
  routeRow: { minHeight: 48, justifyContent: "center", gap: 3 },
  pickupRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  editBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1,
  },
  editBadgeTxt: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  routeLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  routeSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  divider: { height: 1, marginVertical: 4 },

  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 20, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 16, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", paddingVertical: 0 },

  section: { paddingHorizontal: 20, paddingBottom: 12 },
  sectionTitle: {
    fontSize: 11, fontFamily: "Inter_700Bold",
    textTransform: "uppercase", letterSpacing: 1.2,
    marginBottom: 10, marginTop: 8,
  },
  empty: { paddingVertical: 28, alignItems: "center", gap: 8 },
  emptyTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },

  mapBox: {
    marginHorizontal: 20, marginBottom: 8,
    borderRadius: 20, overflow: "hidden", borderWidth: 1, position: "relative",
  },
  tripStats: {
    position: "absolute", bottom: 12, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
  },
  tripStat: { flexDirection: "row", alignItems: "center", gap: 6 },
  tripStatTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tripStatDivider: { width: 1, height: 12 },

  options: { gap: 4 },

  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, gap: 10,
  },
  payRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
  },
  payTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  payDetail: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
});
