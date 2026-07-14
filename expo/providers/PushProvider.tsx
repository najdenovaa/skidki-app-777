import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, AppState, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/services/api";
import type { PushMessage } from "@/types/api";
import { fetchPushToken } from "@/utils/pushToken";

// ── Set global notification handler ──────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const MESSAGES_KEY = "skidki.notifications.messages";
const UNREAD_KEY = "skidki.notifications.unread";
const BANNER_DURATION_MS = 3_500;
const UNREAD_POLL_MS = 15_000;

type InAppBanner = {
  title: string;
  body: string;
  discountId?: string;
  type: string;
};

export const [PushProvider, usePush] = createContextHook(() => {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [messages, setMessages] = useState<PushMessage[]>([]);
  const [banner, setBanner] = useState<InAppBanner | null>(null);
  const bannerAnim = useRef<Animated.Value>(new Animated.Value(0)).current;
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unreadPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const insets = useSafeAreaInsets();

  // ── Load cached messages + unread count on mount ──────────────────────
  useEffect(() => {
    const loadCache = async () => {
      try {
        const [msgsRaw, unreadRaw] = await Promise.all([
          AsyncStorage.getItem(MESSAGES_KEY),
          AsyncStorage.getItem(UNREAD_KEY),
        ]);
        if (msgsRaw) {
          const parsed = JSON.parse(msgsRaw) as PushMessage[];
          setMessages(parsed);
        }
        if (unreadRaw) {
          setUnreadCount(parseInt(unreadRaw, 10) || 0);
        }
      } catch {
        // ignore
      }
    };
    loadCache();
  }, []);

  // ── Persist messages to AsyncStorage when they change ─────────────────
  const persistMessages = useCallback(async (msgs: PushMessage[]) => {
    try {
      await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs.slice(0, 200)));
    } catch {
      // ignore
    }
  }, []);

  const persistUnread = useCallback(async (n: number) => {
    try {
      await AsyncStorage.setItem(UNREAD_KEY, String(n));
    } catch {
      // ignore
    }
  }, []);

  // ── Sync badge count ──────────────────────────────────────────────────
  const syncBadge = useCallback(async (n: number) => {
    try {
      await Notifications.setBadgeCountAsync(n);
    } catch {
      // ignore
    }
  }, []);

  // ── Add a local message (persisted) ───────────────────────────────────
  const addLocalMessage = useCallback(
    (msg: PushMessage) => {
      setMessages((prev) => {
        const next = [msg, ...prev];
        persistMessages(next);
        return next;
      });
      setUnreadCount((prev) => {
        const n = prev + 1;
        persistUnread(n);
        syncBadge(n);
        return n;
      });
    },
    [persistMessages, persistUnread, syncBadge]
  );

  // ── Mark single message as read ───────────────────────────────────────
  const markRead = useCallback(
    async (id: string) => {
      // Optimistic local update
      let newCount = unreadCount;
      setMessages((prev) => {
        const next = prev.map((m) => {
          if (m.id === id && !m.read) {
            newCount = Math.max(0, unreadCount - 1);
            return { ...m, read: true };
          }
          return m;
        });
        persistMessages(next);
        return next;
      });
      if (newCount !== unreadCount) {
        setUnreadCount(newCount);
        persistUnread(newCount);
        syncBadge(newCount);
      }
      // Try backend
      api.markNotificationRead(id).catch(() => {});
    },
    [unreadCount, persistMessages, persistUnread, syncBadge]
  );

  // ── Mark all as read ──────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    setMessages((prev) => {
      const next = prev.map((m) => ({ ...m, read: true }));
      persistMessages(next);
      return next;
    });
    setUnreadCount(0);
    persistUnread(0);
    syncBadge(0);
    api.markAllNotificationsRead().catch(() => {});
  }, [persistMessages, persistUnread, syncBadge]);

  // ── Refresh from server ───────────────────────────────────────────────
  const refreshMessages = useCallback(async () => {
    if (isGuest) return;
    try {
      const res = await api.getNotifications();
      if (res.success && res.data) {
        setMessages(res.data);
        persistMessages(res.data);
        const unread = res.data.filter((m) => !m.read).length;
        setUnreadCount(unread);
        persistUnread(unread);
        syncBadge(unread);
      }
    } catch {
      // server unavailable — keep local cache
    }
  }, [isGuest, persistMessages, persistUnread, syncBadge]);

  // ── Poll unread count from server ─────────────────────────────────────
  useEffect(() => {
    if (isGuest || !token) return;
    // Initial fetch
    refreshMessages();
    // Periodic poll
    unreadPollRef.current = setInterval(refreshMessages, UNREAD_POLL_MS);
    return () => {
      if (unreadPollRef.current) clearInterval(unreadPollRef.current);
    };
  }, [isGuest, token, refreshMessages]);

  // ── Register for push ─────────────────────────────────────────────────
  useEffect(() => {
    const register = async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Основные уведомления",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: Colors.primary,
        });

        if (Number(Platform.Version) >= 33) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          if (result !== PermissionsAndroid.RESULTS.GRANTED) {
            setPermissionGranted(false);
            return;
          }
        }
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: true },
          android: {},
        });
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        setPermissionGranted(false);
        return;
      }

      setPermissionGranted(true);

      try {
        const pushToken = await fetchPushToken();
        if (pushToken) setToken(pushToken);
      } catch {
        // push token unavailable — ignore
      }
    };

    register();
  }, []);

  // ── Re-fetch push token when user changes (login/logout) ──────────────
  useEffect(() => {
    if (isGuest || !permissionGranted) return;
    const load = async () => {
      await new Promise((r) => setTimeout(r, 500));
      const pushToken = await fetchPushToken();
      if (pushToken) setToken(pushToken);
    };
    load().catch(() => {});
  }, [user?.id, isGuest, permissionGranted]);

  // ── Send token to server when authenticated ───────────────────────────
  useEffect(() => {
    if (!token || isGuest) return;
    const send = async () => {
      for (let i = 0; i < 3; i++) {
        const res = await api.registerPushToken(token, Platform.OS);
        if (res.success) return;
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    send().catch(() => {});
  }, [token, isGuest, user?.id]);

  // ── Refresh messages when app becomes active ──────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refreshMessages();
      }
    });
    return () => sub.remove();
  }, [refreshMessages]);

  // ── Show/hide in-app banner ──────────────────────────────────────────
  const showBanner = useCallback(
    (b: InAppBanner) => {
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
    // Notification received while app is foregrounded
    const receivedSub = Notifications.addNotificationReceivedListener((notif) => {
      const data = notif.request.content.data as Record<string, string> | undefined;
      const type = data?.type ?? "system_message";
      const title = notif.request.content.title ?? data?.title ?? "";
      const body = notif.request.content.body ?? data?.body ?? "";
      const discountId = data?.discountId ?? "";

      // Save to local inbox
      const msg: PushMessage = {
        id: notif.request.identifier,
        title,
        body,
        type: type as PushMessage["type"],
        data: data ?? {},
        read: false,
        createdAt: Date.now(),
      };
      addLocalMessage(msg);

      // Show in-app banner for all notification types
      if (title) {
        showBanner({ title, body, discountId: discountId || undefined, type });
      }
    });

    // Notification tapped (background/terminated) — navigate
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      const type = data?.type;
      const discountId = data?.discountId;

      // Save to local inbox
      const notif = response.notification;
      const msg: PushMessage = {
        id: notif.request.identifier,
        title: notif.request.content.title ?? data?.title ?? "",
        body: notif.request.content.body ?? data?.body ?? "",
        type: (type as PushMessage["type"]) ?? "system_message",
        data: data ?? {},
        read: true, // It was tapped, so mark as read
        createdAt: Date.now(),
      };
      addLocalMessage(msg);

      // Navigate based on type
      if ((type === "new_discount" || type === "like_comment") && discountId) {
        router.push(`/discount/${discountId}`);
      } else {
        router.push("/notifications");
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [router, showBanner, addLocalMessage]);

  // ── Banner press → navigate ──────────────────────────────────────────
  const onBannerPress = useCallback(() => {
    if (!banner) return;
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    Animated.timing(bannerAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setBanner(null));
    if ((banner.type === "new_discount" || banner.type === "like_comment") && banner.discountId) {
      router.push(`/discount/${banner.discountId}`);
    } else {
      router.push("/notifications");
    }
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
          {banner.type === "new_discount"
            ? "Новая скидка"
            : banner.type === "like_comment"
              ? "Активность"
              : "Сообщение"}
        </Text>
        <Text style={styles.bannerTitle} numberOfLines={1}>
          {banner.title}
        </Text>
        {banner.body ? (
          <Text style={styles.bannerBody} numberOfLines={1}>
            {banner.body}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  ) : null;

  return {
    token,
    permissionGranted,
    bannerNode,
    unreadCount,
    messages,
    markRead,
    markAllRead,
    refreshMessages,
    addLocalMessage,
  };
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
  bannerBody: {
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: -0.1,
    marginTop: 2,
  },
});
