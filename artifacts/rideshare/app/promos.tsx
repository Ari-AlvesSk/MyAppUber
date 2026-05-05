import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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

import { useColors } from "@/hooks/useColors";

type Promo = { id: string; code: string; desc: string; discount: string; expiry: string; used: boolean };

const DEFAULT_PROMOS: Promo[] = [];

export default function PromosScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [promos, setPromos] = useState<Promo[]>(DEFAULT_PROMOS);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top;

  const handleApply = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    const exists = promos.find((p) => p.code === trimmed);
    if (exists) {
      setMsg({ type: "err", text: "Este código já está na sua lista." });
      return;
    }
    const newPromo: Promo = {
      id: Date.now().toString(),
      code: trimmed,
      desc: "Desconto especial",
      discount: "15% OFF",
      expiry: "31/12/2025",
      used: false,
    };
    setPromos((prev) => [newPromo, ...prev]);
    setCode("");
    setMsg({ type: "ok", text: `Código ${trimmed} adicionado com sucesso!` });
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => setMsg(null), 3000);
  };

  const active = promos.filter((p) => !p.used);
  const used = promos.filter((p) => p.used);

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Promoções</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: colors.accent + "18", borderColor: colors.accent + "44" }]}>
          <Feather name="tag" size={22} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: colors.foreground }]}>Tem um código?</Text>
            <Text style={[styles.bannerSub, { color: colors.mutedForeground }]}>Adicione e economize na próxima corrida</Text>
          </View>
        </View>

        {/* Input */}
        <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            value={code}
            onChangeText={(t) => { setCode(t); setMsg(null); }}
            placeholder="Digite o código promocional"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground }]}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={handleApply}
          />
          <Pressable
            onPress={handleApply}
            disabled={!code.trim()}
            style={({ pressed }) => [styles.applyBtn, { backgroundColor: colors.accent, opacity: pressed || !code.trim() ? 0.6 : 1 }]}
          >
            <Text style={[styles.applyTxt, { color: colors.accentForeground }]}>Aplicar</Text>
          </Pressable>
        </View>

        {msg && (
          <View style={[styles.msgBox, { backgroundColor: msg.type === "ok" ? colors.accent + "22" : "#EF444422", borderColor: msg.type === "ok" ? colors.accent : "#EF4444" }]}>
            <Feather name={msg.type === "ok" ? "check-circle" : "alert-circle"} size={15} color={msg.type === "ok" ? colors.accent : "#EF4444"} />
            <Text style={[styles.msgTxt, { color: msg.type === "ok" ? colors.accent : "#EF4444" }]}>{msg.text}</Text>
          </View>
        )}

        {/* Ativos */}
        {active.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Disponíveis</Text>
            {active.map((p) => (
              <View key={p.id} style={[styles.promoCard, { backgroundColor: colors.card, borderColor: colors.accent + "55" }]}>
                <View style={[styles.discountBadge, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.discountTxt, { color: colors.accentForeground }]}>{p.discount}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.promoCode, { color: colors.foreground }]}>{p.code}</Text>
                  <Text style={[styles.promoDesc, { color: colors.mutedForeground }]}>{p.desc}</Text>
                  <Text style={[styles.promoExpiry, { color: colors.mutedForeground }]}>Válido até {p.expiry}</Text>
                </View>
                <Feather name="gift" size={20} color={colors.accent} />
              </View>
            ))}
          </>
        )}

        {/* Usados */}
        {used.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>Já utilizados</Text>
            {used.map((p) => (
              <View key={p.id} style={[styles.promoCard, styles.promoUsed, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <View style={[styles.discountBadge, { backgroundColor: colors.mutedForeground }]}>
                  <Text style={[styles.discountTxt, { color: colors.background }]}>{p.discount}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.promoCode, { color: colors.mutedForeground }]}>{p.code}</Text>
                  <Text style={[styles.promoDesc, { color: colors.mutedForeground }]}>{p.desc}</Text>
                </View>
                <Feather name="check" size={18} color={colors.mutedForeground} />
              </View>
            ))}
          </>
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
  banner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  bannerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  bannerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", paddingHorizontal: 14, paddingVertical: 14 },
  applyBtn: { paddingHorizontal: 18, paddingVertical: 14 },
  applyTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
  msgBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  msgTxt: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10, marginTop: 4 },
  promoCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  promoUsed: { opacity: 0.6 },
  discountBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  discountTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  promoCode: { fontSize: 15, fontFamily: "Inter_700Bold" },
  promoDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  promoExpiry: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 4 },
});
