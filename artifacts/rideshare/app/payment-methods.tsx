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

type PixType = "cpf" | "telefone" | "email" | "aleatoria";
const PIX_TYPES: { key: PixType; label: string }[] = [
  { key: "cpf", label: "CPF" },
  { key: "telefone", label: "Telefone" },
  { key: "email", label: "E-mail" },
  { key: "aleatoria", label: "Chave aleatória" },
];

export default function PaymentMethodsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { payments, defaultPaymentId, setDefaultPayment, addPaymentMethod, removePaymentMethod } = useRides();

  const [showAdd, setShowAdd] = useState(false);
  const [pixType, setPixType] = useState<PixType>("cpf");
  const [pixKey, setPixKey] = useState("");
  const [saving, setSaving] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top;

  const baseIds = ["pix", "cash"];

  const handleAdd = async () => {
    if (!pixKey.trim()) return;
    setSaving(true);
    const label = pixType === "cpf" ? "Pix (CPF)"
      : pixType === "telefone" ? "Pix (Telefone)"
      : pixType === "email" ? "Pix (E-mail)"
      : "Pix (Chave aleatória)";
    await addPaymentMethod({ type: "wallet", label, detail: pixKey.trim() });
    setSaving(false);
    setPixKey("");
    setShowAdd(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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

  const placeholders: Record<PixType, string> = {
    cpf: "000.000.000-00",
    telefone: "+55 11 90000-0000",
    email: "voce@email.com",
    aleatoria: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Formas de pagamento</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {/* Lista */}
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
                <View style={[styles.methodIcon, { backgroundColor: p.id === "pix" || p.type === "wallet" ? "#00D26A22" : colors.muted }]}>
                  <Feather
                    name={p.id === "cash" ? "dollar-sign" : "zap"}
                    size={16}
                    color={p.id === "cash" ? colors.foreground : colors.accent}
                  />
                </View>
                <Pressable style={{ flex: 1 }} onPress={() => { if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); setDefaultPayment(p.id); }}>
                  <Text style={[styles.methodLabel, { color: colors.foreground }]}>{p.label}</Text>
                  <Text style={[styles.methodDetail, { color: colors.mutedForeground }]}>{p.detail}</Text>
                </Pressable>
                {isDefault ? (
                  <View style={[styles.defaultPill, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.defaultTxt, { color: colors.accentForeground }]}>Padrão</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setDefaultPayment(p.id)}
                    style={({ pressed }) => [styles.radioBtn, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
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

        {/* Adicionar Pix */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Adicionar chave Pix</Text>
        {!showAdd ? (
          <Pressable
            onPress={() => setShowAdd(true)}
            style={({ pressed }) => [
              styles.addBtn,
              { borderColor: colors.accent, backgroundColor: colors.accent + "11", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="plus" size={18} color={colors.accent} />
            <Text style={[styles.addBtnTxt, { color: colors.accent }]}>Adicionar chave Pix</Text>
          </Pressable>
        ) : (
          <View style={[styles.addForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Tipo de chave */}
            <Text style={[styles.label, { color: colors.mutedForeground }]}>TIPO DE CHAVE</Text>
            <View style={styles.typeRow}>
              {PIX_TYPES.map((t) => (
                <Pressable
                  key={t.key}
                  onPress={() => setPixType(t.key)}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: pixType === t.key ? colors.accent : colors.muted,
                      borderColor: pixType === t.key ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.typeTxt, { color: pixType === t.key ? colors.accentForeground : colors.foreground }]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}>CHAVE PIX</Text>
            <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Feather name="zap" size={16} color={colors.mutedForeground} />
              <TextInput
                value={pixKey}
                onChangeText={setPixKey}
                placeholder={placeholders[pixType]}
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground }]}
                autoCapitalize="none"
                keyboardType={pixType === "telefone" ? "phone-pad" : "default"}
              />
            </View>

            <View style={styles.formBtns}>
              <Pressable
                onPress={() => { setShowAdd(false); setPixKey(""); }}
                style={({ pressed }) => [styles.cancelBtn, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.cancelTxt, { color: colors.foreground }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleAdd}
                disabled={!pixKey.trim() || saving}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  { backgroundColor: colors.accent, opacity: pressed || !pixKey.trim() || saving ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.confirmTxt, { color: colors.accentForeground }]}>
                  {saving ? "Adicionando..." : "Adicionar"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  content: { padding: 20, gap: 0 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10, marginTop: 8 },
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
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed" },
  addBtnTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  addForm: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 4 },
  label: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  typeTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inputBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", paddingVertical: 0 },
  formBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  cancelTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  confirmBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12 },
  confirmTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
