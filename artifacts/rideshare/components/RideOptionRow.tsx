import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { formatPrice } from "@/data/mock";
import type { RideOption } from "@/types";

type Props = {
  option: RideOption;
  selected: boolean;
  onPress: () => void;
};

const ICONS: Record<RideOption["tier"], keyof typeof Feather.glyphMap> = {
  economy: "navigation",
  comfort: "wind",
  xl: "users",
  premium: "award",
};

export function RideOptionRow({ option, selected, onPress }: Props) {
  const colors = useColors();
  const iconName = ICONS[option.tier];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? colors.card : "transparent",
          borderColor: selected ? colors.foreground : "transparent",
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: selected ? colors.accent : colors.muted,
          },
        ]}
      >
        <Feather
          name={iconName}
          size={22}
          color={selected ? colors.accentForeground : colors.foreground}
        />
      </View>
      <View style={styles.middle}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {option.name}
          </Text>
          <View style={styles.cap}>
            <Feather name="user" size={11} color={colors.mutedForeground} />
            <Text style={[styles.capTxt, { color: colors.mutedForeground }]}>
              {option.capacity}
            </Text>
          </View>
        </View>
        <Text style={[styles.eta, { color: colors.mutedForeground }]}>
          {option.etaMinutes} min away · {option.description}
        </Text>
      </View>
      <Text style={[styles.price, { color: colors.foreground }]}>
        {formatPrice(option.priceCents)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  middle: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  cap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  capTxt: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  eta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  price: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
});
