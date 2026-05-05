import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Feather } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LocationProvider, useLocation } from "@/context/LocationContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { RideProvider } from "@/context/RideContext";
import { useColors } from "@/hooks/useColors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;

    const first = segments[0] as string | undefined;
    const inAuthScreens = first === "login" || first === "register";
    const inDriverArea = first === "(driver)";
    const inPassengerTabs = first === "(tabs)" || first === undefined;
    const inAdmin = first === "admin";
    const inPending =
      inDriverArea && (segments[1] as string | undefined) === "pending";

    if (!user) {
      if (!inAuthScreens) router.replace("/login");
      return;
    }

    if (inAuthScreens) {
      if (user.role === "admin") router.replace("/admin");
      else if (user.role === "driver") {
        if (user.driverStatus === "pending" || user.driverStatus === "rejected")
          router.replace("/(driver)/pending");
        else router.replace("/(driver)");
      } else {
        router.replace("/(tabs)");
      }
      return;
    }

    if (user.role === "admin") {
      if (!inAdmin) router.replace("/admin");
      return;
    }

    if (user.role === "driver") {
      const needsPending =
        user.driverStatus === "pending" || user.driverStatus === "rejected";
      if (needsPending && !inPending) { router.replace("/(driver)/pending"); return; }
      if (!needsPending && inPending) { router.replace("/(driver)"); return; }
      if (inPassengerTabs) { router.replace("/(driver)"); return; }
      if (inAdmin) { router.replace("/(driver)"); return; }
    }

    if (user.role === "passenger") {
      if (inDriverArea || inAdmin) router.replace("/(tabs)");
    }
  }, [user, hydrated, segments, router]);

  return <>{children}</>;
}

function LocationGate({ children }: { children: React.ReactNode }) {
  const { granted, requestPermission, loading } = useLocation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (granted === null || granted === false) {
      (async () => {
        setRequesting(true);
        await requestPermission();
        setRequesting(false);
      })();
    }
  }, []);

  if (granted === false) {
    return (
      <View style={[lg.root, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <View style={[lg.icon, { backgroundColor: "#EF444420" }]}>
          <Feather name="map-pin" size={36} color="#EF4444" />
        </View>
        <Text style={[lg.title, { color: colors.foreground }]}>Localização necessária</Text>
        <Text style={[lg.body, { color: colors.mutedForeground }]}>
          O Paraúna Mobi não funciona corretamente sem acesso à sua localização. Precisamos dela para exibir o mapa, encontrar corridas próximas e calcular rotas.
        </Text>
        <Pressable
          onPress={async () => {
            setRequesting(true);
            await requestPermission();
            setRequesting(false);
          }}
          style={({ pressed }) => [lg.btn, { backgroundColor: colors.accent, opacity: pressed || requesting || loading ? 0.75 : 1 }]}
          disabled={requesting || loading}
        >
          <Feather name="map-pin" size={18} color={colors.accentForeground} />
          <Text style={[lg.btnTxt, { color: colors.accentForeground }]}>
            {requesting || loading ? "Solicitando..." : "Permitir localização"}
          </Text>
        </Pressable>
        <Text style={[lg.hint, { color: colors.mutedForeground }]}>
          Se você negou a permissão permanentemente, acesse as configurações do dispositivo e habilite a localização para o Paraúna Mobi.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const lg = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  icon: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.3 },
  body: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 23 },
  btn: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 28, paddingVertical: 16, borderRadius: 18, marginTop: 8 },
  btnTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
});

function RootLayoutNav() {
  const slideRight = { animation: "slide_from_right" as const };
  return (
    <Stack screenOptions={{ headerBackTitle: "Voltar" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(driver)" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="login" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="register" options={{ headerShown: false, ...slideRight }} />
      <Stack.Screen name="booking" options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="ride/[id]" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="profile-edit" options={{ headerShown: false, ...slideRight }} />
      <Stack.Screen name="payment-methods" options={{ headerShown: false, ...slideRight }} />
      <Stack.Screen name="promos" options={{ headerShown: false, ...slideRight }} />
      <Stack.Screen name="security" options={{ headerShown: false, ...slideRight }} />
      <Stack.Screen name="notifications" options={{ headerShown: false, ...slideRight }} />
      <Stack.Screen name="help" options={{ headerShown: false, ...slideRight }} />
      <Stack.Screen name="legal" options={{ headerShown: false, ...slideRight }} />
      <Stack.Screen name="driver-docs" options={{ headerShown: false, ...slideRight }} />
      <Stack.Screen name="driver-vehicle" options={{ headerShown: false, ...slideRight }} />
      <Stack.Screen name="driver-tax" options={{ headerShown: false, ...slideRight }} />
      <Stack.Screen name="location-picker" options={{ headerShown: false, animation: "slide_from_bottom" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RideProvider>
              <LocationProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <NotificationProvider>
                      <AuthGate>
                        <LocationGate>
                          <RootLayoutNav />
                        </LocationGate>
                      </AuthGate>
                    </NotificationProvider>
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </LocationProvider>
            </RideProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
