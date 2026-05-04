import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth, type UserRole } from "@/context/AuthContext";
import { useRides } from "@/context/RideContext";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");
const HERO_H = Math.min(SCREEN_H * 0.42, 320);

export default function LoginScreen() {
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

  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoAnim, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 120, delay: 80 }),
      Animated.timing(cardAnim, { toValue: 0, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true, delay: 160 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true, delay: 200 }),
    ]).start();

    const loop = Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 18000, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const handleLogin = async () => {
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@") || password.length < 6) {
      setError("Informe um e-mail válido e senha com ao menos 6 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      const u = await login(role, trimmed, password);
      await setUserId(u.id);
      if (u.role === "admin") router.replace("/admin");
      else if (u.role === "driver") {
        if (u.driverStatus === "pending") router.replace("/(driver)/pending");
        else if (u.driverStatus === "rejected") {
          setError(`Registro não aprovado: ${u.driverRejectionReason ?? "motivo não informado"}`);
          return;
        } else router.replace("/(driver)");
      } else {
        router.replace("/(tabs)");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = (r: UserRole) => {
    setRole(r);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  };

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── HERO ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <LinearGradient
          colors={["#0f1117", "#0a0a0a"]}
          style={StyleSheet.absoluteFill}
        />

        {/* decorative rings */}
        <Animated.View style={[styles.ringOuter, { transform: [{ rotate: spin }] }]} />
        <Animated.View style={[styles.ringMid, { transform: [{ rotate: spin }] }]} />
        <View style={styles.ringInner} />

        {/* logo badge */}
        <Animated.View style={[styles.logoBadge, {
          transform: [
            { scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
          ],
          opacity: logoAnim,
        }]}>
          <LinearGradient
            colors={["#00D26A", "#00b359"]}
            style={styles.logoBg}
          >
            <MaterialCommunityIcons name="car-side" size={38} color="#0a0a0a" />
          </LinearGradient>
          <View style={styles.logoDot} />
        </Animated.View>

        <Animated.View style={{ alignItems: "center", opacity: fadeAnim, marginTop: 18 }}>
          <Text style={styles.brandName}>Paraúna Mobi</Text>
          <View style={styles.tagRow}>
            <View style={styles.tagDot} />
            <Text style={styles.tagline}>Mobilidade em Paraúna, GO</Text>
            <View style={styles.tagDot} />
          </View>
        </Animated.View>
      </View>

      {/* ── FORM CARD ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.cardOuter}
      >
        <Animated.View style={[styles.card, { transform: [{ translateY: cardAnim }], opacity: fadeAnim }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          >
            <Text style={styles.cardTitle}>Bem-vindo de volta 👋</Text>
            <Text style={styles.cardSub}>Entre na sua conta para continuar</Text>

            {/* Role toggle */}
            <View style={styles.roleWrap}>
              <Pressable
                onPress={() => handleRoleChange("passenger")}
                style={[styles.roleTab, role === "passenger" && styles.roleTabActive]}
              >
                <MaterialCommunityIcons
                  name="account"
                  size={18}
                  color={role === "passenger" ? "#0a0a0a" : "#6b7280"}
                />
                <View>
                  <Text style={[styles.roleTabLabel, { color: role === "passenger" ? "#0a0a0a" : "#6b7280" }]}>Passageiro</Text>
                  <Text style={[styles.roleTabSub, { color: role === "passenger" ? "#374151" : "#9ca3af" }]}>Pedir corridas</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => handleRoleChange("driver")}
                style={[styles.roleTab, role === "driver" && styles.roleTabActive]}
              >
                <MaterialCommunityIcons
                  name="steering"
                  size={18}
                  color={role === "driver" ? "#0a0a0a" : "#6b7280"}
                />
                <View>
                  <Text style={[styles.roleTabLabel, { color: role === "driver" ? "#0a0a0a" : "#6b7280" }]}>Motorista</Text>
                  <Text style={[styles.roleTabSub, { color: role === "driver" ? "#374151" : "#9ca3af" }]}>Aceitar corridas</Text>
                </View>
              </Pressable>
            </View>

            {/* Email field */}
            <Text style={styles.fieldLabel}>E-mail</Text>
            <View style={styles.inputWrap}>
              <View style={styles.inputIconWrap}>
                <Feather name="mail" size={16} color="#6b7280" />
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="voce@email.com"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.inputField}
              />
            </View>

            {/* Password field */}
            <Text style={styles.fieldLabel}>Senha</Text>
            <View style={styles.inputWrap}>
              <View style={styles.inputIconWrap}>
                <Feather name="lock" size={16} color="#6b7280" />
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                style={styles.inputField}
              />
              <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={10} style={styles.eyeBtn}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={16} color="#6b7280" />
              </Pressable>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorWrap}>
                <Feather name="alert-circle" size={14} color="#ef4444" />
                <Text style={styles.errorTxt}>{error}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <Pressable
              onPress={handleLogin}
              disabled={submitting}
              style={({ pressed }) => [styles.submitBtn, { opacity: pressed || submitting ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={["#00D26A", "#00b359"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {submitting ? (
                  <Text style={styles.submitTxt}>Entrando…</Text>
                ) : (
                  <>
                    <Text style={styles.submitTxt}>Entrar</Text>
                    <Feather name="arrow-right" size={18} color="#0a0a0a" />
                  </>
                )}
              </LinearGradient>
            </Pressable>

            {/* Register */}
            <View style={styles.registerRow}>
              <Text style={styles.registerTxt}>Ainda não tem uma conta? </Text>
              <Link href="/register" style={styles.registerLink}>Cadastre-se</Link>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a" },

  // Hero
  hero: {
    height: HERO_H,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ringOuter: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: "rgba(0,210,106,0.12)",
    borderStyle: "dashed",
  },
  ringMid: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
    borderColor: "rgba(0,210,106,0.2)",
  },
  ringInner: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: "rgba(0,210,106,0.15)",
  },
  logoBadge: { alignItems: "center" },
  logoBg: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00D26A",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  logoDot: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#00D26A",
    borderWidth: 3,
    borderColor: "#0a0a0a",
  },
  brandName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  tagDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#00D26A",
  },
  tagline: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#00D26A",
    letterSpacing: 0.4,
  },

  // Card
  cardOuter: {
    flex: 1,
    marginTop: -24,
  },
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 28,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  cardTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#0a0a0a",
    letterSpacing: -0.4,
  },
  cardSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6b7280",
    marginTop: 4,
    marginBottom: 22,
  },

  // Role tabs
  roleWrap: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
    backgroundColor: "#f3f4f6",
    padding: 4,
    borderRadius: 18,
  },
  roleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  roleTabActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  roleTabLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  roleTabSub: { fontSize: 11, fontFamily: "Inter_400Regular" },

  // Fields
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#374151",
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  inputIconWrap: {
    width: 44,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  inputField: {
    flex: 1,
    height: 50,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#0a0a0a",
  },
  eyeBtn: {
    width: 44,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  // Error
  errorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorTxt: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#ef4444",
  },

  // Submit
  submitBtn: { borderRadius: 18, overflow: "hidden", marginTop: 4 },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
  },
  submitTxt: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#0a0a0a",
  },

  // Register
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  registerTxt: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#6b7280" },
  registerLink: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#00D26A" },
});
