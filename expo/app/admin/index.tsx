import { useRouter } from "expo-router";
import {
  Shield,
  Trash2,
  Users,
  Eye,
  CheckCircle2,
  FileText,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { PercentSpinnerCentered } from "@/components/PercentSpinner";
import { api } from "@/services/api";
import { useAuth } from "@/providers/AuthProvider";
import type { AdminDiscount, AdminStats, AdminUser } from "@/types/api";
import { formatFullDate } from "@/utils/time";

const { width } = Dimensions.get("window");
const CARD_GAP = 12;
const CARD_W = (width - 20 * 2 - CARD_GAP) / 2;

// ─── helpers ──────────────────────────────────────────────────────────────

function formatViews(n: number): string {
  if (n >= 10000) return `${Math.floor(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ─── stat tile ────────────────────────────────────────────────────────────

function StatTile({
  value,
  label,
  icon: Icon,
}: {
  value: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
}) {
  return (
    <View style={styles.statCard}>
      <Icon size={20} color={Colors.textMuted} strokeWidth={1.5} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── discount row ─────────────────────────────────────────────────────────

function DiscountRow({
  discount,
  onDelete,
}: {
  discount: AdminDiscount;
  onDelete: (id: string) => void;
}) {
  const handleDelete = useCallback(() => {
    Alert.alert("Удалить скидку?", `«${discount.title}» будет удалена навсегда.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => onDelete(discount.id),
      },
    ]);
  }, [discount.id, discount.title, onDelete]);

  return (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {discount.title}
        </Text>
        <Text style={styles.rowMeta}>
          {discount.authorName} · {formatFullDate(discount.postedAt)}
        </Text>
      </View>
      <Pressable onPress={handleDelete} style={styles.rowDelete} hitSlop={8}>
        <Trash2 size={18} color={Colors.danger} strokeWidth={1.5} />
      </Pressable>
    </View>
  );
}

// ─── user row ─────────────────────────────────────────────────────────────

function UserRow({ user }: { user: AdminUser }) {
  return (
    <View style={styles.row}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {user.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.rowInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {user.name}
          </Text>
          {user.role === "admin" && (
            <View style={styles.roleBadge}>
              <Shield size={10} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.roleBadgeText}>admin</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowMeta}>
          {user.email} · {user.postCount} {plural(user.postCount, "пост", "поста", "постов")}
        </Text>
      </View>
      <Text style={styles.userDate}>{formatFullDate(user.createdAt)}</Text>
    </View>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [discounts, setDiscounts] = useState<AdminDiscount[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [statsRes, discountsRes, usersRes] = await Promise.all([
      api.getAdminStats(),
      api.getAdminDiscounts(),
      api.getAdminUsers(),
    ]);
    if (statsRes.success && statsRes.data) setStats(statsRes.data);
    if (discountsRes.success && discountsRes.data) setDiscounts(discountsRes.data);
    if (usersRes.success && usersRes.data) setUsers(usersRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await api.deleteAdminDiscount(id);
      if (res.success) {
        setDiscounts((prev) => prev.filter((d) => d.id !== id));
        // Refresh stats after deletion
        const statsRes = await api.getAdminStats();
        if (statsRes.success && statsRes.data) setStats(statsRes.data);
      } else {
        Alert.alert("Ошибка", res.error ?? "Не удалось удалить скидку.");
      }
    },
    []
  );

  // Guard: non-admin access
  if (!user || user.role !== "admin") {
    return (
      <SafeAreaView edges={["top"]} style={styles.root}>
        <View style={styles.guard}>
          <Shield size={48} color={Colors.danger} strokeWidth={1.5} />
          <Text style={styles.guardTitle}>Нет доступа</Text>
          <Text style={styles.guardSubtitle}>
            Эта страница доступна только администраторам.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.guardBtn}>
            <Text style={styles.guardBtnText}>Назад</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {loading ? (
          <View style={styles.loader}>
          <PercentSpinnerCentered />
          </View>
        ) : (
          <>
            {/* ── Stats ──────────────────────────────────────────────── */}
            <Text style={styles.sectionTitle}>Статистика</Text>
            <View style={styles.statsGrid}>
              <StatTile
                value={String(stats?.totalDiscounts ?? 0)}
                label="Всего скидок"
                icon={FileText}
              />
              <StatTile
                value={String(stats?.activeDiscounts ?? 0)}
                label="Активных"
                icon={CheckCircle2}
              />
              <StatTile
                value={String(stats?.totalUsers ?? 0)}
                label="Пользователей"
                icon={Users}
              />
              <StatTile
                value={formatViews(stats?.viewsToday ?? 0)}
                label="Просмотров сегодня"
                icon={Eye}
              />
            </View>

            {/* ── Recent discounts ───────────────────────────────────── */}
            <Text style={styles.sectionTitle}>Последние скидки</Text>
            {discounts.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Нет опубликованных скидок</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {discounts.map((d) => (
                  <DiscountRow
                    key={d.id}
                    discount={d}
                    onDelete={handleDelete}
                  />
                ))}
              </View>
            )}

            {/* ── Users ──────────────────────────────────────────────── */}
            <Text style={styles.sectionTitle}>Пользователи</Text>
            {users.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Нет зарегистрированных пользователей</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {users.map((u) => (
                  <UserRow key={u.id} user={u} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────

function plural(n: number, one: string, few: string, many: string): string {
  const m = n % 10;
  const h = n % 100;
  if (h >= 11 && h <= 19) return many;
  if (m === 1) return one;
  if (m >= 2 && m <= 4) return few;
  return many;
}

// ─── styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  // ── loader ──────────────────────────────────────────────────────────
  loader: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, paddingTop: 120 },

  // ── section title ───────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginTop: 28,
    marginBottom: 10,
  },

  // ── stats 2×2 ───────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: CARD_GAP,
  },
  statCard: {
    width: CARD_W,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.text,
    letterSpacing: -0.7,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: -0.1,
  },

  // ── list / rows ─────────────────────────────────────────────────────
  list: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: "hidden" as const,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  rowMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: -0.1,
  },
  rowDelete: {
    width: 36,
    height: 36,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  // ── user row extras ─────────────────────────────────────────────────
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
  userNameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
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
  userDate: {
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: -0.1,
  },

  // ── empty ───────────────────────────────────────────────────────────
  empty: { paddingVertical: 28, alignItems: "center" as const },
  emptyText: { fontSize: 14, color: Colors.textMuted },

  // ── guard (non-admin) ───────────────────────────────────────────────
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
