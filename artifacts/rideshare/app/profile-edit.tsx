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

const AVATAR_COLORS = [
  "#00D26A", "#3B82F6", "#8B5CF6", "#F59E0B",
  "#EF4444", "#EC4899", "#06B6D4", "#10B981",
  "#F97316", "#6366F1", "#84CC16", "#14B8A6",
];

export default function ProfileEditScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor ?? "#00D26A");
  const [saving, setSaving] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top;

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await updateUser({ name: name.trim(), phone: phone.trim(), avatarColor });
    setSaving(false);
    router.back();
  };

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Editar perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar preview */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarTxt}>{initial}</Text>
          </View>
          <Text style={[styles.avatarHint, { color: colors.mutedForeground }]}>
            Escolha uma cor para o seu avatar
          </Text>
        </View>

        {/* Color picker */}
        <View style={styles.colorGrid}>
          {AVATAR_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                setAvatarColor(c);
              }}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                avatarColor === c && styles.colorSwatchSelected,
              ]}
            >
              {avatarColor === c && (
                <Feather name="check" size={16} color="#fff" />
              )}
            </Pressable>
          ))}
        </View>

        {/* Campos */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>NOME COMPLETO</Text>
        <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="user" size={16} color={colors.mutedForeground} />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Seu nome completo"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground }]}
            autoCapitalize="words"
          />
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>TELEFONE</Text>
        <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="phone" size={16} color={colors.mutedForeground} />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+55 11 90000-0000"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground }]}
            keyboardType="phone-pad"
          />
        </View>

        <Pressable
          onPress={handleSave}
          disabled={saving || !name.trim()}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.accent, opacity: pressed || saving || !name.trim() ? 0.7 : 1 },
          ]}
        >
          <Feather name="check" size={18} color={colors.accentForeground} />
          <Text style={[styles.saveTxt, { color: colors.accentForeground }]}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  content: { padding: 24, gap: 0 },
  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarTxt: { fontSize: 38, fontFamily: "Inter_700Bold", color: "#fff" },
  avatarHint: { fontSize: 13, fontFamily: "Inter_500Medium" },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 32 },
  colorSwatch: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  colorSwatchSelected: { borderWidth: 3, borderColor: "#fff", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  label: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, marginTop: 16 },
  inputBox: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 4 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", paddingVertical: 0 },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16, borderRadius: 16, marginTop: 32,
  },
  saveTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
