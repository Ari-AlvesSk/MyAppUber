import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
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

function InfoRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[ir.row]}>
      <View style={[ir.icon, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={15} color={colors.mutedForeground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[ir.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[ir.value, { color: colors.foreground }]}>{value || "—"}</Text>
      </View>
    </View>
  );
}
const ir = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  value: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});

export default function DriverVehicleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top;

  const vehicleIcon: keyof typeof MaterialCommunityIcons.glyphMap =
    user?.vehicleType === "moto" ? "motorbike" : "car-side";
  const vehicleTypeLabel = user?.vehicleType === "moto" ? "Motocicleta" : "Automóvel";

  const requirements =
    user?.vehicleType === "moto"
      ? ["Moto com até 10 anos de fabricação", "CNH categoria A ou AB", "Equipamentos de segurança obrigatórios (capacete, colete, etc.)", "CRLV em dia"]
      : ["Veículo com até 10 anos de fabricação", "CNH categoria B ou superior", "Ar-condicionado funcionando", "CRLV em dia", "4 portas obrigatório"];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Meu Veículo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>

        <View style={[styles.vehicleCard, { backgroundColor: colors.foreground }]}>
          <View style={[styles.vehicleIconBig, { backgroundColor: colors.accent + "33" }]}>
            <MaterialCommunityIcons name={vehicleIcon} size={48} color={colors.accent} />
          </View>
          <Text style={[styles.vehicleType, { color: colors.background, opacity: 0.65 }]}>{vehicleTypeLabel}</Text>
          <Text style={[styles.vehicleModel, { color: colors.background }]}>{user?.vehicleModel ?? "Não cadastrado"}</Text>
          {user?.vehiclePlate && (
            <View style={[styles.platePill, { backgroundColor: colors.background + "22" }]}>
              <Text style={[styles.plateTxt, { color: colors.background }]}>{user.vehiclePlate}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Dados do veículo</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow icon="box" label="Modelo" value={user?.vehicleModel ?? "—"} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow icon="hash" label="Placa" value={user?.vehiclePlate ?? "—"} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow icon="tag" label="Tipo" value={vehicleTypeLabel} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Requisitos do veículo</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {requirements.map((req, i) => (
            <View key={i}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View style={styles.reqRow}>
                <View style={[styles.reqDot, { backgroundColor: colors.accent }]} />
                <Text style={[styles.reqTxt, { color: colors.foreground }]}>{req}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="edit-3" size={16} color={colors.mutedForeground} />
          <Text style={[styles.infoTxt, { color: colors.mutedForeground }]}>
            Para alterar dados do veículo, entre em contato com o suporte. Alterações estão sujeitas a nova análise de documentos.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  content: { padding: 20, gap: 0 },
  vehicleCard: { borderRadius: 24, padding: 28, alignItems: "center", gap: 8, marginBottom: 28 },
  vehicleIconBig: { width: 100, height: 100, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  vehicleType: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1 },
  vehicleModel: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  platePill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, marginTop: 4 },
  plateTxt: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10, marginTop: 4 },
  group: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 20 },
  divider: { height: 1 },
  reqRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16 },
  reqDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  reqTxt: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 21 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  infoTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
