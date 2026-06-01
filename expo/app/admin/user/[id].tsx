import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Shield,
  Trash2,
  MessageCircle,
  FileText,
  Eye,
  Heart,
  ChevronRight,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { CityPicker } from "@/components/CityPicker";
import PasswordInput from "@/components/PasswordInput";
import { PercentSpinnerCentered } from "@/components/PercentSpinner";
import { api } from "@/services/api";
import type { AdminUserDetail } from "@/types/api";
import { formatFullDate } from "@/utils/time";

function plural(n: number, one: string, few: string, many: string): string {
  const m = n % 10;
  const h = n % 100;
  if (h >= 11 && h <= 19) return many;
  if (m === 1) return one;
  if (m >= 2 && m <= 4) return few;
  return many;
}

export default function AdminUserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Form state
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [role, setRole] = useState<string>("user");
  const [cityName, setCityName] = useState<string>("");
  const [cityId, setCityId] = useState<number | undefined>();
  const [cityPickerOpen, setCityPickerOpen] = useState<boolean>(false);

  // Password reset
  const [newPassword, setNewPassword] = useState<string>("");
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  const fetchUser = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await api.getAdminUser(id);
    if (res.success && res.data) {
      setData(res.data);
      setName(res.data.user.name);
      setEmail(res.data.user.email);
      setUsername(res.data.user.username ?? "");
      setRole(res.data.user.role);
      setCityName(res.data.user.city ?? "");
      setCityId(res.data.user.cityId);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleSave = useCallback(async () => {
    if (!id) return;
    const res = await api.updateAdminUser(id, {
      name,
      email,
      username: username || undefined,
      role,
      city: cityName,
      cityId,
    });
    if (res.success) {
      Alert.alert("Сохранено", "Данные пользователя обновлены");
    } else {
      Alert.alert("Ошибка", res.error ?? "Не удалось сохранить");
    }
  }, [id, name, email, username, role, cityName, cityId]);

  const handleResetPassword = useCallback(async () => {
    if (!id || !newPassword.trim()) {
      Alert.alert("Ошибка", "Введите новый пароль (минимум 6 символов)");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Ошибка", "Пароль должен быть не менее 6 символов");
      return;
    }

    Alert.alert("Сбросить пароль?", "Пользователю будет установлен новый пароль", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Сбросить",
        style: "destructive",
        onPress: async () => {
          setResetLoading(true);
          const res = await api.resetAdminPassword(id, newPassword);
          if (res.success) {
            Alert.alert("Готово", "Пароль сброшен");
            setNewPassword("");
          } else {
            Alert.alert("Ошибка", res.error ?? "Не удалось сбросить пароль");
          }
          setResetLoading(false);
        },
      },
    ]);
  }, [id, newPassword]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    Alert.alert("Удалить пользователя?", "Это действие нельзя отменить. Все посты пользователя также будут удалены.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          const res = await api.deleteAdminUser(id);
          if (res.success) {
            router.back();
          } else {
            Alert.alert("Ошибка", res.error ?? "Не удалось удалить пользователя");
          }
        },
      },
    ]);
  }, [id, router]);

  if (loading) {
    return (
      <View style={styles.root}>
        <PercentSpinnerCentered />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={["top"]} style={styles.safe}>
          <Text style={styles.errorText}>Пользователь не найден</Text>
        </SafeAreaView>
      </View>
    );
  }

  const user = data.user;

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: `#${user.displayId} ${user.name}`,
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
          {/* ── Header ─────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.headerInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.headerName}>#{user.displayId}</Text>
                {user.role === "admin" && (
                  <View style={styles.roleBadge}>
                    <Shield size={10} color={Colors.primary} strokeWidth={2} />
                    <Text style={styles.roleBadgeText}>admin</Text>
                  </View>
                )}
              </View>
              <Text style={styles.headerEmail}>{user.email}</Text>
              <Text style={styles.headerDate}>
                Регистрация: {formatFullDate(user.createdAt)}
              </Text>
            </View>
          </View>

          {/* ── Edit form ──────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>Редактирование</Text>
          <View style={styles.group}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Имя</Text>
              <TextInput
                style={styles.fieldInput}
                value={name}
                onChangeText={setName}
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.separator} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.fieldInput}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.separator} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Username</Text>
              <TextInput
                style={styles.fieldInput}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.separator} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Роль</Text>
              <View style={styles.rolePicker}>
                <Pressable
                  style={[styles.roleChip, role === "user" && styles.roleChipActive]}
                  onPress={() => setRole("user")}
                >
                  <Text style={[styles.roleChipText, role === "user" && styles.roleChipTextActive]}>
                    user
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.roleChip, role === "admin" && styles.roleChipActive]}
                  onPress={() => setRole("admin")}
                >
                  <Text style={[styles.roleChipText, role === "admin" && styles.roleChipTextActive]}>
                    admin
                  </Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.separator} />
            <Pressable
              style={styles.field}
              onPress={() => setCityPickerOpen(true)}
            >
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Город</Text>
                <Text style={styles.fieldValue}>
                  {cityName || "Не выбран"}
                </Text>
                <ChevronRight size={14} color={Colors.textMuted} strokeWidth={2} />
              </View>
            </Pressable>
          </View>

          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Сохранить</Text>
          </Pressable>

          {/* ── Password ───────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>Пароль</Text>
          <View style={styles.group}>
            <View style={styles.field}>
                <PasswordInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Новый пароль"
                  autoCapitalize="none"
                />
            </View>
          </View>
          <Pressable
            style={[styles.saveBtn, styles.resetBtn, resetLoading && styles.btnDisabled]}
            onPress={handleResetPassword}
            disabled={resetLoading}
          >
            <Text style={styles.resetBtnText}>
              {resetLoading ? "Сброс..." : "Сбросить пароль"}
            </Text>
          </Pressable>

          {/* ── Posts ──────────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>
            Посты ({data.posts.length})
          </Text>
          {data.posts.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Нет постов</Text>
            </View>
          ) : (
            <View style={styles.group}>
              {data.posts.map((post, i) => (
                <View key={post.id}>
                  {i > 0 && <View style={styles.separator} />}
                  <Pressable
                    style={styles.postRow}
                    onPress={() => router.push(`/admin/discount/${post.id}`)}
                  >
                    <View style={styles.postInfo}>
                      <Text style={styles.postTitle} numberOfLines={1}>
                        {post.title}
                      </Text>
                      <View style={styles.postStats}>
                        <Eye size={12} color={Colors.textMuted} strokeWidth={1.5} />
                        <Text style={styles.postStat}>{post.views}</Text>
                        <Heart size={12} color={Colors.textMuted} strokeWidth={1.5} />
                        <Text style={styles.postStat}>{post.likes}</Text>
                      </View>
                    </View>
                    <View style={styles.postPercent}>
                      <Text style={styles.postPercentText}>-{post.percent}%</Text>
                    </View>
                    <ChevronRight size={14} color={Colors.textMuted} strokeWidth={2} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* ── Actions ────────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>Действия</Text>
          <View style={styles.group}>
            <Pressable
              style={styles.actionRow}
              onPress={() => router.push(`/admin/support/${id}`)}
            >
              <MessageCircle size={18} color={Colors.text} strokeWidth={2} />
              <Text style={styles.actionText}>Написать в чат</Text>
              <ChevronRight size={14} color={Colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          <Pressable style={styles.deleteBtn} onPress={handleDelete}>
            <Trash2 size={18} color={Colors.danger} strokeWidth={2} />
            <Text style={styles.deleteBtnText}>Удалить пользователя</Text>
          </Pressable>

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>

      <CityPicker
        visible={cityPickerOpen}
        onSelect={(c) => {
          setCityName(c.cityName);
          setCityId(typeof c.cityId === "string" ? parseInt(c.cityId, 10) : c.cityId as number);
          setCityPickerOpen(false);
        }}
        onClose={() => setCityPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  errorText: { fontSize: 15, color: Colors.textMuted, textAlign: "center", marginTop: 100 },

  // ── Header ───────────────────────────────────────────────────────
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    marginBottom: 24,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.cardSecondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.textSecondary,
    letterSpacing: -0.5,
  },
  headerInfo: { flex: 1, gap: 2 },
  userNameRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
  headerName: { fontSize: 18, fontWeight: "700" as const, color: Colors.text, letterSpacing: -0.4 },
  headerEmail: { fontSize: 14, color: Colors.textSecondary, letterSpacing: -0.2 },
  headerDate: { fontSize: 12, color: Colors.textMuted, letterSpacing: -0.1, marginTop: 2 },

  roleBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary + "1A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.primary,
    letterSpacing: 0,
  },

  // ── Form ─────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 10,
    marginLeft: 4,
  },
  group: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    overflow: "hidden" as const,
  },
  field: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: -0.1,
    marginBottom: 6,
  },
  fieldInput: {
    fontSize: 15,
    color: Colors.text,
    letterSpacing: -0.2,
    padding: 0,
  },
  fieldRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  fieldValue: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    textAlign: "right" as const,
    marginRight: 6,
    letterSpacing: -0.2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 16,
  },

  rolePicker: {
    flexDirection: "row" as const,
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.cardSecondary,
  },
  roleChipActive: {
    backgroundColor: Colors.primary,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.textMuted,
    letterSpacing: -0.2,
  },
  roleChipTextActive: {
    color: "#fff",
  },

  saveBtn: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center" as const,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#fff",
    letterSpacing: -0.3,
  },
  resetBtn: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  btnDisabled: {
    opacity: 0.5,
  },

  // ── Posts ────────────────────────────────────────────────────────
  empty: { paddingVertical: 24, alignItems: "center" as const },
  emptyText: { fontSize: 14, color: Colors.textMuted },

  postRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  postInfo: { flex: 1, gap: 2 },
  postTitle: { fontSize: 14, fontWeight: "500" as const, color: Colors.text, letterSpacing: -0.2 },
  postStats: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4 },
  postStat: { fontSize: 12, color: Colors.textMuted, marginRight: 8 },
  postPercent: {
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  postPercentText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.danger,
    letterSpacing: -0.2,
  },

  // ── Actions ──────────────────────────────────────────────────────
  actionRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    letterSpacing: -0.2,
  },

  deleteBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 16,
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.danger,
    letterSpacing: -0.3,
  },
});
