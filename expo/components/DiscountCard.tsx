import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Bookmark,
  ChevronDown,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
} from "lucide-react-native";
import React, { memo, useCallback, useState } from "react";
import {
  Alert,
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

const isIos = Platform.OS === "ios";

import { ImageCarousel } from "@/components/ImageCarousel";
import { Open2GisLink } from "@/components/Open2GisLink";

import Colors from "@/constants/colors";
import { CATEGORY_MAP } from "@/constants/categories";
import { resolveImageUrl } from "@/utils/image";
import { useAuth } from "@/providers/AuthProvider";
import { useDiscounts } from "@/providers/DiscountsProvider";
import type { Discount } from "@/types/discount";
import { useTick } from "@/hooks/useTick";
import {
  formatTimeSince,
  formatTimeAgo,
  formatViews,
  formatTimeUntil,
  formatDistance,
  isIndefinite,
} from "@/utils/time";
import { shareDiscount } from "@/utils/share";
import { isValidCoords } from "@/utils/maps";

interface Props {
  discount: Discount;
  index?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

function impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== "web") Haptics.impactAsync(style).catch(() => {});
}

function DiscountCardBase({
  discount,
  index = 0,
  isExpanded: expandedProp,
  onToggleExpand: onToggleExpandProp,
}: Props) {
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
  const cat = CATEGORY_MAP[discount.category];

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

  const onComment = useCallback(() => {
    if (isGuest) {
      promptAuth();
      return;
    }
    router.push(`/discount/${discount.id}?scrollToComments=1`);
  }, [isGuest, router, discount.id, promptAuth]);

  return (
    <Animated.View
      entering={isIos ? FadeIn.delay(index * 80).duration(200) : undefined}
      style={[styles.outer, expired && styles.outerExpired]}
    >
      <View style={styles.card}>
        {/* ── Image carousel ── */}
        <ImageCarousel
          images={discount.images.map(resolveImageUrl)}
          height={expanded ? 380 : 220}
          onPress={expanded ? undefined : onOpen}
          gradient
          contentFit="cover"
          activeDotColor="#FFFFFF"
          inactiveDotColor="rgba(255,255,255,0.4)"
        >
          {/* Percentage badge — orange-to-gold gradient */}
          <View style={styles.pctBadge} pointerEvents="none">
            <LinearGradient
              colors={[Colors.percentGradientStart, Colors.percentGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pctGradient}
            />
            <Text style={styles.pctText}>−{discount.percent}%</Text>
          </View>

          {/* Timer pill */}
          <View style={styles.timerPill} pointerEvents="none">
            <View style={styles.timerBg} />
            <Text style={styles.timerElapsed} numberOfLines={1}>{elapsed}</Text>
            {!indefinite && (
              <>
                <Text style={styles.timerDot}>·</Text>
                <Text style={styles.timerExpiry} numberOfLines={1}>{expiresIn}</Text>
              </>
            )}
          </View>

          {/* Bookmark button */}
          <Pressable onPress={onSave} hitSlop={10} style={styles.bookmarkBtn}>
            <View style={styles.bookmarkBg}>
              <Bookmark
                size={18}
                color={discount.saved ? Colors.primary : "#FFFFFF"}
                strokeWidth={2.2}
                fill={discount.saved ? Colors.primary : "transparent"}
              />
            </View>
          </Pressable>
        </ImageCarousel>

        {expired && (
          <View style={styles.expiredBanner}>
            <Text style={styles.expiredBannerText}>Скидка истекла</Text>
          </View>
        )}

        {/* ── Compact info bar ── */}
        <Pressable onPress={handleToggleExpand} style={styles.infoBar}>
          <View style={styles.infoBarLeft}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {discount.title}
            </Text>
            {discount.locationName ? (
              <Text style={styles.infoBarStore} numberOfLines={1}>{discount.locationName}</Text>
            ) : null}
            {!expanded && (
              <View style={styles.statsMini}>
                <Pressable onPress={onLike} hitSlop={8} style={styles.statItem}>
                  <Heart
                    size={14}
                    color={discount.liked ? Colors.danger : Colors.textMuted}
                    strokeWidth={2}
                    fill={discount.liked ? Colors.danger : "transparent"}
                  />
                  <Text style={[styles.statText, discount.liked && styles.statTextLiked]}>
                    {discount.likes}
                  </Text>
                </Pressable>
                <View style={styles.statItem}>
                  <Eye size={14} color={Colors.textMuted} strokeWidth={2} />
                  <Text style={styles.statText}>{formatViews(discount.views)}</Text>
                </View>
                <View style={styles.statItem}>
                  <MessageCircle size={14} color={Colors.textMuted} strokeWidth={2} />
                  <Text style={styles.statText}>{discount.comments}</Text>
                </View>
              </View>
            )}
          </View>
          <View style={styles.infoBarRight}>
            {isValidCoords(discount.lat, discount.lng) ? (
              <Text style={styles.infoBarDistance}>{formatDistance(discount.distanceKm)}</Text>
            ) : null}
            <View style={[styles.chevronBtn, expanded && styles.chevronBtnExpanded]}>
              <ChevronDown
                size={16}
                color={expanded ? Colors.textInverse : Colors.textMuted}
                strokeWidth={2.5}
                style={expanded && styles.chevronRotated}
              />
            </View>
          </View>
        </Pressable>

        {/* ── Expanded body ── */}
        {expanded && (
          <View style={styles.expandedBody}>
            {/* Divider */}
            <View style={styles.divider} />

            {/* Stats row — same compact style as collapsed */}
            <View style={styles.statsMini}>
              <Pressable onPress={onLike} hitSlop={8} style={styles.statItem}>
                <Heart
                  size={14}
                  color={discount.liked ? Colors.danger : Colors.textMuted}
                  strokeWidth={2}
                  fill={discount.liked ? Colors.danger : "transparent"}
                />
                <Text style={[styles.statText, discount.liked && styles.statTextLiked]}>
                  {discount.likes}
                </Text>
              </Pressable>
              <View style={styles.statItem}>
                <Eye size={14} color={Colors.textMuted} strokeWidth={2} />
                <Text style={styles.statText}>{formatViews(discount.views)}</Text>
              </View>
              <View style={styles.statItem}>
                <MessageCircle size={14} color={Colors.textMuted} strokeWidth={2} />
                <Text style={styles.statText}>{discount.comments}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Author row + category chip on same line */}
            <View style={styles.authorRow}>
              <Image
                source={{ uri: resolveImageUrl(discount.author.avatar) }}
                style={styles.authorAvatar}
                contentFit="cover"
              />
              <View style={styles.authorTextCol}>
                <Text style={styles.authorName}>
                  {discount.author.name}
                  {discount.author.verified && (
                    <Text style={styles.verifiedMark}> ✓</Text>
                  )}
                </Text>
                <Text style={styles.authorDate}>{formatTimeAgo(discount.postedAt)}</Text>
              </View>
              <View style={styles.tag}>
                {React.createElement(cat.icon, { size: 13, color: cat.color, strokeWidth: 2 })}
                <Text style={[styles.tagText, { color: cat.color }]}>{cat.label}</Text>
              </View>
            </View>

            {/* Note */}
            {discount.note ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoCardLabel}>Примечание</Text>
                <Text style={styles.infoCardText}>{discount.note}</Text>
              </View>
            ) : null}

            {/* Link with label */}
            {discount.link ? (
              <View style={styles.linkSection}>
                <Text style={styles.linkLabel}>Ссылка</Text>
                <Pressable
                  onPress={() => {
                    const url = discount.link!.startsWith("http") ? discount.link! : `https://${discount.link}`;
                    Linking.openURL(url).catch(() => {});
                  }}
                  style={styles.linkRow}
                >
                  <Text style={styles.linkText} numberOfLines={1}>{discount.link}</Text>
                </Pressable>
              </View>
            ) : null}

            {/* CTA buttons */}
            <View style={[styles.divider, { marginTop: 4 }]} />

            <Pressable
              onPress={onGoing}
              style={({ pressed }) => [
                styles.ctaMain,
                discount.isGoing && styles.ctaMainActive,
                pressed && !discount.isGoing && styles.ctaMainPressed,
              ]}
            >
              <Text style={[styles.ctaMainText, discount.isGoing && styles.ctaMainTextActive]}>
                {discount.isGoing
                  ? `Я иду · ${discount.going} ${pluralGoing(discount.going)}`
                  : "Я иду"}
              </Text>
            </Pressable>

            {isValidCoords(discount.lat, discount.lng) && (
              <Open2GisLink
                lat={discount.lat}
                lng={discount.lng}
                address={discount.address}
                city={discount.cityName}
              />
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function pluralGoing(n: number): string {
  const m = n % 10;
  const h = n % 100;
  if (h >= 11 && h <= 19) return "человек";
  if (m === 1) return "человек";
  if (m >= 2 && m <= 4) return "человека";
  return "человек";
}

export const DiscountCard = memo(DiscountCardBase);

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 16, paddingTop: 10 },
  outerExpired: { opacity: 0.55 },

  // ── Card shell ──
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },

  // ── Percentage badge — orange-to-gold gradient ──
  pctBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: Colors.percentGradientStart,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  pctGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  pctText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800" as const,
    letterSpacing: -0.6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  // ── Timer pill ──
  timerPill: {
    position: "absolute",
    top: 12,
    right: 52,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 3,
    overflow: "hidden",
  },
  timerBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
  },
  timerElapsed: {
    fontSize: 12,
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500" as const,
  },
  timerDot: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    marginHorizontal: 1,
  },
  timerExpiry: {
    fontSize: 11,
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: 0.1,
    color: Colors.accent,
    fontWeight: "600" as const,
  },

  // ── Bookmark ──
  bookmarkBtn: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  bookmarkBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  // ── Expired banner ──
  expiredBanner: {
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.danger + "15",
  },
  expiredBannerText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.danger,
    letterSpacing: -0.1,
  },

  // ── Compact info bar ──
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  infoBarLeft: { flex: 1, gap: 6, minWidth: 0 },
  infoBarStore: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    letterSpacing: -0.15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
    letterSpacing: -0.4,
    lineHeight: 22,
  },
  statsMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.1,
    fontWeight: "500" as const,
  },
  statTextLiked: { color: Colors.danger },

  // ── Chevron ──
  chevronBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chevronBtnExpanded: {
    backgroundColor: Colors.primary,
  },
  chevronRotated: {
    transform: [{ rotate: "180deg" }],
  },

  // ── Info bar right column (distance + chevron) ──
  infoBarRight: {
    alignItems: "center" as const,
    gap: 6,
    flexShrink: 0,
  },
  infoBarDistance: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
    letterSpacing: -0.1,
  },

  // ── Expanded body ──
  expandedBody: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 16,
  },

  // ── Divider ──
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },

  // ── Author row ──
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardSecondary,
  },
  authorTextCol: {
    flex: 1,
    gap: 2,
  },
  authorName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  verifiedMark: {
    color: Colors.primary,
    fontSize: 12,
  },
  authorDate: {
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: -0.1,
  },

  // ── Tag chip ──
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
    letterSpacing: -0.1,
  },

  // ── Info card (note / where to find) ──
  infoCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  infoCardLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.textMuted,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
  },
  infoCardText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    letterSpacing: -0.2,
  },

  // ── Link ──
  linkSection: {
    gap: 8,
  },
  linkLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.textMuted,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary,
    letterSpacing: -0.1,
    flex: 1,
    fontWeight: "500" as const,
  },

  // ── CTA: "Я иду" ──
  ctaMain: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaMainPressed: {
    backgroundColor: Colors.primaryDark,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  ctaMainActive: {
    backgroundColor: Colors.successLight,
    shadowColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaMainTextActive: {
    color: Colors.primary,
  },
  ctaMainText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },

  // ── Social row ──
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 6,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  socialCount: {
    fontSize: 14,
    color: Colors.textMuted,
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.1,
    fontWeight: "500" as const,
  },
});
