import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Bookmark,
  ChevronLeft,
  Clock,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  Navigation,
  Send,
  Share2,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ImageCarousel } from "@/components/ImageCarousel";
import { KeyboardSafeScrollView } from "@/components/KeyboardSafeScrollView";
import { Open2GisLink } from "@/components/Open2GisLink";
import Colors from "@/constants/colors";
import { shareDiscount } from "@/utils/share";
import { isValidCoords } from "@/utils/maps";
import { useAuth } from "@/providers/AuthProvider";
import { resolveImageUrl } from "@/utils/image";
import { CATEGORY_MAP } from "@/constants/categories";
import { useTick } from "@/hooks/useTick";
import { useDiscount, useDiscounts } from "@/providers/DiscountsProvider";
import { api } from "@/services/api";
import type { Comment } from "@/types/discount";
import {
  formatTimeSince,
  formatDistance,
  formatFullDate,
  formatTimeAgo,
  formatViews,
  formatTimeUntil,
  isIndefinite,
} from "@/utils/time";

function impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== "web") Haptics.impactAsync(style).catch(() => {});
}

export default function DiscountDetailScreen() {
  useTick(1000);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const discount = useDiscount(id ?? "");
  const { toggleLike, toggleSave, toggleGoing, incrementViews } = useDiscounts();
  const { user, isGuest } = useAuth();
  const [comment, setComment] = useState<string>("");
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (id) {
      incrementViews(id);
      api.getComments(id).then((res) => {
        if (res.success && res.data) {
          setComments(
            res.data.map((c) => ({
              ...c,
              postedAt: c.postedAt ?? c.createdAt ?? Date.now(),
            }))
          );
        }
      });
    }
  }, [id, incrementViews]);

  const promptAuth = useCallback(() => {
    Alert.alert("Вход", "Войди в аккаунт, чтобы использовать эту функцию", [
      { text: "Отмена", style: "cancel" },
      { text: "Войти", onPress: () => router.push("/auth/login") },
    ]);
  }, [router]);

  const onSendComment = useCallback(async () => {
    if (isGuest) { promptAuth(); return; }
    const txt = comment.trim();
    if (!txt || !id) return;
    const res = await api.addComment(id, txt);
    if (!res.success) {
      Alert.alert("Ошибка", res.error ?? "Не удалось отправить");
      return;
    }
    if (res.data) {
      setComments((cs) => [res.data!, ...cs]);
    } else {
      const reloadRes = await api.getComments(id);
      if (reloadRes.success && reloadRes.data) {
        setComments(
          reloadRes.data.map((c) => ({
            ...c,
            postedAt: c.postedAt ?? c.createdAt ?? Date.now(),
          }))
        );
      }
    }
    setComment("");
    impact();
  }, [comment, id, isGuest, promptAuth]);

  if (!discount) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Stack.Screen options={{ title: "Скидка" }} />
        <Text style={{ color: Colors.textMuted }}>Скидка не найдена</Text>
      </View>
    );
  }

  const cat = CATEGORY_MAP[discount.category];
  const Icon = cat.icon;
  const elapsed = formatTimeSince(discount.postedAt);
  const expiresIn = formatTimeUntil(discount.expiresAt);
  const indefinite = isIndefinite(discount.expiresAt);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardSafeScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
          {/* ── Hero carousel ── */}
          <View style={styles.heroWrap}>
            <ImageCarousel images={discount.images.map(resolveImageUrl)} height={300}>
              {/* Header overlay */}
              <SafeAreaView edges={["top"]} style={styles.heroHeader} pointerEvents="box-none">
                <View style={styles.heroHeaderRow}>
                  <Pressable
                    onPress={() => router.back()}
                    style={styles.headerBtn}
                    hitSlop={12}
                  >
                    <ChevronLeft size={22} color={Colors.text} strokeWidth={2} />
                  </Pressable>
                  <View style={styles.heroActions}>
                    <Pressable
                      onPress={() => {
                        if (isGuest) { promptAuth(); return; }
                        toggleSave(discount.id);
                      }}
                      style={styles.headerBtn}
                      hitSlop={12}
                    >
                      <Bookmark
                        size={20}
                        color={discount.saved ? Colors.primary : Colors.text}
                        strokeWidth={2}
                        fill={discount.saved ? Colors.primary : "transparent"}
                      />
                    </Pressable>
                    <Pressable style={styles.headerBtn} hitSlop={12} onPress={() => shareDiscount({ title: discount.title, address: discount.address, placeName: discount.placeName, originalPrice: discount.originalPrice, discountedPrice: discount.discountedPrice, note: discount.note })}>
                      <Share2 size={20} color={Colors.text} strokeWidth={2} />
                    </Pressable>
                  </View>
                </View>
              </SafeAreaView>

              {/* Bottom overlay badges */}
              <View style={styles.heroBottom} pointerEvents="box-none">
                <View style={styles.discountBadge}>
                  <Text style={styles.discountNumber}>−{discount.percent}%</Text>
                </View>
                <View style={styles.timersPill} pointerEvents="box-none">
                  <LinearGradient
                    colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.3)", "rgba(0,0,0,0)"]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.timerGradient}
                    pointerEvents="none"
                  />
                  <LinearGradient
                    colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.3)", "rgba(0,0,0,0)"]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.timerGradient}
                    pointerEvents="none"
                  />
                  <View style={styles.timerRow}>
                    <Clock size={11} color="rgba(255,255,255,0.85)" strokeWidth={2} />
                    <Text style={styles.timerText}>{elapsed}</Text>
                  </View>
                  {!indefinite && (
                    <>
                      <View style={styles.timerDividerLine} />
                      <Text style={styles.timerTextExpiry}>{expiresIn}</Text>
                    </>
                  )}
                </View>
              </View>
            </ImageCarousel>
          </View>

          {/* ── Content ── */}
          <View style={styles.content}>

            {/* Title */}
            <Text style={styles.title}>{discount.title}</Text>
            {discount.placeName ? (
              <Text style={styles.placeName}>{discount.placeName}</Text>
            ) : null}

            {/* Author row */}
            <View style={styles.authorRow}>
              <Image
                source={{ uri: resolveImageUrl(discount.author.avatar) }}
                style={styles.authorAvatar}
                contentFit="cover"
              />
              <View style={styles.authorBody}>
                <View style={styles.authorLine}>
                  <Text style={styles.authorName}>{discount.author.name}</Text>
                  {discount.author.verified && (
                    <View style={styles.verifiedDot} />
                  )}
                </View>
                <Text style={styles.authorTime}>
                  {formatFullDate(discount.postedAt)}
                </Text>
              </View>
            </View>

            {/* Category & Location */}
            <View style={styles.metaRow}>
              <View style={[styles.chip, { backgroundColor: cat.color + "20" }]}>
                <Icon size={12} color={cat.color} strokeWidth={2} />
                <Text style={[styles.chipText, { color: cat.color }]}>
                  {cat.label}
                </Text>
              </View>
              <View style={styles.locationChip}>
                <MapPin size={12} color={Colors.textMuted} strokeWidth={2} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {discount.address || discount.locationName}
                </Text>
                {isValidCoords(discount.lat, discount.lng) ? (
                  <>
                    <Text style={styles.locationDot}>·</Text>
                    <Text style={styles.distanceText}>
                      {formatDistance(discount.distanceKm)}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>

            {/* Prices */}
            {discount.discountedPrice !== undefined && (
              <View style={styles.priceRow}>
                <Text style={styles.priceNow}>
                  {discount.discountedPrice.toLocaleString("ru-RU")} ₽
                </Text>
                {discount.originalPrice !== undefined && (
                  <>
                    <Text style={styles.priceDash}>—</Text>
                    <Text style={styles.priceWas}>
                      {discount.originalPrice.toLocaleString("ru-RU")} ₽
                    </Text>
                    <View style={styles.savingsPill}>
                      <Text style={styles.savingsText}>
                        Экономия{" "}
                        {(
                          discount.originalPrice - discount.discountedPrice
                        ).toLocaleString("ru-RU")}{" "}
                        ₽
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* CTA — "Я иду" */}
            <Pressable
              onPress={() => {
                if (isGuest) { promptAuth(); return; }
                impact(Haptics.ImpactFeedbackStyle.Medium);
                toggleGoing(discount.id);
              }}
              style={[
                styles.cta,
                discount.isGoing && { backgroundColor: Colors.successLight },
              ]}
            >
              <Text
                style={[
                  styles.ctaText,
                  discount.isGoing && { color: Colors.success },
                ]}
              >
                {discount.isGoing
                  ? `Идёшь · ${discount.going} человек`
                  : "Я иду"}
              </Text>
            </Pressable>

            {/* Action row: Views / Like / Comment / Share */}
            <View style={styles.actionRow}>
              <View style={styles.actionBtn}>
                <Eye size={22} color={Colors.textMuted} strokeWidth={2} />
                <Text style={styles.actionLabel}>
                  {formatViews(discount.views)}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  impact();
                  toggleLike(discount.id);
                }}
                style={styles.actionBtn}
                hitSlop={8}
              >
                <Heart
                  size={22}
                  color={discount.liked ? Colors.danger : Colors.textMuted}
                  strokeWidth={2}
                  fill={discount.liked ? Colors.danger : "transparent"}
                />
                <Text
                  style={[
                    styles.actionLabel,
                    discount.liked && { color: Colors.danger },
                  ]}
                >
                  {discount.likes}
                </Text>
              </Pressable>
              <Pressable style={styles.actionBtn} hitSlop={8}>
                <MessageCircle size={22} color={Colors.textMuted} strokeWidth={2} />
                <Text style={styles.actionLabel}>{discount.comments}</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} hitSlop={8} onPress={() => shareDiscount({ title: discount.title, address: discount.address, placeName: discount.placeName, originalPrice: discount.originalPrice, discountedPrice: discount.discountedPrice, note: discount.note })}>
                <Share2 size={22} color={Colors.textMuted} strokeWidth={2} />
              </Pressable>
            </View>

            {/* ── Note ── */}
            {discount.note ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Примечание</Text>
                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>{discount.note}</Text>
                </View>
              </View>
            ) : null}

            {/* ── Where to find ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Где найти</Text>
              <Text style={styles.addressText}>
                {discount.address || discount.locationName}
              </Text>
              <Open2GisLink
                lat={discount.lat}
                lng={discount.lng}
                address={discount.address}
                city={discount.cityName}
              />
            </View>

            {/* ── Comments ── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Комментарии · {comments.length}
                </Text>
              </View>
              {comments.map((c) => (
                <View key={c.id} style={styles.commentRow}>
                  <Image
                    source={{ uri: resolveImageUrl(c.author.avatar) }}
                    style={styles.commentAv}
                    contentFit="cover"
                  />
                  <View style={styles.commentBody}>
                    <View style={styles.commentHead}>
                      <Text style={styles.commentName}>{c.author.name}</Text>
                      <Text style={styles.commentTime}>
                        {formatTimeAgo(c.postedAt)}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{c.text}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Comment input — inline, not sticky */}
            <SafeAreaView edges={["bottom"]} style={styles.inputBar}>
              <View style={styles.inputBarInner}>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder={isGuest ? "Войди, чтобы комментировать" : "Написать комментарий"}
                  placeholderTextColor={Colors.textMuted}
                  style={styles.commentInput}
                  editable={!isGuest}
                  onPressIn={() => { if (isGuest) promptAuth(); }}
                />
                <Pressable
                  onPress={onSendComment}
                  disabled={!comment.trim()}
                  style={[
                    styles.sendBtn,
                    !comment.trim() && { opacity: 0.4 },
                  ]}
                >
                  <Send size={18} color={Colors.primary} strokeWidth={2} />
                </Pressable>
              </View>
            </SafeAreaView>
          </View>
        </KeyboardSafeScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // ── Hero image ──
  heroWrap: {
    width: "100%",
    height: 300,
    backgroundColor: Colors.cardSecondary,
    position: "relative",
  },
  // ── Header ──
  heroHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  heroActions: { flexDirection: "row", gap: 4 },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Badges on hero ──
  heroBottom: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  discountBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  discountNumber: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700" as const,
    letterSpacing: -0.7,
  },
  // ── Timers pill (smooth gradient darkening on all 4 sides) ──
  timersPill: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
    gap: 4,
    alignItems: "center",
    overflow: "hidden",
  },
  timerGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  timerText: {
    fontSize: 12,
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.9)",
  },
  timerDividerLine: {
    width: 14,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: 1,
  },
  timerTextExpiry: {
    fontSize: 11,
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: 0.1,
    color: Colors.accent,
  },

  // ── Content ──
  content: { paddingHorizontal: 20, paddingTop: 20 },

  // Title
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
    lineHeight: 30,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  placeName: {
    fontSize: 15,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    marginBottom: 16,
  },

  // Author
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardSecondary,
  },
  authorBody: { flex: 1, gap: 1 },
  authorLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorName: {
    fontSize: 15,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  authorTime: {
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: -0.1,
  },

  // Category & Location
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap" as const,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  chipText: { fontSize: 12, letterSpacing: 0.2 },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  locationText: {
    fontSize: 13,
    color: Colors.textMuted,
    flexShrink: 1,
  },
  locationDot: { color: Colors.textMuted, fontSize: 12 },
  distanceText: { fontSize: 13, color: Colors.textMuted },

  // Prices
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap" as const,
  },
  priceNow: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.primary,
    letterSpacing: -0.7,
  },
  priceDash: {
    fontSize: 18,
    color: Colors.textMuted,
    marginHorizontal: 2,
  },
  priceWas: {
    fontSize: 18,
    color: Colors.textMuted,
    textDecorationLine: "line-through" as const,
  },
  savingsPill: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  savingsText: {
    fontSize: 13,
    color: Colors.accent,
    letterSpacing: -0.1,
  },

  // CTA
  cta: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    marginBottom: 16,
  },
  ctaText: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "600" as const,
    letterSpacing: -0.3,
  },

  // Actions
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 32,
    marginBottom: 10,
    paddingVertical: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    fontVariant: ["tabular-nums"] as const,
  },

  // ── Note ──
  noteBox: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
  },
  noteText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    letterSpacing: -0.2,
  },

  // ── Section (Map / Comments) ──
  section: { marginTop: 12, gap: 12 },
  sectionHeader: { marginBottom: 4 },
  sectionTitle: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  addressText: {
    fontSize: 15,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    lineHeight: 22,
    marginBottom: 4,
  },

  // ── Comments ──
  commentRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  commentAv: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.cardSecondary,
  },
  commentBody: { flex: 1, gap: 3 },
  commentHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  commentName: {
    fontSize: 13,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  commentTime: { fontSize: 11, color: Colors.textMuted },
  commentText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 19,
  },

  // ── Comment input bar ──
  inputBar: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  inputBarInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 12,
    letterSpacing: -0.2,
  },
  sendBtn: { padding: 8 },
});
