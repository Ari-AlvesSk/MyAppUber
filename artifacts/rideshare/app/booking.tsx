import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
import { api } from "@/utils/api";
import type { CouponValidateResult } from "@/utils/api";
import { useColors } from "@/hooks/useColors";
import type { Place, Ride, RideOption } from "@/types";

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
  const { addRide, defaultPaymentId, setDefaultPayment, payments, rides } = useRides();
  const { address, coords, loading: locLoading, requestPermission } = useLocation();

  // ── Dynamic ride options (prices from admin settings) ──
  const [rideOptions, setRideOptions] = useState<RideOption[]>(RIDE_OPTIONS);
  useEffect(() => {
    api.getPublicPaymentSettings().then((s) => {
      setRideOptions(RIDE_OPTIONS.map((o) => ({
        ...o,
        pricePerKmCents: o.tier === "moto"
          ? Math.round((s.pricePerKmMoto ?? 1.8) * 100)
          : Math.round((s.pricePerKmCar ?? 2.5) * 100),
        minPriceCents: o.tier === "moto"
          ? Math.round((s.minPriceMoto ?? 5.0) * 100)
          : Math.round((s.minPriceCar ?? 8.0) * 100),
      })));
      if (s.pixKey) setPlatformPixKey(s.pixKey);
      if (s.pixKeyType) setPlatformPixKeyType(s.pixKeyType);
    }).catch(() => {});
  }, []);

  // ── Route state ──
  const [customPickup, setCustomPickup] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(() => findPlace(params.destinationId));
  const [query, setQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState(RIDE_OPTIONS[0]!.tier);
  const [requesting, setRequesting] = useState(false);

  // ── Payment modal ──
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [tempPaymentId, setTempPaymentId] = useState<string | null>(null);

  // ── Coupon state ──
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponValidateResult | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);

  // ── Platform Pix settings ──
  const [platformPixKey, setPlatformPixKey] = useState<string>("");
  const [platformPixKeyType, setPlatformPixKeyType] = useState<string>("");

  // ── Pix payment modal ──
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [pendingRideId, setPendingRideId] = useState<string | null>(null);

  const selectedPaymentId = tempPaymentId ?? defaultPaymentId;
  const selectedPayment = payments.find((p) => p.id === selectedPaymentId) ?? payments[0];

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

  useEffect(() => {
    registerPickupCallback((result) => {
      setCustomPickup({ id: "current", label: result.label, address: result.address, lat: result.lat, lng: result.lng });
    });
    registerDestinationCallback((result) => {
      setDestination({ id: `map-${Date.now()}`, label: result.label, address: result.address, lat: result.lat, lng: result.lng });
      setQuery("");
    });
  }, []);

  useEffect(() => {
    const p = findPlace(params.destinationId);
    if (p) setDestination(p);
  }, [params.destinationId]);

  const openPickupPicker = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    router.push({ pathname: "/location-picker", params: { mode: "pickup", pickupLat: String(pickup.lat ?? -16.0028), pickupLng: String(pickup.lng ?? -49.7903) } });
  };
  const openDestinationPicker = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    router.push({ pathname: "/location-picker", params: { mode: "destination", pickupLat: String(pickup.lat ?? -16.0028), pickupLng: String(pickup.lng ?? -49.7903) } });
  };

  const filtered = useMemo(() => {
    const completedRecent = rides.filter((r) => r.status === "completed").map((r) => r.dropoff);
    const pool = [...SAVED_PLACES, ...completedRecent, ...SUGGESTED_PLACES];
    if (!query.trim()) return pool;
    const q = query.toLowerCase();
    return pool.filter((p) => p.label.toLowerCase().includes(q) || p.address.toLowerCase().includes(q));
  }, [query, rides]);

  const selectedOption = useMemo(() => rideOptions.find((o) => o.tier === selectedTier) ?? rideOptions[0]!, [selectedTier, rideOptions]);
  const distanceKm = useMemo(() => {
    if (!destination) return 0;
    if (pickup.lat != null && pickup.lng != null && destination.lat != null && destination.lng != null) {
      return haversineDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng);
    }
    return estimateDistanceKm(destination.id);
  }, [destination, pickup.lat, pickup.lng]);

  const tripDurationMin = Math.max(3, Math.round(distanceKm * 2.4));
  const basePriceCents = useMemo(
    () => computePriceCents(distanceKm, selectedOption.pricePerKmCents, selectedOption.minPriceCents),
    [distanceKm, selectedOption],
  );
  const discountCents = couponResult?.discountCents ?? 0;
  const finalPriceCents = Math.max(0, basePriceCents - discountCents);

  const handleSelectDestination = (p: Place) => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    setDestination(p);
    setQuery("");
  };

  // ── Coupon validation ──
  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    setCouponResult(null);
    try {
      const result = await api.validateCoupon(code, basePriceCents);
      setCouponResult(result);
      setCouponCode("");
      setShowCouponInput(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      setCouponError(e?.message ?? "Cupom inválido");
    }
    setCouponLoading(false);
  };

  const handleRemoveCoupon = () => {
    setCouponResult(null);
    setCouponError(null);
    setCouponCode("");
  };

  const createRideRecord = async (overrideStatus?: Ride["status"]): Promise<string> => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 6);
    const ride: Ride = {
      id,
      pickup,
      dropoff: destination!,
      tier: selectedOption.tier,
      tierName: selectedOption.name,
      priceCents: finalPriceCents,
      distanceKm,
      durationMinutes: tripDurationMin,
      status: overrideStatus ?? "searching",
      driver: null,
      createdAt: Date.now(),
      completedAt: null,
    };
    await addRide(ride);
    if (tempPaymentId) await setDefaultPayment(tempPaymentId);
    return id;
  };

  const handleConfirm = async () => {
    if (!destination) return;
    setRequesting(true);

    const isPixPayment = selectedPayment?.id === "pix" || selectedPayment?.type === "wallet";

    try {
      if (isPixPayment) {
        // Cria a corrida com status awaiting_pix (aguarda confirmação do admin)
        const rideId = await createRideRecord("awaiting_pix");
        setPendingRideId(rideId);
        setRequesting(false);
        setShowPixModal(true);
        return;
      }

      // Cartão ou dinheiro: cria corrida direto
      if (selectedPayment?.type === "card" && finalPriceCents > 0) {
        // Cria a corrida, depois cobra via Stripe em background
        const rideId = await createRideRecord();
        api.createPaymentIntent({
          rideId,
          amountCents: finalPriceCents,
          paymentType: "card",
        }).catch(() => {});
        router.replace(`/ride/${rideId}`);
      } else {
        const rideId = await createRideRecord();
        router.replace(`/ride/${rideId}`);
      }
    } catch (e: any) {
      setRequesting(false);
    }
  };

  const handlePixConfirm = () => {
    setShowPixModal(false);
    if (pendingRideId) {
      router.replace(`/ride/${pendingRideId}`);
    }
  };

  const copyPixCode = () => {
    const code = platformPixKey ?? "";
    if (Platform.OS === "web") {
      try { (navigator as any).clipboard?.writeText(code); } catch {}
    } else {
      try {
        const { Clipboard } = require("react-native") as any;
        Clipboard?.setString?.(code);
      } catch {}
    }
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2500);
  };

  const topInset = Platform.OS === "web" ? Math.max(insets.top, 24) : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const showMap = !!destination && query === "";
  const payIcon = selectedPayment?.id === "pix" || selectedPayment?.type === "wallet" ? "zap" : "dollar-sign";

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topInset + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.6 : 1 }]}>
          <Feather name="x" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Planejar corrida</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 220 + bottomInset }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Route box ── */}
        <View style={[styles.routeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.routeIconCol}>
            <View style={[styles.dotGreen, { backgroundColor: colors.accent }]} />
            <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
            <View style={[styles.dotDark, { backgroundColor: colors.foreground }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Pressable onPress={openPickupPicker} style={styles.routeRow}>
              <View style={styles.pickupRow}>
                <Text style={[styles.routeLabel, { color: colors.foreground }]} numberOfLines={1}>{pickup.label}</Text>
                {locLoading && !customPickup && <ActivityIndicator size="small" color={colors.accent} />}
                <View style={[styles.editBadge, { backgroundColor: colors.accent + "20", borderColor: colors.accent + "50" }]}>
                  <Feather name="edit-2" size={10} color={colors.accent} />
                  <Text style={[styles.editBadgeTxt, { color: colors.accent }]}>Mudar</Text>
                </View>
              </View>
              <Text style={[styles.routeSub, { color: colors.mutedForeground }]} numberOfLines={1}>{pickup.address}</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Pressable onPress={openDestinationPicker} style={styles.routeRow}>
              <Text style={[styles.routeLabel, { color: destination ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                {destination?.label ?? "Selecionar destino"}
              </Text>
              <Text style={[styles.routeSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {destination?.address ?? "Toque para escolher no mapa ou buscar"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Search input ── */}
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
            <Pressable onPress={() => setQuery("")}><Feather name="x" size={16} color={colors.mutedForeground} /></Pressable>
          )}
        </View>

        {/* ── Suggestions ── */}
        {(!destination || query.length > 0) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{query ? "Resultados" : "Salvos e próximos"}</Text>
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="search" size={22} color={colors.mutedForeground} />
                <Text style={[styles.emptyTxt, { color: colors.mutedForeground }]}>Nenhum resultado para "{query}"</Text>
              </View>
            ) : (
              filtered.map((p) => <PlaceRow key={p.id} place={p} onPress={() => handleSelectDestination(p)} />)
            )}
          </View>
        )}

        {/* ── Map + ride options ── */}
        {showMap && (
          <>
            <View style={[styles.mapBox, { borderColor: colors.border }]}>
              <LeafletMap
                lat={pickup.lat ?? -16.0028} lng={pickup.lng ?? -49.7903}
                destLat={destination?.lat} destLng={destination?.lng}
                originLat={pickup.lat} originLng={pickup.lng}
                mode="destination" height={200} interactive={false} showRoute
              />
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
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Tipo de corrida</Text>
              <View style={styles.options}>
                {rideOptions.map((o) => (
                  <RideOptionRow
                    key={o.tier} option={o} distanceKm={distanceKm} selected={o.tier === selectedTier}
                    onPress={() => { if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); setSelectedTier(o.tier); }}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Bottom bar ── */}
      {destination && query === "" && (
        <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomInset + 12 }]}>

          {/* Payment method row */}
          <Pressable
            onPress={() => setShowPaymentModal(true)}
            style={({ pressed }) => [styles.payRow, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={[styles.payIconBox, { backgroundColor: selectedPayment?.id === "cash" ? colors.background : colors.accent + "22" }]}>
              <Feather name={payIcon} size={15} color={selectedPayment?.id === "cash" ? colors.foreground : colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.payTxt, { color: colors.foreground }]}>{selectedPayment?.label ?? "Pix"}</Text>
              <Text style={[styles.payDetail, { color: colors.mutedForeground }]}>{selectedPayment?.detail ?? "Transferência instantânea"}</Text>
            </View>
            <View style={[styles.changePill, { backgroundColor: colors.accent + "20" }]}>
              <Text style={[styles.changeTxt, { color: colors.accent }]}>Trocar</Text>
            </View>
          </Pressable>

          {/* Coupon row */}
          {couponResult ? (
            <View style={[styles.couponApplied, { backgroundColor: colors.accent + "15", borderColor: colors.accent + "40" }]}>
              <Feather name="tag" size={15} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.couponAppliedCode, { color: colors.accent }]}>{couponResult.code}</Text>
                <Text style={[styles.couponAppliedDesc, { color: colors.mutedForeground }]}>
                  -{formatPrice(discountCents)} de desconto
                </Text>
              </View>
              <Pressable onPress={handleRemoveCoupon} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <Feather name="x-circle" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ) : showCouponInput ? (
            <View style={[styles.couponInputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="tag" size={15} color={colors.mutedForeground} />
              <TextInput
                value={couponCode}
                onChangeText={(v) => { setCouponCode(v.toUpperCase()); setCouponError(null); }}
                placeholder="Código do cupom"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.couponInput, { color: colors.foreground }]}
                autoCapitalize="characters"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleApplyCoupon}
              />
              <Pressable
                onPress={() => { setShowCouponInput(false); setCouponCode(""); setCouponError(null); }}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
              >
                <Feather name="x" size={15} color={colors.mutedForeground} />
              </Pressable>
              <Pressable
                onPress={handleApplyCoupon}
                disabled={!couponCode.trim() || couponLoading}
                style={({ pressed }) => [styles.couponApplyBtn, { backgroundColor: colors.accent, opacity: pressed || !couponCode.trim() || couponLoading ? 0.6 : 1 }]}
              >
                {couponLoading ? <ActivityIndicator size="small" color={colors.accentForeground} /> : (
                  <Text style={[styles.couponApplyTxt, { color: colors.accentForeground }]}>Aplicar</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => { setShowCouponInput(true); setCouponError(null); }}
              style={({ pressed }) => [styles.couponAddBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="tag" size={14} color={colors.mutedForeground} />
              <Text style={[styles.couponAddTxt, { color: colors.mutedForeground }]}>Adicionar cupom de desconto</Text>
              <Feather name="plus" size={14} color={colors.mutedForeground} />
            </Pressable>
          )}

          {couponError && (
            <View style={[styles.couponErrRow, { backgroundColor: "#EF444415", borderColor: "#EF444440" }]}>
              <Feather name="alert-circle" size={13} color="#EF4444" />
              <Text style={[styles.couponErrTxt, { color: "#EF4444" }]}>{couponError}</Text>
            </View>
          )}

          {/* Price breakdown when discount applied */}
          {discountCents > 0 && (
            <View style={[styles.priceBreakdown, { borderColor: colors.border }]}>
              <View style={styles.priceRow}>
                <Text style={[styles.priceLbl, { color: colors.mutedForeground }]}>Subtotal</Text>
                <Text style={[styles.priceVal, { color: colors.mutedForeground }]}>{formatPrice(basePriceCents)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={[styles.priceLbl, { color: colors.accent }]}>Desconto ({couponResult?.code})</Text>
                <Text style={[styles.priceVal, { color: colors.accent }]}>-{formatPrice(discountCents)}</Text>
              </View>
            </View>
          )}

          <PrimaryButton
            label={`Confirmar ${selectedOption.name} · ${formatPrice(finalPriceCents)}`}
            variant="accent"
            onPress={handleConfirm}
            loading={requesting}
          />
        </View>
      )}

      {/* ── Pix payment modal ── */}
      <Modal visible={showPixModal} transparent animationType="slide" onRequestClose={() => setShowPixModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.pixSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 20 }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.pixHeader}>
              <View style={[styles.pixIconBox, { backgroundColor: colors.accent + "22" }]}>
                <Feather name="zap" size={26} color={colors.accent} />
              </View>
              <Text style={[styles.pixTitle, { color: colors.foreground }]}>Pagamento via Pix</Text>
              <Text style={[styles.pixSubtitle, { color: colors.mutedForeground }]}>
                Copie a chave Pix abaixo, pague pelo seu banco e clique em confirmar. O motorista só é acionado após verificação.
              </Text>
            </View>

            <View style={[styles.pixAmountBox, { backgroundColor: colors.accent + "15", borderColor: colors.accent + "40" }]}>
              <Text style={[styles.pixAmountLabel, { color: colors.accent }]}>Valor a pagar</Text>
              <Text style={[styles.pixAmount, { color: colors.accent }]}>{formatPrice(finalPriceCents)}</Text>
            </View>

            {platformPixKey ? (
              <>
                <Text style={[styles.pixKeyLabel, { color: colors.mutedForeground }]}>
                  CHAVE PIX — {platformPixKeyType.toUpperCase()}
                </Text>
                <View style={[styles.pixKeyBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <TextInput
                    value={platformPixKey}
                    editable={false}
                    selectTextOnFocus
                    style={[styles.pixKeyValue, { color: colors.foreground, flex: 1 }]}
                  />
                  <Pressable
                    onPress={copyPixCode}
                    style={({ pressed }) => [styles.pixCopyBtn, { backgroundColor: pixCopied ? colors.accent : colors.accent + "22", opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Feather name={pixCopied ? "check" : "copy"} size={15} color={pixCopied ? colors.accentForeground : colors.accent} />
                    <Text style={[styles.pixCopyTxt, { color: pixCopied ? colors.accentForeground : colors.accent }]}>
                      {pixCopied ? "Copiado!" : "Copiar"}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={[styles.pixInfoBox, { backgroundColor: "#FEF3C722", borderWidth: 1, borderColor: "#F59E0B44" }]}>
                <Feather name="alert-triangle" size={13} color="#F59E0B" />
                <Text style={[styles.pixInfoTxt, { color: "#F59E0B" }]}>
                  Chave Pix não configurada. Contate o administrador do app.
                </Text>
              </View>
            )}

            <View style={[styles.pixInfoBox, { backgroundColor: colors.muted }]}>
              <Feather name="shield" size={13} color={colors.mutedForeground} />
              <Text style={[styles.pixInfoTxt, { color: colors.mutedForeground }]}>
                Após confirmar, o pagamento será verificado pelo administrador antes de acionar o motorista.
              </Text>
            </View>

            <Pressable
              onPress={platformPixKey ? handlePixConfirm : undefined}
              style={({ pressed }) => [styles.pixConfirmBtn, {
                backgroundColor: platformPixKey ? colors.accent : colors.muted,
                opacity: pressed ? 0.85 : 1,
              }]}
            >
              <Feather name="check-circle" size={18} color={platformPixKey ? colors.accentForeground : colors.mutedForeground} />
              <Text style={[styles.pixConfirmTxt, { color: platformPixKey ? colors.accentForeground : colors.mutedForeground }]}>
                Já realizei o pagamento
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShowPixModal(false)}
              style={({ pressed }) => [styles.pixCancelBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.pixCancelTxt, { color: colors.mutedForeground }]}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Payment method modal ── */}
      <Modal visible={showPaymentModal} transparent animationType="slide" onRequestClose={() => setShowPaymentModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowPaymentModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Forma de pagamento</Text>
            {payments.map((p) => {
              const isSelected = p.id === selectedPaymentId;
              const pIcon = p.id === "pix" || p.type === "wallet" ? "zap" : "dollar-sign";
              const iconColor = p.id === "cash" ? colors.foreground : colors.accent;
              const iconBg = p.id === "cash" ? colors.muted : colors.accent + "22";
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                    setTempPaymentId(p.id);
                    setShowPaymentModal(false);
                  }}
                  style={({ pressed }) => [
                    styles.paymentOption,
                    { backgroundColor: isSelected ? colors.accent + "12" : colors.card, borderColor: isSelected ? colors.accent : colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <View style={[styles.payOptIcon, { backgroundColor: iconBg }]}>
                    <Feather name={pIcon} size={16} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.payOptLabel, { color: colors.foreground }]}>{p.label}</Text>
                    <Text style={[styles.payOptDetail, { color: colors.mutedForeground }]}>{p.detail}</Text>
                  </View>
                  {isSelected ? (
                    <View style={[styles.radioSelected, { backgroundColor: colors.accent }]}>
                      <Feather name="check" size={12} color={colors.accentForeground} />
                    </View>
                  ) : (
                    <View style={[styles.radioEmpty, { borderColor: colors.border }]} />
                  )}
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => { setShowPaymentModal(false); router.push("/payment-methods"); }}
              style={({ pressed }) => [styles.addPaymentBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="plus" size={16} color={colors.accent} />
              <Text style={[styles.addPaymentTxt, { color: colors.accent }]}>Gerenciar formas de pagamento</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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

  routeBox: { margin: 20, flexDirection: "row", gap: 14, padding: 16, borderRadius: 20, borderWidth: 1 },
  routeIconCol: { alignItems: "center", paddingTop: 8 },
  dotGreen: { width: 13, height: 13, borderRadius: 7 },
  routeLine: { width: 2, flex: 1, marginVertical: 6, minHeight: 22 },
  dotDark: { width: 13, height: 13, borderRadius: 4 },
  routeRow: { minHeight: 48, justifyContent: "center", gap: 3 },
  pickupRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  editBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  editBadgeTxt: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  routeLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  routeSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  divider: { height: 1, marginVertical: 4 },

  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 20, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", paddingVertical: 0 },

  section: { paddingHorizontal: 20, paddingBottom: 12 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10, marginTop: 8 },
  empty: { paddingVertical: 28, alignItems: "center", gap: 8 },
  emptyTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  options: { gap: 4 },

  mapBox: { marginHorizontal: 20, marginBottom: 8, borderRadius: 20, overflow: "hidden", borderWidth: 1, position: "relative" },
  tripStats: {
    position: "absolute", bottom: 12, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
  },
  tripStat: { flexDirection: "row", alignItems: "center", gap: 6 },
  tripStatTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tripStatDivider: { width: 1, height: 12 },

  // Bottom bar
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, gap: 8,
  },

  // Payment row
  payRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14 },
  payIconBox: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  payTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
  payDetail: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  changePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  changeTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Coupon
  couponAddBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderStyle: "dashed" },
  couponAddTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  couponInputRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  couponInput: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", paddingVertical: 6, letterSpacing: 0.5 },
  couponApplyBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  couponApplyTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  couponApplied: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  couponAppliedCode: { fontSize: 14, fontFamily: "Inter_700Bold" },
  couponAppliedDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  couponErrRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  couponErrTxt: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },

  // Price breakdown
  priceBreakdown: { borderRadius: 12, borderWidth: 1, padding: 10, gap: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceLbl: { fontSize: 13, fontFamily: "Inter_500Medium" },
  priceVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Pix modal
  pixSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, gap: 12 },
  pixHeader: { alignItems: "center", gap: 8, marginBottom: 4 },
  pixIconBox: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  pixTitle: { fontSize: 19, fontFamily: "Inter_700Bold", textAlign: "center" },
  pixSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  pixAmountBox: { alignItems: "center", paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  pixAmountLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  pixAmount: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  pixKeyLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.2 },
  pixKeyBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
  pixKeyType: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  pixKeyValue: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  pixCopyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  pixCopyTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  pixInfoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  pixInfoTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  pixConfirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 16 },
  pixConfirmTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },
  pixCancelBtn: { alignItems: "center", paddingVertical: 10 },
  pixCancelTxt: { fontSize: 14, fontFamily: "Inter_500Medium" },

  // Payment modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
  paymentOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5 },
  payOptIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  payOptLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  payOptDetail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  radioSelected: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  radioEmpty: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
  addPaymentBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 14, borderWidth: 1, marginTop: 4 },
  addPaymentTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
