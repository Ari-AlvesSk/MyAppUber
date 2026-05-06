import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "car", selected: "car.fill" }} />
        <Label>Dirigir</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="earnings">
        <Icon sf={{ default: "dollarsign.circle", selected: "dollarsign.circle.fill" }} />
        <Label>Ganhos</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Conta</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0.5,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84, paddingTop: 8 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dirigir",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="car.fill" tintColor={color} size={24} />
            ) : (
              <Feather name="navigation" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Ganhos",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="dollarsign.circle.fill" tintColor={color} size={24} />
            ) : (
              <Feather name="dollar-sign" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Conta",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.fill" tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen name="pending" options={{ href: null }} />
    </Tabs>
  );
}

export default function DriverTabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
