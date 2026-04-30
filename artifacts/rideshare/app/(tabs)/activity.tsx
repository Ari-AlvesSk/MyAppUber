import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRides } from "@/context/RideContext";
import { formatDistanceKm, formatPrice } from "@/data/mock";
import { useColors } from "@/hooks/useColors";
import type { Ride } from "@/types";

function StatusBadge({ status }: { status: Ride["status"] }) {
  const colors = useColors();
  const map: Record<Ride["status"], { label: string; bg: string; fg: string }> =
    {
      searching: {
        label: "Searching",
        bg: colors.muted,
        fg: colors.foreground,
      },
      matched: { label: "Matched", bg: colors.muted, fg: colors.foreground },
      arriving: {
        label: "Arriving",
        bg: colors.accent,
        fg: colors.accentForeground,
      },
      in_progress: {
        label: "On trip",
        bg: colors.accent,
        fg: colors.accentForeground,
      },
      completed: {
        label: "Completed",
        bg: colors.muted,
        fg: colors.mutedForeground,
      },
      cancelled: {
        label: "Cancelled",
        bg: colors.muted,
        fg: colors.destructive,
      },
    };
  const s = map[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeTxt, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  let day: string;
  if (sameDay(d, today)) day = "Today";
  else if (sameDay(d, yest)) day = "Yesterday";
  else
    day = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

export default function ActivityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { rides } = useRides();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top + 8;
  const bottomPad = isWeb ? 84 + 24 : insets.bottom + 88;

  const totalSpent = useMemo(
    () =>
      rides
        .filter((r) => r.status === "completed")
        .reduce((sum, r) => sum + r.priceCents, 0),
    [rides],
  );
  const totalCompleted = rides.filter((r) => r.status === "completed").length;

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
        <Text style={[styles.title, { color: colors.foreground }]}>
          Activity
        </Text>

        <View style={styles.summaryRow}>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.foreground },
            ]}
          >
            <Text
              style={[styles.summaryLabel, { color: colors.background }]}
            >
              This year
            </Text>
            <Text
              style={[styles.summaryValue, { color: colors.background }]}
            >
              {totalCompleted}
            </Text>
            <Text
              style={[
                styles.summarySub,
                { color: colors.background, opacity: 0.6 },
              ]}
            >
              trips
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: colors.accent,
              },
            ]}
          >
            <Text
              style={[styles.summaryLabel, { color: colors.accentForeground }]}
            >
              Spent
            </Text>
            <Text
              style={[styles.summaryValue, { color: colors.accentForeground }]}
            >
              {formatPrice(totalSpent)}
            </Text>
            <Text
              style={[
                styles.summarySub,
                { color: colors.accentForeground, opacity: 0.7 },
              ]}
            >
              all time
            </Text>
          </View>
        </View>

        {rides.length === 0 ? (
          <View style={styles.empty}>
            <View
              style={[
                styles.emptyIcon,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather
                name="navigation"
                size={26}
                color={colors.mutedForeground}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No trips yet
            </Text>
            <Text
              style={[styles.emptyTxt, { color: colors.mutedForeground }]}
            >
              Your ride history will show up here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {rides.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/ride/${r.id}`)}
                style={({ pressed }) => [
                  styles.tripCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.tripTop}>
                  <Text
                    style={[styles.tripDate, { color: colors.mutedForeground }]}
                  >
                    {formatDate(r.createdAt)}
                  </Text>
                  <StatusBadge status={r.status} />
                </View>

                <View style={styles.tripRoute}>
                  <View style={styles.routeIconCol}>
                    <View
                      style={[
                        styles.routeDot,
                        { backgroundColor: colors.accent },
                      ]}
                    />
                    <View
                      style={[
                        styles.routeLine,
                        { backgroundColor: colors.border },
                      ]}
                    />
                    <View
                      style={[
                        styles.routeSquare,
                        { backgroundColor: colors.foreground },
                      ]}
                    />
                  </View>
                  <View style={styles.routeTextCol}>
                    <Text
                      style={[
                        styles.routeLabel,
                        { color: colors.foreground },
                      ]}
                      numberOfLines={1}
                    >
                      {r.pickup.label}
                    </Text>
                    <View style={styles.routeGap} />
                    <Text
                      style={[
                        styles.routeLabel,
                        { color: colors.foreground },
                      ]}
                      numberOfLines={1}
                    >
                      {r.dropoff.label}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.tripFooter,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <View style={styles.tripStat}>
                    <Feather
                      name="navigation"
                      size={13}
                      color={colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.tripStatTxt,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {r.tierName}
                    </Text>
                  </View>
                  <View style={styles.tripStat}>
                    <Feather
                      name="map"
                      size={13}
                      color={colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.tripStatTxt,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {formatDistanceKm(r.distanceKm)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.tripPrice, { color: colors.foreground }]}
                  >
                    {formatPrice(r.priceCents)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.6,
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 18,
    borderRadius: 22,
    minHeight: 124,
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  summarySub: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 56,
    gap: 8,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  emptyTxt: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  list: {
    gap: 12,
  },
  tripCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  tripTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tripDate: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeTxt: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tripRoute: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  routeIconCol: {
    alignItems: "center",
    paddingTop: 4,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    width: 2,
    flex: 1,
    minHeight: 14,
    marginVertical: 4,
  },
  routeSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  routeTextCol: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  routeLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  routeGap: {
    height: 8,
  },
  tripFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  tripStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tripStatTxt: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  tripPrice: {
    marginLeft: "auto",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
