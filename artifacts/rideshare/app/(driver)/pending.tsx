import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function PendingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, checkDriverStatus } = useAuth();

  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const handleCheck = async () => {
    setChecking(true);
    setMessage(null);
    const status = await checkDriverStatus();
    setChecking(false);
    if (status === "approved") {
      router.replace("/(driver)");
    } else if (status === "rejected") {
      setMessage(`Seu registro como motorista não foi aprovado. Motivo: ${user?.driverRejectionReason ?? "não informado"}`);
    } else {
      setMessage("Seu cadastro ainda está em análise. Aguarde.");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const firstName = (user?.name ?? "Motorista").split(" ")[0];

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.center}>
        <View style={[styles.iconWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="clock" size={40} color={colors.accent} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Cadastro em análise</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>Olá, {firstName}! Seu cadastro como motorista está sendo analisado pela nossa equipe.</Text>

        {user?.vehicleModel && (
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoRow}><Feather name="user" size={14} color={colors.mutedForeground} /><Text style={[styles.infoTxt, { color: colors.mutedForeground }]}>{user.name}</Text></View>
            <View style={styles.infoRow}><Feather name={user.vehicleType === "moto" ? "zap" : "truck"} size={14} color={colors.mutedForeground} /><Text style={[styles.infoTxt, { color: colors.mutedForeground }]}>{user.vehicleModel} · {user.vehiclePlate}</Text></View>
            <View style={styles.infoRow}><Feather name="mail" size={14} color={colors.mutedForeground} /><Text style={[styles.infoTxt, { color: colors.mutedForeground }]}>{user.email}</Text></View>
          </View>
        )}

        {message && (
          <View style={[styles.msgBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="info" size={14} color={colors.mutedForeground} />
            <Text style={[styles.msgTxt, { color: colors.mutedForeground }]}>{message}</Text>
          </View>
        )}

        <Pressable onPress={handleCheck} disabled={checking} style={({ pressed }) => [styles.checkBtn, { backgroundColor: colors.accent, opacity: pressed || checking ? 0.7 : 1 }]}>
          {checking ? <ActivityIndicator color={colors.accentForeground} /> : <><Feather name="refresh-cw" size={16} color={colors.accentForeground} /><Text style={[styles.checkTxt, { color: colors.accentForeground }]}>Verificar status</Text></>}
        </Pressable>

        <Pressable onPress={handleLogout} style={({ pressed }) => [styles.logoutBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
          <Feather name="log-out" size={16} color={colors.mutedForeground} />
          <Text style={[styles.logoutTxt, { color: colors.mutedForeground }]}>Sair</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 16 },
  iconWrap: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 8 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" },
  sub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  infoCard: { width: "100%", borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoTxt: { fontSize: 14, fontFamily: "Inter_500Medium" },
  msgBox: { width: "100%", flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14 },
  msgTxt: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 18 },
  checkBtn: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 54, borderRadius: 16, marginTop: 8 },
  checkTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },
  logoutBtn: { marginTop: 4, width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 16, borderWidth: 1 },
  logoutTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
});