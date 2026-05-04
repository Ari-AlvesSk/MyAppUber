import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/data/mock";
import { useColors } from "@/hooks/useColors";
import { api } from "@/utils/api";

type Range = "week" | "month";

type DayData = { label: string; cents: number; trips: number };

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

function getWeekStart(weeksAgo = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() - weeksAgo * 7);
  return d;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    api.getDriverRides(user.id).then((rows) => {
      const rides = rows as Record<string, unknown>[];
      const now = new Date();

      if (range === "week") {
        const weekLabels = getWeekDays();
        const buckets: DayData[] = weekLabels.map((label) => ({ label, cents: 0, trips: 0 }));
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        for (const r of rides) {
          if (r["status"] !== "completed") continue;
          const ca = r["completedAt"];
          const ts = ca instanceof Date ? ca.getTime() : typeof ca === "string" ? new Date(ca).getTime() : typeof ca === "number" ? ca : 0;
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
          const ca = r["completedAt"];
          const ts = ca instanceof Date ? ca.getTime() : typeof ca === "string" ? new Date(ca).getTime() : typeof ca === "number" ? ca : 0;
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

  const total = data.reduce((s, d) => s + d.cents, 0);
  const trips = data.reduce((s, d) => s + d.trips, 0);
  const max = Math.max(...data.map((d) => d.cents), 1);
  const avgPerTrip = trips > 0 ? Math.round(total / trips) : 0;

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
          <BreakdownRow label="Tarifas das corridas" value={total} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BreakdownRow label="Taxa do app (18%)" value={-Math.round(total * 0.18)} negative />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BreakdownRow label="Total líquido" value={total - Math.round(total * 0.18)} bold />
        </View>
      </ScrollView>
    </View>
  );
}

function BreakdownRow({ label, value, negative, bold }: { label: string; value: number; negative?: boolean; bold?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.breakRow}>
      <Text style={[styles.breakLabel, { color: bold ? colors.foreground : colors.mutedForeground, fontFamily: bold ? "Inter_700Bold" : "Inter_500Medium" }]}>{label}</Text>
      <Text style={[styles.breakValue, { color: negative ? colors.destructive : colors.foreground, fontFamily: bold ? "Inter_700Bold" : "Inter_600SemiBold" }]}>
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
  breakRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 14 },
  breakLabel: { fontSize: 14 },
  breakValue: { fontSize: 14 },
  divider: { height: 1, marginHorizontal: 14 },
});
