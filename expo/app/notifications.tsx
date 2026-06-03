import { Stack, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Bell,
  BellOff,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  Heart,
  Mail,
  Megaphone,
  MessageCircle,
  Tag,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
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
import { usePush } from "@/providers/PushProvider";
import { useBiometricSetting } from "@/components/BiometricGate";
import { api } from "@/services/api";
import type {
  NotificationSettings,
  NotificationSubscription,
} from "@/types/api";
import type { PushMessage } from "@/types/api";
import type { Category } from "@/types/discount";
import { formatTimeAgo } from "@/utils/time";

type SubState = Record<Category, NotificationSubscription | null>;

const DEFAULT_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  newDiscounts: true,
  likesEnabled: true,
  commentsEnabled: true,
};

type Tab = "messages" | "settings";

function impact() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

function NotificationIcon({ type }: { type: PushMessage["type"] }) {
  const iconProps = { size: 18, strokeWidth: 2 } as const;
  switch (type) {
    case "new_discount":
      return <Tag {...iconProps} color={Colors.primary} />;
    case "like_comment":
      return <Heart {...iconProps} color={Colors.accent} />;
    case "system_message":
      return <Megaphone {...iconProps} color={Colors.info} />;
  }
}

function NotificationLabel({ type }: { type: PushMessage["type"] }) {
  switch (type) {
    case "new_discount":
      return "Новая скидка";
    case "like_comment":
      return "Активность";
    case "system_message":
      return "Системное сообщение";
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { messages, unreadCount, markRead, markAllRead, refreshMessages } = usePush();
  const [tab, setTab] = useState<Tab>(unreadCount > 0 ? "messages" : "messages");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const { enabled: biometricEnabled, available: biometricAvailable, setEnabled: setBiometricEnabled, refresh: refreshBiometric } = useBiometricSetting();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshMessages();
    setRefreshing(false);
  }, [refreshMessages]);

  // ── Messages Tab ───────────────────────────────────────────────────────
  const renderMessage = useCallback(
    ({ item }: { item: PushMessage }) => (
      <Pressable
        style={[styles.msgRow, !item.read && styles.msgUnread]}
        onPress={() => {
          if (!item.read) markRead(item.id);
          if ((item.type === "new_discount" || item.type === "like_comment") && item.data?.discountId) {
            router.push(`/discount/${item.data.discountId}`);
          }
        }}
      >
        <View style={[styles.msgIconDot, !item.read && styles.msgIconDotUnread]}>
          <NotificationIcon type={item.type} />
        </View>
        <View style={styles.msgContent}>
          <View style={styles.msgHeader}>
            <Text style={[styles.msgType, !item.read && styles.msgTypeUnread]}>
              {NotificationLabel({ type: item.type } as { type: PushMessage["type"] })}
            </Text>
            <Text style={styles.msgTime}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
          <Text style={[styles.msgTitle, !item.read && styles.msgTitleUnread]}>
            {item.title}
          </Text>
          {item.body ? (
            <Text style={styles.msgBody}>
              {item.body}
            </Text>
          ) : null}
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </Pressable>
    ),
    [markRead]
  );

  const messagesList = useMemo(
    () => (
      <FlatList
        data={messages}
        keyExtractor={(m) => String(m.id)}
        renderItem={renderMessage}
        contentContainerStyle={styles.msgList}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          messages.length > 0 ? (
            <Pressable style={styles.markAllBtn} onPress={markAllRead}>
              <CheckCheck size={16} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.markAllText}>Прочитать все</Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Mail size={48} color={Colors.textMuted} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Нет сообщений</Text>
            <Text style={styles.emptyText}>
              Здесь будут появляться уведомления о новых скидках, активности и системные сообщения
            </Text>
          </View>
        }
      />
    ),
    [messages, refreshing, onRefresh, renderMessage, markAllRead]
  );

  // ── Settings Tab ──────────────────────────────────────────────────────
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [subs, setSubs] = useState<SubState>(
    () =>
      Object.fromEntries(
        CATEGORIES.map((c) => [c.id, null])
      ) as SubState
  );
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState<boolean>(false);

  const cityId = user?.cityId != null ? String(user.cityId) : "";

  useEffect(() => {
    if (tab !== "settings" || settingsLoaded) return;
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
      setSettingsLoaded(true);
    });
  }, [tab, settingsLoaded]);

  const updateSetting = useCallback(
    async (key: keyof NotificationSettings, value: boolean) => {
      impact();
      const optimistic = { ...settings, [key]: value };
      setSettings(optimistic);
      const res = await api.updateNotificationSettings({ [key]: value });
      if (res.success && res.data) {
        setSettings(res.data);
      } else if (!res.success) {
        setSettings(settings);
      }
    },
    [settings]
  );

  const toggleCategory = useCallback(
    async (catId: Category) => {
      impact();
      const existing = subs[catId];
      if (existing) {
        setSubs((prev) => ({ ...prev, [catId]: null }));
        const res = await api.unsubscribeCategory(existing.id);
        if (!res.success) {
          setSubs((prev) => ({ ...prev, [catId]: existing }));
        }
      } else {
        const cityParam = cityId || undefined;
        setSubs((prev) => ({ ...prev, [catId]: { id: "pending", categoryId: catId, cityId: cityParam ?? "" } }));
        const res = await api.subscribeCategory(catId, cityParam);
        if (res.success && res.data) {
          setSubs((prev) => ({ ...prev, [catId]: res.data! }));
        } else if (res.success) {
          const reload = await api.getSubscriptions();
          if (reload.success && reload.data) {
            const map = { ...subs } as SubState;
            for (const sub of reload.data) {
              map[sub.categoryId as Category] = sub;
            }
            setSubs(map);
          } else {
            setSubs((prev) => ({ ...prev, [catId]: null }));
          }
        } else {
          setSubs((prev) => ({ ...prev, [catId]: null }));
        }
      }
    },
    [subs, cityId]
  );

  const settingsTab = useMemo(
    () => (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.settingsScroll}
      >
        {/* ── General settings ── */}
        <Text style={styles.sectionLabel}>Общие настройки</Text>
        <View style={styles.group}>
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

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Heart size={20} color={Colors.primary} strokeWidth={2} />
              <View style={styles.rowLeftText}>
                <Text style={styles.rowLabel}>Лайки</Text>
                <Text style={styles.rowHint}>
                  Уведомления о новых лайках на моих скидках
                </Text>
              </View>
            </View>
            <Switch
              value={settings.likesEnabled}
              onValueChange={(v) => updateSetting("likesEnabled", v)}
              trackColor={{ false: Colors.borderLight, true: Colors.primaryDark }}
              thumbColor={settings.likesEnabled ? Colors.primary : Colors.textMuted}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <MessageCircle size={20} color={Colors.primary} strokeWidth={2} />
              <View style={styles.rowLeftText}>
                <Text style={styles.rowLabel}>Комментарии</Text>
                <Text style={styles.rowHint}>
                  Уведомления о новых комментариях на моих скидках
                </Text>
              </View>
            </View>
            <Switch
              value={settings.commentsEnabled}
              onValueChange={(v) => updateSetting("commentsEnabled", v)}
              trackColor={{ false: Colors.borderLight, true: Colors.primaryDark }}
              thumbColor={settings.commentsEnabled ? Colors.primary : Colors.textMuted}
            />
          </View>
        </View>

        {/* ── Biometric security ── */}
        {biometricAvailable ? (
          <>
            <Text style={styles.sectionLabel}>Безопасность</Text>
            <View style={styles.group}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Fingerprint size={20} color={Colors.primary} strokeWidth={2} />
                  <View style={styles.rowLeftText}>
                    <Text style={styles.rowLabel}>Вход по Face ID / Touch ID</Text>
                    <Text style={styles.rowHint}>
                      При возврате в приложение — подтверждение биометрией
                    </Text>
                  </View>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={async (v) => {
                    impact();
                    const ok = await setBiometricEnabled(v);
                    if (!ok) await refreshBiometric();
                  }}
                  trackColor={{ false: Colors.borderLight, true: Colors.primaryDark }}
                  thumbColor={biometricEnabled ? Colors.primary : Colors.textMuted}
                />
              </View>
            </View>
          </>
        ) : null}

        {/* ── Category subscriptions ── */}
        <Pressable
          style={styles.sectionHeader}
          onPress={() => setCategoriesExpanded((v) => !v)}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 4 }]}>
              Категории скидок
            </Text>
            {!categoriesExpanded && (() => {
              const activeIds = CATEGORIES.filter((c) => subs[c.id] !== null);
              const activeCount = activeIds.length;
              return (
                <View style={styles.catSummary}>
                  <Text style={styles.catSummaryText}>
                    {activeCount} из {CATEGORIES.length} включено
                  </Text>
                  <View style={styles.catChipsRow}>
                    {activeIds.slice(0, 5).map((c) => (
                      <View
                        key={c.id}
                        style={[styles.catMiniChip, { backgroundColor: c.color + "30" }]}
                      >
                        <View style={[styles.catMiniDot, { backgroundColor: c.color }]} />
                      </View>
                    ))}
                    {activeIds.length > 5 && (
                      <Text style={styles.catMoreText}>+{activeIds.length - 5}</Text>
                    )}
                  </View>
                </View>
              );
            })()}
          </View>
          {categoriesExpanded ? (
            <ChevronUp size={18} color={Colors.textMuted} strokeWidth={2} />
          ) : (
            <ChevronDown size={18} color={Colors.textMuted} strokeWidth={2} />
          )}
        </Pressable>

        {categoriesExpanded ? (
          <View style={styles.group}>
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              const sub = subs[cat.id];
              const isSubscribed = sub !== null;
              const switchDisabled = !settings.pushEnabled || !settings.newDiscounts;

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
                      disabled={switchDisabled}
                      trackColor={{ false: Colors.borderLight, true: cat.color + "40" }}
                      thumbColor={isSubscribed ? cat.color : Colors.textMuted}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.group} />
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    ),
    [settings, subs, cityId, user, updateSetting, toggleCategory, categoriesExpanded, biometricEnabled, biometricAvailable, setBiometricEnabled, refreshBiometric]
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
        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, tab === "messages" && styles.tabActive]}
            onPress={() => setTab("messages")}
          >
            <Mail size={15} color={tab === "messages" ? "#fff" : Colors.textMuted} strokeWidth={2} />
            <Text style={[styles.tabText, tab === "messages" && styles.tabTextActive]}>
              Сообщения
            </Text>
            {unreadCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={[styles.tab, tab === "settings" && styles.tabActive]}
            onPress={() => setTab("settings")}
          >
            <Bell size={15} color={tab === "settings" ? "#fff" : Colors.textMuted} strokeWidth={2} />
            <Text style={[styles.tabText, tab === "settings" && styles.tabTextActive]}>
              Настройки
            </Text>
          </Pressable>
        </View>

        {/* ── Tab content ───────────────────────────────────────────── */}
        {tab === "messages" ? messagesList : settingsTab}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },

  // ── Tabs ──────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: "row" as const,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 12,
  },
  tab: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textMuted,
    letterSpacing: -0.2,
  },
  tabTextActive: { color: "#fff" },
  tabBadge: {
    backgroundColor: Colors.danger,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#fff",
  },

  // ── Messages List ─────────────────────────────────────────────────
  msgList: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 },
  markAllBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  markAllText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "500" as const,
    letterSpacing: -0.2,
  },
  msgRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 4,
    borderRadius: 14,
    gap: 12,
  },
  msgUnread: {
    backgroundColor: Colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  msgIconDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.cardSecondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 2,
  },
  msgIconDotUnread: {
    backgroundColor: Colors.primaryDark,
  },
  msgContent: {
    flex: 1,
    gap: 2,
  },
  msgHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  msgType: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  msgTypeUnread: {
    color: Colors.primary,
  },
  msgTime: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: -0.1,
  },
  msgTitle: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    marginTop: 1,
  },
  msgTitleUnread: {
    color: Colors.text,
    fontWeight: "600" as const,
  },
  msgBody: {
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: -0.1,
    marginTop: 1,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },

  // ── Settings ─────────────────────────────────────────────────────
  settingsScroll: { paddingHorizontal: 20, paddingTop: 12 },
  sectionLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: 24,
    paddingVertical: 8,
    paddingRight: 4,
  },
  catSummary: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginTop: 4,
    marginLeft: 4,
  },
  catSummaryText: {
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
  },
  catChipsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  catMiniChip: {
    width: 16,
    height: 16,
    borderRadius: 5,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  catMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  catMoreText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 2,
  },
  group: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    overflow: "hidden" as const,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  rowLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
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
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 56,
  },

  // ── Empty ─────────────────────────────────────────────────────────
  empty: { paddingVertical: 60, alignItems: "center" as const, gap: 12 },
  emptyTitle: { fontSize: 17, color: Colors.text, letterSpacing: -0.3 },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center" as const,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
