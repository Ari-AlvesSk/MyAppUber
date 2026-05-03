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
  carProgress?: number;
  variant?: "light" | "dark";
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function routePoint(progress: number) {
  const t = clamp01(progress);
  const p0 = { x: 70, y: 250 };
  const p1 = { x: 120, y: 220 };
  const p2 = { x: 166, y: 210 };
  const p3 = { x: 244, y: 160 };
  const p4 = { x: 320, y: 80 };
  const seg = t * 4;
  const cubic = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }, tt: number) => {
    const mt = 1 - tt;
    const mt2 = mt * mt;
    const t2 = tt * tt;
    return {
      x: mt2 * mt * a.x + 3 * mt2 * tt * b.x + 3 * mt * t2 * c.x + t2 * tt * d.x,
      y: mt2 * mt * a.y + 3 * mt2 * tt * b.y + 3 * mt * t2 * c.y + t2 * tt * d.y,
    };
  };
  if (seg <= 1) return cubic(p0, p1, p1, p2, seg);
  if (seg <= 2) return cubic(p2, p2, p3, p3, seg - 1);
  if (seg <= 3) return cubic(p3, p3, { x: 290, y: 120 }, p4, seg - 2);
  return p4;
}

function routeAngle(progress: number) {
  const p = routePoint(Math.min(0.999, progress));
  const p2 = routePoint(Math.min(1, progress + 0.01));
  return (Math.atan2(p2.y - p.y, p2.x - p.x) * 180) / Math.PI;
}

/**
 * Stylized deterministic map.
 */
export function MapCanvas({
  height = 320,
  showRoute = true,
  showCar = false,
  carProgress = 0.52,
  variant,
}: Props) {
  const colors = useColors();
  const isDark = variant ? variant === "dark" : colors.background === "#0a0a0a";

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
  const car = routePoint(carProgress);
  const angle = routeAngle(carProgress);

  return (
    <View style={[styles.wrap, { height, backgroundColor: palette.base }]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 400 320">
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.base} />
            <Stop offset="1" stopColor={palette.baseTo} />
          </LinearGradient>
        </Defs>

        <Rect x="0" y="0" width="400" height="320" fill="url(#bg)" />
        <Path d="M 24 36 Q 90 -6 150 28 Q 200 66 152 110 Q 86 138 36 104 Q 4 76 24 36 Z" fill={palette.park} opacity={0.85} />
        <Path d="M 240 200 Q 320 180 400 220 L 400 320 L 220 320 Q 230 250 240 200 Z" fill={palette.water} opacity={0.85} />

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

        <Line x1="0" y1="124" x2="400" y2="124" stroke={palette.roadMajor} strokeWidth={14} />
        <Line x1="0" y1="220" x2="400" y2="220" stroke={palette.roadMajor} strokeWidth={10} />
        <Line x1="166" y1="0" x2="166" y2="320" stroke={palette.roadMajor} strokeWidth={12} />

        <G stroke={palette.road} strokeWidth={6} opacity={0.9}>
          <Line x1="60" y1="0" x2="60" y2="320" />
          <Line x1="244" y1="0" x2="244" y2="320" />
          <Line x1="320" y1="0" x2="320" y2="320" />
          <Line x1="0" y1="60" x2="400" y2="60" />
          <Line x1="0" y1="180" x2="400" y2="180" />
          <Line x1="0" y1="270" x2="400" y2="270" />
        </G>

        <Path d="M 0 290 Q 140 240 220 200 Q 300 160 400 110" stroke={palette.road} strokeWidth={8} fill="none" opacity={0.85} />

        {showRoute && (
          <>
            <Path d="M 70 250 Q 120 220 166 210 Q 210 200 244 160 Q 280 116 320 80" stroke={palette.accent} strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.25} />
            <Path d="M 70 250 Q 120 220 166 210 Q 210 200 244 160 Q 280 116 320 80" stroke={palette.accent} strokeWidth={4} strokeLinecap="round" fill="none" />
            <G>
              <Circle cx="70" cy="250" r="10" fill={palette.pin} />
              <Circle cx="70" cy="250" r="4" fill={palette.accent} />
            </G>
            <G>
              <Rect x="312" y="62" width="16" height="16" rx="3" fill={palette.pin} />
              <Rect x="316" y="66" width="8" height="8" rx="1" fill={palette.accent} />
            </G>
          </>
        )}

        {showCar && (
          <G transform={`translate(${car.x} ${car.y}) rotate(${angle})`}>
            <Rect x="-14" y="-8" width="28" height="16" rx="6" fill={palette.accent} opacity={0.22} />
            <Rect x="-12" y="-6" width="24" height="12" rx="5" fill={palette.accent} />
            <Rect x="-8" y="-3" width="16" height="6" rx="2" fill={palette.pin} opacity={0.9} />
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
