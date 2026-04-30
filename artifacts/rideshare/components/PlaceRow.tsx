import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Place } from "@/types";

type Props = {
  place: Place;
  onPress: () => void;
  iconName?: keyof typeof Feather.glyphMap;
  trailing?: React.ReactNode;
};

export function PlaceRow({ place, onPress, iconName, trailing }: Props) {
  const colors = useColors();
  const icon =
    iconName ??
    ((place.icon as keyof typeof Feather.glyphMap | undefined) ?? "clock");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: colors.muted,
            borderColor: colors.border,
          },
        ]}
      >
        <Feather name={icon} size={18} color={colors.foreground} />
      </View>
      <View style={styles.middle}>
        <Text
          style={[styles.label, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {place.label}
        </Text>
        <Text
          style={[styles.address, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {place.address}
        </Text>
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  middle: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  address: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
