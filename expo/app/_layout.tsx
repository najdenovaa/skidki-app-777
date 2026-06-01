import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { CityPicker } from "@/components/CityPicker";
import BrandSplash from "@/components/BrandSplash";
import ErrorBoundary from "@/components/ErrorBoundary";
import Colors from "@/constants/colors";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { DiscountsProvider } from "@/providers/DiscountsProvider";
import { PushProvider, usePush } from "@/providers/PushProvider";
import type { SelectedCity } from "@/types/api";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function GuestCityGate() {
  const { isGuest, hydrated, guestCity, saveGuestCity } = useAuth();
  const [showPicker, setShowPicker] = useState<boolean>(false);

  useEffect(() => {
    if (hydrated && isGuest && !guestCity) {
      const t = setTimeout(() => setShowPicker(true), 400);
      return () => clearTimeout(t);
    }
  }, [hydrated, isGuest, guestCity]);

  const handleSelect = useCallback(
    (c: SelectedCity) => {
      saveGuestCity(c);
      setShowPicker(false);
    },
    [saveGuestCity]
  );

  return (
    <CityPicker
      visible={showPicker}
      onSelect={handleSelect}
      onClose={() => setShowPicker(false)}
      title="Выбери город"
      subtitle="Чтобы показывать скидки рядом с тобой"
      showSkip
      onSkip={() => setShowPicker(false)}
    />
  );
}

function RootLayoutNav() {
  const { bannerNode } = usePush();

  return (
    <>
    {bannerNode}
    <Stack
      screenOptions={{
        headerBackTitle: "Назад",
        headerTintColor: Colors.text,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="post"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="auth/login"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="auth/register"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen name="discount/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="admin/index"
        options={{
          title: "Админ-панель",
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: "Уведомления",
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="privacy"
        options={{
          title: "Политика конфиденциальности",
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="terms"
        options={{
          title: "Пользовательское соглашение",
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="delete-account"
        options={{
          title: "Удаление аккаунта",
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="edit-post"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="support"
        options={{
          title: "Поддержка",
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="admin/user/[id]"
        options={{
          title: "Пользователь",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <Stack.Screen
        name="admin/discount/[id]"
        options={{
          title: "Редактировать",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <Stack.Screen
        name="admin/support/[userId]"
        options={{
          title: "Чат поддержки",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <Stack.Screen
        name="admin/push"
        options={{
          title: "Push-рассылка",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <Stack.Screen
        name="user/[id]"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
    </Stack>
    </>
  );
}

export default function RootLayout() {
  const [showBrandSplash, setShowBrandSplash] = useState(true);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <PushProvider>
              <DiscountsProvider>
                <ErrorBoundary>
                  <StatusBar style="light" />
                  <GuestCityGate />
                  <RootLayoutNav />
                  {showBrandSplash && (
                    <BrandSplash onFinish={() => setShowBrandSplash(false)} />
                  )}
                </ErrorBoundary>
              </DiscountsProvider>
            </PushProvider>
          </AuthProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
