import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import type { DriverRequest } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { useRides } from "@/context/RideContext";
import { LeafletMap } from "@/components/LeafletMap";
import { api } from "@/utils/api";
import type { CouponItem } from "@/utils/api";
import { formatPrice } from "@/data/mock";
import { useColors } from "@/hooks/useColors";
import type { Ride } from "@/types";

const COMMISSION = 0.2;
type MainTab = "motoristas" | "viagens" | "financeiro" | "cupons" | "mapa" | "configuracoes";
type DriverFilter = "pending" | "approved" | "rejected";

type WithdrawalItem = {
  id: string; driverId: string; driverName: string; pixKey: string;
  amountCents: number; status: "pending" | "approved" | "rejected";
  rejectionReason?: string; createdAt: number;
};
type OnlineDriver = {
  driverId: string; driverName: string; vehicleType: string;
  lat: number; lng: number; online: boolean; updatedAt: number;
};

// ─── Shared sub-components ─────────────────────────────────────────────────

function Chip({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={[chip.wrap, { backgroundColor: bg }]}>
      <Text style={[chip.txt, { color: fg }]}>{label}</Text>
    </View>
  );
}
const chip = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  txt: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.4 },
});

function StatusChip({ status }: { status: DriverRequest["status"] }) {
  const colors = useColors();
  const map = {
    pending: { label: "Pendente", bg: "#F59E0B22", fg: "#F59E0B" },
    approved: { label: "Aprovado", bg: colors.accent + "33", fg: colors.accent },
    rejected: { label: "Rejeitado", bg: "#EF444422", fg: "#EF4444" },
  };
  const s = map[status];
  return <Chip label={s.label} bg={s.bg} fg={s.fg} />;
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
  return <Chip label={s.label} bg={s.bg} fg={s.fg} />;
}
function WithdrawChip({ status }: { status: string }) {
  const colors = useColors();
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    pending: { label: "Pendente", bg: "#F59E0B22", fg: "#F59E0B" },
    approved: { label: "Aprovado", bg: colors.accent + "33", fg: colors.accent },
    rejected: { label: "Rejeitado", bg: "#EF444422", fg: "#EF4444" },
  };
  const s = map[status] ?? { label: status, bg: "#88888822", fg: "#888" };
  return <Chip label={s.label} bg={s.bg} fg={s.fg} />;
}

function StatCard({ label, value, icon, iconColor, accent }: { label: string; value: string; icon: string; iconColor: string; accent: string }) {
  const colors = useColors();
  return (
    <View style={[sc.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[sc.icon, { backgroundColor: accent + "22" }]}>
        <Feather name={icon as any} size={18} color={iconColor} />
      </View>
      <Text style={[sc.val, { color: colors.foreground }]}>{value}</Text>
      <Text style={[sc.lbl, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}
const sc = StyleSheet.create({
  card: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, gap: 6, minWidth: 130 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  val: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  lbl: { fontSize: 11, fontFamily: "Inter_500Medium", lineHeight: 15 },
});

function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  const colors = useColors();
  return (
    <View style={es.wrap}>
      <View style={[es.ico, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Feather name={icon as any} size={24} color={colors.mutedForeground} />
      </View>
      <Text style={[es.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[es.sub, { color: colors.mutedForeground }]}>{text}</Text>
    </View>
  );
}
const es = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 48, gap: 8 },
  ico: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 4 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 24, lineHeight: 20 },
});

function ActionRow({ onApprove, onReject, approveLabel, loading }: {
  onApprove: () => void; onReject: () => void; approveLabel?: string; loading?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={ar.row}>
      <Pressable onPress={onReject} style={[ar.btn, { backgroundColor: "#EF444415", flex: 1 }]}>
        <Feather name="x" size={14} color="#EF4444" />
        <Text style={[ar.txt, { color: "#EF4444" }]}>Rejeitar</Text>
      </Pressable>
      <Pressable onPress={onApprove} style={[ar.btn, { backgroundColor: colors.accent, flex: 1 }]}>
        {loading ? <ActivityIndicator size="small" color={colors.accentForeground} /> : (
          <>
            <Feather name="check" size={14} color={colors.accentForeground} />
            <Text style={[ar.txt, { color: colors.accentForeground }]}>{approveLabel ?? "Aprovar"}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
const ar = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, paddingTop: 12 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12 },
  txt: { fontSize: 13, fontFamily: "Inter_700Bold" },
});

// ─── Main screen ────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, driverRequests, approveDriver, rejectDriver } = useAuth();
  const { coords: adminCoords } = useLocation();
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

  // ── Coupons ──
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "", description: "",
    discountType: "percent" as "percent" | "fixed",
    discountValue: "", minOrderCents: "", maxUses: "",
    expiresAt: "", active: true,
  });
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [couponDeleteLoading, setCouponDeleteLoading] = useState<Record<string, boolean>>({});

  // ── Payment Settings ──
  const [paySettingsForm, setPaySettingsForm] = useState({
    pixKey: "", pixKeyType: "cpf",
    pixEnabled: true, cardEnabled: true, cashEnabled: true,
    cardFeePercent: "3.5", commissionPercent: "20",
    pricePerKmCar: "2.50", pricePerKmMoto: "1.80",
    stripePublishableKey: "", stripeSecretKey: "",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  useEffect(() => { fetchWithdrawals(); }, []);
  useEffect(() => { if (mainTab === "cupons") fetchCoupons(); }, [mainTab]);
  useEffect(() => { if (mainTab === "configuracoes" && !settingsLoaded) fetchPaySettings(); }, [mainTab, settingsLoaded]);
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
        id: String(r.id ?? ""), driverId: String(r.driverId ?? ""),
        driverName: String(r.driverName ?? ""), pixKey: String(r.pixKey ?? ""),
        amountCents: typeof r.amountCents === "number" ? r.amountCents : 0,
        status: (r.status ?? "pending") as WithdrawalItem["status"],
        rejectionReason: r.rejectionReason,
        createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
      })));
    } catch {}
  };
  const fetchOnlineDrivers = async () => {
    try { const rows = await api.getOnlineDrivers(); setOnlineDrivers(rows); } catch {}
  };
  const fetchCoupons = async () => {
    setCouponLoading(true);
    try { setCoupons(await api.getCoupons()); } catch { setCouponError("Erro ao carregar cupons"); }
    setCouponLoading(false);
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
    setRejectingId(null); setRejectReason("");
    setLoading((p) => ({ ...p, [id]: false }));
  };
  const handleApproveWithdraw = async (w: WithdrawalItem) => {
    setWithdrawLoading((p) => ({ ...p, [w.id]: true }));
    try { await api.processWithdrawal(w.id, { status: "approved" }); await fetchWithdrawals(); } catch {}
    setWithdrawLoading((p) => ({ ...p, [w.id]: false }));
  };
  const handleRejectWithdraw = async (id: string) => {
    if (!rejectWithdrawReason.trim()) return;
    setWithdrawLoading((p) => ({ ...p, [id]: true }));
    try {
      await api.processWithdrawal(id, { status: "rejected", rejectionReason: rejectWithdrawReason.trim() });
      setRejectWithdrawId(null); setRejectWithdrawReason("");
      await fetchWithdrawals();
    } catch {}
    setWithdrawLoading((p) => ({ ...p, [id]: false }));
  };

  const handleSaveCoupon = async () => {
    const code = couponForm.code.trim().toUpperCase();
    const desc = couponForm.description.trim();
    const val = parseFloat(couponForm.discountValue);
    if (!code || !desc || isNaN(val) || val <= 0) {
      setCouponError("Preencha código, descrição e valor do desconto."); return;
    }
    if (couponForm.discountType === "percent" && val > 100) {
      setCouponError("Percentual máximo é 100%."); return;
    }
    setSavingCoupon(true);
    setCouponError(null);
    try {
      const minOrder = parseFloat(couponForm.minOrderCents) || 0;
      const maxUses = parseInt(couponForm.maxUses, 10) || 0;
      const expiresAt = couponForm.expiresAt ? new Date(couponForm.expiresAt).getTime() : null;
      await api.createCoupon({
        code,
        description: desc,
        discountType: couponForm.discountType,
        discountValue: couponForm.discountType === "fixed" ? Math.round(val * 100) : val,
        minOrderCents: Math.round(minOrder * 100),
        maxUses,
        expiresAt,
        active: couponForm.active,
      });
      setCouponForm({ code: "", description: "", discountType: "percent", discountValue: "", minOrderCents: "", maxUses: "", expiresAt: "", active: true });
      setShowCouponForm(false);
      await fetchCoupons();
    } catch (e: any) {
      setCouponError(e?.message ?? "Erro ao criar cupom");
    }
    setSavingCoupon(false);
  };

  const handleDeleteCoupon = async (id: string) => {
    setCouponDeleteLoading((p) => ({ ...p, [id]: true }));
    try { await api.deleteCoupon(id); await fetchCoupons(); } catch {}
    setCouponDeleteLoading((p) => ({ ...p, [id]: false }));
  };
  const handleToggleCoupon = async (id: string, active: boolean) => {
    try { await api.toggleCoupon(id, active); await fetchCoupons(); } catch {}
  };

  const fetchPaySettings = async () => {
    try {
      const data = await api.getAdminPaymentSettings();
      setPaySettingsForm({
        pixKey: data.pixKey ?? "",
        pixKeyType: data.pixKeyType ?? "cpf",
        pixEnabled: data.pixEnabled ?? true,
        cardEnabled: data.cardEnabled ?? true,
        cashEnabled: data.cashEnabled ?? true,
        cardFeePercent: String(data.cardFeePercent ?? 3.5),
        commissionPercent: String(data.commissionPercent ?? 20),
        pricePerKmCar: String(data.pricePerKmCar ?? 2.5),
        pricePerKmMoto: String(data.pricePerKmMoto ?? 1.8),
        stripePublishableKey: data.stripePublishableKey ?? "",
        stripeSecretKey: data.stripeSecretKey === "***" ? "" : (data.stripeSecretKey ?? ""),
      });
      setSettingsLoaded(true);
    } catch {}
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    setSettingsError(null);
    setSettingsSuccess(false);
    try {
      await api.updateAdminPaymentSettings({
        ...paySettingsForm,
        cardFeePercent: parseFloat(paySettingsForm.cardFeePercent) || 3.5,
        commissionPercent: parseFloat(paySettingsForm.commissionPercent) || 20,
        pricePerKmCar: parseFloat(paySettingsForm.pricePerKmCar) || 2.5,
        pricePerKmMoto: parseFloat(paySettingsForm.pricePerKmMoto) || 1.8,
      });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (e: any) {
      setSettingsError(e?.message ?? "Erro ao salvar configurações");
    }
    setSettingsSaving(false);
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

  const TABS = [
    { key: "motoristas", label: "Motoristas", icon: "users", badge: driverCounts.pending },
    { key: "viagens", label: "Viagens", icon: "navigation", badge: 0 },
    { key: "financeiro", label: "Financeiro", icon: "trending-up", badge: pendingWithdrawals.length },
    { key: "cupons", label: "Cupons", icon: "tag", badge: 0 },
    { key: "mapa", label: "Mapa", icon: "map-pin", badge: onlineDrivers.length },
    { key: "configuracoes", label: "Config.", icon: "settings", badge: 0 },
  ];

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={[s.adminBadge, { backgroundColor: colors.accent + "20" }]}>
            <View style={[s.adminDot, { backgroundColor: colors.accent }]} />
            <Text style={[s.adminBadgeTxt, { color: colors.accent }]}>ADMIN</Text>
          </View>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Painel de Controle</Text>
          <Text style={[s.headerSub, { color: colors.mutedForeground }]}>{user?.name ?? "Administrador"} · Paraúna Mobi</Text>
        </View>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [s.logoutBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="log-out" size={16} color={colors.foreground} />
        </Pressable>
      </View>

      {/* ── Tab bar ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.tabScroll, { borderBottomColor: colors.border }]}>
        <View style={s.tabs}>
          {TABS.map((t) => {
            const active = mainTab === t.key;
            return (
              <Pressable key={t.key} onPress={() => setMainTab(t.key as MainTab)} style={[s.tab, active && { borderBottomColor: colors.accent, borderBottomWidth: 2.5 }]}>
                <Feather name={t.icon as any} size={14} color={active ? colors.accent : colors.mutedForeground} />
                <Text style={[s.tabTxt, { color: active ? colors.accent : colors.mutedForeground }]}>{t.label}</Text>
                {t.badge > 0 && (
                  <View style={[s.badge, { backgroundColor: t.key === "mapa" ? colors.accent : "#F59E0B" }]}>
                    <Text style={s.badgeTxt}>{t.badge}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* ══════════════ MOTORISTAS ══════════════ */}
      {mainTab === "motoristas" && (
        <>
          {/* Summary chips */}
          <View style={[s.summaryRow, { borderBottomColor: colors.border }]}>
            {[
              { label: "Pendentes", count: driverCounts.pending, color: "#F59E0B" },
              { label: "Aprovados", count: driverCounts.approved, color: colors.accent },
              { label: "Rejeitados", count: driverCounts.rejected, color: "#EF4444" },
            ].map((item, i, arr) => (
              <React.Fragment key={item.label}>
                <View style={s.summaryItem}>
                  <Text style={[s.summaryNum, { color: item.color }]}>{item.count}</Text>
                  <Text style={[s.summaryLbl, { color: colors.mutedForeground }]}>{item.label}</Text>
                </View>
                {i < arr.length - 1 && <View style={[s.summaryDiv, { backgroundColor: colors.border }]} />}
              </React.Fragment>
            ))}
          </View>

          {/* Sub-filter tabs */}
          <View style={[s.subTabs, { borderBottomColor: colors.border }]}>
            {(["pending", "approved", "rejected"] as DriverFilter[]).map((f) => {
              const labels = { pending: "Pendentes", approved: "Aprovados", rejected: "Rejeitados" };
              const active = driverFilter === f;
              return (
                <Pressable key={f} onPress={() => setDriverFilter(f)} style={[s.subTab, active && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}>
                  <Text style={[s.subTabTxt, { color: active ? colors.accent : colors.mutedForeground }]}>{labels[f]}</Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.list}>
            {filteredDrivers.length === 0 ? (
              <EmptyState icon="users" title="Nenhum motorista" text="Não há motoristas neste filtro." />
            ) : filteredDrivers.map((req) => (
              <View key={req.id} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={s.cardTop}>
                  <View style={[s.avatar, { backgroundColor: colors.accent + "22" }]}>
                    <Text style={[s.avatarTxt, { color: colors.accent }]}>{req.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cardName, { color: colors.foreground }]}>{req.name}</Text>
                    <Text style={[s.cardSub, { color: colors.mutedForeground }]}>{req.email}</Text>
                  </View>
                  <StatusChip status={req.status} />
                </View>

                <View style={[s.details, { borderTopColor: colors.border }]}>
                  {[
                    { icon: "phone", val: req.phone },
                    { icon: "credit-card", val: req.cpf },
                    { icon: req.vehicleType === "moto" ? "zap" : "truck", val: `${req.vehicleType === "moto" ? "Moto" : "Carro"} · ${req.vehicleModel}` },
                    { icon: "hash", val: req.vehiclePlate },
                  ].map((d) => (
                    <View key={d.icon} style={s.detailRow}>
                      <Feather name={d.icon as any} size={12} color={colors.mutedForeground} />
                      <Text style={[s.detailTxt, { color: colors.foreground }]}>{d.val}</Text>
                    </View>
                  ))}
                </View>

                {req.status === "pending" && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                    {rejectingId === req.id ? (
                      <View style={{ gap: 8, paddingTop: 12 }}>
                        <TextInput
                          style={[s.reasonInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                          placeholder="Motivo da rejeição..."
                          placeholderTextColor={colors.mutedForeground}
                          value={rejectReason}
                          onChangeText={setRejectReason}
                        />
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Pressable onPress={() => { setRejectingId(null); setRejectReason(""); }} style={[s.btnSm, { backgroundColor: colors.muted, flex: 1 }]}>
                            <Text style={[s.btnSmTxt, { color: colors.foreground }]}>Cancelar</Text>
                          </Pressable>
                          <Pressable onPress={() => handleReject(req.id)} disabled={!rejectReason.trim()} style={[s.btnSm, { backgroundColor: "#EF4444", flex: 1, opacity: rejectReason.trim() ? 1 : 0.4 }]}>
                            {loading[req.id] ? <ActivityIndicator size="small" color="white" /> : <Text style={[s.btnSmTxt, { color: "white" }]}>Confirmar</Text>}
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <ActionRow onApprove={() => handleApprove(req.id)} onReject={() => setRejectingId(req.id)} loading={loading[req.id]} />
                    )}
                  </View>
                )}

                {req.status === "rejected" && req.rejectionReason && (
                  <View style={[s.rejectionNote, { backgroundColor: "#EF444410", borderTopColor: colors.border }]}>
                    <Feather name="alert-circle" size={12} color="#EF4444" />
                    <Text style={[s.rejectionTxt, { color: "#EF4444" }]}>{req.rejectionReason}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {/* ══════════════ VIAGENS ══════════════ */}
      {mainTab === "viagens" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.list}>
          {sortedRides.length === 0 ? (
            <EmptyState icon="navigation" title="Sem viagens" text="Nenhuma viagem registrada ainda." />
          ) : sortedRides.map((ride) => (
            <View key={ride.id} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.rideHeader}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.cardName, { color: colors.foreground }]} numberOfLines={1}>
                    {ride.pickup.label} → {ride.dropoff.label}
                  </Text>
                  <Text style={[s.cardSub, { color: colors.mutedForeground }]}>
                    {ride.tierName} · {ride.distanceKm.toFixed(1)} km
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 5 }}>
                  <Text style={[s.ridePrice, { color: colors.foreground }]}>{formatPrice(ride.priceCents)}</Text>
                  <RideStatusChip status={ride.status} />
                </View>
              </View>
              {ride.driver && (
                <View style={[s.rideDriver, { borderTopColor: colors.border }]}>
                  <Feather name="user" size={12} color={colors.mutedForeground} />
                  <Text style={[s.rideDriverTxt, { color: colors.mutedForeground }]}>{ride.driver.name}</Text>
                  {ride.driver.plate && <Text style={[s.rideDriverTxt, { color: colors.mutedForeground }]}>· {ride.driver.plate}</Text>}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* ══════════════ FINANCEIRO ══════════════ */}
      {mainTab === "financeiro" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View style={s.statRow}>
            <StatCard label="Receita total" value={formatPrice(totalRevenueCents)} icon="trending-up" iconColor={colors.accent} accent={colors.accent} />
            <StatCard label="Lucro plataforma" value={formatPrice(platformProfitCents)} icon="percent" iconColor="#7C3AED" accent="#7C3AED" />
          </View>
          <View style={s.statRow}>
            <StatCard label="Repasse motoristas" value={formatPrice(driverPayoutsCents)} icon="users" iconColor="#2563EB" accent="#2563EB" />
            <StatCard label="Saques pendentes" value={formatPrice(totalPendingWithdraw)} icon="clock" iconColor="#F59E0B" accent="#F59E0B" />
          </View>

          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>Solicitações de Saque</Text>
            <Pressable onPress={fetchWithdrawals} style={[s.refreshBtn, { backgroundColor: colors.muted }]}>
              <Feather name="refresh-cw" size={13} color={colors.foreground} />
            </Pressable>
          </View>

          {withdrawals.length === 0 ? (
            <EmptyState icon="send" title="Nenhum saque" text="Não há solicitações de saque ainda." />
          ) : withdrawals.map((w) => (
            <View key={w.id} style={[s.card, { backgroundColor: colors.card, borderColor: w.status === "pending" ? "#F59E0B55" : colors.border }]}>
              <View style={s.cardTop}>
                <View style={[s.avatar, { backgroundColor: "#F59E0B22" }]}>
                  <Text style={[s.avatarTxt, { color: "#F59E0B" }]}>{w.driverName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardName, { color: colors.foreground }]}>{w.driverName}</Text>
                  <Text style={[s.cardSub, { color: colors.mutedForeground }]}>{new Date(w.createdAt).toLocaleDateString("pt-BR")}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={[s.withdrawAmt, { color: colors.foreground }]}>{formatPrice(w.amountCents)}</Text>
                  <WithdrawChip status={w.status} />
                </View>
              </View>
              <View style={[s.pixRow, { borderTopColor: colors.border, backgroundColor: colors.muted }]}>
                <Feather name="key" size={12} color={colors.mutedForeground} />
                <Text style={[s.pixLbl, { color: colors.mutedForeground }]}>PIX:</Text>
                <Text style={[s.pixVal, { color: colors.foreground }]}>{w.pixKey}</Text>
              </View>
              {w.status === "pending" && (
                <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                  {rejectWithdrawId === w.id ? (
                    <View style={{ gap: 8, paddingTop: 12 }}>
                      <TextInput
                        style={[s.reasonInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                        placeholder="Motivo da rejeição..."
                        placeholderTextColor={colors.mutedForeground}
                        value={rejectWithdrawReason}
                        onChangeText={setRejectWithdrawReason}
                      />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Pressable onPress={() => { setRejectWithdrawId(null); setRejectWithdrawReason(""); }} style={[s.btnSm, { backgroundColor: colors.muted, flex: 1 }]}>
                          <Text style={[s.btnSmTxt, { color: colors.foreground }]}>Cancelar</Text>
                        </Pressable>
                        <Pressable onPress={() => handleRejectWithdraw(w.id)} disabled={!rejectWithdrawReason.trim()} style={[s.btnSm, { backgroundColor: "#EF4444", flex: 1, opacity: rejectWithdrawReason.trim() ? 1 : 0.4 }]}>
                          {withdrawLoading[w.id] ? <ActivityIndicator size="small" color="white" /> : <Text style={[s.btnSmTxt, { color: "white" }]}>Confirmar</Text>}
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <ActionRow onApprove={() => handleApproveWithdraw(w)} onReject={() => setRejectWithdrawId(w.id)} approveLabel="Aprovar Pix" loading={withdrawLoading[w.id]} />
                  )}
                </View>
              )}
              {w.status === "rejected" && w.rejectionReason && (
                <View style={[s.rejectionNote, { backgroundColor: "#EF444410", borderTopColor: colors.border }]}>
                  <Feather name="alert-circle" size={12} color="#EF4444" />
                  <Text style={[s.rejectionTxt, { color: "#EF4444" }]}>{w.rejectionReason}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* ══════════════ CUPONS ══════════════ */}
      {mainTab === "cupons" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {/* Create button / form */}
          {!showCouponForm ? (
            <Pressable
              onPress={() => { setShowCouponForm(true); setCouponError(null); }}
              style={({ pressed }) => [s.addCouponBtn, { borderColor: colors.accent, backgroundColor: colors.accent + "11", opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="plus" size={18} color={colors.accent} />
              <Text style={[s.addCouponTxt, { color: colors.accent }]}>Criar novo cupom</Text>
            </Pressable>
          ) : (
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.formTitle, { color: colors.foreground }]}>Novo Cupom</Text>

              {couponError && (
                <View style={[s.errBox, { backgroundColor: "#EF444415", borderColor: "#EF444440" }]}>
                  <Feather name="alert-circle" size={14} color="#EF4444" />
                  <Text style={[s.errTxt, { color: "#EF4444" }]}>{couponError}</Text>
                </View>
              )}

              <Text style={[s.lbl, { color: colors.mutedForeground }]}>CÓDIGO DO CUPOM</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                placeholder="EX: PROMO10"
                placeholderTextColor={colors.mutedForeground}
                value={couponForm.code}
                onChangeText={(v) => setCouponForm((p) => ({ ...p, code: v.toUpperCase() }))}
                autoCapitalize="characters"
              />

              <Text style={[s.lbl, { color: colors.mutedForeground }]}>DESCRIÇÃO</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Ex: Desconto de boas-vindas"
                placeholderTextColor={colors.mutedForeground}
                value={couponForm.description}
                onChangeText={(v) => setCouponForm((p) => ({ ...p, description: v }))}
              />

              <Text style={[s.lbl, { color: colors.mutedForeground }]}>TIPO DE DESCONTO</Text>
              <View style={s.typeRow}>
                {(["percent", "fixed"] as const).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setCouponForm((p) => ({ ...p, discountType: t }))}
                    style={[s.typeBtn, { backgroundColor: couponForm.discountType === t ? colors.accent : colors.muted, borderColor: couponForm.discountType === t ? colors.accent : colors.border }]}
                  >
                    <Text style={[s.typeTxt, { color: couponForm.discountType === t ? colors.accentForeground : colors.foreground }]}>
                      {t === "percent" ? "Percentual (%)" : "Fixo (R$)"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[s.lbl, { color: colors.mutedForeground }]}>
                {couponForm.discountType === "percent" ? "DESCONTO (%)" : "DESCONTO (R$)"}
              </Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                placeholder={couponForm.discountType === "percent" ? "Ex: 15" : "Ex: 5,00"}
                placeholderTextColor={colors.mutedForeground}
                value={couponForm.discountValue}
                onChangeText={(v) => setCouponForm((p) => ({ ...p, discountValue: v.replace(",", ".") }))}
                keyboardType="decimal-pad"
              />

              <View style={s.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.lbl, { color: colors.mutedForeground }]}>PEDIDO MÍNIMO (R$)</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="0,00"
                    placeholderTextColor={colors.mutedForeground}
                    value={couponForm.minOrderCents}
                    onChangeText={(v) => setCouponForm((p) => ({ ...p, minOrderCents: v.replace(",", ".") }))}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.lbl, { color: colors.mutedForeground }]}>USOS MÁXIMOS (0=∞)</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                    value={couponForm.maxUses}
                    onChangeText={(v) => setCouponForm((p) => ({ ...p, maxUses: v.replace(/\D/g, "") }))}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <Text style={[s.lbl, { color: colors.mutedForeground }]}>EXPIRAÇÃO (opcional, AAAA-MM-DD)</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                placeholder="2025-12-31"
                placeholderTextColor={colors.mutedForeground}
                value={couponForm.expiresAt}
                onChangeText={(v) => setCouponForm((p) => ({ ...p, expiresAt: v }))}
              />

              <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                <Pressable
                  onPress={() => { setShowCouponForm(false); setCouponError(null); }}
                  style={({ pressed }) => [s.btnSm, { backgroundColor: colors.muted, flex: 1, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[s.btnSmTxt, { color: colors.foreground }]}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveCoupon}
                  disabled={savingCoupon}
                  style={({ pressed }) => [s.btnSm, { backgroundColor: colors.accent, flex: 1, opacity: pressed || savingCoupon ? 0.7 : 1 }]}
                >
                  {savingCoupon ? <ActivityIndicator size="small" color={colors.accentForeground} /> : (
                    <Text style={[s.btnSmTxt, { color: colors.accentForeground }]}>Criar Cupom</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {/* Coupon list */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>Cupons cadastrados</Text>
            <Pressable onPress={fetchCoupons} style={[s.refreshBtn, { backgroundColor: colors.muted }]}>
              <Feather name="refresh-cw" size={13} color={colors.foreground} />
            </Pressable>
          </View>

          {couponLoading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
          ) : coupons.length === 0 ? (
            <EmptyState icon="tag" title="Nenhum cupom" text="Crie o primeiro cupom usando o botão acima." />
          ) : coupons.map((c) => (
            <View key={c.id} style={[s.card, { backgroundColor: colors.card, borderColor: c.active ? colors.border : colors.border + "55" }]}>
              <View style={s.couponTop}>
                <View style={[s.couponCodeBadge, { backgroundColor: c.active ? colors.accent + "20" : colors.muted }]}>
                  <Text style={[s.couponCode, { color: c.active ? colors.accent : colors.mutedForeground }]}>{c.code}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[s.cardName, { color: c.active ? colors.foreground : colors.mutedForeground }]}>{c.description}</Text>
                  <Text style={[s.cardSub, { color: colors.mutedForeground }]}>
                    {c.discountType === "percent" ? `${c.discountValue}% OFF` : `R$ ${(c.discountValue / 100).toFixed(2).replace(".", ",")} OFF`}
                    {c.minOrderCents > 0 ? ` · mín. ${formatPrice(c.minOrderCents)}` : ""}
                    {c.maxUses > 0 ? ` · ${c.usedCount}/${c.maxUses} usos` : ""}
                  </Text>
                  {c.expiresAt && (
                    <Text style={[s.couponExpiry, { color: new Date(c.expiresAt) < new Date() ? "#EF4444" : colors.mutedForeground }]}>
                      {new Date(c.expiresAt) < new Date() ? "⚠ Expirado · " : ""}
                      Expira em {new Date(c.expiresAt).toLocaleDateString("pt-BR")}
                    </Text>
                  )}
                </View>
                <Chip label={c.active ? "Ativo" : "Inativo"} bg={c.active ? colors.accent + "22" : colors.muted} fg={c.active ? colors.accent : colors.mutedForeground} />
              </View>
              <View style={[s.couponActions, { borderTopColor: colors.border }]}>
                <Pressable
                  onPress={() => handleToggleCoupon(c.id, !c.active)}
                  style={({ pressed }) => [s.couponBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Feather name={c.active ? "pause" : "play"} size={13} color={colors.foreground} />
                  <Text style={[s.couponBtnTxt, { color: colors.foreground }]}>{c.active ? "Pausar" : "Ativar"}</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDeleteCoupon(c.id)}
                  style={({ pressed }) => [s.couponBtn, { backgroundColor: "#EF444415", opacity: pressed ? 0.7 : 1 }]}
                >
                  {couponDeleteLoading[c.id] ? <ActivityIndicator size="small" color="#EF4444" /> : (
                    <>
                      <Feather name="trash-2" size={13} color="#EF4444" />
                      <Text style={[s.couponBtnTxt, { color: "#EF4444" }]}>Excluir</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ══════════════ CONFIGURAÇÕES ══════════════ */}
      {mainTab === "configuracoes" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>

          {/* Chave Pix */}
          <View style={[s.cfgCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.cfgCardHeader}>
              <View style={[s.cfgIconBox, { backgroundColor: colors.accent + "22" }]}>
                <Feather name="zap" size={16} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cfgCardTitle, { color: colors.foreground }]}>Chave Pix para Recebimento</Text>
                <Text style={[s.cfgCardSub, { color: colors.mutedForeground }]}>Passageiros pagarão para esta chave</Text>
              </View>
            </View>
            <Text style={[s.lbl, { color: colors.mutedForeground }]}>TIPO DE CHAVE</Text>
            <View style={[s.typeRow, { marginHorizontal: 14, flexWrap: "wrap" }]}>
              {([{ k: "cpf", l: "CPF" }, { k: "cnpj", l: "CNPJ" }, { k: "telefone", l: "Telefone" }, { k: "email", l: "E-mail" }, { k: "aleatoria", l: "Aleatória" }] as const).map((t) => (
                <Pressable
                  key={t.k}
                  onPress={() => setPaySettingsForm((p) => ({ ...p, pixKeyType: t.k }))}
                  style={[s.typeBtn, { backgroundColor: paySettingsForm.pixKeyType === t.k ? colors.accent : colors.muted, borderColor: paySettingsForm.pixKeyType === t.k ? colors.accent : colors.border }]}
                >
                  <Text style={[s.typeTxt, { color: paySettingsForm.pixKeyType === t.k ? colors.accentForeground : colors.foreground }]}>{t.l}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[s.lbl, { color: colors.mutedForeground, marginTop: 8 }]}>CHAVE PIX</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: 000.000.000-00"
              placeholderTextColor={colors.mutedForeground}
              value={paySettingsForm.pixKey}
              onChangeText={(v) => setPaySettingsForm((p) => ({ ...p, pixKey: v }))}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Taxas */}
          <View style={[s.cfgCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.cfgCardHeader}>
              <View style={[s.cfgIconBox, { backgroundColor: "#7C3AED22" }]}>
                <Feather name="percent" size={16} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cfgCardTitle, { color: colors.foreground }]}>Taxas e Comissões</Text>
                <Text style={[s.cfgCardSub, { color: colors.mutedForeground }]}>Em porcentagem sobre o valor da corrida</Text>
              </View>
            </View>
            <View style={s.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={[s.lbl, { color: colors.mutedForeground }]}>COMISSÃO PLATAFORMA (%)</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="20"
                  placeholderTextColor={colors.mutedForeground}
                  value={paySettingsForm.commissionPercent}
                  onChangeText={(v) => setPaySettingsForm((p) => ({ ...p, commissionPercent: v.replace(",", ".") }))}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.lbl, { color: colors.mutedForeground }]}>TAXA CARTÃO (%)</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="3.5"
                  placeholderTextColor={colors.mutedForeground}
                  value={paySettingsForm.cardFeePercent}
                  onChangeText={(v) => setPaySettingsForm((p) => ({ ...p, cardFeePercent: v.replace(",", ".") }))}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Preço por km */}
          <View style={[s.cfgCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.cfgCardHeader}>
              <View style={[s.cfgIconBox, { backgroundColor: "#D9770622" }]}>
                <Feather name="map-pin" size={16} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cfgCardTitle, { color: colors.foreground }]}>Preço por Quilômetro</Text>
                <Text style={[s.cfgCardSub, { color: colors.mutedForeground }]}>Valor cobrado por km rodado (R$)</Text>
              </View>
            </View>
            <View style={s.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={[s.lbl, { color: colors.mutedForeground }]}>🚗 CARRO (R$/km)</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="2.50"
                  placeholderTextColor={colors.mutedForeground}
                  value={paySettingsForm.pricePerKmCar}
                  onChangeText={(v) => setPaySettingsForm((p) => ({ ...p, pricePerKmCar: v.replace(",", ".") }))}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.lbl, { color: colors.mutedForeground }]}>🏍️ MOTO (R$/km)</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="1.80"
                  placeholderTextColor={colors.mutedForeground}
                  value={paySettingsForm.pricePerKmMoto}
                  onChangeText={(v) => setPaySettingsForm((p) => ({ ...p, pricePerKmMoto: v.replace(",", ".") }))}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Métodos disponíveis */}
          <View style={[s.cfgCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.cfgCardHeader}>
              <View style={[s.cfgIconBox, { backgroundColor: "#2563EB22" }]}>
                <Feather name="credit-card" size={16} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cfgCardTitle, { color: colors.foreground }]}>Métodos Disponíveis</Text>
                <Text style={[s.cfgCardSub, { color: colors.mutedForeground }]}>Habilite ou desabilite formas de pagamento</Text>
              </View>
            </View>
            {([
              { key: "pixEnabled" as const, label: "Pix", icon: "zap", color: colors.accent },
              { key: "cardEnabled" as const, label: "Cartão de crédito/débito", icon: "credit-card", color: "#7C3AED" },
              { key: "cashEnabled" as const, label: "Dinheiro", icon: "dollar-sign", color: "#2563EB" },
            ]).map((m) => (
              <View key={m.key} style={[s.toggleRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={[s.cfgIconBox, { backgroundColor: m.color + "22" }]}>
                    <Feather name={m.icon as any} size={14} color={m.color} />
                  </View>
                  <Text style={[s.toggleLabel, { color: colors.foreground }]}>{m.label}</Text>
                </View>
                <Switch
                  value={paySettingsForm[m.key] as boolean}
                  onValueChange={(v) => setPaySettingsForm((p) => ({ ...p, [m.key]: v }))}
                  trackColor={{ false: colors.border, true: m.color + "99" }}
                  thumbColor={paySettingsForm[m.key] ? m.color : "#aaa"}
                />
              </View>
            ))}
          </View>

          {/* Gateway Stripe */}
          <View style={[s.cfgCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.cfgCardHeader}>
              <View style={[s.cfgIconBox, { backgroundColor: "#635BFF22" }]}>
                <Feather name="shield" size={16} color="#635BFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cfgCardTitle, { color: colors.foreground }]}>Gateway de Pagamento · Stripe</Text>
                <Text style={[s.cfgCardSub, { color: colors.mutedForeground }]}>Para cobrar cartões automaticamente</Text>
              </View>
            </View>
            <View style={[s.cfgInfoRow, { backgroundColor: "#635BFF11", borderColor: "#635BFF33" }]}>
              <Feather name="info" size={13} color="#635BFF" />
              <Text style={[s.cfgInfoTxt, { color: "#635BFF" }]}>
                Recomendamos o Stripe: suporta Pix, cartões em BRL e é amplamente utilizado no Brasil. Acesse dashboard.stripe.com para criar sua conta e obter as chaves.
              </Text>
            </View>
            <Text style={[s.lbl, { color: colors.mutedForeground }]}>CHAVE PÚBLICA (pk_live_...)</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="pk_live_..."
              placeholderTextColor={colors.mutedForeground}
              value={paySettingsForm.stripePublishableKey}
              onChangeText={(v) => setPaySettingsForm((p) => ({ ...p, stripePublishableKey: v }))}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={[s.lbl, { color: colors.mutedForeground }]}>CHAVE SECRETA (sk_live_...)</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="sk_live_..."
              placeholderTextColor={colors.mutedForeground}
              value={paySettingsForm.stripeSecretKey}
              onChangeText={(v) => setPaySettingsForm((p) => ({ ...p, stripeSecretKey: v }))}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </View>

          {/* Error / Success */}
          {settingsError && (
            <View style={[s.errBox, { backgroundColor: "#EF444415", borderColor: "#EF444440" }]}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <Text style={[s.errTxt, { color: "#EF4444" }]}>{settingsError}</Text>
            </View>
          )}
          {settingsSuccess && (
            <View style={[s.errBox, { backgroundColor: colors.accent + "15", borderColor: colors.accent + "40" }]}>
              <Feather name="check-circle" size={14} color={colors.accent} />
              <Text style={[s.errTxt, { color: colors.accent }]}>Configurações salvas com sucesso!</Text>
            </View>
          )}

          <Pressable
            onPress={handleSaveSettings}
            disabled={settingsSaving}
            style={({ pressed }) => [s.btnSm, { backgroundColor: colors.accent, opacity: pressed || settingsSaving ? 0.7 : 1, marginBottom: 8 }]}
          >
            {settingsSaving ? (
              <ActivityIndicator size="small" color={colors.accentForeground} />
            ) : (
              <>
                <Feather name="save" size={15} color={colors.accentForeground} />
                <Text style={[s.btnSmTxt, { color: colors.accentForeground }]}>Salvar configurações</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}

      {/* ══════════════ MAPA ══════════════ */}
      {mainTab === "mapa" && (
        <View style={{ flex: 1 }}>
          <View style={[s.mapHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={[s.onlineDot, { backgroundColor: onlineDrivers.length > 0 ? colors.accent : colors.mutedForeground }]} />
              <Text style={[s.mapHeaderTxt, { color: colors.foreground }]}>
                {onlineDrivers.length > 0 ? `${onlineDrivers.length} motorista${onlineDrivers.length > 1 ? "s" : ""} online` : "Nenhum motorista online"}
              </Text>
            </View>
            <Pressable onPress={fetchOnlineDrivers} style={[s.refreshBtn, { backgroundColor: colors.muted }]}>
              <Feather name="refresh-cw" size={13} color={colors.foreground} />
            </Pressable>
          </View>
          <View style={{ flex: 1, minHeight: 340 }}>
            <LeafletMap
              height={null}
              lat={adminCoords?.latitude ?? -16.0028}
              lng={adminCoords?.longitude ?? -49.7903}
              interactive={false}
              adminMode={true}
              driverMarkers={onlineDrivers.map((d) => ({
                driverId: d.driverId, driverName: d.driverName,
                vehicleType: d.vehicleType, lat: d.lat, lng: d.lng,
              }))}
            />
          </View>
          {onlineDrivers.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.driversList, { borderTopColor: colors.border }]} contentContainerStyle={{ padding: 12, gap: 10 }}>
              {onlineDrivers.map((d) => (
                <View key={d.driverId} style={[s.driverChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[s.chipVeh, { backgroundColor: d.vehicleType === "moto" ? "#7C3AED22" : "#2563EB22" }]}>
                    <Feather name={d.vehicleType === "moto" ? "zap" : "truck"} size={12} color={d.vehicleType === "moto" ? "#7C3AED" : "#2563EB"} />
                  </View>
                  <Text style={[s.driverChipTxt, { color: colors.foreground }]}>{d.driverName.split(" ")[0]}</Text>
                  <View style={[s.onlineDotSm, { backgroundColor: colors.accent }]} />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: "flex-start", marginBottom: 4 },
  adminDot: { width: 6, height: 6, borderRadius: 3 },
  adminBadgeTxt: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  logoutBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },

  // Tabs
  tabScroll: { borderBottomWidth: 1, flexGrow: 0, flexShrink: 0 },
  tabs: { flexDirection: "row", paddingHorizontal: 8 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 13 },
  tabTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, minWidth: 18, alignItems: "center" },
  badgeTxt: { fontSize: 10, fontFamily: "Inter_700Bold", color: "white" },

  // Summary
  summaryRow: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1 },
  summaryItem: { flex: 1, alignItems: "center", gap: 2 },
  summaryNum: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  summaryLbl: { fontSize: 11, fontFamily: "Inter_500Medium" },
  summaryDiv: { width: 1, marginVertical: 4 },

  // Sub-filter tabs
  subTabs: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 16 },
  subTab: { flex: 1, alignItems: "center", paddingVertical: 11 },
  subTabTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Cards
  list: { padding: 14, gap: 10 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  avatar: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },

  details: { borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailTxt: { fontSize: 13, fontFamily: "Inter_400Regular" },

  rejectionNote: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderTopWidth: 1 },
  rejectionTxt: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },

  reasonInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: "Inter_400Regular" },
  btnSm: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12 },
  btnSmTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },

  // Rides
  rideHeader: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 14, paddingVertical: 12 },
  ridePrice: { fontSize: 15, fontFamily: "Inter_700Bold" },
  rideDriver: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1 },
  rideDriverTxt: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Financial
  statRow: { flexDirection: "row", gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  refreshBtn: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  withdrawAmt: { fontSize: 15, fontFamily: "Inter_700Bold" },
  pixRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1 },
  pixLbl: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  pixVal: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },

  // Coupons
  addCouponBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed" },
  addCouponTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  formTitle: { fontSize: 16, fontFamily: "Inter_700Bold", paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  errBox: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 14, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  errTxt: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  lbl: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, paddingHorizontal: 14 },
  input: { marginHorizontal: 14, marginBottom: 14, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  formRow: { flexDirection: "row", gap: 0 },
  typeRow: { flexDirection: "row", gap: 8, marginHorizontal: 14, marginBottom: 14 },
  typeBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  typeTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  couponTop: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 14, paddingVertical: 12 },
  couponCodeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  couponCode: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  couponExpiry: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 3 },
  couponActions: { flexDirection: "row", borderTopWidth: 1 },
  couponBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  couponBtnTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Map
  mapHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderBottomWidth: 1 },
  mapHeaderTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineDotSm: { width: 6, height: 6, borderRadius: 3 },
  driversList: { maxHeight: 70, borderTopWidth: 1 },
  driverChip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipVeh: { width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  driverChipTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Configurações
  cfgCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden", paddingBottom: 8 },
  cfgCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  cfgIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cfgCardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cfgCardSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  cfgInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginHorizontal: 14, marginBottom: 12, padding: 10, borderRadius: 10, borderWidth: 1 },
  cfgInfoTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
