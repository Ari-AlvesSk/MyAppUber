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

import { MapCanvas } from "@/components/MapCanvas";
import { PlaceRow } from "@/components/PlaceRow";
import { useRides } from "@/context/RideContext";
import { RECENT_PLACES, SAVED_PLACES, SUGGESTED_PLACES } from "@/data/mock";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeRide, profile, rides } = useRides();

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = isWeb ? 84 + 24 : insets.bottom + 88;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Late night";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = profile.name.split(" ")[0];

  const completedCount = rides.filter((r) => r.status === "completed").length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingBottom: bottomPad,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greet, { color: colors.mutedForeground }]}>
              {greeting},
            </Text>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {firstName}
            </Text>
          </View>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: colors.foreground,
              },
            ]}
          >
            <Text
              style={[styles.avatarTxt, { color: colors.background }]}
            >
              {firstName.charAt(0)}
            </Text>
          </View>
        </View>

        {/* Map preview */}
        <View
          style={[
            styles.mapWrap,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <MapCanvas height={220} showRoute />
          <View
            style={[
              styles.mapOverlay,
              { backgroundColor: colors.background },
            ]}
            pointerEvents="none"
          >
            <Feather name="map-pin" size={14} color={colors.accent} />
            <Text style={[styles.mapOverlayTxt, { color: colors.foreground }]}>
              San Francisco, CA
            </Text>
          </View>
        </View>

        {/* Where to */}
        <Pressable
          onPress={() => router.push("/booking")}
          style={({ pressed }) => [
            styles.searchBar,
            {
              backgroundColor: colors.foreground,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.searchIcon,
              { backgroundColor: colors.accent },
            ]}
          >
            <Feather name="search" size={16} color={colors.accentForeground} />
          </View>
          <Text style={[styles.searchTxt, { color: colors.background }]}>
            Where to?
          </Text>
          <View
            style={[
              styles.nowChip,
              { backgroundColor: colors.background },
            ]}
          >
            <Feather name="clock" size={12} color={colors.foreground} />
            <Text style={[styles.nowTxt, { color: colors.foreground }]}>
              Now
            </Text>
          </View>
        </Pressable>

        {/* Active ride banner */}
        {activeRide && (
          <Pressable
            onPress={() => router.push(`/ride/${activeRide.id}`)}
            style={({ pressed }) => [
              styles.activeBanner,
              {
                backgroundColor: colors.accent,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={styles.activeLeft}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: colors.accentForeground },
                ]}
              />
              <View>
                <Text
                  style={[
                    styles.activeTitle,
                    { color: colors.accentForeground },
                  ]}
                >
                  Ride in progress
                </Text>
                <Text
                  style={[
                    styles.activeSub,
                    { color: colors.accentForeground, opacity: 0.7 },
                  ]}
                  numberOfLines={1}
                >
                  To {activeRide.dropoff.label}
                </Text>
              </View>
            </View>
            <Feather
              name="chevron-right"
              size={22}
              color={colors.accentForeground}
            />
          </Pressable>
        )}

        {/* Saved places */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Saved places
          </Text>
          <View
            style={[
              styles.savedGrid,
            ]}
          >
            {SAVED_PLACES.map((p) => (
              <Pressable
                key={p.id}
                onPress={() =>
                  router.push({
                    pathname: "/booking",
                    params: { destinationId: p.id },
                  })
                }
                style={({ pressed }) => [
                  styles.savedCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.savedIcon,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Feather
                    name={
                      (p.icon as keyof typeof Feather.glyphMap | undefined) ??
                      "map-pin"
                    }
                    size={18}
                    color={colors.foreground}
                  />
                </View>
                <Text
                  style={[styles.savedLabel, { color: colors.foreground }]}
                >
                  {p.label}
                </Text>
                <Text
                  style={[
                    styles.savedAddr,
                    { color: colors.mutedForeground },
                  ]}
                  numberOfLines={1}
                >
                  {p.address.split(",")[0]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Recent
          </Text>
          {RECENT_PLACES.slice(0, 4).map((p) => (
            <PlaceRow
              key={p.id}
              place={p}
              iconName="clock"
              onPress={() =>
                router.push({
                  pathname: "/booking",
                  params: { destinationId: p.id },
                })
              }
            />
          ))}
        </View>

        {/* Suggested */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Around you
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          >
            {SUGGESTED_PLACES.map((p) => (
              <Pressable
                key={p.id}
                onPress={() =>
                  router.push({
                    pathname: "/booking",
                    params: { destinationId: p.id },
                  })
                }
                style={({ pressed }) => [
                  styles.suggestCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.suggestIcon,
                    { backgroundColor: colors.accent },
                  ]}
                >
                  <Feather
                    name="map-pin"
                    size={16}
                    color={colors.accentForeground}
                  />
                </View>
                <Text
                  style={[
                    styles.suggestLabel,
                    { color: colors.foreground },
                  ]}
                >
                  {p.label}
                </Text>
                <Text
                  style={[
                    styles.suggestAddr,
                    { color: colors.mutedForeground },
                  ]}
                  numberOfLines={2}
                >
                  {p.address}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Stats */}
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {completedCount}
            </Text>
            <Text
              style={[styles.statLabel, { color: colors.mutedForeground }]}
            >
              Trips taken
            </Text>
          </View>
          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
          />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              4.96
            </Text>
            <Text
              style={[styles.statLabel, { color: colors.mutedForeground }]}
            >
              Rider rating
            </Text>
          </View>
          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
          />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              Gold
            </Text>
            <Text
              style={[styles.statLabel, { color: colors.mutedForeground }]}
            >
              Member tier
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greet: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  name: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  mapWrap: {
    marginHorizontal: 20,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  mapOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  mapOverlayTxt: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  searchBar: {
    marginHorizontal: 20,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    borderRadius: 18,
    paddingHorizontal: 12,
    gap: 12,
  },
  searchIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchTxt: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  nowChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  nowTxt: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  activeBanner: {
    marginHorizontal: 20,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 18,
  },
  activeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  activeSub: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  savedGrid: {
    flexDirection: "row",
    gap: 12,
  },
  savedCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  savedIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  savedLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  savedAddr: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  hScroll: {
    gap: 12,
    paddingRight: 20,
  },
  suggestCard: {
    width: 180,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  suggestIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  suggestAddr: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    minHeight: 32,
  },
  statCard: {
    marginTop: 28,
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  divider: {
    width: 1,
    height: 36,
  },
});
