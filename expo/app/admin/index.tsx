import { useFocusEffect, useRouter } from "expo-router";
import {
  Shield,
  Trash2,
  Users,
  Eye,
  CheckCircle2,
  FileText,
  MessageCircle,
  Search,
  Tag,
  ArrowUpLeft,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { PercentSpinnerCentered } from "@/components/PercentSpinner";
import { api } from "@/services/api";
import { useAuth } from "@/providers/AuthProvider";
import type { AdminDiscount, AdminStats, AdminSupportThread, AdminUser } from "@/types/api";
import { formatFullDate, formatTimeAgo } from "@/utils/time";

const { width } = Dimensions.get("window");
const CARD_GAP = 12;
const CARD_W = (width - 20 * 2 - CARD_GAP) / 2;

type Tab = "discounts" | "users" | "support";

function plural(n: number, one: string, few: string, many: string): string {
  const m = n % 10;
  const h = n % 100;
  if (h >= 11 && h <= 19) return many;
  if (m === 1) return one;
  if (m >= 2 && m <= 4) return few;
  return many;
}

function formatViews(n: number): string {
  if (n >= 10000) return `${Math.floor(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

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

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>("discounts");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Discounts tab
  const [discounts, setDiscounts] = useState<AdminDiscount[]>([]);
  const [discountSearch, setDiscountSearch] = useState<string>("");

  // Users tab
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState<string>("");

  // Support tab
  const [threads, setThreads] = useState<AdminSupportThread[]>([]);

  const fetchStats = useCallback(async () => {
    const res = await api.getAdminStats();
    if (res.success && res.data) setStats(res.data);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [statsRes, discountsRes, usersRes, threadsRes] = await Promise.all([
      api.getAdminStats(),
      api.getAdminDiscounts(),
      api.getAdminUsers(),
      api.getAdminSupportThreads(),
    ]);
    if (statsRes.success && statsRes.data) setStats(statsRes.data);
    if (discountsRes.success && discountsRes.data) setDiscounts(discountsRes.data);
    if (usersRes.success && usersRes.data) setUsers(usersRes.data);
    if (threadsRes.success && threadsRes.data) setThreads(threadsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Refetch stats on focus
  useFocusEffect(useCallback(() => { fetchStats(); }, [fetchStats]));

  // Debounced search for discounts
  useEffect(() => {
    if (tab !== "discounts") return;
    const t = setTimeout(async () => {
      const res = await api.getAdminDiscounts(discountSearch || undefined);
      if (res.success && res.data) setDiscounts(res.data);
    }, 300);
    return () => clearTimeout(t);
  }, [discountSearch, tab]);

  // Debounced search for users
  useEffect(() => {
    if (tab !== "users") return;
    const t = setTimeout(async () => {
      const res = await api.getAdminUsers(userSearch || undefined);
      if (res.success && res.data) setUsers(res.data);
    }, 300);
    return () => clearTimeout(t);
  }, [userSearch, tab]);

  const handleDeleteDiscount = useCallback(async (id: string, title: string) => {
    Alert.alert("Удалить скидку?", `«${title}» будет удалена навсегда.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          const res = await api.deleteAdminDiscount(id);
          if (res.success) {
            setDiscounts((prev) => prev.filter((d) => d.id !== id));
            fetchStats();
          } else {
            Alert.alert("Ошибка", res.error ?? "Не удалось удалить.");
          }
        },
      },
    ]);
  }, [fetchStats]);

  const handleDeleteUser = useCallback(async (userId: string, userName: string) => {
    Alert.alert("Удалить пользователя?", `«${userName}» и все его посты будут удалены.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          const res = await api.deleteAdminUser(userId);
          if (res.success) {
            setUsers((prev) => prev.filter((u) => u.id !== userId));
            fetchStats();
          } else {
            Alert.alert("Ошибка", res.error ?? "Не удалось удалить.");
          }
        },
      },
    ]);
  }, [fetchStats]);

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

  return (
    <SafeAreaView edges={["bottom"]} style={styles.root}>
      {loading ? (
        <View style={styles.loader}>
          <PercentSpinnerCentered />
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <View style={styles.scroll}>
              {/* ── Stats ──────────────────────────────────────────────── */}
              <View style={styles.statsGrid}>
                <StatTile value={String(stats?.totalDiscounts ?? 0)} label="Всего скидок" icon={FileText} />
                <StatTile value={String(stats?.activeDiscounts ?? 0)} label="Активных" icon={CheckCircle2} />
                <StatTile value={String(stats?.totalUsers ?? 0)} label="Пользователей" icon={Users} />
                <StatTile value={formatViews(stats?.viewsToday ?? 0)} label="Просмотров сегодня" icon={Eye} />
                {(stats?.unreadSupport ?? 0) > 0 && (
                  <StatTile
                    value={String(stats?.unreadSupport ?? 0)}
                    label="Непрочитанные чаты"
                    icon={MessageCircle}
                  />
                )}
              </View>

              {/* ── Tabs ──────────────────────────────────────────────── */}
              <View style={styles.tabRow}>
                {([
                  ["discounts", "Скидос", FileText],
                  ["users", "Пользователи", Users],
                  ["support", "Поддержка", MessageCircle],
                ] as [Tab, string, React.ComponentType<any>][]).map(([key, label, Icon]) => (
                  <Pressable
                    key={key}
                    style={[styles.tab, tab === key && styles.tabActive]}
                    onPress={() => setTab(key)}
                  >
                    <Icon
                      size={15}
                      color={tab === key ? "#fff" : Colors.textMuted}
                      strokeWidth={2}
                    />
                    <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
                      {label}
                    </Text>
                    {key === "support" && stats?.unreadSupport ? (
                      <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>{stats.unreadSupport}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </View>

              {/* ── Tab: Discounts ───────────────────────────────────── */}
              {tab === "discounts" && (
                <View>
                  {/* Search */}
                  <View style={styles.searchBar}>
                    <Search size={16} color={Colors.textMuted} strokeWidth={2} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Поиск по названию..."
                      placeholderTextColor={Colors.textMuted}
                      value={discountSearch}
                      onChangeText={setDiscountSearch}
                    />
                  </View>

                  {discounts.length === 0 ? (
                    <View style={styles.empty}>
                      <Tag size={36} color={Colors.textMuted} strokeWidth={1.5} />
                      <Text style={styles.emptyText}>Нет скидок</Text>
                    </View>
                  ) : (
                    <View style={styles.list}>
                      {discounts.map((d) => (
                        <View key={d.id} style={styles.row}>
                          <Pressable
                            style={styles.rowMain}
                            onPress={() => router.push(`/admin/discount/${d.id}`)}
                          >
                            <View style={styles.rowInfo}>
                              <Text style={styles.rowTitle} numberOfLines={1}>
                                {d.title}
                              </Text>
                              <Text style={styles.rowMeta}>
                                {d.authorDisplayId ? `#${d.authorDisplayId} ` : ""}
                                {d.authorName} · {formatFullDate(d.postedAt)}
                              </Text>
                              {(d.views !== undefined || d.likes !== undefined) && (
                                <View style={styles.rowStats}>
                                  {d.views !== undefined && (
                                    <>
                                      <Eye size={11} color={Colors.textMuted} strokeWidth={1.5} />
                                      <Text style={styles.rowStat}>{d.views}</Text>
                                    </>
                                  )}
                                </View>
                              )}
                            </View>
                            <View style={styles.rowRight}>
                              {d.percent && (
                                <View style={styles.percentBadge}>
                                  <Text style={styles.percentText}>-{d.percent}%</Text>
                                </View>
                              )}
                            </View>
                          </Pressable>
                          <Pressable
                            style={styles.rowDelete}
                            onPress={() => handleDeleteDiscount(d.id, d.title)}
                            hitSlop={8}
                          >
                            <Trash2 size={16} color={Colors.danger} strokeWidth={1.5} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* ── Tab: Users ───────────────────────────────────────── */}
              {tab === "users" && (
                <View>
                  {/* Search */}
                  <View style={styles.searchBar}>
                    <Search size={16} color={Colors.textMuted} strokeWidth={2} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Поиск по имени, email, #id..."
                      placeholderTextColor={Colors.textMuted}
                      value={userSearch}
                      onChangeText={setUserSearch}
                    />
                  </View>

                  {users.length === 0 ? (
                    <View style={styles.empty}>
                      <Users size={36} color={Colors.textMuted} strokeWidth={1.5} />
                      <Text style={styles.emptyText}>Нет пользователей</Text>
                    </View>
                  ) : (
                    <View style={styles.list}>
                      {users.map((u) => (
                        <View key={u.id} style={styles.row}>
                          <Pressable
                            style={styles.rowMain}
                            onPress={() => router.push(`/admin/user/${u.id}`)}
                          >
                            <View style={styles.userAvatar}>
                              <Text style={styles.userAvatarText}>
                                {u.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.rowInfo}>
                              <View style={styles.userNameRow}>
                                <Text style={styles.rowTitle} numberOfLines={1}>
                                  #{u.displayId} {u.name}
                                </Text>
                                {u.role === "admin" && (
                                  <View style={styles.roleBadge}>
                                    <Shield size={9} color={Colors.primary} strokeWidth={2} />
                                    <Text style={styles.roleBadgeText}>admin</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.rowMeta}>
                                {u.email} · {u.postCount} {plural(u.postCount, "пост", "поста", "постов")}
                              </Text>
                            </View>
                          </Pressable>
                          <Pressable
                            style={styles.rowDelete}
                            onPress={() => handleDeleteUser(u.id, u.name)}
                            hitSlop={8}
                          >
                            <Trash2 size={16} color={Colors.danger} strokeWidth={1.5} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* ── Tab: Support ─────────────────────────────────────── */}
              {tab === "support" && (
                <View>
                  {threads.length === 0 ? (
                    <View style={styles.empty}>
                      <MessageCircle size={36} color={Colors.textMuted} strokeWidth={1.5} />
                      <Text style={styles.emptyText}>Нет обращений</Text>
                    </View>
                  ) : (
                    <View style={styles.list}>
                      {threads.map((t) => (
                        <Pressable
                          key={t.userId}
                          style={styles.row}
                          onPress={() => router.push(`/admin/support/${t.userId}`)}
                        >
                          <View style={styles.userAvatar}>
                            <Text style={styles.userAvatarText}>
                              {t.userName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.rowInfo}>
                            <View style={styles.userNameRow}>
                              <Text style={styles.rowTitle} numberOfLines={1}>
                                #{t.displayId} {t.userName}
                              </Text>
                              {t.unreadCount > 0 && (
                                <View style={styles.unreadBadge}>
                                  <Text style={styles.unreadBadgeText}>
                                    {t.unreadCount}
                                  </Text>
                                </View>
                              )}
                            </View>
                            {t.lastMessage ? (
                              <Text style={styles.rowMeta} numberOfLines={1}>
                                {t.lastMessage}
                              </Text>
                            ) : null}
                            <Text style={styles.rowTime}>
                              {formatTimeAgo(t.lastMessageAt)}
                            </Text>
                          </View>
                          <ArrowUpLeft size={14} color={Colors.textMuted} strokeWidth={2} />
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View style={{ height: 60 }} />
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  loader: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },

  // ── Stats ─────────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: CARD_GAP,
    marginBottom: 16,
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

  // ── Tabs ──────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: "row" as const,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
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

  // ── Search ────────────────────────────────────────────────────────
  searchBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 10,
    letterSpacing: -0.2,
  },

  // ── List / rows ───────────────────────────────────────────────────
  list: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    overflow: "hidden" as const,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  rowMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: -0.1,
  },
  rowTime: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: -0.1,
  },
  rowStats: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    marginTop: 2,
  },
  rowStat: { fontSize: 11, color: Colors.textMuted, marginRight: 8 },
  rowRight: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
  rowDelete: {
    width: 36,
    height: 36,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  percentBadge: {
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  percentText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.danger,
    letterSpacing: -0.2,
  },

  // ── User ──────────────────────────────────────────────────────────
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
  unreadBadge: {
    backgroundColor: Colors.danger,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#fff",
  },

  // ── Empty ─────────────────────────────────────────────────────────
  empty: { paddingVertical: 40, alignItems: "center" as const },
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
