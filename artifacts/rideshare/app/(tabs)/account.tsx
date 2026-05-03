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

type SettingItem = {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  value?: string;
  route: string;
  tint?: string;
};

const SETTINGS: SettingItem[] = [
  { id: "promos", label: "Promoções", icon: "tag", route: "/promos", tint: "#F59E0B" },
  { id: "safety", label: "Segurança", icon: "shield", route: "/security", tint: "#3B82F6" },
  { id: "language", label: "Idioma", icon: "globe", value: "Português", route: "/legal" },
  { id: "notifs", label: "Notificações", icon: "bell", route: "/notifications", tint: "#8B5CF6" },
  { id: "help", label: "Ajuda e Suporte", icon: "help-circle", route: "/help" },
  { id: "legal", label: "Termos legais", icon: "file-text", route: "/legal" },
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
  const avatarColor = user?.avatarColor ?? colors.accent;

  const press = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  };

  const handleLogout = () => {
    const doLogout = async () => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      await logout();
      router.replace("/login");
    };
    if (Platform.OS === "web") {
      if (window.confirm("Sair da conta\n\nTem certeza que deseja sair?")) doLogout();
    } else {
      Alert.alert("Sair da conta", "Tem certeza que deseja sair?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  const defaultPayment = payments.find((p) => p.id === defaultPaymentId) ?? payments[0];
  const payIcon = defaultPayment?.id === "pix" ? "zap" : "dollar-sign";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Conta</Text>

        {/* Cartão de perfil — clicável para editar */}
        <Pressable
          onPress={() => { press(); router.push("/profile-edit"); }}
          style={({ pressed }) => [
            styles.profileCard,
            { backgroundColor: colors.foreground, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={[styles.avatarTxt, { color: "#fff" }]}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.background }]}>{displayName}</Text>
            <View style={styles.ratingRow}>
              <Feather name="star" size={13} color={colors.accent} />
              <Text style={[styles.ratingTxt, { color: colors.background, opacity: 0.85 }]}>
                4,96 · Nível Ouro
              </Text>
            </View>
          </View>
          <View style={[styles.editBadge, { backgroundColor: colors.background }]}>
            <Feather name="edit-2" size={13} color={colors.foreground} />
            <Text style={[styles.editBadgeTxt, { color: colors.foreground }]}>Editar</Text>
          </View>
        </Pressable>

        {/* Info */}
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
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pagamento</Text>
        <Pressable
          onPress={() => { press(); router.push("/payment-methods"); }}
          style={({ pressed }) => [
            styles.group,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={styles.paymentRow}>
            <View style={[styles.payIcon, { backgroundColor: defaultPayment?.id === "pix" ? "#00D26A22" : colors.muted }]}>
              <Feather name={payIcon} size={16} color={defaultPayment?.id === "pix" ? colors.accent : colors.foreground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.payLabel, { color: colors.foreground }]}>{defaultPayment?.label ?? "Pix"}</Text>
              <Text style={[styles.payDetail, { color: colors.mutedForeground }]}>{defaultPayment?.detail}</Text>
            </View>
            <View style={[styles.defaultPill, { backgroundColor: colors.accent }]}>
              <Text style={[styles.defaultTxt, { color: colors.accentForeground }]}>Padrão</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>
          <View style={[styles.addPayRow, { borderTopColor: colors.border }]}>
            <Feather name="plus" size={15} color={colors.accent} />
            <Text style={[styles.addPayTxt, { color: colors.accent }]}>Gerenciar formas de pagamento</Text>
          </View>
        </Pressable>

        {/* Preferências */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Preferências</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {SETTINGS.map((s, i) => (
            <Pressable
              key={s.id}
              onPress={() => { press(); router.push(s.route as any); }}
              style={({ pressed }) => [
                styles.settingRow,
                i > 0 && { borderTopColor: colors.border, borderTopWidth: 1 },
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <View style={[styles.settingIcon, { backgroundColor: s.tint ? s.tint + "22" : colors.muted }]}>
                <Feather name={s.icon} size={16} color={s.tint ?? colors.foreground} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>{s.label}</Text>
              {s.value && (
                <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{s.value}</Text>
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

        <Text style={[styles.version, { color: colors.mutedForeground }]}>RideShare · v1.0.0</Text>
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
  editBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  editBadgeTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  infoBlock: { borderRadius: 18, borderWidth: 1, padding: 4, marginBottom: 24 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  infoTxt: { fontSize: 14, fontFamily: "Inter_500Medium" },
  divider: { height: 1, marginHorizontal: 14 },
  sectionTitle: {
    fontSize: 13, fontFamily: "Inter_700Bold",
    textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10, marginTop: 4,
  },
  group: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 24 },
  paymentRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  payIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  payLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  payDetail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  defaultPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  defaultTxt: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  addPayRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1,
  },
  addPayTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
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
