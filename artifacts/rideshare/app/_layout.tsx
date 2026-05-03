import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LocationProvider } from "@/context/LocationContext";
import { RideProvider } from "@/context/RideContext";

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
                <GestureHandlerRootView>
                  <KeyboardProvider>
                    <AuthGate>
                      <RootLayoutNav />
                    </AuthGate>
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
