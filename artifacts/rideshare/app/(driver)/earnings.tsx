import { Feather } from "@expo/vector-icons";
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

import { formatPrice } from "@/data/mock";
import { useColors } from "@/hooks/useColors";

type Range = "week" | "month";

const WEEK_DATA = [
  { label: "Seg", cents: 9840, trips: 6 },
  { label: "Ter", cents: 12200, trips: 8 },
  { label: "Qua", cents: 8650, trips: 5 },
  { label: "Qui", cents: 14580, trips: 9 },
  { label: "Sex", cents: 18420, trips: 11 },
  { label: "Sáb", cents: 21340, trips: 14 },
  { label: "Dom", cents: 13740, trips: 7 },
];

const MONTH_DATA = [
  { label: "Sem 1", cents: 56400, trips: 42 },
  { label: "Sem 2", cents: 64200, trips: 48 },
  { label: "Sem 3", cents: 71800, trips: 53 },
  { label: "Sem 4", cents: 98770, trips: 60 },
];

export default function EarningsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top + 8;
  const bottomPad = isWeb ? 84 + 24 : insets.bottom + 88;

  const [range, setRange] = useState<Range>("week");
  const data = range === "week" ? WEEK_DATA : MONTH_DATA;
  const total = data.reduce((s, d) => s + d.cents, 0);
  const trips = data.reduce((s, d) => s + d.trips, 0);
  const max = Math.max(...data.map((d) => d.cents), 1);
  const avgPerTrip = trips > 0 ? Math.round(total / trips) : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingBottom: bottomPad,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Ganhos</Text>

        {/* Range tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.card }]}>
          {(["week", "month"] as Range[]).map((r) => (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              style={({ pressed }) => [
                styles.tab,
                {
                  backgroundColor:
                    range === r ? colors.foreground : "transparent",
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabTxt,
                  {
                    color: range === r ? colors.background : colors.foreground,
                  },
                ]}
              >
                {r === "week" ? "Esta semana" : "Este mês"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Total card */}
        <View
          style={[
            styles.totalCard,
            { backgroundColor: colors.foreground },
          ]}
        >
          <Text
            style={[
              styles.totalLabel,
              { color: colors.background, opacity: 0.7 },
            ]}
          >
            {range === "week" ? "Ganhos da semana" : "Ganhos do mês"}
          </Text>
          <Text style={[styles.totalValue, { color: colors.background }]}>
            {formatPrice(total)}
          </Text>
          <View style={styles.totalRow}>
            <View style={styles.totalStat}>
              <Feather name="check-circle" size={14} color={colors.accent} />
              <Text
                style={[
                  styles.totalStatTxt,
                  { color: colors.background, opacity: 0.85 },
                ]}
              >
                {trips} corridas
              </Text>
            </View>
            <View style={styles.totalStat}>
              <Feather name="trending-up" size={14} color={colors.accent} />
              <Text
                style={[
                  styles.totalStatTxt,
                  { color: colors.background, opacity: 0.85 },
                ]}
              >
                {formatPrice(avgPerTrip)} / corrida
              </Text>
            </View>
          </View>
        </View>

        {/* Chart */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Distribuição
        </Text>
        <View
          style={[
            styles.chart,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {data.map((d) => {
            const heightPct = (d.cents / max) * 100;
            return (
              <View key={d.label} style={styles.chartCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        backgroundColor: colors.accent,
                        height: `${heightPct}%`,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.barLabel, { color: colors.mutedForeground }]}
                >
                  {d.label}
                </Text>
                <Text
                  style={[styles.barValue, { color: colors.foreground }]}
                >
                  R$ {(d.cents / 100).toFixed(0)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Pay out */}
        <Pressable
          style={({ pressed }) => [
            styles.payoutBtn,
            { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="download" size={16} color={colors.accentForeground} />
          <Text
            style={[styles.payoutTxt, { color: colors.accentForeground }]}
          >
            Transferir para conta bancária
          </Text>
        </Pressable>

        {/* Breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Detalhes
        </Text>
        <View
          style={[
            styles.breakdown,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <BreakdownRow label="Tarifas das corridas" value={total} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BreakdownRow label="Bônus de pico" value={Math.round(total * 0.08)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BreakdownRow
            label="Taxa do app"
            value={-Math.round(total * 0.18)}
            negative
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BreakdownRow
            label="Total líquido"
            value={total + Math.round(total * 0.08) - Math.round(total * 0.18)}
            bold
          />
        </View>
      </ScrollView>
    </View>
  );
}

function BreakdownRow({
  label,
  value,
  negative,
  bold,
}: {
  label: string;
  value: number;
  negative?: boolean;
  bold?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.breakRow}>
      <Text
        style={[
          styles.breakLabel,
          {
            color: bold ? colors.foreground : colors.mutedForeground,
            fontFamily: bold ? "Inter_700Bold" : "Inter_500Medium",
          },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.breakValue,
          {
            color: negative
              ? colors.destructive
              : bold
                ? colors.foreground
                : colors.foreground,
            fontFamily: bold ? "Inter_700Bold" : "Inter_600SemiBold",
          },
        ]}
      >
        {negative ? "-" : ""}
        {formatPrice(Math.abs(value))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.6,
    marginBottom: 18,
  },
  tabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabTxt: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  totalCard: {
    padding: 22,
    borderRadius: 22,
    gap: 10,
  },
  totalLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.8,
  },
  totalRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 6,
  },
  totalStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  totalStatTxt: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 10,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    height: 220,
  },
  chartCol: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  barTrack: {
    width: "70%",
    flex: 1,
    justifyContent: "flex-end",
    borderRadius: 8,
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    minHeight: 6,
    borderRadius: 8,
  },
  barLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  barValue: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  payoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  payoutTxt: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  breakdown: {
    padding: 4,
    borderRadius: 18,
    borderWidth: 1,
  },
  breakRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  breakLabel: {
    fontSize: 14,
  },
  breakValue: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
  },
});
