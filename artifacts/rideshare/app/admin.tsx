import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import type { DriverRequest } from "@/context/AuthContext";
import { useRides } from "@/context/RideContext";
import { LeafletMap } from "@/components/LeafletMap";
import { api } from "@/utils/api";
import { formatPrice } from "@/data/mock";
import { useColors } from "@/hooks/useColors";
import type { Ride } from "@/types";

const COMMISSION = 0.2;
type MainTab = "motoristas" | "viagens" | "financeiro" | "mapa";
type DriverFilter = "pending" | "approved" | "rejected";

type WithdrawalItem = {
  id: string;
  driverId: string;
  driverName: string;
  pixKey: string;
  amountCents: number;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: number;
};

type OnlineDriver = {
  driverId: string;
  driverName: string;
  vehicleType: string;
  lat: number;
  lng: number;
  online: boolean;
  updatedAt: number;
};

function StatusChip({ status }: { status: DriverRequest["status"] }) {
  const colors = useColors();
  const map = {
    pending: { label: "Pendente", bg: "#F59E0B22", fg: "#F59E0B" },
    approved: { label: "Aprovado", bg: colors.accent + "33", fg: colors.accent },
    rejected: { label: "Rejeitado", bg: "#EF444422", fg: "#EF4444" },
  };
  const s = map[status];
  return <View style={[chip.wrap, { backgroundColor: s.bg }]}><Text style={[chip.txt, { color: s.fg }]}>{s.label}</Text></View>;
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
  return <View style={[chip.wrap, { backgroundColor: s.bg }]}><Text style={[chip.txt, { color: s.fg }]}>{s.label}</Text></View>;
}

function WithdrawStatusChip({ status }: { status: string }) {
  const colors = useColors();
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    pending: { label: "Pendente", bg: "#F59E0B22", fg: "#F59E0B" },
    approved: { label: "Aprovado", bg: colors.accent + "33", fg: colors.accent },
    rejected: { label: "Rejeitado", bg: "#EF444422", fg: "#EF4444" },
  };
  const s = map[status] ?? { label: status, bg: "#88888822", fg: "#888888" };
  return <View style={[chip.wrap, { backgroundColor: s.bg }]}><Text style={[chip.txt, { color: s.fg }]}>{s.label}</Text></View>;
}

const chip = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  txt: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
});

function FinCard({ label, value, icon, iconColor, bg }: { label: string; value: string; icon: string; iconColor: string; bg: string }) {
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
  card: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 16, gap: 8 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", lineHeight: 16 },
});

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

export default function AdminScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, driverRequests, approveDriver, rejectDriver } = useAuth();
  const { platformRides } = useRides();
  const [mainTab, setMainTab] = useState<MainTab>("motoristas");
  const [driverFilter, setDriverFilter] = useState<DriverFilter>("pending");
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [withdrawLoading, setWithdrawLoading] = useState<Record<string, boolean>>({});
  const [rejectWithdrawId, setRejectWithdrawId] = useState<string | null>(null);
  const [rejectWithdrawReason, setRejectWithdrawReason] = useState("");

  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);
  const mapPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  useEffect(() => {
    if (mainTab === "mapa") {
      fetchOnlineDrivers();
      mapPollRef.current = setInterval(fetchOnlineDrivers, 8000);
    } else {
      if (mapPollRef.current) { clearInterval(mapPollRef.current); mapPollRef.current = null; }
    }
    return () => { if (mapPollRef.current) { clearInterval(mapPollRef.current); mapPollRef.current = null; } };
  }, [mainTab]);

  const fetchWithdrawals = async () => {
    try {
      const rows = await api.getWithdrawals();
      setWithdrawals(rows.map((r: any) => ({
        id: String(r.id ?? ""),
        driverId: String(r.driverId ?? ""),
        driverName: String(r.driverName ?? ""),
        pixKey: String(r.pixKey ?? ""),
        amountCents: typeof r.amountCents === "number" ? r.amountCents : 0,
        status: (r.status ?? "pending") as WithdrawalItem["status"],
        rejectionReason: r.rejectionReason,
        createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
      })));
    } catch {}
  };

  const fetchOnlineDrivers = async () => {
    try {
      const rows = await api.getOnlineDrivers();
      setOnlineDrivers(rows);
    } catch {}
  };

  const handleApprove = async (id: string) => {
    setLoading((p) => ({ ...p, [id]: true }));
    await approveDriver(id);
    setLoading((p) => ({ ...p, [id]: false }));
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    setLoading((p) => ({ ...p, [id]: true }));
    await rejectDriver(id, rejectReason.trim());
    setRejectingId(null);
    setRejectReason("");
    setLoading((p) => ({ ...p, [id]: false }));
  };

  const handleApproveWithdraw = async (w: WithdrawalItem) => {
    setWithdrawLoading((p) => ({ ...p, [w.id]: true }));
    try {
      await api.processWithdrawal(w.id, { status: "approved" });
      await fetchWithdrawals();
    } catch {}
    setWithdrawLoading((p) => ({ ...p, [w.id]: false }));
  };

  const handleRejectWithdraw = async (id: string) => {
    if (!rejectWithdrawReason.trim()) return;
    setWithdrawLoading((p) => ({ ...p, [id]: true }));
    try {
      await api.processWithdrawal(id, { status: "rejected", rejectionReason: rejectWithdrawReason.trim() });
      setRejectWithdrawId(null);
      setRejectWithdrawReason("");
      await fetchWithdrawals();
    } catch {}
    setWithdrawLoading((p) => ({ ...p, [id]: false }));
  };

  const handleLogout = async () => { await logout(); router.replace("/login"); };

  const driverCounts = {
    pending: driverRequests.filter((r) => r.status === "pending").length,
    approved: driverRequests.filter((r) => r.status === "approved").length,
    rejected: driverRequests.filter((r) => r.status === "rejected").length,
  };
  const filteredDrivers = driverRequests.filter((r) => r.status === driverFilter);
  const sortedRides = useMemo(() => [...platformRides].sort((a, b) => b.createdAt - a.createdAt), [platformRides]);
  const completedRides = useMemo(() => platformRides.filter((r) => r.status === "completed"), [platformRides]);
  const totalRevenueCents = useMemo(() => completedRides.reduce((s, r) => s + r.priceCents, 0), [completedRides]);
  const platformProfitCents = Math.round(totalRevenueCents * COMMISSION);
  const driverPayoutsCents = totalRevenueCents - platformProfitCents;

  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending");
  const totalPendingWithdraw = pendingWithdrawals.reduce((s, w) => s + w.amountCents, 0);

  const tabs = [
    { key: "motoristas", label: "Motoristas", icon: "users" },
    { key: "viagens", label: "Viagens", icon: "navigation" },
    { key: "financeiro", label: "Financeiro", icon: "bar-chart-2" },
    { key: "mapa", label: "Mapa AO VIVO", icon: "map-pin" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <View style={{ flex: 1 }}>
          <View style={styles.headerTop}>
            <View style={[styles.adminBadge, { backgroundColor: colors.accent + "22" }]}>
              <View style={[styles.adminDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.adminBadgeTxt, { color: colors.accent }]}>ADMIN</Text>
            </View>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Painel de Controle</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>{user?.name ?? "Administrador"}</Text>
        </View>
        <Pressable onPress={handleLogout} style={({ pressed }) => [styles.logoutBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}>
          <Feather name="log-out" size={18} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.mainTabsScroll, { borderBottomColor: colors.border }]}>
        <View style={styles.mainTabs}>
          {tabs.map((t) => {
            const active = mainTab === t.key;
            const badge = t.key === "motoristas" && driverCounts.pending > 0 ? driverCounts.pending
              : t.key === "financeiro" && pendingWithdrawals.length > 0 ? pendingWithdrawals.length
              : t.key === "mapa" && onlineDrivers.length > 0 ? onlineDrivers.length
              : 0;
            return (
              <Pressable key={t.key} onPress={() => setMainTab(t.key as MainTab)} style={[styles.mainTab, active && { borderBottomColor: colors.accent, borderBottomWidth: 2.5 }]}>
                <Feather name={t.icon as any} size={15} color={active ? colors.accent : colors.mutedForeground} />
                <Text style={[styles.mainTabTxt, { color: active ? colors.accent : colors.mutedForeground }]}>{t.label}</Text>
                {badge > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: t.key === "mapa" ? colors.accent : "#F59E0B" }]}>
                    <Text style={styles.tabBadgeTxt}>{badge}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {mainTab === "motoristas" && (
        <>
          <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
            {[
              { label: "Pendentes", count: driverCounts.pending, color: "#F59E0B" },
              { label: "Aprovados", count: driverCounts.approved, color: colors.accent },
              { label: "Rejeitados", count: driverCounts.rejected, color: "#EF4444" },
            ].map((s, i, arr) => (
              <React.Fragment key={s.label}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNum, { color: s.color }]}>{s.count}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
                {i < arr.length - 1 && <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />}
              </React.Fragment>
            ))}
          </View>

          <View style={[styles.subTabs, { borderBottomColor: colors.border }]}>
            {(["pending", "approved", "rejected"] as DriverFilter[]).map((f) => {
              const labels = { pending: "Pendentes", approved: "Aprovados", rejected: "Rejeitados" };
              const active = driverFilter === f;
              return (
                <Pressable key={f} onPress={() => setDriverFilter(f)} style={[styles.subTab, active && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}>
                  <Text style={[styles.subTabTxt, { color: active ? colors.accent : colors.mutedForeground }]}>{labels[f]}</Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list}>
            {filteredDrivers.length === 0 ? (
              <EmptyState icon="users" title="Nenhum motorista" text="Não há motoristas neste filtro." />
            ) : filteredDrivers.map((req) => (
              <View key={req.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.avatar, { backgroundColor: colors.accent + "22" }]}>
                    <Text style={[styles.avatarTxt, { color: colors.accent }]}>{req.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: colors.foreground }]}>{req.name}</Text>
                    <Text style={[styles.cardEmail, { color: colors.mutedForeground }]}>{req.email}</Text>
                  </View>
                  <StatusChip status={req.status} />
                </View>

                <View style={[styles.details, { borderTopColor: colors.border }]}>
                  {[
                    { icon: "phone", val: req.phone },
                    { icon: "credit-card", val: req.cpf },
                    { icon: req.vehicleType === "moto" ? "zap" : "truck", val: `${req.vehicleType === "moto" ? "Moto" : "Carro"} · ${req.vehicleModel}` },
                    { icon: "hash", val: req.vehiclePlate },
                  ].map((d) => (
                    <View key={d.icon} style={styles.detailRow}>
                      <Feather name={d.icon as any} size={13} color={colors.mutedForeground} />
                      <Text style={[styles.detailTxt, { color: colors.foreground }]}>{d.val}</Text>
                    </View>
                  ))}
                </View>

                {req.status === "pending" && (
                  <View style={[styles.actions, { borderTopColor: colors.border }]}>
                    {rejectingId === req.id ? (
                      <View style={{ flex: 1, gap: 8 }}>
                        <TextInput
                          style={[styles.reasonInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                          placeholder="Motivo da rejeição..."
                          placeholderTextColor={colors.mutedForeground}
                          value={rejectReason}
                          onChangeText={setRejectReason}
                        />
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Pressable onPress={() => { setRejectingId(null); setRejectReason(""); }} style={[styles.btnSm, { backgroundColor: colors.muted, flex: 1 }]}>
                            <Text style={[styles.btnSmTxt, { color: colors.foreground }]}>Cancelar</Text>
                          </Pressable>
                          <Pressable onPress={() => handleReject(req.id)} disabled={!rejectReason.trim()} style={[styles.btnSm, { backgroundColor: "#EF4444", flex: 1, opacity: rejectReason.trim() ? 1 : 0.5 }]}>
                            {loading[req.id] ? <ActivityIndicator size="small" color="white" /> : <Text style={[styles.btnSmTxt, { color: "white" }]}>Confirmar</Text>}
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <>
                        <Pressable onPress={() => setRejectingId(req.id)} style={[styles.btnSm, { backgroundColor: "#EF444422", flex: 1 }]}>
                          <Feather name="x" size={14} color="#EF4444" />
                          <Text style={[styles.btnSmTxt, { color: "#EF4444" }]}>Rejeitar</Text>
                        </Pressable>
                        <Pressable onPress={() => handleApprove(req.id)} style={[styles.btnSm, { backgroundColor: colors.accent, flex: 1 }]}>
                          {loading[req.id] ? <ActivityIndicator size="small" color={colors.accentForeground} /> : (
                            <>
                              <Feather name="check" size={14} color={colors.accentForeground} />
                              <Text style={[styles.btnSmTxt, { color: colors.accentForeground }]}>Aprovar</Text>
                            </>
                          )}
                        </Pressable>
                      </>
                    )}
                  </View>
                )}

                {req.status === "rejected" && req.rejectionReason && (
                  <View style={[styles.rejectionNote, { backgroundColor: "#EF444411", borderTopColor: colors.border }]}>
                    <Feather name="alert-circle" size={13} color="#EF4444" />
                    <Text style={[styles.rejectionTxt, { color: "#EF4444" }]}>{req.rejectionReason}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {mainTab === "viagens" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list}>
          {sortedRides.length === 0 ? (
            <EmptyState icon="navigation" title="Sem viagens" text="Nenhuma viagem registrada ainda." />
          ) : sortedRides.map((ride) => (
            <View key={ride.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.rideCardHeader}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.cardName, { color: colors.foreground }]}>{ride.pickup.label} → {ride.dropoff.label}</Text>
                  <Text style={[styles.cardEmail, { color: colors.mutedForeground }]}>{ride.tierName} · {ride.distanceKm.toFixed(1)} km</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text style={[styles.ridePrice, { color: colors.foreground }]}>{formatPrice(ride.priceCents)}</Text>
                  <RideStatusChip status={ride.status} />
                </View>
              </View>
              {ride.driver && (
                <View style={[styles.rideDriver, { borderTopColor: colors.border }]}>
                  <Feather name="user" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.rideDriverTxt, { color: colors.mutedForeground }]}>{ride.driver.name}</Text>
                  {ride.driver.plate && <Text style={[styles.rideDriverTxt, { color: colors.mutedForeground }]}>· {ride.driver.plate}</Text>}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {mainTab === "financeiro" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View style={styles.finCards}>
            <FinCard label="Receita total" value={formatPrice(totalRevenueCents)} icon="trending-up" iconColor={colors.accent} bg={colors.accent + "22"} />
            <FinCard label="Lucro plataforma" value={formatPrice(platformProfitCents)} icon="percent" iconColor="#7C3AED" bg="#7C3AED22" />
          </View>
          <View style={styles.finCards}>
            <FinCard label="Repasse motoristas" value={formatPrice(driverPayoutsCents)} icon="users" iconColor="#2563EB" bg="#2563EB22" />
            <FinCard label="Saques pendentes" value={formatPrice(totalPendingWithdraw)} icon="clock" iconColor="#F59E0B" bg="#F59E0B22" />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Solicitações de Saque</Text>
            <Pressable onPress={fetchWithdrawals} style={[styles.refreshBtn, { backgroundColor: colors.muted }]}>
              <Feather name="refresh-cw" size={13} color={colors.foreground} />
            </Pressable>
          </View>

          {withdrawals.length === 0 ? (
            <EmptyState icon="send" title="Nenhum saque" text="Não há solicitações de saque ainda." />
          ) : withdrawals.map((w) => (
            <View key={w.id} style={[styles.card, { backgroundColor: colors.card, borderColor: w.status === "pending" ? "#F59E0B66" : colors.border }]}>
              <View style={styles.withdrawCardTop}>
                <View style={[styles.avatar, { backgroundColor: "#F59E0B22" }]}>
                  <Text style={[styles.avatarTxt, { color: "#F59E0B" }]}>{w.driverName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardName, { color: colors.foreground }]}>{w.driverName}</Text>
                  <Text style={[styles.cardEmail, { color: colors.mutedForeground }]}>{new Date(w.createdAt).toLocaleDateString("pt-BR")}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={[styles.withdrawAmount, { color: colors.foreground }]}>{formatPrice(w.amountCents)}</Text>
                  <WithdrawStatusChip status={w.status} />
                </View>
              </View>

              <View style={[styles.pixRow, { borderTopColor: colors.border, backgroundColor: colors.muted }]}>
                <Feather name="key" size={13} color={colors.mutedForeground} />
                <Text style={[styles.pixLabel, { color: colors.mutedForeground }]}>Chave PIX:</Text>
                <Text style={[styles.pixValue, { color: colors.foreground }]}>{w.pixKey}</Text>
              </View>

              {w.status === "pending" && (
                <View style={[styles.actions, { borderTopColor: colors.border }]}>
                  {rejectWithdrawId === w.id ? (
                    <View style={{ flex: 1, gap: 8 }}>
                      <TextInput
                        style={[styles.reasonInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                        placeholder="Motivo da rejeição..."
                        placeholderTextColor={colors.mutedForeground}
                        value={rejectWithdrawReason}
                        onChangeText={setRejectWithdrawReason}
                      />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Pressable onPress={() => { setRejectWithdrawId(null); setRejectWithdrawReason(""); }} style={[styles.btnSm, { backgroundColor: colors.muted, flex: 1 }]}>
                          <Text style={[styles.btnSmTxt, { color: colors.foreground }]}>Cancelar</Text>
                        </Pressable>
                        <Pressable onPress={() => handleRejectWithdraw(w.id)} disabled={!rejectWithdrawReason.trim()} style={[styles.btnSm, { backgroundColor: "#EF4444", flex: 1, opacity: rejectWithdrawReason.trim() ? 1 : 0.5 }]}>
                          {withdrawLoading[w.id] ? <ActivityIndicator size="small" color="white" /> : <Text style={[styles.btnSmTxt, { color: "white" }]}>Confirmar</Text>}
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Pressable onPress={() => setRejectWithdrawId(w.id)} style={[styles.btnSm, { backgroundColor: "#EF444422", flex: 1 }]}>
                        <Feather name="x" size={14} color="#EF4444" />
                        <Text style={[styles.btnSmTxt, { color: "#EF4444" }]}>Rejeitar</Text>
                      </Pressable>
                      <Pressable onPress={() => handleApproveWithdraw(w)} style={[styles.btnSm, { backgroundColor: colors.accent, flex: 1 }]}>
                        {withdrawLoading[w.id] ? <ActivityIndicator size="small" color={colors.accentForeground} /> : (
                          <>
                            <Feather name="check" size={14} color={colors.accentForeground} />
                            <Text style={[styles.btnSmTxt, { color: colors.accentForeground }]}>Aprovar</Text>
                          </>
                        )}
                      </Pressable>
                    </>
                  )}
                </View>
              )}

              {w.status === "rejected" && w.rejectionReason && (
                <View style={[styles.rejectionNote, { backgroundColor: "#EF444411", borderTopColor: colors.border }]}>
                  <Feather name="alert-circle" size={13} color="#EF4444" />
                  <Text style={[styles.rejectionTxt, { color: "#EF4444" }]}>{w.rejectionReason}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {mainTab === "mapa" && (
        <View style={{ flex: 1 }}>
          <View style={[styles.mapHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.mapHeaderLeft}>
              <View style={[styles.onlineDot, { backgroundColor: onlineDrivers.length > 0 ? colors.accent : colors.mutedForeground }]} />
              <Text style={[styles.mapHeaderTxt, { color: colors.foreground }]}>
                {onlineDrivers.length > 0 ? `${onlineDrivers.length} motorista${onlineDrivers.length > 1 ? "s" : ""} online` : "Nenhum motorista online"}
              </Text>
            </View>
            <Pressable onPress={fetchOnlineDrivers} style={[styles.refreshBtn, { backgroundColor: colors.muted }]}>
              <Feather name="refresh-cw" size={13} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={{ flex: 1, minHeight: 340 }}>
            <LeafletMap
              height={null}
              lat={-16.0028}
              lng={-49.7903}
              interactive={false}
              adminMode={true}
              driverMarkers={onlineDrivers.map((d) => ({
                driverId: d.driverId,
                driverName: d.driverName,
                vehicleType: d.vehicleType,
                lat: d.lat,
                lng: d.lng,
              }))}
            />
          </View>

          {onlineDrivers.length > 0 && (
            <ScrollView style={[styles.driversList, { borderTopColor: colors.border }]} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 12, gap: 10 }}>
              {onlineDrivers.map((d) => (
                <View key={d.driverId} style={[styles.driverChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.chipVehicle, { backgroundColor: d.vehicleType === "moto" ? "#7C3AED22" : "#2563EB22" }]}>
                    <Feather name={d.vehicleType === "moto" ? "zap" : "truck"} size={12} color={d.vehicleType === "moto" ? "#7C3AED" : "#2563EB"} />
                  </View>
                  <Text style={[styles.driverChipTxt, { color: colors.foreground }]}>{d.driverName.split(" ")[0]}</Text>
                  <View style={[styles.onlineDotSm, { backgroundColor: colors.accent }]} />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  adminDot: { width: 6, height: 6, borderRadius: 3 },
  adminBadgeTxt: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  sub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  logoutBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  mainTabsScroll: { borderBottomWidth: 1, flexShrink: 0 },
  mainTabs: { flexDirection: "row", paddingHorizontal: 4 },
  mainTab: { alignItems: "center", flexDirection: "row", gap: 6, paddingVertical: 12, paddingHorizontal: 14 },
  mainTabTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, minWidth: 18, alignItems: "center" },
  tabBadgeTxt: { fontSize: 10, fontFamily: "Inter_700Bold", color: "white" },
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
  details: { borderTopWidth: 1, padding: 14, gap: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  actions: { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1 },
  btnSm: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  btnSmTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  reasonInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  rejectionNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderTopWidth: 1 },
  rejectionTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  rideCardHeader: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  ridePrice: { fontSize: 16, fontFamily: "Inter_700Bold" },
  rideDriver: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingBottom: 12, borderTopWidth: 1, paddingTop: 10 },
  rideDriverTxt: { fontSize: 12, fontFamily: "Inter_500Medium" },
  finCards: { flexDirection: "row", gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: -0.2 },
  refreshBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  withdrawCardTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  withdrawAmount: { fontSize: 17, fontFamily: "Inter_700Bold" },
  pixRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  pixLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  pixValue: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  mapHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  mapHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  mapHeaderTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  onlineDotSm: { width: 7, height: 7, borderRadius: 3.5 },
  driversList: { maxHeight: 80, flexShrink: 0, borderTopWidth: 1 },
  driverChip: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  chipVehicle: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  driverChipTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
