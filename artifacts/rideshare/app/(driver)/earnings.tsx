import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
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
import { formatPrice } from "@/data/mock";
import { useColors } from "@/hooks/useColors";
import { api } from "@/utils/api";

type Range = "week" | "month";
type DayData = { label: string; cents: number; trips: number };

const APP_FEE_CENTS = 200;

function getWeekDays(): string[] {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const result: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    result.push(days[d.getDay()]!);
  }
  return result;
}

export default function EarningsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top + 8;
  const bottomPad = isWeb ? 84 + 24 : insets.bottom + 88;

  const [range, setRange] = useState<Range>("week");
  const [data, setData] = useState<DayData[]>([]);
  const [allRides, setAllRides] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [existingWithdrawals, setExistingWithdrawals] = useState<Record<string, unknown>[]>([]);

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    api.getDriverRides(user.id).then((rows) => {
      const rides = rows as Record<string, unknown>[];
      setAllRides(rides);
      const now = new Date();

      if (range === "week") {
        const weekLabels = getWeekDays();
        const buckets: DayData[] = weekLabels.map((label) => ({ label, cents: 0, trips: 0 }));
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        for (const r of rides) {
          if (r["status"] !== "completed") continue;
          const ts = getTimestamp(r["completedAt"]);
          if (!ts || ts < sevenDaysAgo.getTime()) continue;
          const d = new Date(ts);
          const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
          const dayLabel = days[d.getDay()]!;
          const bucket = buckets.find((b) => b.label === dayLabel);
          if (bucket) {
            bucket.cents += typeof r["priceCents"] === "number" ? r["priceCents"] : 0;
            bucket.trips++;
          }
        }
        setData(buckets);
      } else {
        const weeks: DayData[] = [
          { label: "Sem 1", cents: 0, trips: 0 },
          { label: "Sem 2", cents: 0, trips: 0 },
          { label: "Sem 3", cents: 0, trips: 0 },
          { label: "Sem 4", cents: 0, trips: 0 },
        ];
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        for (const r of rides) {
          if (r["status"] !== "completed") continue;
          const ts = getTimestamp(r["completedAt"]);
          if (!ts || ts < monthStart.getTime()) continue;
          const d = new Date(ts);
          const weekIdx = Math.min(Math.floor((d.getDate() - 1) / 7), 3);
          const bucket = weeks[weekIdx]!;
          bucket.cents += typeof r["priceCents"] === "number" ? r["priceCents"] : 0;
          bucket.trips++;
        }
        setData(weeks);
      }
    }).catch(() => setData([])).finally(() => setLoading(false));
  }, [user?.id, range]);

  useEffect(() => {
    if (!user?.id) return;
    api.getWithdrawals(user.id).then((rows) => {
      setExistingWithdrawals(rows as Record<string, unknown>[]);
    }).catch(() => {});
  }, [user?.id, withdrawSuccess]);

  const getTimestamp = (ca: unknown): number => {
    if (ca instanceof Date) return ca.getTime();
    if (typeof ca === "string") return new Date(ca).getTime();
    if (typeof ca === "number") return ca;
    return 0;
  };

  const total = data.reduce((s, d) => s + d.cents, 0);
  const trips = data.reduce((s, d) => s + d.trips, 0);
  const max = Math.max(...data.map((d) => d.cents), 1);
  const avgPerTrip = trips > 0 ? Math.round(total / trips) : 0;

  const allCompleted = allRides.filter((r) => r["status"] === "completed");
  const totalAllEarnings = allCompleted.reduce((s, r) => s + (typeof r["priceCents"] === "number" ? r["priceCents"] : 0), 0);
  const totalTrips = allCompleted.length;
  const appFeeTotal = totalTrips * APP_FEE_CENTS;
  const pendingWithdrawal = existingWithdrawals
    .filter((w) => w["status"] === "pending")
    .reduce((s, w) => s + (typeof w["amountCents"] === "number" ? w["amountCents"] : 0), 0);
  const approvedWithdrawal = existingWithdrawals
    .filter((w) => w["status"] === "approved")
    .reduce((s, w) => s + (typeof w["amountCents"] === "number" ? w["amountCents"] : 0), 0);
  const availableBalance = Math.max(0, totalAllEarnings - appFeeTotal - pendingWithdrawal - approvedWithdrawal);

  const openWithdraw = () => {
    setWithdrawSuccess(false);
    setWithdrawError("");
    setPixKey("");
    setShowWithdraw(true);
    Animated.timing(slideAnim, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };

  const closeWithdraw = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
      setShowWithdraw(false);
    });
  };

  const handleWithdraw = async () => {
    if (!pixKey.trim() || !user) return;
    if (availableBalance <= 0) { setWithdrawError("Saldo insuficiente para saque."); return; }
    setWithdrawLoading(true);
    setWithdrawError("");
    try {
      await api.createWithdrawal({
        driverId: user.id,
        driverName: user.name,
        pixKey: pixKey.trim(),
        amountCents: availableBalance,
      });
      setWithdrawSuccess(true);
    } catch (e: any) {
      setWithdrawError(e?.message ?? "Erro ao solicitar saque.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const modalTranslate = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Ganhos</Text>

        <View style={[styles.tabs, { backgroundColor: colors.card }]}>
          {(["week", "month"] as Range[]).map((r) => (
            <Pressable key={r} onPress={() => setRange(r)} style={({ pressed }) => [styles.tab, { backgroundColor: range === r ? colors.foreground : "transparent", opacity: pressed ? 0.85 : 1 }]}>
              <Text style={[styles.tabTxt, { color: range === r ? colors.background : colors.foreground }]}>
                {r === "week" ? "Esta semana" : "Este mês"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.totalCard, { backgroundColor: colors.foreground }]}>
          <Text style={[styles.totalLabel, { color: colors.background, opacity: 0.7 }]}>
            {range === "week" ? "Ganhos da semana" : "Ganhos do mês"}
          </Text>
          <Text style={[styles.totalValue, { color: colors.background }]}>
            {loading ? "Carregando..." : formatPrice(total)}
          </Text>
          <View style={styles.totalRow}>
            <View style={styles.totalStat}>
              <Feather name="check-circle" size={14} color={colors.accent} />
              <Text style={[styles.totalStatTxt, { color: colors.background, opacity: 0.85 }]}>{trips} corridas</Text>
            </View>
            <View style={styles.totalStat}>
              <Feather name="trending-up" size={14} color={colors.accent} />
              <Text style={[styles.totalStatTxt, { color: colors.background, opacity: 0.85 }]}>{formatPrice(avgPerTrip)} / corrida</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Distribuição</Text>
        <View style={[styles.chart, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ flex: 1 }} />
          ) : data.map((d) => {
            const heightPct = (d.cents / max) * 100;
            return (
              <View key={d.label} style={styles.chartCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { backgroundColor: colors.accent, height: `${heightPct}%` }]} />
                </View>
                <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{d.label}</Text>
                <Text style={[styles.barValue, { color: colors.foreground }]}>R$ {(d.cents / 100).toFixed(0)}</Text>
              </View>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Detalhes</Text>
        <View style={[styles.breakdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <BreakdownRow label="Total bruto (PIX + Cartão)" value={totalAllEarnings} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BreakdownRow label={`Taxa do app (R$2 × ${totalTrips} corridas)`} value={-appFeeTotal} negative />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {pendingWithdrawal > 0 && <>
            <BreakdownRow label="Saques pendentes" value={-pendingWithdrawal} negative />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </>}
          {approvedWithdrawal > 0 && <>
            <BreakdownRow label="Saques aprovados" value={-approvedWithdrawal} negative />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </>}
          <BreakdownRow label="Saldo disponível" value={availableBalance} bold />
        </View>

        <Pressable
          onPress={openWithdraw}
          style={({ pressed }) => [styles.withdrawBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <Feather name="send" size={18} color={colors.accentForeground} />
          <Text style={[styles.withdrawBtnTxt, { color: colors.accentForeground }]}>Sacar Ganhos via PIX</Text>
        </Pressable>

        {existingWithdrawals.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Histórico de Saques</Text>
            <View style={[styles.breakdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {existingWithdrawals.map((w, i) => {
                const status = String(w["status"] ?? "");
                const statusLabel = status === "pending" ? "Pendente" : status === "approved" ? "Aprovado" : "Rejeitado";
                const statusColor = status === "pending" ? "#F59E0B" : status === "approved" ? colors.accent : "#EF4444";
                return (
                  <View key={String(w["id"] ?? i)}>
                    {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                    <View style={styles.breakRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.breakLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                          {formatPrice(typeof w["amountCents"] === "number" ? w["amountCents"] : 0)}
                        </Text>
                        <Text style={[styles.breakLabel, { color: colors.mutedForeground, fontSize: 12, marginTop: 2 }]}>
                          PIX: {String(w["pixKey"] ?? "")}
                        </Text>
                      </View>
                      <View style={[styles.statusChip, { backgroundColor: statusColor + "22" }]}>
                        <Text style={[styles.statusChipTxt, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={showWithdraw} transparent animationType="none" onRequestClose={closeWithdraw}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.modalBackdrop} onPress={closeWithdraw} />
          <Animated.View style={[styles.modalSheet, { backgroundColor: colors.background, transform: [{ translateY: modalTranslate }] }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Solicitar Saque</Text>

            {withdrawSuccess ? (
              <View style={styles.successWrap}>
                <View style={[styles.successIcon, { backgroundColor: colors.accent + "22" }]}>
                  <Feather name="check-circle" size={36} color={colors.accent} />
                </View>
                <Text style={[styles.successTitle, { color: colors.foreground }]}>Solicitação enviada!</Text>
                <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
                  Seu saque de {formatPrice(availableBalance)} foi solicitado. O admin irá processar em breve.
                </Text>
                <Pressable onPress={closeWithdraw} style={[styles.doneBtn, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.doneBtnTxt, { color: colors.accentForeground }]}>Fechar</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={[styles.balanceCard, { backgroundColor: colors.foreground }]}>
                  <Text style={[styles.balanceLabel, { color: colors.background, opacity: 0.7 }]}>Saldo disponível para saque</Text>
                  <Text style={[styles.balanceValue, { color: colors.background }]}>{formatPrice(availableBalance)}</Text>
                  <Text style={[styles.balanceNote, { color: colors.background, opacity: 0.55 }]}>
                    Total bruto − taxa do app (R$2/corrida) − saques anteriores
                  </Text>
                </View>

                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Chave PIX</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="CPF, e-mail, telefone ou chave aleatória"
                  placeholderTextColor={colors.mutedForeground}
                  value={pixKey}
                  onChangeText={setPixKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {withdrawError ? (
                  <Text style={[styles.errorTxt, { color: "#EF4444" }]}>{withdrawError}</Text>
                ) : null}

                <View style={[styles.feeNote, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Feather name="info" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.feeNoteTxt, { color: colors.mutedForeground }]}>
                    Pagamentos em dinheiro não entram no saque — você já recebeu esses valores diretamente do passageiro.
                  </Text>
                </View>

                <Pressable
                  onPress={handleWithdraw}
                  disabled={withdrawLoading || !pixKey.trim() || availableBalance <= 0}
                  style={({ pressed }) => [styles.confirmBtn, { backgroundColor: availableBalance > 0 ? colors.accent : colors.muted, opacity: pressed ? 0.85 : 1 }]}
                >
                  {withdrawLoading ? (
                    <ActivityIndicator color={colors.accentForeground} />
                  ) : (
                    <>
                      <Feather name="send" size={16} color={availableBalance > 0 ? colors.accentForeground : colors.mutedForeground} />
                      <Text style={[styles.confirmBtnTxt, { color: availableBalance > 0 ? colors.accentForeground : colors.mutedForeground }]}>
                        Solicitar {formatPrice(availableBalance)}
                      </Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function BreakdownRow({ label, value, negative, bold }: { label: string; value: number; negative?: boolean; bold?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.breakRow}>
      <Text style={[styles.breakLabel, { color: bold ? colors.foreground : colors.mutedForeground, fontFamily: bold ? "Inter_700Bold" : "Inter_500Medium" }]}>{label}</Text>
      <Text style={[styles.breakValue, { color: negative ? "#EF4444" : bold ? colors.accent : colors.foreground, fontFamily: bold ? "Inter_700Bold" : "Inter_600SemiBold" }]}>
        {negative ? "-" : ""}{formatPrice(Math.abs(value))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -0.6, marginBottom: 18 },
  tabs: { flexDirection: "row", padding: 4, borderRadius: 14, marginBottom: 18 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  totalCard: { padding: 22, borderRadius: 22, gap: 10 },
  totalLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1 },
  totalValue: { fontSize: 36, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  totalRow: { flexDirection: "row", gap: 18, marginTop: 6 },
  totalStat: { flexDirection: "row", alignItems: "center", gap: 6 },
  totalStatTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.2, marginTop: 24, marginBottom: 10 },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", padding: 18, borderRadius: 22, borderWidth: 1, height: 220 },
  chartCol: { flex: 1, alignItems: "center", gap: 6 },
  barTrack: { width: "70%", flex: 1, justifyContent: "flex-end", borderRadius: 8, overflow: "hidden" },
  bar: { width: "100%", minHeight: 6, borderRadius: 8 },
  barLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  barValue: { fontSize: 11, fontFamily: "Inter_700Bold" },
  breakdown: { padding: 4, borderRadius: 18, borderWidth: 1 },
  breakRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14 },
  breakLabel: { fontSize: 14 },
  breakValue: { fontSize: 14 },
  divider: { height: 1, marginHorizontal: 14 },
  withdrawBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 20, paddingVertical: 16, borderRadius: 18 },
  withdrawBtnTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusChipTxt: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, gap: 14, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 20 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  balanceCard: { padding: 20, borderRadius: 18, gap: 6 },
  balanceLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1 },
  balanceValue: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -0.6 },
  balanceNote: { fontSize: 12, fontFamily: "Inter_400Regular" },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: "Inter_500Medium" },
  feeNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  feeNoteTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 18, marginTop: 4 },
  confirmBtnTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },
  errorTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  successWrap: { alignItems: "center", gap: 14, paddingVertical: 20 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  doneBtn: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 16, marginTop: 8 },
  doneBtnTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
