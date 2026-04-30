import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

type Variant = "primary" | "accent" | "secondary" | "destructive";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  testID?: string;
};

export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  testID,
}: Props) {
  const colors = useColors();

  const styleByVariant: Record<Variant, { bg: string; fg: string }> = {
    primary: { bg: colors.primary, fg: colors.primaryForeground },
    accent: { bg: colors.accent, fg: colors.accentForeground },
    secondary: { bg: colors.secondary, fg: colors.secondaryForeground },
    destructive: { bg: colors.destructive, fg: colors.destructiveForeground },
  };

  const v = styleByVariant[variant];

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onPress();
  };

  const isDisabled = !!disabled || !!loading;

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      testID={testID}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: v.bg,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={v.fg} />
        ) : (
          <>
            {icon}
            <Text style={[styles.label, { color: v.fg }]}>{label}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  label: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});
