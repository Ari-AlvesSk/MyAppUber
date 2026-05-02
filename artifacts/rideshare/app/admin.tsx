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
import type { DriverRequest } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type FilterTab = "pending" | "approved" | "rejected";

function StatusChip({ status }: { status: DriverRequest["status"] }) {
  const colors = useColors();
  const map = {
    pending: { label: "Pendente", bg: "#F59E0B22", fg: "#F59E0B" },
    approved: {
      label: "Aprovado",
      bg: colors.accent + "33",
      fg: colors.accent,
    },
    rejected: { label: "Rejeitado", bg: "#EF444422", fg: "#EF4444" },
  };
  const s = map[status];
  return (
    <View style={[chip.wrap, { backgroundColor: s.bg }]}>
      <Text style={[chip.txt, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const chip = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  txt: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
});

export default function AdminScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, driverRequests, approveDriver, rejectDriver } = useAuth();

  const [activeTab, setActiveTab] = useState<FilterTab>("pending");
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const filtered = driverRequests.filter((r) => r.status === activeTab);

  const counts = {
    pending: driverRequests.filter((r) => r.status === "pending").length,
    approved: driverRequests.filter((r) => r.status === "approved").length,
    rejected: driverRequests.filter((r) => r.status === "rejected").length,
  };

  const handleApprove = async (id: string) => {
    setLoading((prev) => ({ ...prev, [id]: true }));
    await approveDriver(id);
    setLoading((prev) => ({ ...prev, [id]: false }));
  };

  const handleReject = async (id: string) => {
    setLoading((prev) => ({ ...prev, [id]: true }));
    await rejectDriver(id);
    setLoading((prev) => ({ ...prev, [id]: false }));
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "pending", label: "Pendentes" },
    { key: "approved", label: "Aprovados" },
    { key: "rejected", label: "Rejeitados" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Cabeçalho */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Painel Admin
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {user?.name ?? "Administrador"}
          </Text>
        </View>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            {
              backgroundColor: colors.muted,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="log-out" size={18} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Resumo */}
      <View
        style={[
          styles.summaryRow,
          { borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: "#F59E0B" }]}>
            {counts.pending}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
            Pendentes
          </Text>
        </View>
        <View
          style={[styles.summaryDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: colors.accent }]}>
            {counts.approved}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
            Aprovados
          </Text>
        </View>
        <View
          style={[styles.summaryDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: "#EF4444" }]}>
            {counts.rejected}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
            Rejeitados
          </Text>
        </View>
      </View>

      {/* Abas */}
      <View
        style={[styles.tabs, { borderBottomColor: colors.border }]}
      >
        {tabs.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setActiveTab(t.key)}
            style={[
              styles.tab,
              activeTab === t.key && {
                borderBottomColor: colors.accent,
                borderBottomWidth: 2,
              },
            ]}
          >
            <Text
              style={[
                styles.tabTxt,
                {
                  color:
                    activeTab === t.key
                      ? colors.accent
                      : colors.mutedForeground,
                },
              ]}
            >
              {t.label}
              {counts[t.key] > 0 ? ` (${counts[t.key]})` : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Lista */}
      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              <Feather
                name={
                  activeTab === "pending"
                    ? "clock"
                    : activeTab === "approved"
                    ? "check-circle"
                    : "x-circle"
                }
                size={26}
                color={colors.mutedForeground}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {activeTab === "pending"
                ? "Nenhum pedido pendente"
                : activeTab === "approved"
                ? "Nenhum motorista aprovado"
                : "Nenhum pedido rejeitado"}
            </Text>
            <Text
              style={[styles.emptyTxt, { color: colors.mutedForeground }]}
            >
              {activeTab === "pending"
                ? "Novos cadastros de motoristas aparecerão aqui."
                : "Os registros desta categoria aparecerão aqui."}
            </Text>
          </View>
        ) : (
          filtered.map((req) => (
            <View
              key={req.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Topo */}
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: colors.foreground },
                  ]}
                >
                  <Text
                    style={[styles.avatarTxt, { color: colors.background }]}
                  >
                    {req.name.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.cardName, { color: colors.foreground }]}
                  >
                    {req.name}
                  </Text>
                  <Text
                    style={[
                      styles.cardEmail,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {req.email}
                  </Text>
                </View>
                <StatusChip status={req.status} />
              </View>

              {/* Detalhes */}
              <View
                style={[
                  styles.details,
                  { borderTopColor: colors.border },
                ]}
              >
                <View style={styles.detailRow}>
                  <Feather
                    name="phone"
                    size={13}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.detailTxt,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {req.phone}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Feather
                    name={req.vehicleType === "moto" ? "zap" : "truck"}
                    size={13}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.detailTxt,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {req.vehicleModel} · {req.vehiclePlate}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Feather
                    name="calendar"
                    size={13}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.detailTxt,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Cadastro em{" "}
                    {new Date(req.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              </View>

              {/* Ações — apenas para pendentes */}
              {req.status === "pending" && (
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => handleReject(req.id)}
                    disabled={loading[req.id]}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.rejectBtn,
                      { borderColor: "#EF4444", opacity: pressed || loading[req.id] ? 0.6 : 1 },
                    ]}
                  >
                    <Feather name="x" size={15} color="#EF4444" />
                    <Text style={[styles.actionTxt, { color: "#EF4444" }]}>
                      Rejeitar
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleApprove(req.id)}
                    disabled={loading[req.id]}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.approveBtn,
                      {
                        backgroundColor: colors.accent,
                        opacity: pressed || loading[req.id] ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Feather
                      name="check"
                      size={15}
                      color={colors.accentForeground}
                    />
                    <Text
                      style={[
                        styles.actionTxt,
                        { color: colors.accentForeground },
                      ]}
                    >
                      Aprovar
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  sub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 2 },
  summaryNum: { fontSize: 28, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryDivider: { width: 1, height: 40, alignSelf: "center" },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 20,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  list: { padding: 20, gap: 14 },
  empty: { alignItems: "center", paddingVertical: 56, gap: 8 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyTxt: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontSize: 18, fontFamily: "Inter_700Bold" },
  cardName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardEmail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  details: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  actions: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    paddingTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  rejectBtn: { borderWidth: 1.5 },
  approveBtn: {},
  actionTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
