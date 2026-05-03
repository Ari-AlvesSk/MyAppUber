import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { useRides } from "@/context/RideContext";
import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const { setUserId } = useRides();
  const [role, setRole] = useState<UserRole>("passenger");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [vehicleType, setVehicleType] = useState<"moto" | "car">("car");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const emailNorm = email.trim().toLowerCase();
    const phoneDigits = phone.replace(/\D/g, "");
    const cpfDigits = cpf.replace(/\D/g, "");
    if (name.trim().length < 2) return setError("Informe seu nome completo.");
    if (!emailNorm.includes("@")) return setError("E-mail inválido.");
    if (phoneDigits.length < 10) return setError("Informe um telefone válido.");
    if (cpfDigits.length !== 11) return setError("Informe um CPF válido com 11 dígitos.");
    if (password.length < 6) return setError("A senha deve ter pelo menos 6 caracteres.");
    if (role === "driver") {
      if (vehicleModel.trim().length < 2) return setError("Informe o modelo do seu veículo.");
      if (vehiclePlate.trim().length < 5) return setError("Informe a placa do veículo.");
    }
    setSubmitting(true);
    try {
      const u = await register({ role, name: name.trim(), email: emailNorm, phone: phoneDigits, cpf: cpfDigits, password, ...(role === "driver" ? { vehicleType, vehicleModel: vehicleModel.trim(), vehiclePlate: vehiclePlate.trim().toUpperCase() } : {}) });
      await setUserId(u.id);
      router.replace(u.role === "driver" ? "/(driver)/pending" : "/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível cadastrar.");
    } finally {
      setSubmitting(false);
    }
  };

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 24) : insets.top + 8;
  const bottomPad = Platform.OS === "web" ? 24 : Math.max(insets.bottom + 12, 24);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.root, { backgroundColor: colors.background }]}> 
      <ScrollView contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad, paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[styles.headline, { color: colors.foreground }]}>Crie sua conta</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>Em poucos passos você está pronto para começar.</Text>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Quero usar como</Text>
        <View style={styles.roleRow}>
          <RoleCard label="Passageiro" icon="account" active={role === "passenger"} onPress={() => setRole("passenger")} />
          <RoleCard label="Motorista" icon="steering" active={role === "driver"} onPress={() => setRole("driver")} />
        </View>
        <Field label="Nome completo" icon="user" value={name} onChange={setName} placeholder="Seu nome" autoCapitalize="words" />
        <Field label="E-mail" icon="mail" value={email} onChange={setEmail} placeholder="voce@email.com" autoCapitalize="none" keyboardType="email-address" />
        <Field label="Telefone" icon="phone" value={phone} onChange={setPhone} placeholder="(11) 90000-0000" keyboardType="phone-pad" />
        <Field label="CPF" icon="file-text" value={cpf} onChange={setCpf} placeholder="000.000.000-00" keyboardType="number-pad" />
        <Field label="Senha" icon="lock" value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" secure />
        {role === "driver" && <>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tipo de veículo</Text>
          <View style={styles.roleRow}><Chip label="Carro" active={vehicleType === "car"} onPress={() => setVehicleType("car")} /><Chip label="Moto" active={vehicleType === "moto"} onPress={() => setVehicleType("moto")} /></View>
          <Field label="Modelo do veículo" icon="truck" value={vehicleModel} onChange={setVehicleModel} placeholder="Ex: Toyota Corolla" autoCapitalize="words" />
          <Field label="Placa" icon="hash" value={vehiclePlate} onChange={setVehiclePlate} placeholder="ABC-1D23" autoCapitalize="characters" />
        </>}
        {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
        <PrimaryButton label="Criar conta" variant="accent" onPress={handleSubmit} loading={submitting} />
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>Já tem conta? <Link href="/login" style={{ color: colors.accent }}>Entrar</Link></Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RoleCard({ label, icon, active, onPress }: { label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; active: boolean; onPress: () => void; }) { const colors = useColors(); return <Pressable onPress={onPress} style={[styles.roleCard, { backgroundColor: active ? colors.foreground : colors.card }]}><MaterialCommunityIcons name={icon} size={20} color={active ? colors.background : colors.foreground} /><Text style={{ color: active ? colors.background : colors.foreground }}>{label}</Text></Pressable>; }
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void; }) { const colors = useColors(); return <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: active ? colors.foreground : colors.card }]}><Text style={{ color: active ? colors.background : colors.foreground }}>{label}</Text></Pressable>; }
function Field({ label, icon, value, onChange, placeholder, secure, keyboardType, autoCapitalize }: any) { const colors = useColors(); return <><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text><View style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name={icon} size={16} color={colors.mutedForeground} /><TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} secureTextEntry={secure} keyboardType={keyboardType} autoCapitalize={autoCapitalize} style={[styles.inputTxt, { color: colors.foreground }]} /></View></>; }
const styles = StyleSheet.create({ root: { flex: 1 }, headline: { fontSize: 30, fontWeight: "800" }, sub: { marginTop: 8, marginBottom: 18 }, fieldLabel: { marginTop: 14, marginBottom: 8 }, roleRow: { flexDirection: "row", gap: 12 }, roleCard: { flex: 1, padding: 18, borderRadius: 18, alignItems: "center", gap: 8 }, chip: { flex: 1, padding: 14, borderRadius: 14, alignItems: "center" }, input: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 }, inputTxt: { flex: 1 }, error: { marginTop: 6, marginBottom: 10 }, footer: { marginTop: 18, textAlign: "center" } });
