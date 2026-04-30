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
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [role, setRole] = useState<UserRole>("passenger");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email.includes("@") || password.length < 4) {
      setError("Informe um e-mail válido e uma senha com 4+ caracteres.");
      return;
    }
    setSubmitting(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    try {
      const u = await login(role, email.trim());
      router.replace(u.role === "driver" ? "/(driver)" : "/(tabs)");
    } finally {
      setSubmitting(false);
    }
  };

  const topPad =
    Platform.OS === "web" ? Math.max(insets.top, 24) : insets.top + 8;
  const bottomPad =
    Platform.OS === "web" ? 24 : Math.max(insets.bottom + 12, 24);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad + 16,
          paddingBottom: bottomPad,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={styles.brand}>
          <View
            style={[styles.brandMark, { backgroundColor: colors.foreground }]}
          >
            <Feather
              name="navigation"
              size={20}
              color={colors.background}
              style={{ transform: [{ rotate: "-30deg" }] }}
            />
          </View>
          <Text style={[styles.brandName, { color: colors.foreground }]}>
            RideShare
          </Text>
        </View>

        <Text style={[styles.headline, { color: colors.foreground }]}>
          Bem-vindo de volta
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Entre para continuar usando o RideShare.
        </Text>

        {/* Role selector */}
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
          Entrar como
        </Text>
        <View style={styles.roleRow}>
          <RoleCard
            label="Passageiro"
            description="Pedir corridas"
            icon="account"
            active={role === "passenger"}
            onPress={() => setRole("passenger")}
          />
          <RoleCard
            label="Motorista"
            description="Aceitar corridas"
            icon="steering"
            active={role === "driver"}
            onPress={() => setRole("driver")}
          />
        </View>

        {/* Email */}
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
          E-mail
        </Text>
        <View
          style={[
            styles.input,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="mail" size={16} color={colors.mutedForeground} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="voce@email.com"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={[styles.inputTxt, { color: colors.foreground }]}
          />
        </View>

        {/* Password */}
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
          Senha
        </Text>
        <View
          style={[
            styles.input,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="lock" size={16} color={colors.mutedForeground} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={!showPassword}
            style={[styles.inputTxt, { color: colors.foreground }]}
          />
          <Pressable
            onPress={() => setShowPassword((s) => !s)}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={16}
              color={colors.mutedForeground}
            />
          </Pressable>
        </View>

        {error ? (
          <Text style={[styles.error, { color: colors.destructive }]}>
            {error}
          </Text>
        ) : null}

        <View style={{ height: 18 }} />
        <PrimaryButton
          label="Entrar"
          variant="accent"
          onPress={handleLogin}
          loading={submitting}
        />

        <Pressable
          onPress={() => {
            setEmail(
              role === "driver"
                ? "lucas@motorista.com"
                : "alex@passageiro.com",
            );
            setPassword("demo1234");
          }}
          style={({ pressed }) => [
            styles.demoBtn,
            { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Feather name="zap" size={14} color={colors.foreground} />
          <Text style={[styles.demoTxt, { color: colors.foreground }]}>
            Preencher dados de demonstração
          </Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={[styles.footerTxt, { color: colors.mutedForeground }]}>
            Ainda não tem uma conta?
          </Text>
          <Link href="/register" asChild>
            <Pressable
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={[styles.footerLink, { color: colors.accent }]}>
                Cadastre-se
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type RoleCardProps = {
  label: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  active: boolean;
  onPress: () => void;
};

function RoleCard({ label, description, icon, active, onPress }: RoleCardProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") {
          Haptics.selectionAsync().catch(() => {});
        }
        onPress();
      }}
      style={({ pressed }) => [
        styles.roleCard,
        {
          backgroundColor: active ? colors.foreground : colors.card,
          borderColor: active ? colors.foreground : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.roleIcon,
          {
            backgroundColor: active ? colors.accent : colors.muted,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={active ? colors.accentForeground : colors.foreground}
        />
      </View>
      <Text
        style={[
          styles.roleLabel,
          { color: active ? colors.background : colors.foreground },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.roleDesc,
          {
            color: active ? colors.background : colors.mutedForeground,
            opacity: active ? 0.7 : 1,
          },
        ]}
      >
        {description}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  headline: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.6,
  },
  sub: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginTop: 6,
    marginBottom: 28,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 16,
  },
  roleRow: {
    flexDirection: "row",
    gap: 12,
  },
  roleCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 8,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  roleLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  roleDesc: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  inputTxt: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    paddingVertical: 0,
  },
  error: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 12,
  },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  demoTxt: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 28,
  },
  footerTxt: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  footerLink: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
