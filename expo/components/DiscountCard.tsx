import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Bookmark, ChevronDown, Eye, Heart, MapPin, MessageCircle, Share2, Users } from "lucide-react-native";
import React, { memo, useCallback, useState } from "react";
import { Alert, LayoutAnimation, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

const isIos = Platform.OS === "ios";

import { ImageCarousel } from "@/components/ImageCarousel";

import Colors from "@/constants/colors";
import { resolveImageUrl } from "@/utils/image";
import { useAuth } from "@/providers/AuthProvider";
import { useDiscounts } from "@/providers/DiscountsProvider";
import type { Discount } from "@/types/discount";
import { useTick } from "@/hooks/useTick";
import { formatTimeSince, formatTimeAgo, formatViews, formatTimeUntil, isIndefinite } from "@/utils/time";
import { shareDiscount } from "@/utils/share";

interface Props {
  discount: Discount;
  index?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

function impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== "web") Haptics.impactAsync(style).catch(() => {});
}

function DiscountCardBase({ discount, index = 0, isExpanded: expandedProp, onToggleExpand: onToggleExpandProp }: Props) {
  useTick(1000);
  const router = useRouter();
  const { isGuest } = useAuth();
  const { toggleGoing, toggleLike, toggleSave } = useDiscounts();
  const [expandedLocal, setExpandedLocal] = useState(false);
  const expanded = expandedProp !== undefined ? expandedProp : expandedLocal;
  const elapsed = formatTimeSince(discount.postedAt);
  const expiresIn = formatTimeUntil(discount.expiresAt);
  const indefinite = isIndefinite(discount.expiresAt);
  const expired = discount.expired === true || (discount.expiresAt > 0 && discount.expiresAt <= Date.now());

  const handleToggleExpand = useCallback(() => {
    if (onToggleExpandProp) {
      onToggleExpandProp();
    } else {
      if (isIos) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedLocal((v) => !v);
    }
  }, [onToggleExpandProp]);

  const promptAuth = useCallback(() => {
    Alert.alert("Вход", "Войди в аккаунт, чтобы использовать эту функцию", [
      { text: "Отмена", style: "cancel" },
      { text: "Войти", onPress: () => router.push("/auth/login") },
    ]);
  }, [router]);

  const onGoing = useCallback(() => {
    if (isGuest) { promptAuth(); return; }
    impact(Haptics.ImpactFeedbackStyle.Medium);
    toggleGoing(discount.id);
  }, [isGuest, toggleGoing, discount.id, promptAuth]);

  const onLike = useCallback(() => {
    impact();
    toggleLike(discount.id);
  }, [toggleLike, discount.id]);

  const onSave = useCallback(() => {
    if (isGuest) { promptAuth(); return; }
    toggleSave(discount.id);
  }, [isGuest, toggleSave, discount.id, promptAuth]);

  const onOpen = useCallback(() => {
    if (expired) return;
    router.push(`/discount/${discount.id}`);
  }, [router, discount.id, expired]);

  return (
    <Animated.View
      entering={isIos ? FadeIn.delay(index * 80).duration(200) : undefined}
      style={[styles.outer, expired && styles.outerExpired]}
    >
      <View style={styles.card}>
        {/* ── Image carousel ── */}
        <ImageCarousel
          images={discount.images.map(resolveImageUrl)}
          height={expanded ? 420 : 240}
          onPress={onOpen}
          gradient
          contentFit={expanded ? "contain" : "cover"}
        >
          {/* Discount badge */}
          <View style={styles.discountBadge} pointerEvents="box-none">
            <Text style={styles.discountNumber}>−{discount.percent}%</Text>
          </View>

          {/* Timers pill */}
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
            <Text style={styles.timerElapsed}>
              {elapsed}
            </Text>
            {!indefinite && (
              <>
                <View style={styles.timerDivider} />
                <Text style={styles.timerExpiry}>
                  {expiresIn}
                </Text>
              </>
            )}
          </View>

          {/* Bookmark */}
          <Pressable onPress={onSave} hitSlop={10} style={styles.bookmarkBtn}>
            <Bookmark
              size={20}
              color={discount.saved ? Colors.primary : "#FFFFFF"}
              strokeWidth={2}
              fill={discount.saved ? Colors.primary : "transparent"}
            />
          </Pressable>

          {/* NO photo overlay — clean image only */}
        </ImageCarousel>

        {expired && (
          <View style={styles.expiredRibbon}>
            <Text style={styles.expiredRibbonText}>Скидка истекла</Text>
          </View>
        )}

        {/* ── Compact info bar: title + stats + chevron ── */}
        <View style={styles.infoBar}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {discount.title}
          </Text>

          <View style={styles.statsMini}>
            <Pressable onPress={onLike} hitSlop={8} style={styles.statItem}>
              <Heart
                size={15}
                color={discount.liked ? Colors.danger : Colors.textMuted}
                strokeWidth={2}
                fill={discount.liked ? Colors.danger : "transparent"}
              />
              <Text style={[styles.statText, discount.liked && { color: Colors.danger }]}>
                {discount.likes}
              </Text>
            </Pressable>

            <View style={styles.statItem}>
              <Eye size={15} color={Colors.textMuted} strokeWidth={2} />
              <Text style={styles.statText}>{formatViews(discount.views)}</Text>
            </View>

            <View style={styles.statItem}>
              <MessageCircle size={15} color={Colors.textMuted} strokeWidth={2} />
              <Text style={styles.statText}>{discount.comments}</Text>
            </View>
          </View>

          {/* Expand / collapse chevron */}
          <Pressable onPress={handleToggleExpand} hitSlop={6} style={[styles.chevronBtn, expanded && styles.chevronBtnExpanded]}>
            <ChevronDown
              size={16}
              color={expanded ? Colors.textInverse : Colors.textMuted}
              strokeWidth={2.5}
              style={expanded && styles.chevronRotated}
            />
          </Pressable>
        </View>

        {/* ── Expanded body: minimal, airy ── */}
        {expanded && (
          <View style={styles.expandedBody}>
            {/* Location: store name + address */}
            <View style={styles.locationRow}>
              <MapPin size={16} color={Colors.primary} strokeWidth={2} style={{ marginTop: 1 }} />
              <View style={styles.locationTextCol}>
                <Text style={styles.locationName}>{discount.locationName}</Text>
                {discount.address ? (
                  <Text style={styles.locationAddress}>{discount.address}</Text>
                ) : null}
              </View>
            </View>

            {/* Note */}
            {discount.note ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteText}>{discount.note}</Text>
              </View>
            ) : null}

            {/* Link */}
            {discount.link ? (
              <Pressable
                onPress={() => {
                  const url = discount.link!.startsWith("http") ? discount.link! : `https://${discount.link}`;
                  Linking.openURL(url).catch(() => {});
                }}
                style={styles.linkBox}
              >
                <Text style={styles.linkText} numberOfLines={1}>{discount.link}</Text>
              </Pressable>
            ) : null}

            {/* CTA */}
            <Pressable
              onPress={onGoing}
              style={[
                styles.cta,
                discount.isGoing && { backgroundColor: Colors.successLight },
              ]}
            >
              <Text style={[styles.ctaText, discount.isGoing && { color: Colors.success }]}>
                {discount.isGoing
                  ? `Идёшь · ${discount.going} человек`
                  : "Я иду"}
              </Text>
            </Pressable>

            {/* Bottom action row */}
            <View style={styles.actionRow}>
              <Pressable hitSlop={8} style={styles.actionBtn} onPress={() => shareDiscount(discount)}>
                <Share2 size={18} color={Colors.textMuted} strokeWidth={2} />
                <Text style={styles.actionLabel}>Поделиться</Text>
              </Pressable>
              <View style={styles.goingPill}>
                <Users size={12} color={Colors.success} strokeWidth={2} />
                <Text style={styles.goingPillText}>{discount.going}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export const DiscountCard = memo(DiscountCardBase);

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 16, paddingTop: 12 },
  outerExpired: { opacity: 0.65 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },

  discountBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discountNumber: { color: Colors.textInverse, fontSize: 18, letterSpacing: -0.5, fontWeight: "700" as const },

  // ── Timers pill ──
  timersPill: {
    position: "absolute",
    top: 12,
    right: 48,
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
  timerElapsed: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.9)",
  },
  timerDivider: {
    width: 14,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: 1,
  },
  timerExpiry: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.1,
    color: Colors.accent,
  },

  bookmarkBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Compact info bar ──
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: Colors.card,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.3,
    lineHeight: 20,
    minWidth: 0,
  },
  statsMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  chevronBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.cardSecondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  chevronBtnExpanded: {
    backgroundColor: Colors.primary,
  },
  chevronRotated: {
    transform: [{ rotate: "180deg" }],
  },

  // ── Expired ribbon ──
  expiredRibbon: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.dangerLight,
  },
  expiredRibbonText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.danger,
    letterSpacing: -0.1,
  },

  // ── Expanded body: minimal ──
  expandedBody: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },

  // ── Location (store name + address) ──
  locationRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  locationTextCol: {
    flex: 1,
    gap: 2,
  },
  locationName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  locationAddress: {
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: -0.1,
  },

  // ── CTA ──
  cta: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  ctaText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },

  // ── Bottom action row ──
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionLabel: { fontSize: 13, color: Colors.textMuted },
  goingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  goingPillText: { color: Colors.success, fontSize: 12 },

  // ── Note ──
  noteBox: {
    backgroundColor: Colors.cardSecondary,
    borderRadius: 10,
    padding: 12,
  },
  noteText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    letterSpacing: -0.2,
  },

  // ── Link ──
  linkBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary,
    letterSpacing: -0.1,
    textDecorationLine: "underline" as const,
    flex: 1,
  },
});
