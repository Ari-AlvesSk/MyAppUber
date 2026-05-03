import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useRides } from "@/context/RideContext";
import { useColors } from "@/hooks/useColors";

const SETTINGS = [
  { id: "promos", label: "Promoções", icon: "tag" as const },
  { id: "safety", label: "Segurança", icon: "shield" as const },
  { id: "language", label: "Idioma", icon: "globe" as const, value: "Português" },
  { id: "notifs", label: "Notificações", icon: "bell" as const },
  { id: "help", label: "Ajuda e Suporte", icon: "help-circle" as const },
  { id: "legal", label: "Termos legais", icon: "file-text" as const },
];

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout, user } = useAuth();
  const { payments, defaultPaymentId, setDefaultPayment } = useRides();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top + 8;
  const bottomPad = isWeb ? 84 + 24 : insets.bottom + 88;

  const displayName = user?.name ?? "Passageiro";
  const displayEmail = user?.email ?? "—";
  const displayPhone = user?.phone ?? "—";
  const firstName = displayName.split(" ")[0] ?? "";

  const confirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel = "Confirmar",
  ) => {
    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    } else {
      Alert.alert(title, message, [
        { text: "Cancelar", style: "cancel" },
        { text: confirmLabel, style: "destructive", onPress: onConfirm },
      ]);
    }
  };

  const handleLogout = () => {
    confirm(
      "Sair da conta",
      "Tem certeza que deseja sair?",
      async () => {
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }
        await logout();
        router.replace("/login");
      },
      "Sair",
    );
  };

  const handleSelectPayment = (id: string) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    setDefaultPayment(id);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingBottom: bottomPad,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Conta</Text>

        {/* Cartão de perfil */}
        <View style={[styles.profileCard, { backgroundColor: colors.foreground }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={[styles.avatarTxt, { color: colors.accentForeground }]}>
              {firstName.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.background }]}>
              {displayName}
            </Text>
            <View style={styles.ratingRow}>
              <Feather name="star" size={13} color={colors.accent} />
              <Text style={[styles.ratingTxt, { color: colors.background, opacity: 0.85 }]}>
                4,96 · Nível Ouro
              </Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.editBtn,
              { backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="edit-2" size={14} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Informações */}
        <View style={[styles.infoBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Feather name="mail" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoTxt, { color: colors.foreground }]}>{displayEmail}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Feather name="phone" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoTxt, { color: colors.foreground }]}>{displayPhone}</Text>
          </View>
        </View>

        {/* Pagamento */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Forma de pagamento
        </Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {payments.map((p, i) => {
            const isDefault = p.id === defaultPaymentId;
            return (
              <Pressable
                key={p.id}
                onPress={() => handleSelectPayment(p.id)}
                style={({ pressed }) => [
                  styles.paymentRow,
                  i > 0 && { borderTopColor: colors.border, borderTopWidth: 1 },
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <View
                  style={[
                    styles.payIcon,
                    { backgroundColor: p.id === "pix" ? "#00D26A22" : colors.muted },
                  ]}
                >
                  <Feather
                    name={p.id === "pix" ? "zap" : "dollar-sign"}
                    size={16}
                    color={p.id === "pix" ? colors.accent : colors.foreground}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.payLabel, { color: colors.foreground }]}>
                    {p.label}
                  </Text>
                  <Text style={[styles.payDetail, { color: colors.mutedForeground }]}>
                    {p.detail}
                  </Text>
                </View>
                {isDefault ? (
                  <View style={[styles.defaultPill, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.defaultTxt, { color: colors.accentForeground }]}>
                      Padrão
                    </Text>
                  </View>
                ) : (
                  <Feather name="circle" size={18} color={colors.mutedForeground} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Preferências */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Preferências</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {SETTINGS.map((s, i) => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [
                styles.settingRow,
                i > 0 && { borderTopColor: colors.border, borderTopWidth: 1 },
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <View style={[styles.settingIcon, { backgroundColor: colors.muted }]}>
                <Feather name={s.icon} size={16} color={colors.foreground} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>{s.label}</Text>
              {s.value && (
                <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>
                  {s.value}
                </Text>
              )}
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.signOut,
            { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.signOutTxt, { color: colors.destructive }]}>Sair da conta</Text>
        </Pressable>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>
          RideShare · v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -0.6, marginBottom: 18 },
  profileCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 22, marginBottom: 12,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontSize: 22, fontFamily: "Inter_700Bold" },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  ratingTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  editBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  infoBlock: { borderRadius: 18, borderWidth: 1, padding: 4, marginBottom: 24 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  infoTxt: { fontSize: 14, fontFamily: "Inter_500Medium" },
  divider: { height: 1, marginHorizontal: 14 },
  sectionTitle: {
    fontSize: 13, fontFamily: "Inter_700Bold",
    textTransform: "uppercase", letterSpacing: 1.2,
    marginBottom: 10, marginTop: 4,
  },
  group: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 24 },
  paymentRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  payIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  payLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  payDetail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  defaultPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  defaultTxt: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  settingIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  settingLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  settingValue: { fontSize: 13, fontFamily: "Inter_500Medium" },
  signOut: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16,
  },
  signOutTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  version: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular" },
});
