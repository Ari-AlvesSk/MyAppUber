import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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
import { useRides } from "@/context/RideContext";
import { formatPrice } from "@/data/mock";
import { useColors } from "@/hooks/useColors";
import type { Ride } from "@/types";

const COMMISSION = 0.2;

type MainTab = "motoristas" | "viagens" | "financeiro";
type DriverFilter = "pending" | "approved" | "rejected";

function StatusChip({ status }: { status: DriverRequest["status"] }) {
  const colors = useColors();
  const map = {
    pending: { label: "Pendente", bg: "#F59E0B22", fg: "#F59E0B" },
    approved: { label: "Aprovado", bg: colors.accent + "33", fg: colors.accent },
    rejected: { label: "Rejeitado", bg: "#EF444422", fg: "#EF4444" },
  };
  const s = map[status];
  return (
    <View style={[chip.wrap, { backgroundColor: s.bg }]}>
      <Text style={[chip.txt, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

function RideStatusChip({ status }: { status: Ride["status"] }) {
  const colors = useColors();
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    completed: { label: "Concluída", bg: colors.accent + "33", fg: colors.accent },
    cancelled: { label: "Cancelada", bg: "#EF444422", fg: "#EF4444" },
    searching: { label: "Buscando", bg: "#F59E0B22", fg: "#F59E0B" },
    matched: { label: "Aceita", bg: "#3B82F622", fg: "#3B82F6" },
    arriving: { label: "A caminho", bg: "#8B5CF622", fg: "#8B5CF6" },
    in_progress: { label: "Em andamento", bg: "#06B6D422", fg: "#06B6D4" },
  };
  const s = map[status] ?? { label: status, bg: "#88888822", fg: "#888888" };
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
  const { platformRides } = useRides();

  const [mainTab, setMainTab] = useState<MainTab>("motoristas");
  const [driverFilter, setDriverFilter] = useState<DriverFilter>("pending");
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  // ——— Motoristas ———
  const driverCounts = {
    pending: driverRequests.filter((r) => r.status === "pending").length,
    approved: driverRequests.filter((r) => r.status === "approved").length,
    rejected: driverRequests.filter((r) => r.status === "rejected").length,
  };
  const filteredDrivers = driverRequests.filter((r) => r.status === driverFilter);

  const handleApprove = async (id: string) => {
    setLoading((p) => ({ ...p, [id]: true }));
    await approveDriver(id);
    setLoading((p) => ({ ...p, [id]: false }));
  };
  const handleReject = async (id: string) => {
    setLoading((p) => ({ ...p, [id]: true }));
    await rejectDriver(id);
    setLoading((p) => ({ ...p, [id]: false }));
  };

  // ——— Viagens ———
  const sortedRides = useMemo(
    () => [...platformRides].sort((a, b) => b.createdAt - a.createdAt),
    [platformRides],
  );

  // ——— Financeiro ———
  const completedRides = useMemo(
    () => platformRides.filter((r) => r.status === "completed"),
    [platformRides],
  );
  const totalRevenueCents = useMemo(
    () => completedRides.reduce((s, r) => s + r.priceCents, 0),
    [completedRides],
  );
  const platformProfitCents = Math.round(totalRevenueCents * COMMISSION);
  const driverPayoutsCents = totalRevenueCents - platformProfitCents;

  const perDriver = useMemo(() => {
    const map = new Map<string, { rides: number; totalCents: number; name: string }>();
    for (const r of completedRides) {
      const key = r.driver?.name ?? "Motorista desconhecido";
      const prev = map.get(key) ?? { rides: 0, totalCents: 0, name: key };
      map.set(key, {
        name: key,
        rides: prev.rides + 1,
        totalCents: prev.totalCents + r.priceCents,
      });
    }
    return [...map.values()].sort((a, b) => b.totalCents - a.totalCents);
  }, [completedRides]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const mainTabs: { key: MainTab; label: string; icon: string }[] = [
    { key: "motoristas", label: "Motoristas", icon: "users" },
    { key: "viagens", label: "Viagens", icon: "navigation" },
    { key: "financeiro", label: "Financeiro", icon: "bar-chart-2" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Cabeçalho */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Painel Admin</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {user?.name ?? "Administrador"}
          </Text>
        </View>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="log-out" size={18} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Abas principais */}
      <View style={[styles.mainTabs, { borderBottomColor: colors.border }]}>
        {mainTabs.map((t) => {
          const active = mainTab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setMainTab(t.key)}
              style={[
                styles.mainTab,
                active && { borderBottomColor: colors.accent, borderBottomWidth: 2 },
              ]}
            >
              <Feather
                name={t.icon as any}
                size={15}
                color={active ? colors.accent : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.mainTabTxt,
                  { color: active ? colors.accent : colors.mutedForeground },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ══════════ MOTORISTAS ══════════ */}
      {mainTab === "motoristas" && (
        <>
          {/* Resumo */}
          <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: "#F59E0B" }]}>{driverCounts.pending}</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Pendentes</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: colors.accent }]}>{driverCounts.approved}</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Aprovados</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: "#EF4444" }]}>{driverCounts.rejected}</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Rejeitados</Text>
            </View>
          </View>

          {/* Filtro */}
          <View style={[styles.subTabs, { borderBottomColor: colors.border }]}>
            {(["pending", "approved", "rejected"] as DriverFilter[]).map((f) => {
              const labels = { pending: "Pendentes", approved: "Aprovados", rejected: "Rejeitados" };
              const active = driverFilter === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => setDriverFilter(f)}
                  style={[
                    styles.subTab,
                    active && { borderBottomColor: colors.foreground, borderBottomWidth: 2 },
                  ]}
                >
                  <Text style={[styles.subTabTxt, { color: active ? colors.foreground : colors.mutedForeground }]}>
                    {labels[f]}{driverCounts[f] > 0 ? ` (${driverCounts[f]})` : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
            showsVerticalScrollIndicator={false}
          >
            {filteredDrivers.length === 0 ? (
              <EmptyState
                icon={driverFilter === "pending" ? "clock" : driverFilter === "approved" ? "check-circle" : "x-circle"}
                title={
                  driverFilter === "pending" ? "Nenhum pedido pendente"
                    : driverFilter === "approved" ? "Nenhum motorista aprovado"
                    : "Nenhum pedido rejeitado"
                }
                text="Os registros desta categoria aparecerão aqui."
              />
            ) : (
              filteredDrivers.map((req) => (
                <View
                  key={req.id}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.avatar, { backgroundColor: colors.foreground }]}>
                      <Text style={[styles.avatarTxt, { color: colors.background }]}>
                        {req.name.charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardName, { color: colors.foreground }]}>{req.name}</Text>
                      <Text style={[styles.cardEmail, { color: colors.mutedForeground }]}>{req.email}</Text>
                    </View>
                    <StatusChip status={req.status} />
                  </View>

                  <View style={[styles.details, { borderTopColor: colors.border }]}>
                    <View style={styles.detailRow}>
                      <Feather name="phone" size={13} color={colors.mutedForeground} />
                      <Text style={[styles.detailTxt, { color: colors.mutedForeground }]}>{req.phone}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather name={req.vehicleType === "moto" ? "zap" : "truck"} size={13} color={colors.mutedForeground} />
                      <Text style={[styles.detailTxt, { color: colors.mutedForeground }]}>
                        {req.vehicleModel} · {req.vehiclePlate}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather name="calendar" size={13} color={colors.mutedForeground} />
                      <Text style={[styles.detailTxt, { color: colors.mutedForeground }]}>
                        Cadastro em{" "}
                        {new Date(req.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </Text>
                    </View>
                  </View>

                  {req.status === "pending" && (
                    <View style={styles.actions}>
                      <Pressable
                        onPress={() => handleReject(req.id)}
                        disabled={loading[req.id]}
                        style={({ pressed }) => [
                          styles.actionBtn, styles.rejectBtn,
                          { borderColor: "#EF4444", opacity: pressed || loading[req.id] ? 0.6 : 1 },
                        ]}
                      >
                        <Feather name="x" size={15} color="#EF4444" />
                        <Text style={[styles.actionTxt, { color: "#EF4444" }]}>Rejeitar</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleApprove(req.id)}
                        disabled={loading[req.id]}
                        style={({ pressed }) => [
                          styles.actionBtn, styles.approveBtn,
                          { backgroundColor: colors.accent, opacity: pressed || loading[req.id] ? 0.7 : 1 },
                        ]}
                      >
                        <Feather name="check" size={15} color={colors.accentForeground} />
                        <Text style={[styles.actionTxt, { color: colors.accentForeground }]}>Aprovar</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </>
      )}

      {/* ══════════ VIAGENS ══════════ */}
      {mainTab === "viagens" && (
        <>
          <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: colors.foreground }]}>{platformRides.length}</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Total</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: colors.accent }]}>{completedRides.length}</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Concluídas</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: "#EF4444" }]}>
                {platformRides.filter((r) => r.status === "cancelled").length}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Canceladas</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
            showsVerticalScrollIndicator={false}
          >
            {sortedRides.length === 0 ? (
              <EmptyState
                icon="navigation"
                title="Nenhuma viagem ainda"
                text="As viagens realizadas pelos passageiros aparecerão aqui."
              />
            ) : (
              sortedRides.map((ride) => (
                <View
                  key={ride.id}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.rideCardTop}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.detailRow}>
                        <Feather name="map-pin" size={12} color={colors.accent} />
                        <Text style={[styles.rideLoc, { color: colors.foreground }]} numberOfLines={1}>
                          {ride.pickup.label}
                        </Text>
                      </View>
                      <View style={[styles.detailRow, { marginTop: 4 }]}>
                        <Feather name="flag" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.rideLoc, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {ride.dropoff.label}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <RideStatusChip status={ride.status} />
                      <Text style={[styles.ridePrice, { color: colors.foreground }]}>
                        {formatPrice(ride.priceCents)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.rideCardBottom, { borderTopColor: colors.border }]}>
                    <View style={styles.detailRow}>
                      <Feather name="user" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.detailTxt, { color: colors.mutedForeground }]}>
                        {ride.driver ? ride.driver.name : "—"}
                      </Text>
                    </View>
                    <Text style={[styles.detailTxt, { color: colors.mutedForeground }]}>
                      {new Date(ride.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </>
      )}

      {/* ══════════ FINANCEIRO ══════════ */}
      {mainTab === "financeiro" && (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Cards de resumo */}
          <View style={styles.finRow}>
            <FinCard
              label="Receita total"
              value={formatPrice(totalRevenueCents)}
              icon="trending-up"
              iconColor={colors.accent}
              bg={colors.accent + "18"}
            />
            <FinCard
              label="Lucro plataforma (20%)"
              value={formatPrice(platformProfitCents)}
              icon="percent"
              iconColor="#8B5CF6"
              bg="#8B5CF618"
            />
          </View>
          <View style={styles.finRow}>
            <FinCard
              label="Repasse motoristas"
              value={formatPrice(driverPayoutsCents)}
              icon="users"
              iconColor="#F59E0B"
              bg="#F59E0B18"
            />
            <FinCard
              label="Viagens concluídas"
              value={String(completedRides.length)}
              icon="check-circle"
              iconColor="#06B6D4"
              bg="#06B6D418"
            />
          </View>

          {/* Por motorista */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Desempenho por motorista
          </Text>

          {perDriver.length === 0 ? (
            <EmptyState
              icon="bar-chart-2"
              title="Sem dados financeiros"
              text="Os dados aparecerão conforme as viagens forem concluídas."
            />
          ) : (
            <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {perDriver.map((d, i) => {
                const driverEarnings = Math.round(d.totalCents * (1 - COMMISSION));
                const platformCut = d.totalCents - driverEarnings;
                return (
                  <View
                    key={d.name}
                    style={[
                      styles.driverFinRow,
                      i > 0 && { borderTopColor: colors.border, borderTopWidth: 1 },
                    ]}
                  >
                    <View style={[styles.driverAvatar, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.driverAvatarTxt, { color: colors.foreground }]}>
                        {d.name.charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.driverFinName, { color: colors.foreground }]}>{d.name}</Text>
                      <Text style={[styles.driverFinSub, { color: colors.mutedForeground }]}>
                        {d.rides} {d.rides === 1 ? "viagem" : "viagens"}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      <Text style={[styles.driverFinEarnings, { color: colors.foreground }]}>
                        {formatPrice(driverEarnings)}
                      </Text>
                      <Text style={[styles.driverFinCut, { color: colors.accent }]}>
                        plataforma {formatPrice(platformCut)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  const colors = useColors();
  return (
    <View style={es.wrap}>
      <View style={[es.icon, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Feather name={icon as any} size={26} color={colors.mutedForeground} />
      </View>
      <Text style={[es.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[es.txt, { color: colors.mutedForeground }]}>{text}</Text>
    </View>
  );
}

const es = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 48, gap: 8 },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 8 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  txt: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 20 },
});

function FinCard({ label, value, icon, iconColor, bg }: {
  label: string; value: string;
  icon: string; iconColor: string; bg: string;
}) {
  const colors = useColors();
  return (
    <View style={[fc.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[fc.icon, { backgroundColor: bg }]}>
        <Feather name={icon as any} size={18} color={iconColor} />
      </View>
      <Text style={[fc.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[fc.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const fc = StyleSheet.create({
  card: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", lineHeight: 16 },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  sub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  logoutBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  mainTabs: { flexDirection: "row", borderBottomWidth: 1 },
  mainTab: { flex: 1, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6, paddingVertical: 12 },
  mainTabTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  summaryRow: { flexDirection: "row", paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
  summaryItem: { flex: 1, alignItems: "center", gap: 2 },
  summaryNum: { fontSize: 28, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryDivider: { width: 1, height: 40, alignSelf: "center" },
  subTabs: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 20 },
  subTab: { flex: 1, alignItems: "center", paddingVertical: 10 },
  subTabTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  list: { padding: 16, gap: 12 },
  card: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontSize: 18, fontFamily: "Inter_700Bold" },
  cardName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardEmail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  details: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  actions: { flexDirection: "row", gap: 10, padding: 14, paddingTop: 4 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  rejectBtn: { borderWidth: 1.5 },
  approveBtn: {},
  actionTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
  rideCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16 },
  rideCardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  rideLoc: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  ridePrice: { fontSize: 16, fontFamily: "Inter_700Bold" },
  finRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.2, marginTop: 8, marginBottom: 10 },
  group: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  driverFinRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  driverAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  driverAvatarTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },
  driverFinName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  driverFinSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  driverFinEarnings: { fontSize: 15, fontFamily: "Inter_700Bold" },
  driverFinCut: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
