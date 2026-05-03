import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
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

import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { useRides } from "@/context/RideContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { setUserId } = useRides();
  const [role, setRole] = useState<UserRole>("passenger");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@") || password.length < 4) {
      setError("Informe um e-mail válido e uma senha com 4+ caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      const u = await login(role, trimmed, password);
      await setUserId(u.id);
      if (u.role === "admin") router.replace("/admin");
      else if (u.role === "driver") {
        if (u.driverStatus === "pending" || u.driverStatus === "rejected") router.replace("/(driver)/pending");
        else router.replace("/(driver)");
      } else router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  };

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 24) : insets.top + 8;
  const bottomPad = Platform.OS === "web" ? 24 : Math.max(insets.bottom + 12, 24);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad, paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[styles.headline, { color: colors.foreground }]}>Bem-vindo de volta</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>Entre para continuar usando o RideShare.</Text>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Entrar como</Text>
        <View style={styles.roleRow}>
          <RoleCard label="Passageiro" description="Pedir corridas" icon="account" active={role === "passenger"} onPress={() => setRole("passenger")} />
          <RoleCard label="Motorista" description="Aceitar corridas" icon="steering" active={role === "driver"} onPress={() => setRole("driver")} />
        </View>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>E-mail</Text>
        <View style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="mail" size={16} color={colors.mutedForeground} />
          <TextInput value={email} onChangeText={setEmail} placeholder="voce@email.com" placeholderTextColor={colors.mutedForeground} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" style={[styles.inputTxt, { color: colors.foreground }]} />
        </View>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Senha</Text>
        <View style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="lock" size={16} color={colors.mutedForeground} />
          <TextInput value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={colors.mutedForeground} secureTextEntry={!showPassword} style={[styles.inputTxt, { color: colors.foreground }]} />
          <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8}><Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} /></Pressable>
        </View>
        {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
        <PrimaryButton label="Entrar" variant="accent" onPress={handleLogin} loading={submitting} />
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>Ainda não tem uma conta? <Link href="/register" style={{ color: colors.accent }}>Cadastre-se</Link></Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RoleCard({ label, description, icon, active, onPress }: { label: string; description: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; active: boolean; onPress: () => void; }) {
  const colors = useColors();
  return <Pressable onPress={onPress} style={[styles.roleCard, { backgroundColor: active ? colors.foreground : colors.card }]}><MaterialCommunityIcons name={icon} size={20} color={active ? colors.background : colors.foreground} /><View><Text style={{ color: active ? colors.background : colors.foreground, fontWeight: "700" }}>{label}</Text><Text style={{ color: active ? colors.background : colors.mutedForeground }}>{description}</Text></View></Pressable>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, headline: { fontSize: 34, fontWeight: "800" }, sub: { marginTop: 8, marginBottom: 18 }, fieldLabel: { marginTop: 14, marginBottom: 8 }, roleRow: { flexDirection: "row", gap: 12 }, roleCard: { flex: 1, padding: 18, borderRadius: 18, flexDirection: "row", gap: 12, alignItems: "center" }, input: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 }, inputTxt: { flex: 1 }, error: { marginTop: 6, marginBottom: 10 }, footer: { marginTop: 18, textAlign: "center" } });
