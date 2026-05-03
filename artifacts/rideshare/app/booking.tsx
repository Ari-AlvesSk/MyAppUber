import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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

import { MapCanvas } from "@/components/MapCanvas";
import { PlaceRow } from "@/components/PlaceRow";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RideOptionRow } from "@/components/RideOptionRow";
import { useLocation } from "@/context/LocationContext";
import { useRides } from "@/context/RideContext";
import {
  RECENT_PLACES,
  RIDE_OPTIONS,
  SAVED_PLACES,
  SUGGESTED_PLACES,
  computePriceCents,
  estimateDistanceKm,
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
  const { addRide, defaultPaymentId, payments } = useRides();
  const { address, granted, loading: locLoading, requestPermission } = useLocation();

  const pickup = useMemo<Place>(
    () => ({
      id: "current",
      label: "Localização atual",
      address: address && address !== "Permitir localização" && address !== "Buscando localização..."
        ? address
        : "Consolação, São Paulo",
    }),
    [address],
  );

  const [destination, setDestination] = useState<Place | null>(() => findPlace(params.destinationId));
  const [query, setQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState(RIDE_OPTIONS[0]!.tier);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const p = findPlace(params.destinationId);
    if (p) setDestination(p);
  }, [params.destinationId]);

  const filtered = useMemo(() => {
    if (!query.trim()) return [...SAVED_PLACES, ...RECENT_PLACES];
    const q = query.toLowerCase();
    return ALL_PLACES.filter(
      (p) => p.label.toLowerCase().includes(q) || p.address.toLowerCase().includes(q),
    );
  }, [query]);

  const selectedOption = useMemo(
    () => RIDE_OPTIONS.find((o) => o.tier === selectedTier)!,
    [selectedTier],
  );

  const distanceKm = useMemo(
    () => (destination ? estimateDistanceKm(destination.id) : 0),
    [destination],
  );

  const tripDurationMin = Math.max(3, Math.round(distanceKm * 2.4));

  const selectedPriceCents = useMemo(
    () => computePriceCents(distanceKm, selectedOption.pricePerKmCents, selectedOption.minPriceCents),
    [distanceKm, selectedOption.pricePerKmCents, selectedOption.minPriceCents],
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
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
        {/* Campos de rota */}
        <View style={[styles.routeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.routeIconCol}>
            <View style={[styles.dot, { backgroundColor: colors.accent }]} />
            <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
            <View style={[styles.square, { backgroundColor: colors.foreground }]} />
          </View>
          <View style={{ flex: 1 }}>
            {/* Origem */}
            <Pressable
              onPress={async () => {
                if (!granted) {
                  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                  await requestPermission();
                }
              }}
              style={styles.routeRow}
            >
              <View style={styles.pickupRow}>
                <Text style={[styles.routeLabel, { color: colors.foreground }]}>{pickup.label}</Text>
                {locLoading && <ActivityIndicator size="small" color={colors.accent} />}
                {!locLoading && granted === false && (
                  <View style={[styles.locBadge, { backgroundColor: colors.accent + "22", borderColor: colors.accent + "55" }]}>
                    <Feather name="map-pin" size={11} color={colors.accent} />
                    <Text style={[styles.locBadgeTxt, { color: colors.accent }]}>Permitir acesso</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.routeSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {pickup.address}
              </Text>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Destino */}
            <View style={styles.routeRow}>
              <TextInput
                value={query !== "" ? query : destination?.label ?? ""}
                onChangeText={(t) => setQuery(t)}
                onFocus={() => { if (destination && query === "") setQuery(""); }}
                placeholder="Para onde?"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground }]}
                returnKeyType="search"
                autoFocus={!params.destinationId}
              />
              {destination ? (
                <Text style={[styles.routeSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {destination.address}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {!destination || query.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {query ? "Resultados" : "Salvos e Recentes"}
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
        ) : (
          <>
            <View style={[styles.mapBox, { borderColor: colors.border }]}>
              <MapCanvas height={200} showRoute />
              <View style={[styles.tripStats, { backgroundColor: colors.background }]}>
                <View style={styles.tripStat}>
                  <Feather name="clock" size={13} color={colors.foreground} />
                  <Text style={[styles.tripStatTxt, { color: colors.foreground }]}>{tripDurationMin} min</Text>
                </View>
                <View style={[styles.tripStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.tripStat}>
                  <Feather name="map" size={13} color={colors.foreground} />
                  <Text style={[styles.tripStatTxt, { color: colors.foreground }]}>{formatDistanceKm(distanceKm)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Escolha o tipo</Text>
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

      {destination && query === "" && (
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomInset + 12 },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.payRow,
              { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name={payIcon} size={16} color={colors.foreground} />
            <Text style={[styles.payTxt, { color: colors.foreground }]}>{defaultPayment?.label ?? "Pix"}</Text>
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
  routeBox: { margin: 20, flexDirection: "row", gap: 14, padding: 16, borderRadius: 18, borderWidth: 1 },
  routeIconCol: { alignItems: "center", paddingTop: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  routeLine: { width: 2, flex: 1, marginVertical: 6, minHeight: 22 },
  square: { width: 12, height: 12, borderRadius: 3 },
  routeRow: { minHeight: 44, justifyContent: "center", gap: 2 },
  pickupRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  locBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  locBadgeTxt: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  routeLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  routeSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  input: { fontSize: 15, fontFamily: "Inter_600SemiBold", paddingVertical: 0 },
  divider: { height: 1, marginVertical: 6 },
  section: { paddingHorizontal: 20, paddingBottom: 12 },
  sectionTitle: {
    fontSize: 13, fontFamily: "Inter_700Bold",
    textTransform: "uppercase", letterSpacing: 1.2,
    marginBottom: 10, marginTop: 4,
  },
  empty: { paddingVertical: 28, alignItems: "center", gap: 8 },
  emptyTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  mapBox: {
    marginHorizontal: 20, marginBottom: 8,
    borderRadius: 22, overflow: "hidden", borderWidth: 1, position: "relative",
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
