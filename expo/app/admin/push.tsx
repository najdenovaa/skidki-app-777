import { Stack, useRouter } from "expo-router";
import {
  ChevronDown,
  Globe,
  Megaphone,
  Search,
  Send,
  Shield,
  User,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { api } from "@/services/api";
import { useAuth } from "@/providers/AuthProvider";
import type { AdminUser, PushAudience, PushSendRecord, SendPushDTO } from "@/types/api";
import { formatFullDate, formatTimeAgo } from "@/utils/time";

type AudienceOption = {
  value: PushAudience;
  label: string;
  desc: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
};

const AUDIENCE_OPTIONS: AudienceOption[] = [
  { value: "all", label: "Всем пользователям", desc: "Включая гостей", icon: Globe },
  { value: "authorized", label: "Авторизованным", desc: "Только зарегистрированные", icon: Shield },
  { value: "specific", label: "Конкретному пользователю", desc: "Выбрать из списка", icon: User },
];

export default function AdminPushScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [audience, setAudience] = useState<PushAudience>("all");
  const [showAudiencePicker, setShowAudiencePicker] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  // Specific user search
  const [userSearch, setUserSearch] = useState<string>("");
  const [userResults, setUserResults] = useState<AdminUser[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserPicker, setShowUserPicker] = useState<boolean>(false);

  // History
  const [history, setHistory] = useState<PushSendRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);

  // ── Guard ──
  if (!user || user.role !== "admin") {
    return (
      <SafeAreaView edges={["top"]} style={styles.root}>
        <View style={styles.guard}>
          <Shield size={48} color={Colors.danger} strokeWidth={1.5} />
          <Text style={styles.guardTitle}>Нет доступа</Text>
          <Text style={styles.guardSubtitle}>Эта страница доступна только администраторам.</Text>
          <Pressable onPress={() => router.back()} style={styles.guardBtn}>
            <Text style={styles.guardBtnText}>Назад</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Load history ───────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const res = await api.getPushHistory();
    if (res.success && res.data) {
      setHistory(res.data);
    } else {
      // If backend not ready, use empty list
      setHistory([]);
    }
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ── Search users for specific audience ─────────────────────────────────
  const searchUsers = useCallback(async (q: string) => {
    setUserSearch(q);
    if (q.trim().length < 2) {
      setUserResults([]);
      return;
    }
    setSearchLoading(true);
    const res = await api.getAdminUsers(q);
    if (res.success && res.data) {
      setUserResults(res.data);
    }
    setSearchLoading(false);
  }, []);

  // ── Send push ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    Keyboard.dismiss();

    if (!title.trim()) {
      Alert.alert("Ошибка", "Введите заголовок уведомления");
      return;
    }
    if (!body.trim()) {
      Alert.alert("Ошибка", "Введите текст уведомления");
      return;
    }
    if (audience === "specific" && !selectedUser) {
      Alert.alert("Ошибка", "Выберите пользователя");
      return;
    }

    const dto: SendPushDTO = {
      title: title.trim(),
      body: body.trim(),
      audience,
      targetUserId: audience === "specific" ? selectedUser?.id : undefined,
      targetUserName: audience === "specific" ? selectedUser?.name : undefined,
    };

    setSending(true);
    const res = await api.sendPush(dto);
    setSending(false);

    if (res.success) {
      Alert.alert("Отправлено", `Рассылка успешно отправлена${res.data ? ` (${res.data.recipientCount} получателей)` : ""}`);
      setTitle("");
      setBody("");
      setAudience("all");
      setSelectedUser(null);
      loadHistory();
    } else {
      Alert.alert("Ошибка", res.error ?? "Не удалось отправить рассылку");
    }
  }, [title, body, audience, selectedUser, loadHistory]);

  const selectedAudienceOption = AUDIENCE_OPTIONS.find((o) => o.value === audience)!;

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: "Push-рассылка",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <SafeAreaView edges={["bottom"]} style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Compose ──────────────────────────────────────────────── */}
          <View style={styles.card}>
            {/* Title */}
            <Text style={styles.fieldLabel}>Заголовок</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Например: Новая функция в Скидос!"
              placeholderTextColor={Colors.textMuted}
              maxLength={100}
            />

            {/* Body */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Текст сообщения</Text>
            <TextInput
              style={styles.bodyInput}
              value={body}
              onChangeText={setBody}
              placeholder="Текст push-уведомления..."
              placeholderTextColor={Colors.textMuted}
              multiline
              textAlignVertical="top"
              maxLength={250}
            />
            <Text style={styles.charCount}>
              {body.length}/250
            </Text>

            {/* Audience selector */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Получатели</Text>
            <Pressable
              style={styles.audienceBtn}
              onPress={() => setShowAudiencePicker(!showAudiencePicker)}
            >
              <selectedAudienceOption.icon size={18} color={Colors.primary} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.audienceLabel}>{selectedAudienceOption.label}</Text>
                <Text style={styles.audienceDesc}>{selectedAudienceOption.desc}</Text>
              </View>
              <ChevronDown
                size={16}
                color={Colors.textMuted}
                strokeWidth={2}
                style={{ transform: [{ rotate: showAudiencePicker ? "180deg" : "0deg" }] }}
              />
            </Pressable>

            {showAudiencePicker && (
              <View style={styles.audienceDropdown}>
                {AUDIENCE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = opt.value === audience;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[styles.audienceOption, isSelected && styles.audienceOptionSelected]}
                      onPress={() => {
                        setAudience(opt.value);
                        setShowAudiencePicker(false);
                        if (opt.value !== "specific") setSelectedUser(null);
                      }}
                    >
                      <Icon
                        size={17}
                        color={isSelected ? "#fff" : Colors.textMuted}
                        strokeWidth={2}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.audienceOptionLabel,
                            isSelected && styles.audienceOptionLabelSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text style={styles.audienceDesc}>{opt.desc}</Text>
                      </View>
                      {isSelected && (
                        <View style={styles.checkDot}>
                          <View style={styles.checkDotInner} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Specific user picker */}
            {audience === "specific" && (
              <View style={{ marginTop: 12 }}>
                {selectedUser ? (
                  <View style={styles.selectedUser}>
                    <View style={styles.selectedUserInfo}>
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>
                          {selectedUser.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.selectedUserName}>
                          #{selectedUser.displayId} {selectedUser.name}
                        </Text>
                        <Text style={styles.selectedUserEmail}>{selectedUser.email}</Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => {
                        setSelectedUser(null);
                        setUserSearch("");
                        setShowUserPicker(false);
                      }}
                      hitSlop={8}
                    >
                      <X size={18} color={Colors.textMuted} strokeWidth={2} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={styles.userSearchBtn}
                    onPress={() => setShowUserPicker(!showUserPicker)}
                  >
                    <Search size={16} color={Colors.textMuted} strokeWidth={2} />
                    <Text style={styles.userSearchPlaceholder}>
                      Найти пользователя...
                    </Text>
                  </Pressable>
                )}

                {showUserPicker && !selectedUser && (
                  <View style={styles.userDropdown}>
                    <View style={styles.userSearchBar}>
                      <Search size={16} color={Colors.textMuted} strokeWidth={2} />
                      <TextInput
                        style={styles.userSearchInput}
                        placeholder="Поиск по имени, email, #id..."
                        placeholderTextColor={Colors.textMuted}
                        value={userSearch}
                        onChangeText={searchUsers}
                        autoFocus
                      />
                      {searchLoading && (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      )}
                    </View>
                    {userResults.length === 0 && userSearch.length >= 2 && !searchLoading ? (
                      <Text style={styles.noUsers}>Ничего не найдено</Text>
                    ) : (
                      <ScrollView style={styles.userResultsList} keyboardShouldPersistTaps="handled">
                        {userResults.map((u) => (
                          <Pressable
                            key={u.id}
                            style={styles.userResultRow}
                            onPress={() => {
                              setSelectedUser(u);
                              setShowUserPicker(false);
                              setUserSearch("");
                              setUserResults([]);
                            }}
                          >
                            <View style={styles.userAvatar}>
                              <Text style={styles.userAvatarText}>
                                {u.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.userResultName}>
                                #{u.displayId} {u.name}
                              </Text>
                              <Text style={styles.userResultEmail}>{u.email}</Text>
                            </View>
                            {u.role === "admin" && (
                              <View style={styles.roleBadge}>
                                <Shield size={9} color={Colors.primary} strokeWidth={2} />
                                <Text style={styles.roleBadgeText}>admin</Text>
                              </View>
                            )}
                          </Pressable>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Send button */}
            <Pressable
              style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={20} color="#fff" strokeWidth={2} />
              )}
              <Text style={styles.sendBtnText}>
                {sending ? "Отправка..." : "Отправить рассылку"}
              </Text>
            </Pressable>
          </View>

          {/* ── History ──────────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>История рассылок</Text>
          {historyLoading ? (
            <View style={styles.historyLoader}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : history.length === 0 ? (
            <View style={styles.empty}>
              <Megaphone size={36} color={Colors.textMuted} strokeWidth={1.5} />
              <Text style={styles.emptyText}>Рассылок пока не было</Text>
            </View>
          ) : (
            <View style={styles.historyGroup}>
              {history.map((item, i) => (
                <View key={item.id}>
                  {i > 0 && <View style={styles.historySep} />}
                  <View style={styles.historyRow}>
                    <Megaphone size={16} color={Colors.primary} strokeWidth={2} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.historyBody} numberOfLines={1}>
                        {item.body}
                      </Text>
                      <View style={styles.historyMeta}>
                        <Text style={styles.historyAudience}>
                          {item.audience === "all"
                            ? "Всем"
                            : item.audience === "authorized"
                              ? "Авторизованным"
                              : item.targetUserName ?? "Пользователю"}
                        </Text>
                        <Text style={styles.historyDot}>·</Text>
                        <Text style={styles.historyCount}>
                          {item.recipientCount} получателей
                        </Text>
                        <Text style={styles.historyDot}>·</Text>
                        <Text style={styles.historyTime}>
                          {formatTimeAgo(item.sentAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

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

  // ── Card (compose form) ───────────────────────────────────────────
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    letterSpacing: -0.2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  bodyInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    letterSpacing: -0.2,
    minHeight: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  charCount: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "right" as const,
    marginTop: 4,
    marginRight: 4,
  },

  // ── Audience ──────────────────────────────────────────────────────
  audienceBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  audienceLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  audienceDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
    letterSpacing: -0.1,
  },
  audienceDropdown: {
    marginTop: 4,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  audienceOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  audienceOptionSelected: {
    backgroundColor: Colors.primary,
  },
  audienceOptionLabel: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  audienceOptionLabelSelected: {
    color: "#fff",
  },
  checkDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  checkDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },

  // ── Specific user ─────────────────────────────────────────────────
  selectedUser: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectedUserInfo: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  selectedUserName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  selectedUserEmail: {
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: -0.1,
  },
  userSearchBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  userSearchPlaceholder: {
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: -0.2,
  },
  userDropdown: {
    marginTop: 4,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  userSearchBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  userSearchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  userResultsList: { maxHeight: 200 },
  userResultRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  userResultName: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  userResultEmail: {
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: -0.1,
  },
  noUsers: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center" as const,
    paddingVertical: 16,
  },

  // User avatar shared
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardSecondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  userAvatarText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    letterSpacing: -0.3,
  },
  roleBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary + "1A",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.primary,
    letterSpacing: 0,
  },

  // ── Send button ───────────────────────────────────────────────────
  sendBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
    gap: 8,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#fff",
    letterSpacing: -0.3,
  },

  // ── History ───────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  historyLoader: { paddingVertical: 20, alignItems: "center" as const },
  historyGroup: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    overflow: "hidden" as const,
  },
  historyRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    padding: 14,
    gap: 12,
  },
  historySep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 42,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  historyBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  historyMeta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: 4,
    gap: 4,
  },
  historyAudience: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "500" as const,
  },
  historyDot: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  historyCount: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  historyTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // ── Empty ─────────────────────────────────────────────────────────
  empty: { paddingVertical: 30, alignItems: "center" as const },
  emptyText: { fontSize: 14, color: Colors.textMuted, marginTop: 8 },

  // ── Guard ─────────────────────────────────────────────────────────
  guard: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 40,
    gap: 12,
  },
  guardTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    letterSpacing: -0.5,
    marginTop: 8,
  },
  guardSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  guardBtn: {
    marginTop: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  guardBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
});
