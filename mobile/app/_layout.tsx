import React, { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/lib/auth";
import { restoreCache, persistCache } from "@/lib/persistQueryClient";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import NetworkStatusBar from "@/components/ui/NetworkStatusBar";
import "@/lib/i18n";
import "../../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Restore cached data on startup
    restoreCache(queryClient).then(() => {
      SplashScreen.hideAsync();
    });

    // Persist cache periodically
    const interval = setInterval(() => {
      persistCache(queryClient);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <StatusBar style="light" />
              <NetworkStatusBar />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: "#0f172a" },
                  headerStyle: { backgroundColor: "#0f172a" },
                  headerTintColor: "#f8fafc",
                  headerTitleStyle: { fontWeight: "600" },
                }}
              >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="agents/[slug]"
                  options={{
                    headerShown: true,
                    headerTitle: "",
                    headerTransparent: true,
                  }}
                />
                <Stack.Screen
                  name="settings/profile"
                  options={{ headerShown: true, headerTitle: "Profile" }}
                />
                <Stack.Screen
                  name="settings/security"
                  options={{ headerShown: true, headerTitle: "Security" }}
                />
                <Stack.Screen
                  name="settings/language"
                  options={{ headerShown: true, headerTitle: "Language" }}
                />
                <Stack.Screen
                  name="settings/subscription"
                  options={{ headerShown: true, headerTitle: "Subscription" }}
                />
                <Stack.Screen
                  name="settings/notifications"
                  options={{
                    headerShown: true,
                    headerTitle: "Notifications",
                  }}
                />
              </Stack>
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
