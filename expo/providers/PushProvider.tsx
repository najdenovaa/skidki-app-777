import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/services/api";

const BANNER_DURATION_MS = 3_000;

type InAppBanner = {
  title: string;
  discountId: string;
};

export const [PushProvider, usePush] = createContextHook(() => {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [banner, setBanner] = useState<InAppBanner | null>(null);
  const bannerAnim = useRef<Animated.Value>(new Animated.Value(0)).current;
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  // ── Register for push ─────────────────────────────────────────────────
  useEffect(() => {
    const register = async () => {
      // Android channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Основные уведомления",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: Colors.primary,
        });
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: true },
        });
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        setPermissionGranted(false);
        return;
      }

      setPermissionGranted(true);

      try {
        const expoToken = (await Notifications.getExpoPushTokenAsync()).data;
        setToken(expoToken);
      } catch {
        // push token unavailable — ignore
      }
    };

    register();
  }, []);

  // ── Send token to server when authenticated ───────────────────────────
  useEffect(() => {
    if (!token || isGuest) return;
    api
      .registerPushToken(token, Platform.OS)
      .catch(() => {});
  }, [token, isGuest, user?.id]);

  // ── Show/hide in-app banner ──────────────────────────────────────────
  const showBanner = useCallback(
    (b: InAppBanner) => {
      // Clear existing timer
      if (bannerTimer.current) clearTimeout(bannerTimer.current);

      setBanner(b);
      Animated.spring(bannerAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();

      bannerTimer.current = setTimeout(() => {
        Animated.timing(bannerAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => setBanner(null));
      }, BANNER_DURATION_MS);
    },
    [bannerAnim]
  );

  // ── Listen for incoming notifications ─────────────────────────────────
  useEffect(() => {
    // Notification received while app is foregrounded — show in-app banner
    const receivedSub = Notifications.addNotificationReceivedListener((notif) => {
      const data = notif.request.content.data as Record<string, string> | undefined;
      const type = data?.type;
      const title = notif.request.content.title ?? data?.title ?? "";
      const discountId = data?.discountId ?? "";

      if (type === "new_discount" && title && discountId) {
        showBanner({ title, discountId });
      }
    });

    // Notification tapped (background/terminated) — navigate
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      const discountId = data?.discountId;
      if (discountId) {
        router.push(`/discount/${discountId}`);
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [router, showBanner]);

  // ── Banner press → navigate ──────────────────────────────────────────
  const onBannerPress = useCallback(() => {
    if (!banner) return;
    // Clear timer & hide
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    Animated.timing(bannerAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setBanner(null));
    router.push(`/discount/${banner.discountId}`);
  }, [banner, bannerAnim, router]);

  // ── Render in-app banner ─────────────────────────────────────────────
  const bannerNode = banner ? (
    <Animated.View
      style={[
        styles.banner,
        { top: insets.top + 8 },
        {
          opacity: bannerAnim,
          transform: [
            {
              translateY: bannerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-60, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable onPress={onBannerPress} style={styles.bannerInner}>
        <Text style={styles.bannerLabel} numberOfLines={1}>
          Новая скидка
        </Text>
        <Text style={styles.bannerTitle} numberOfLines={1}>
          {banner.title}
        </Text>
      </Pressable>
    </Animated.View>
  ) : null;

  return { token, permissionGranted, bannerNode };
});

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  bannerInner: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    shadowColor: "rgba(0,0,0,0.4)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  bannerLabel: {
    fontSize: 11,
    color: Colors.primary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  bannerTitle: {
    fontSize: 14,
    color: Colors.text,
    letterSpacing: -0.2,
    fontWeight: "600",
  },
});
