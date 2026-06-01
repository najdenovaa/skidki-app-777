import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Eye, Heart, MapPin, Percent } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import { resolveImageUrl } from "@/utils/image";
import { formatTimeAgo, formatViews } from "@/utils/time";
import type { PublicUserPost, PublicUserProfile } from "@/types/api";

const { width } = Dimensions.get("window");
const TILE = (width - 20 * 2 - 12) / 2;

function plural(n: number, one: string, few: string, many: string): string {
  const m = n % 10;
  const h = n % 100;
  if (h >= 11 && h <= 19) return many;
  if (m === 1) return one;
  if (m >= 2 && m <= 4) return few;
  return many;
}

function isExpired(post: PublicUserPost): boolean {
  if (post.expired) return true;
  if (post.expiresAt > 0 && post.expiresAt <= Date.now()) return true;
  return false;
}

function PostTile({
  post,
  onPress,
}: {
  post: PublicUserPost;
  onPress?: () => void;
}) {
  const expired = isExpired(post);

  return (
    <Pressable
      onPress={expired ? undefined : onPress}
      style={[styles.tile, expired && styles.tileExpired]}
    >
      <Image
        source={{ uri: resolveImageUrl(post.images[0]) }}
        style={styles.tileImg}
        contentFit="cover"
      />
      {expired && <View style={styles.tileExpiredOverlay} />}
      {expired && (
        <View style={styles.tileExpiredBadge}>
          <Text style={styles.tileExpiredText}>Истекла</Text>
        </View>
      )}
      <View style={styles.tilePercent}>
        <Percent size={10} color="#fff" strokeWidth={2.5} />
        <Text style={styles.tilePercentText}>−{post.percent}%</Text>
      </View>
      <View style={styles.tileBody}>
        <Text style={[styles.tileTitle, expired && styles.tileTitleExpired]} numberOfLines={2}>
          {post.title}
        </Text>
        <View style={styles.tileStats}>
          <Eye size={10} color={expired ? Colors.textMuted : Colors.textSecondary} strokeWidth={1.5} />
          <Text style={[styles.tileStatText, expired && styles.tileStatExpired]}>
            {formatViews(post.views)}
          </Text>
          <Heart size={10} color={expired ? Colors.textMuted : Colors.textSecondary} strokeWidth={1.5} />
          <Text style={[styles.tileStatText, expired && styles.tileStatExpired]}>
            {post.likes}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tab, setTab] = useState<"active" | "expired">("active");

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await api.getUserProfile(id);
    if (res.success && res.data) {
      setProfile(res.data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const { activePosts, expiredPosts } = useMemo(() => {
    if (!profile) return { activePosts: [] as PublicUserPost[], expiredPosts: [] as PublicUserPost[] };
    const active: PublicUserPost[] = [];
    const expired: PublicUserPost[] = [];
    for (const p of profile.posts) {
      if (isExpired(p)) {
        expired.push(p);
      } else {
        active.push(p);
      }
    }
    return { activePosts: active, expiredPosts: expired };
  }, [profile]);

  const displayPosts = tab === "active" ? activePosts : expiredPosts;

  if (loading) {
    return (
      <View style={styles.root}>
        <PercentSpinnerCentered />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={["top"]} style={styles.safe}>
          <Text style={styles.errorText}>Пользователь не найден</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={["top"]} style={styles.safe}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
            <ChevronLeft size={22} color={Colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>Профиль</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Avatar + Identity */}
          <View style={styles.identity}>
            <Image
              source={{ uri: resolveImageUrl(profile.avatar) }}
              style={styles.avatar}
              contentFit="cover"
            />
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.displayId}>#{profile.displayId}</Text>
            {profile.city ? (
              <View style={styles.cityRow}>
                <MapPin size={12} color={Colors.textMuted} strokeWidth={2} />
                <Text style={styles.cityText}>{profile.city}</Text>
              </View>
            ) : null}
          </View>

          {/* Stats */}
          <Text style={styles.statsLine}>
            {profile.postCount} {plural(profile.postCount, "пост", "поста", "постов")}
            {" · "}
            {activePosts.length} {plural(activePosts.length, "активный", "активных", "активных")}
          </Text>

          {/* Segments */}
          <View style={styles.segment}>
            <Pressable
              onPress={() => setTab("active")}
              style={[styles.segTab, tab === "active" && styles.segTabActive]}
            >
              <Text style={[styles.segText, tab === "active" && styles.segTextActive]}>
                Активные ({activePosts.length})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTab("expired")}
              style={[styles.segTab, tab === "expired" && styles.segTabActive]}
            >
              <Text style={[styles.segText, tab === "expired" && styles.segTextActive]}>
                Прошедшие ({expiredPosts.length})
              </Text>
            </Pressable>
          </View>

          {/* Grid */}
          {displayPosts.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {tab === "active" ? "Нет активных скидок" : "Нет прошедших скидок"}
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {displayPosts.map((post) => (
                <PostTile
                  key={post.id}
                  post={post}
                  onPress={
                    tab === "active"
                      ? () => router.push(`/discount/${post.id}`)
                      : undefined
                  }
                />
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
  scroll: { paddingBottom: 120 },
  errorText: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 100,
  },

  // ── Header ───────────────────────────────────────────────────────
  headerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },

  // ── Identity ─────────────────────────────────────────────────────
  identity: {
    alignItems: "center" as const,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.cardSecondary,
  },
  name: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: 12,
    letterSpacing: -0.5,
  },
  displayId: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  cityRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 5,
    marginTop: 6,
  },
  cityText: {
    fontSize: 14,
    color: Colors.primary,
    letterSpacing: -0.2,
  },

  // ── Stats ────────────────────────────────────────────────────────
  statsLine: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginTop: 14,
    letterSpacing: -0.2,
  },

  // ── Segment ──────────────────────────────────────────────────────
  segment: {
    flexDirection: "row" as const,
    marginTop: 20,
    marginHorizontal: 20,
  },
  segTab: {
    flex: 1,
    alignItems: "center" as const,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  segTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  segText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.textMuted,
    letterSpacing: -0.2,
  },
  segTextActive: {
    color: Colors.text,
    fontWeight: "600" as const,
  },

  // ── Empty ────────────────────────────────────────────────────────
  empty: {
    padding: 60,
    alignItems: "center" as const,
  },
  emptyTitle: {
    fontSize: 15,
    color: Colors.textMuted,
    letterSpacing: -0.2,
  },

  // ── Grid ─────────────────────────────────────────────────────────
  grid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  tile: {
    width: TILE,
    height: TILE * 1.4,
    borderRadius: 16,
    backgroundColor: Colors.card,
    overflow: "hidden" as const,
  },
  tileExpired: {
    opacity: 0.55,
  },
  tileImg: {
    width: "100%" as const,
    height: "100%" as const,
    backgroundColor: Colors.cardSecondary,
  },
  tilePercent: {
    position: "absolute" as const,
    top: 8,
    left: 8,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  tilePercentText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  tileExpiredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 16,
  },
  tileExpiredBadge: {
    position: "absolute" as const,
    top: "50%" as const,
    left: 0,
    right: 0,
    alignItems: "center" as const,
    transform: [{ translateY: -12 }],
  },
  tileExpiredText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden" as const,
    letterSpacing: -0.2,
  },
  tileBody: {
    position: "absolute" as const,
    left: 10,
    right: 10,
    bottom: 10,
  },
  tileTitle: {
    fontSize: 12,
    color: Colors.text,
    lineHeight: 15,
    fontWeight: "600" as const,
  },
  tileTitleExpired: {
    color: Colors.textMuted,
  },
  tileStats: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    marginTop: 4,
  },
  tileStatText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  tileStatExpired: {
    color: Colors.textMuted,
  },
});
