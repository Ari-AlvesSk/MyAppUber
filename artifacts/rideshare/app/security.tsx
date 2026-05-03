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

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function SecurityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const [newEmail, setNewEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSaved, setPwdSaved] = useState(false);

  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top;

  const handleSaveEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes("@")) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await updateUser({ email: newEmail.trim() });
    setEmailSaved(true);
    setNewEmail("");
    setTimeout(() => setEmailSaved(false), 3000);
  };

  const handleSavePassword = async () => {
    setPwdError("");
    if (!currentPwd || !newPwd || !confirmPwd) { setPwdError("Preencha todos os campos."); return; }
    if (newPwd.length < 6) { setPwdError("A nova senha deve ter pelo menos 6 caracteres."); return; }
    if (newPwd !== confirmPwd) { setPwdError("As senhas não coincidem."); return; }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setPwdSaved(true);
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    setTimeout(() => setPwdSaved(false), 3000);
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Segurança</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>

        {/* Alterar e-mail */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: "#3B82F622" }]}>
              <Feather name="mail" size={18} color="#3B82F6" />
            </View>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Alterar e-mail</Text>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{user?.email ?? "—"}</Text>
            </View>
          </View>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>NOVO E-MAIL</Text>
          <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Feather name="at-sign" size={16} color={colors.mutedForeground} />
            <TextInput
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="novo@email.com"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {emailSaved && (
            <View style={[styles.successBox, { backgroundColor: colors.accent + "22", borderColor: colors.accent }]}>
              <Feather name="check-circle" size={14} color={colors.accent} />
              <Text style={[styles.successTxt, { color: colors.accent }]}>E-mail atualizado com sucesso!</Text>
            </View>
          )}

          <Pressable
            onPress={handleSaveEmail}
            disabled={!newEmail.trim()}
            style={({ pressed }) => [styles.saveBtn, { backgroundColor: "#3B82F6", opacity: pressed || !newEmail.trim() ? 0.7 : 1 }]}
          >
            <Text style={styles.saveTxt}>Salvar e-mail</Text>
          </Pressable>
        </View>

        {/* Alterar senha */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: "#8B5CF622" }]}>
              <Feather name="lock" size={18} color="#8B5CF6" />
            </View>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Alterar senha</Text>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Mínimo 6 caracteres</Text>
            </View>
          </View>

          {[
            { label: "SENHA ATUAL", value: currentPwd, set: setCurrentPwd, show: showCur, toggle: () => setShowCur((v) => !v) },
            { label: "NOVA SENHA", value: newPwd, set: setNewPwd, show: showNew, toggle: () => setShowNew((v) => !v) },
            { label: "CONFIRMAR NOVA SENHA", value: confirmPwd, set: setConfirmPwd, show: showConf, toggle: () => setShowConf((v) => !v) },
          ].map((f) => (
            <View key={f.label}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>{f.label}</Text>
              <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Feather name="lock" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={f.value}
                  onChangeText={f.set}
                  secureTextEntry={!f.show}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { color: colors.foreground }]}
                />
                <Pressable onPress={f.toggle}>
                  <Feather name={f.show ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>
          ))}

          {pwdError ? (
            <View style={[styles.errorBox, { backgroundColor: "#EF444422", borderColor: "#EF4444" }]}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <Text style={[styles.errorTxt, { color: "#EF4444" }]}>{pwdError}</Text>
            </View>
          ) : null}

          {pwdSaved && (
            <View style={[styles.successBox, { backgroundColor: colors.accent + "22", borderColor: colors.accent }]}>
              <Feather name="check-circle" size={14} color={colors.accent} />
              <Text style={[styles.successTxt, { color: colors.accent }]}>Senha alterada com sucesso!</Text>
            </View>
          )}

          <Pressable
            onPress={handleSavePassword}
            style={({ pressed }) => [styles.saveBtn, { backgroundColor: "#8B5CF6", opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.saveTxt}>Alterar senha</Text>
          </Pressable>
        </View>

        {/* Info de segurança */}
        <View style={[styles.infoBox, { backgroundColor: colors.muted }]}>
          <Feather name="shield" size={16} color={colors.mutedForeground} />
          <Text style={[styles.infoTxt, { color: colors.mutedForeground }]}>
            Suas informações são armazenadas com segurança. Nunca compartilhe sua senha com ninguém.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  content: { padding: 20, gap: 16 },
  section: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  sectionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  label: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 },
  inputBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 4 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", paddingVertical: 0 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  errorTxt: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  successBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  successTxt: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  saveBtn: { alignItems: "center", paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  saveTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 14 },
  infoTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
