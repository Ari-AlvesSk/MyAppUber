import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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

type DocStatus = "ok" | "pending" | "expired" | "missing";

type Doc = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  status: DocStatus;
  expiresAt?: string;
};

const STATUS_MAP: Record<DocStatus, { label: string; color: string; bg: string }> = {
  ok:      { label: "Aprovado",  color: "#00D26A", bg: "#00D26A22" },
  pending: { label: "Em análise",color: "#F59E0B", bg: "#F59E0B22" },
  expired: { label: "Vencido",  color: "#EF4444", bg: "#EF444422" },
  missing: { label: "Pendente", color: "#888888", bg: "#88888822" },
};

export default function DriverDocsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top;

  const docs: Doc[] = [
    {
      id: "cnh",
      title: "CNH — Carteira de Habilitação",
      subtitle: user?.vehicleType === "moto" ? "Categoria A ou AB obrigatória" : "Categoria B ou superior",
      icon: "credit-card",
      status: user?.driverStatus === "approved" ? "ok" : "pending",
      expiresAt: "15/08/2027",
    },
    {
      id: "crlv",
      title: "CRLV — Licenciamento",
      subtitle: "Documento do veículo em dia",
      icon: "file-text",
      status: user?.driverStatus === "approved" ? "ok" : "pending",
      expiresAt: "31/12/2025",
    },
    {
      id: "antecedentes",
      title: "Certidão de antecedentes",
      subtitle: "Certidão criminal federal e estadual",
      icon: "shield",
      status: user?.driverStatus === "approved" ? "ok" : "missing",
    },
    {
      id: "foto",
      title: "Foto do perfil",
      subtitle: "Foto recente com rosto visível",
      icon: "camera",
      status: user?.driverStatus === "approved" ? "ok" : "pending",
    },
    {
      id: "seguro",
      title: "Seguro do veículo",
      subtitle: "Seguro obrigatório ou facultativo vigente",
      icon: "umbrella",
      status: user?.driverStatus === "approved" ? "ok" : "missing",
    },
  ];

  const approved = docs.filter((d) => d.status === "ok").length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Documentos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>

        <View style={[styles.statusBanner, { backgroundColor: approved === docs.length ? colors.accent + "18" : "#F59E0B18", borderColor: approved === docs.length ? colors.accent + "44" : "#F59E0B44" }]}>
          <Feather name={approved === docs.length ? "check-circle" : "alert-circle"} size={22} color={approved === docs.length ? colors.accent : "#F59E0B"} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: colors.foreground }]}>
              {approved === docs.length ? "Documentação completa" : `${approved} de ${docs.length} documentos aprovados`}
            </Text>
            <Text style={[styles.bannerSub, { color: colors.mutedForeground }]}>
              {approved === docs.length ? "Todos os documentos estão em ordem" : "Documentos pendentes podem limitar suas corridas"}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Seus documentos</Text>

        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {docs.map((doc, i) => {
            const s = STATUS_MAP[doc.status];
            return (
              <View
                key={doc.id}
                style={[styles.docRow, i > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}
              >
                <View style={[styles.docIcon, { backgroundColor: colors.muted }]}>
                  <Feather name={doc.icon} size={18} color={colors.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.docTitle, { color: colors.foreground }]}>{doc.title}</Text>
                  <Text style={[styles.docSub, { color: colors.mutedForeground }]}>{doc.subtitle}</Text>
                  {doc.expiresAt && (
                    <Text style={[styles.docExpiry, { color: colors.mutedForeground }]}>Validade: {doc.expiresAt}</Text>
                  )}
                </View>
                <View style={[styles.chip, { backgroundColor: s.bg }]}>
                  <Text style={[styles.chipTxt, { color: s.color }]}>{s.label}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="info" size={16} color={colors.mutedForeground} />
          <Text style={[styles.infoTxt, { color: colors.mutedForeground }]}>
            Para atualizar ou enviar documentos, entre em contato com o suporte do Paraúna Mobi pelo WhatsApp ou e-mail.
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
  statusBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 24 },
  bannerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  bannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 },
  group: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 20 },
  docRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  docIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  docTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  docSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 },
  docExpiry: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 3 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipTxt: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  infoTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
