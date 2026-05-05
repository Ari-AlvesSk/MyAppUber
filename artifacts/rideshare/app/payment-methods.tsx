import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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

import { useRides } from "@/context/RideContext";
import { useColors } from "@/hooks/useColors";
import type { PaymentMethod } from "@/types";

function formatCardNumber(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function detectBrand(num: string): string {
  const d = num.replace(/\s/g, "");
  if (d.startsWith("4")) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "Mastercard";
  if (d.startsWith("3")) return "Amex";
  if (/^(636368|438935|504175|451416|509048)/.test(d)) return "Elo";
  return "Cartão";
}

export default function PaymentMethodsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { payments, defaultPaymentId, setDefaultPayment, addPaymentMethod, removePaymentMethod } = useRides();

  const [showAdd, setShowAdd] = useState(false);

  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [saving, setSaving] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top;
  const baseIds = ["pix", "cash"];

  const cardBrand = detectBrand(cardNumber);
  const cardLast4 = cardNumber.replace(/\s/g, "").slice(-4);
  const isCardValid =
    cardNumber.replace(/\s/g, "").length === 16 &&
    cardHolder.trim().length > 0 &&
    cardExpiry.length === 5;

  const handleAddCard = async () => {
    if (!isCardValid) return;
    setSaving(true);
    const label = `${cardBrand} •••• ${cardLast4}`;
    await addPaymentMethod({ type: "card", label, detail: cardHolder.trim() });
    setSaving(false);
    setCardNumber("");
    setCardHolder("");
    setCardExpiry("");
    setShowAdd(false);
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const handleRemove = (p: PaymentMethod) => {
    const doRemove = () => removePaymentMethod(p.id);
    if (Platform.OS === "web") {
      if (window.confirm(`Remover ${p.label}?`)) doRemove();
    } else {
      Alert.alert("Remover método", `Remover ${p.label}?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Remover", style: "destructive", onPress: doRemove },
      ]);
    }
  };

  const methodIcon = (p: PaymentMethod): any => {
    if (p.type === "card") return "credit-card";
    if (p.id === "cash") return "dollar-sign";
    return "zap";
  };
  const methodIconColor = (p: PaymentMethod) => {
    if (p.type === "card") return "#7C3AED";
    if (p.id === "cash") return colors.foreground;
    return colors.accent;
  };
  const methodIconBg = (p: PaymentMethod) => {
    if (p.type === "card") return "#7C3AED22";
    if (p.id === "cash") return colors.muted;
    return colors.accent + "22";
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: colors.muted, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Formas de pagamento</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Lista de métodos ── */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Seus métodos</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {payments.map((p, i) => {
            const isDefault = p.id === defaultPaymentId;
            const isBase = baseIds.includes(p.id);
            return (
              <View
                key={p.id}
                style={[
                  styles.methodRow,
                  i > 0 && { borderTopColor: colors.border, borderTopWidth: 1 },
                ]}
              >
                <View style={[styles.methodIcon, { backgroundColor: methodIconBg(p) }]}>
                  <Feather name={methodIcon(p)} size={16} color={methodIconColor(p)} />
                </View>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                    setDefaultPayment(p.id);
                  }}
                >
                  <Text style={[styles.methodLabel, { color: colors.foreground }]}>{p.label}</Text>
                  <Text style={[styles.methodDetail, { color: colors.mutedForeground }]}>
                    {p.detail}
                  </Text>
                </Pressable>
                {isDefault ? (
                  <View style={[styles.defaultPill, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.defaultTxt, { color: colors.accentForeground }]}>
                      Padrão
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setDefaultPayment(p.id)}
                    style={({ pressed }) => [
                      styles.radioBtn,
                      { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <Text style={[styles.radioTxt, { color: colors.mutedForeground }]}>Usar</Text>
                  </Pressable>
                )}
                {!isBase && (
                  <Pressable
                    onPress={() => handleRemove(p)}
                    style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Feather name="trash-2" size={15} color="#EF4444" />
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Pix info banner ── */}
        <View style={[styles.pixInfoBanner, { backgroundColor: colors.accent + "12", borderColor: colors.accent + "30" }]}>
          <Feather name="zap" size={16} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.pixInfoTitle, { color: colors.accent }]}>Pix via Stripe</Text>
            <Text style={[styles.pixInfoSub, { color: colors.mutedForeground }]}>
              O Pix é gerado automaticamente pelo nosso gateway seguro (Stripe) na hora do pagamento. Se o motorista cancelar, o reembolso é automático.
            </Text>
          </View>
        </View>

        {/* ── Adicionar cartão ── */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Adicionar cartão</Text>

        {!showAdd ? (
          <Pressable
            onPress={() => setShowAdd(true)}
            style={({ pressed }) => [
              styles.addBtn,
              {
                borderColor: "#7C3AED",
                backgroundColor: "#7C3AED11",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="credit-card" size={16} color="#7C3AED" />
            <Text style={[styles.addBtnTxt, { color: "#7C3AED" }]}>Adicionar cartão de crédito/débito</Text>
          </Pressable>
        ) : (
          <View style={[styles.addForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardBrandRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather
                name="credit-card"
                size={18}
                color={cardNumber.length > 0 ? "#7C3AED" : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.cardBrandTxt,
                  { color: cardNumber.length > 0 ? "#7C3AED" : colors.mutedForeground },
                ]}
              >
                {cardNumber.length > 0 ? cardBrand : "Número do cartão"}
              </Text>
              {cardLast4.length === 4 && (
                <Text style={[styles.cardLast4, { color: colors.mutedForeground }]}>
                  •••• {cardLast4}
                </Text>
              )}
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>NÚMERO DO CARTÃO</Text>
            <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Feather name="credit-card" size={16} color={colors.mutedForeground} />
              <TextInput
                value={cardNumber}
                onChangeText={(v) => setCardNumber(formatCardNumber(v))}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground, letterSpacing: 1.5 }]}
                keyboardType="number-pad"
                maxLength={19}
              />
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 12 }]}>
              NOME DO TITULAR
            </Text>
            <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Feather name="user" size={16} color={colors.mutedForeground} />
              <TextInput
                value={cardHolder}
                onChangeText={(v) => setCardHolder(v.toUpperCase())}
                placeholder="NOME COMO NO CARTÃO"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground }]}
                autoCapitalize="characters"
              />
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 12 }]}>VALIDADE</Text>
            <View
              style={[
                styles.inputBox,
                { borderColor: colors.border, backgroundColor: colors.background, maxWidth: 140 },
              ]}
            >
              <Feather name="calendar" size={16} color={colors.mutedForeground} />
              <TextInput
                value={cardExpiry}
                onChangeText={(v) => setCardExpiry(formatExpiry(v))}
                placeholder="MM/AA"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground, letterSpacing: 1 }]}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>

            <View
              style={[
                styles.cardInfoBox,
                { backgroundColor: "#7C3AED11", borderColor: "#7C3AED30" },
              ]}
            >
              <Feather name="shield" size={13} color="#7C3AED" />
              <Text style={[styles.cardInfoTxt, { color: "#7C3AED" }]}>
                Seus dados são protegidos com criptografia via Stripe. O CVV não é armazenado.
              </Text>
            </View>

            <View style={[styles.formBtns, { marginTop: 16 }]}>
              <Pressable
                onPress={() => {
                  setShowAdd(false);
                  setCardNumber("");
                  setCardHolder("");
                  setCardExpiry("");
                }}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.cancelTxt, { color: colors.foreground }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleAddCard}
                disabled={!isCardValid || saving}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  {
                    backgroundColor: "#7C3AED",
                    opacity: pressed || saving || !isCardValid ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.confirmTxt, { color: "white" }]}>
                  {saving ? "Adicionando..." : "Adicionar cartão"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={[styles.infoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.infoTxt, { color: colors.mutedForeground }]}>
            Cartões são cobrados automaticamente ao confirmar a corrida. Pix é gerado na hora pelo Stripe.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  content: { padding: 20, gap: 0 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 8,
  },

  group: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 24 },
  methodRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 14 },
  methodIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  methodLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  methodDetail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  defaultPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  defaultTxt: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  radioBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  radioTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  deleteBtn: { padding: 6 },

  pixInfoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  pixInfoTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 3 },
  pixInfoSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginBottom: 0,
  },
  addBtnTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  addForm: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 16, paddingBottom: 0 },
  cardBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardBrandTxt: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  cardLast4: { fontSize: 12, fontFamily: "Inter_500Medium" },

  label: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
  },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", paddingVertical: 0 },

  cardInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cardInfoTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  formBtns: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginBottom: 16 },
  cancelBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  cancelTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  confirmBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12 },
  confirmTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  infoTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
