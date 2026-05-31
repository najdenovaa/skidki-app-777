import { Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Bell,
  BellOff,
  Heart,
  MessageCircle,
  Tag,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { CATEGORIES } from "@/constants/categories";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/services/api";
import type {
  NotificationSettings,
  NotificationSubscription,
} from "@/types/api";
import type { Category } from "@/types/discount";

type SubState = Record<Category, NotificationSubscription | null>;

const DEFAULT_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  newDiscounts: true,
  likesComments: true,
};

function impact() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [subs, setSubs] = useState<SubState>(
    () =>
      Object.fromEntries(
        CATEGORIES.map((c) => [c.id, null])
      ) as SubState
  );
  const [loaded, setLoaded] = useState<boolean>(false);

  const cityId = user?.city ?? "";

  // Load settings + subscriptions
  useEffect(() => {
    Promise.all([
      api.getNotificationSettings(),
      api.getSubscriptions(),
    ]).then(([settingsRes, subsRes]) => {
      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
      }
      if (subsRes.success && subsRes.data) {
        const map = { ...subs } as SubState;
        for (const sub of subsRes.data) {
          map[sub.categoryId as Category] = sub;
        }
        setSubs(map);
      }
      setLoaded(true);
    });
  }, []);

  // ── Update a single settings toggle ──────────────────────────────────
  const updateSetting = useCallback(
    async (key: keyof NotificationSettings, value: boolean) => {
      impact();
      const optimistic = { ...settings, [key]: value };
      setSettings(optimistic);

      const res = await api.updateNotificationSettings({ [key]: value });
      if (res.success && res.data) {
        setSettings(res.data);
      } else {
        // Revert on error
        setSettings(settings);
      }
    },
    [settings]
  );

  // ── Toggle category subscription ─────────────────────────────────────
  const toggleCategory = useCallback(
    async (catId: Category) => {
      impact();
      const existing = subs[catId];

      if (existing) {
        // Unsubscribe — optimistic
        setSubs((prev) => ({ ...prev, [catId]: null }));
        const res = await api.unsubscribeCategory(existing.id);
        if (!res.success) {
          setSubs((prev) => ({ ...prev, [catId]: existing }));
        }
      } else if (cityId) {
        // Subscribe — optimistic
        setSubs((prev) => ({ ...prev, [catId]: { id: "pending", categoryId: catId, cityId } }));
        const res = await api.subscribeCategory(catId, cityId);
        if (res.success && res.data) {
          setSubs((prev) => ({ ...prev, [catId]: res.data! }));
        } else {
          setSubs((prev) => ({ ...prev, [catId]: null }));
        }
      }
    },
    [subs, cityId]
  );

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: "Уведомления",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <SafeAreaView edges={["bottom"]} style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* ── Section 1: General settings ── */}
          <Text style={styles.sectionLabel}>Общие настройки</Text>
          <View style={styles.group}>
            {/* Push toggle */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                {settings.pushEnabled ? (
                  <Bell size={20} color={Colors.primary} strokeWidth={2} />
                ) : (
                  <BellOff size={20} color={Colors.textMuted} strokeWidth={2} />
                )}
                <Text style={styles.rowLabel}>Push-уведомления</Text>
              </View>
              <Switch
                value={settings.pushEnabled}
                onValueChange={(v) => updateSetting("pushEnabled", v)}
                trackColor={{ false: Colors.borderLight, true: Colors.primaryDark }}
                thumbColor={settings.pushEnabled ? Colors.primary : Colors.textMuted}
              />
            </View>

            <View style={styles.separator} />

            {/* New discounts toggle */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Tag size={20} color={Colors.primary} strokeWidth={2} />
                <View style={styles.rowLeftText}>
                  <Text style={styles.rowLabel}>Новые скидки</Text>
                  <Text style={styles.rowHint}>
                    Уведомления о скидках в подписанных категориях
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.newDiscounts}
                onValueChange={(v) => updateSetting("newDiscounts", v)}
                trackColor={{ false: Colors.borderLight, true: Colors.primaryDark }}
                thumbColor={settings.newDiscounts ? Colors.primary : Colors.textMuted}
              />
            </View>

            <View style={styles.separator} />

            {/* Likes & comments toggle */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Heart size={20} color={Colors.primary} strokeWidth={2} />
                <View style={styles.rowLeftText}>
                  <Text style={styles.rowLabel}>Лайки и комментарии</Text>
                  <Text style={styles.rowHint}>
                    Уведомления об активности на моих скидках
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.likesComments}
                onValueChange={(v) => updateSetting("likesComments", v)}
                trackColor={{ false: Colors.borderLight, true: Colors.primaryDark }}
                thumbColor={settings.likesComments ? Colors.primary : Colors.textMuted}
              />
            </View>
          </View>

          {/* ── Section 2: Category subscriptions ── */}
          <Text style={styles.sectionLabel}>
            Уведомлять о новых скидках в:
          </Text>
          <View style={styles.group}>
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              const sub = subs[cat.id];
              const isSubscribed = sub !== null;
              const isLast = i === CATEGORIES.length - 1;

              return (
                <View key={cat.id}>
                  {i > 0 && <View style={styles.separator} />}
                  <View style={styles.row}>
                    <View style={styles.rowLeft}>
                      <View
                        style={[
                          styles.catIconDot,
                          { backgroundColor: cat.color },
                        ]}
                      >
                        <Icon size={12} color="#fff" strokeWidth={2.5} />
                      </View>
                      <View style={styles.rowLeftText}>
                        <Text style={styles.rowLabel}>{cat.label}</Text>
                        {isSubscribed && cityId ? (
                          <Text style={styles.rowHint}>
                            в городе: {user?.city || "Москва"}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <Switch
                      value={isSubscribed}
                      onValueChange={() => toggleCategory(cat.id)}
                      trackColor={{ false: Colors.borderLight, true: Colors.primaryDark }}
                      thumbColor={isSubscribed ? Colors.primary : Colors.textMuted}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },

  sectionLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 10,
    marginLeft: 4,
  },

  group: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  rowLeftText: { flexShrink: 1 },
  rowLabel: {
    fontSize: 15,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  rowHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    letterSpacing: -0.1,
  },

  catIconDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 56,
  },
});
