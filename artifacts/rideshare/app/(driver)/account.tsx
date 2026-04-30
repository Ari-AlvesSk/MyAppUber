import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
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
import { useColors } from "@/hooks/useColors";

const SETTINGS = [
  { id: "docs", label: "Documentos", icon: "file-text" as const },
  { id: "vehicle", label: "Veículos", icon: "truck" as const },
  { id: "tax", label: "Imposto e benefícios", icon: "briefcase" as const },
  { id: "help", label: "Ajuda e Suporte", icon: "help-circle" as const },
  { id: "legal", label: "Termos legais", icon: "shield" as const },
];

export default function DriverAccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, switchRole } = useAuth();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top + 8;
  const bottomPad = isWeb ? 84 + 24 : insets.bottom + 88;

  const firstName = (user?.name ?? "Motorista").split(" ")[0];
  const vehicleIcon: keyof typeof MaterialCommunityIcons.glyphMap =
    user?.vehicleType === "moto" ? "motorbike" : "car-side";
  const vehicleTypeLabel =
    user?.vehicleType === "moto" ? "Moto" : "Carro";

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
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
            () => {},
          );
        }
        await logout();
        router.replace("/login");
      },
      "Sair",
    );
  };

  const handleSwitchRole = () => {
    confirm(
      "Alternar para passageiro",
      "Você quer trocar para o modo passageiro?",
      async () => {
        if (Platform.OS !== "web") {
          Haptics.selectionAsync().catch(() => {});
        }
        await switchRole();
        router.replace("/(tabs)");
      },
      "Trocar",
    );
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

        {/* Profile card */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.foreground },
          ]}
        >
          <View
            style={[styles.avatar, { backgroundColor: colors.accent }]}
          >
            <Text
              style={[styles.avatarTxt, { color: colors.accentForeground }]}
            >
              {firstName.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.background }]}>
              {user?.name ?? "Motorista"}
            </Text>
            <View style={styles.ratingRow}>
              <Feather name="star" size={13} color={colors.accent} />
              <Text
                style={[
                  styles.ratingTxt,
                  { color: colors.background, opacity: 0.85 },
                ]}
              >
                4.92 · Motorista parceiro
              </Text>
            </View>
          </View>
        </View>

        {/* Vehicle card */}
        <View
          style={[
            styles.vehicleCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.vehicleIconBox,
              { backgroundColor: colors.muted },
            ]}
          >
            <MaterialCommunityIcons
              name={vehicleIcon}
              size={28}
              color={colors.foreground}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.vehicleType, { color: colors.mutedForeground }]}>
              {vehicleTypeLabel}
            </Text>
            <Text style={[styles.vehicleModel, { color: colors.foreground }]}>
              {user?.vehicleModel ?? "Não cadastrado"}
            </Text>
            <Text style={[styles.vehiclePlate, { color: colors.mutedForeground }]}>
              Placa {user?.vehiclePlate ?? "—"}
            </Text>
          </View>
        </View>

        {/* Quick info */}
        <View
          style={[
            styles.infoBlock,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.infoRow}>
            <Feather name="mail" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoTxt, { color: colors.foreground }]}>
              {user?.email ?? "—"}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Feather name="phone" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoTxt, { color: colors.foreground }]}>
              {user?.phone ?? "—"}
            </Text>
          </View>
        </View>

        {/* Switch to passenger */}
        <Pressable
          onPress={handleSwitchRole}
          style={({ pressed }) => [
            styles.switchBtn,
            {
              backgroundColor: colors.accent,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="account-switch"
            size={18}
            color={colors.accentForeground}
          />
          <Text
            style={[styles.switchTxt, { color: colors.accentForeground }]}
          >
            Alternar para modo passageiro
          </Text>
        </Pressable>

        {/* Settings */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Configurações
        </Text>
        <View
          style={[
            styles.group,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {SETTINGS.map((s, i) => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [
                styles.settingRow,
                i > 0 && {
                  borderTopColor: colors.border,
                  borderTopWidth: 1,
                },
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <View
                style={[
                  styles.settingIcon,
                  { backgroundColor: colors.muted },
                ]}
              >
                <Feather name={s.icon} size={16} color={colors.foreground} />
              </View>
              <Text
                style={[styles.settingLabel, { color: colors.foreground }]}
              >
                {s.label}
              </Text>
              <Feather
                name="chevron-right"
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.signOut,
            {
              borderColor: colors.border,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.signOutTxt, { color: colors.destructive }]}>
            Sair da conta
          </Text>
        </Pressable>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>
          RideShare Motorista · v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.6,
    marginBottom: 18,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 22,
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  profileName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ratingTxt: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
  },
  vehicleIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleType: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  vehicleModel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  vehiclePlate: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  infoBlock: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 4,
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  infoTxt: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
  },
  switchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 24,
  },
  switchTxt: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },
  group: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  signOutTxt: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
