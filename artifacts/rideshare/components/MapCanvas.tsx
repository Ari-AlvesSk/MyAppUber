import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

import { useColors } from "@/hooks/useColors";

type Props = {
  height?: number;
  showRoute?: boolean;
  showCar?: boolean;
  variant?: "light" | "dark";
};

/**
 * A stylized, deterministic "map" rendered with SVG so the app looks like
 * a rideshare product without bundling a native maps SDK in the first build.
 * Uses a subtle grid, curved roads, parks, and an animated-looking route.
 */
export function MapCanvas({
  height = 320,
  showRoute = true,
  showCar = false,
  variant,
}: Props) {
  const colors = useColors();
  const isDark = variant
    ? variant === "dark"
    : colors.background === "#0a0a0a";

  const palette = useMemo(() => {
    if (isDark) {
      return {
        base: "#0f1419",
        baseTo: "#1a1f26",
        road: "#2a313a",
        roadMajor: "#3a424d",
        park: "#16291f",
        water: "#13283d",
        building: "#1a2028",
        accent: "#00D26A",
        pin: "#ffffff",
        text: "#a1a1aa",
      };
    }
    return {
      base: "#eef2f5",
      baseTo: "#e3e8ed",
      road: "#ffffff",
      roadMajor: "#f7f9fb",
      park: "#cfeacb",
      water: "#bcd9ee",
      building: "#dbe2e8",
      accent: "#00D26A",
      pin: "#0a0a0a",
      text: "#6b7280",
    };
  }, [isDark]);

  return (
    <View
      style={[styles.wrap, { height, backgroundColor: palette.base }]}
      pointerEvents="none"
    >
      <Svg width="100%" height="100%" viewBox="0 0 400 320">
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.base} />
            <Stop offset="1" stopColor={palette.baseTo} />
          </LinearGradient>
        </Defs>

        <Rect x="0" y="0" width="400" height="320" fill="url(#bg)" />

        {/* Park blob */}
        <Path
          d="M 24 36 Q 90 -6 150 28 Q 200 66 152 110 Q 86 138 36 104 Q 4 76 24 36 Z"
          fill={palette.park}
          opacity={0.85}
        />

        {/* Water */}
        <Path
          d="M 240 200 Q 320 180 400 220 L 400 320 L 220 320 Q 230 250 240 200 Z"
          fill={palette.water}
          opacity={0.85}
        />

        {/* Buildings (block hints) */}
        <G opacity={isDark ? 0.6 : 0.5}>
          <Rect x="180" y="40" width="36" height="42" rx="3" fill={palette.building} />
          <Rect x="222" y="50" width="28" height="32" rx="3" fill={palette.building} />
          <Rect x="256" y="38" width="44" height="48" rx="3" fill={palette.building} />
          <Rect x="306" y="60" width="30" height="26" rx="3" fill={palette.building} />
          <Rect x="180" y="148" width="40" height="34" rx="3" fill={palette.building} />
          <Rect x="226" y="142" width="26" height="40" rx="3" fill={palette.building} />
          <Rect x="258" y="146" width="34" height="36" rx="3" fill={palette.building} />
          <Rect x="60" y="168" width="40" height="30" rx="3" fill={palette.building} />
          <Rect x="106" y="174" width="34" height="24" rx="3" fill={palette.building} />
        </G>

        {/* Major roads */}
        <Line x1="0" y1="124" x2="400" y2="124" stroke={palette.roadMajor} strokeWidth={14} />
        <Line x1="0" y1="220" x2="400" y2="220" stroke={palette.roadMajor} strokeWidth={10} />
        <Line x1="166" y1="0" x2="166" y2="320" stroke={palette.roadMajor} strokeWidth={12} />

        {/* Minor roads */}
        <G stroke={palette.road} strokeWidth={6} opacity={0.9}>
          <Line x1="60" y1="0" x2="60" y2="320" />
          <Line x1="244" y1="0" x2="244" y2="320" />
          <Line x1="320" y1="0" x2="320" y2="320" />
          <Line x1="0" y1="60" x2="400" y2="60" />
          <Line x1="0" y1="180" x2="400" y2="180" />
          <Line x1="0" y1="270" x2="400" y2="270" />
        </G>

        {/* Diagonal road */}
        <Path
          d="M 0 290 Q 140 240 220 200 Q 300 160 400 110"
          stroke={palette.road}
          strokeWidth={8}
          fill="none"
          opacity={0.85}
        />

        {showRoute && (
          <>
            {/* Route shadow */}
            <Path
              d="M 70 250 Q 120 220 166 210 Q 210 200 244 160 Q 280 116 320 80"
              stroke={palette.accent}
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
              opacity={0.25}
            />
            {/* Route line */}
            <Path
              d="M 70 250 Q 120 220 166 210 Q 210 200 244 160 Q 280 116 320 80"
              stroke={palette.accent}
              strokeWidth={4}
              strokeLinecap="round"
              fill="none"
            />

            {/* Pickup pin */}
            <G>
              <Circle cx="70" cy="250" r="10" fill={palette.pin} />
              <Circle cx="70" cy="250" r="4" fill={palette.accent} />
            </G>

            {/* Dropoff pin */}
            <G>
              <Rect
                x="312"
                y="62"
                width="16"
                height="16"
                rx="3"
                fill={palette.pin}
              />
              <Rect
                x="316"
                y="66"
                width="8"
                height="8"
                rx="1"
                fill={palette.accent}
              />
            </G>
          </>
        )}

        {showCar && (
          <G>
            <Circle cx="200" cy="186" r="14" fill={palette.accent} opacity={0.25} />
            <Circle cx="200" cy="186" r="9" fill={palette.accent} />
            <Circle cx="200" cy="186" r="4" fill={palette.pin} />
          </G>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
  },
});
