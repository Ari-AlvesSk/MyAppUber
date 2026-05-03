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
  const [password, setPassword] = useState("");
  const [vehicleType, setVehicleType] = useState<"moto" | "car">("car");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError("Informe seu nome completo.");
      return;
    }
    if (!email.includes("@")) {
      setError("E-mail inválido.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Informe um telefone válido.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (role === "driver") {
      if (vehicleModel.trim().length < 2) {
        setError("Informe o modelo do seu veículo.");
        return;
      }
      if (vehiclePlate.trim().length < 5) {
        setError("Informe a placa do veículo.");
        return;
      }
    }

    setSubmitting(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    }
    try {
      const u = await register({
        role,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        ...(role === "driver"
          ? {
              vehicleType,
              vehicleModel: vehicleModel.trim(),
              vehiclePlate: vehiclePlate.trim().toUpperCase(),
            }
          : {}),
      });
      await setUserId(u.id);
      if (u.role === "driver") {
        router.replace("/(driver)/pending");
      } else {
        router.replace("/(tabs)");
      }
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
          paddingTop: topPad + 8,
          paddingBottom: bottomPad,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: colors.muted, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        <Text style={[styles.headline, { color: colors.foreground }]}>
          Crie sua conta
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Em poucos passos você está pronto para começar.
        </Text>

        {/* Role */}
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
          Quero usar como
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

        {/* Name */}
        <Field
          label="Nome completo"
          icon="user"
          value={name}
          onChange={setName}
          placeholder="Seu nome"
          autoCapitalize="words"
        />

        {/* Email */}
        <Field
          label="E-mail"
          icon="mail"
          value={email}
          onChange={setEmail}
          placeholder="voce@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* Phone */}
        <Field
          label="Telefone"
          icon="phone"
          value={phone}
          onChange={setPhone}
          placeholder="(11) 90000-0000"
          keyboardType="phone-pad"
        />

        {/* Password */}
        <Field
          label="Senha"
          icon="lock"
          value={password}
          onChange={setPassword}
          placeholder="Mínimo 6 caracteres"
          secure
        />

        {/* Driver-only fields */}
        {role === "driver" && (
          <>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Tipo de veículo
            </Text>
            <View style={styles.vehicleRow}>
              <VehicleChip
                label="Carro"
                icon="car-side"
                active={vehicleType === "car"}
                onPress={() => setVehicleType("car")}
              />
              <VehicleChip
                label="Moto"
                icon="motorbike"
                active={vehicleType === "moto"}
                onPress={() => setVehicleType("moto")}
              />
            </View>

            <Field
              label="Modelo do veículo"
              icon="truck"
              value={vehicleModel}
              onChange={setVehicleModel}
              placeholder={
                vehicleType === "moto" ? "Ex: Honda CB 500F" : "Ex: Toyota Corolla"
              }
              autoCapitalize="words"
            />
            <Field
              label="Placa"
              icon="hash"
              value={vehiclePlate}
              onChange={setVehiclePlate}
              placeholder="ABC-1D23"
              autoCapitalize="characters"
            />
          </>
        )}

        {error ? (
          <Text style={[styles.error, { color: colors.destructive }]}>
            {error}
          </Text>
        ) : null}

        <View style={{ height: 18 }} />
        <PrimaryButton
          label="Criar conta"
          variant="accent"
          onPress={handleSubmit}
          loading={submitting}
        />

        <Text style={[styles.terms, { color: colors.mutedForeground }]}>
          Ao continuar, você concorda com os Termos de Uso e a Política de
          Privacidade.
        </Text>

        <View style={styles.footer}>
          <Text style={[styles.footerTxt, { color: colors.mutedForeground }]}>
            Já tem uma conta?
          </Text>
          <Link href="/login" asChild>
            <Pressable
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={[styles.footerLink, { color: colors.accent }]}>
                Entrar
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  secure?: boolean;
};

function Field({
  label,
  icon,
  value,
  onChange,
  placeholder,
  autoCapitalize,
  keyboardType,
  secure,
}: FieldProps) {
  const colors = useColors();
  const [show, setShow] = useState(false);
  return (
    <>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <View
        style={[
          styles.input,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Feather name={icon} size={16} color={colors.mutedForeground} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize={autoCapitalize ?? "sentences"}
          autoCorrect={false}
          keyboardType={keyboardType ?? "default"}
          secureTextEntry={secure ? !show : false}
          style={[styles.inputTxt, { color: colors.foreground }]}
        />
        {secure ? (
          <Pressable
            onPress={() => setShow((s) => !s)}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Feather
              name={show ? "eye-off" : "eye"}
              size={16}
              color={colors.mutedForeground}
            />
          </Pressable>
        ) : null}
      </View>
    </>
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

type VehicleChipProps = {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  active: boolean;
  onPress: () => void;
};

function VehicleChip({ label, icon, active, onPress }: VehicleChipProps) {
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
        styles.vehicleChip,
        {
          backgroundColor: active ? colors.foreground : colors.card,
          borderColor: active ? colors.foreground : colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={active ? colors.background : colors.foreground}
      />
      <Text
        style={[
          styles.vehicleChipTxt,
          { color: active ? colors.background : colors.foreground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 24,
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
  vehicleRow: {
    flexDirection: "row",
    gap: 10,
  },
  vehicleChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  vehicleChipTxt: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  error: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 12,
  },
  terms: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 14,
    paddingHorizontal: 14,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
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
