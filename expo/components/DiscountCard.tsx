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
  Users,
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

          {/* Timer pill — dark semi-transparent backdrop */}
          <View style={styles.timerPill} pointerEvents="none">
            <View style={styles.timerBg} />
            <Text style={styles.timerElapsed}>{elapsed}</Text>
            {!indefinite && (
              <>
                <View style={styles.timerDivider} />
                <Text style={styles.timerExpiry}>{expiresIn}</Text>
              </>
            )}
          </View>

          {/* Bookmark button */}
          <Pressable onPress={onSave} hitSlop={10} style={styles.bookmarkBtn}>
            <Bookmark
              size={20}
              color={discount.saved ? Colors.primary : "#FFFFFF"}
              strokeWidth={2.2}
              fill={discount.saved ? Colors.primary : "transparent"}
            />
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
          </View>
          <View style={[styles.chevronBtn, expanded && styles.chevronBtnExpanded]}>
            <ChevronDown
              size={16}
              color={expanded ? Colors.textInverse : Colors.textMuted}
              strokeWidth={2.5}
              style={expanded && styles.chevronRotated}
            />
          </View>
        </Pressable>

        {/* ── Expanded body ── */}
        {expanded && (
          <View style={styles.expandedBody}>
            {/* Divider */}
            <View style={styles.divider} />

            {/* Venue name + address */}
            <View style={styles.venueRow}>
              <MapPin size={15} color={Colors.primary} strokeWidth={2} style={{ marginTop: 1 }} />
              <View style={styles.venueTextCol}>
                <Text style={styles.venueName}>{discount.locationName}</Text>
                {discount.address ? (
                  <Text style={styles.venueAddress}>{discount.address}</Text>
                ) : null}
              </View>
            </View>

            {/* Author row */}
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
            </View>

            {/* Tags: category + location */}
            <View style={styles.tagsRow}>
              <View style={styles.tag}>
                {React.createElement(cat.icon, { size: 13, color: cat.color, strokeWidth: 2 })}
                <Text style={[styles.tagText, { color: cat.color }]}>{cat.label}</Text>
              </View>
              {isValidCoords(discount.lat, discount.lng) && (
                <View style={styles.tag}>
                  <MapPin size={13} color={Colors.textMuted} strokeWidth={2} />
                  <Text style={styles.tagText}>{formatDistance(discount.distanceKm)}</Text>
                </View>
              )}
            </View>

            {/* Note — thin bordered card */}
            {discount.note ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoCardLabel}>Примечание</Text>
                <Text style={styles.infoCardText}>{discount.note}</Text>
              </View>
            ) : null}

            {/* Where to find — thin bordered card */}
            {(discount.address || discount.locationName) ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoCardLabel}>Где найти</Text>
                <Text style={styles.infoCardText}>
                  {discount.address || discount.locationName}
                </Text>
              </View>
            ) : null}

            {/* Link */}
            {discount.link ? (
              <Pressable
                onPress={() => {
                  const url = discount.link!.startsWith("http") ? discount.link! : `https://${discount.link}`;
                  Linking.openURL(url).catch(() => {});
                }}
                style={styles.linkRow}
              >
                <Text style={styles.linkText} numberOfLines={1}>{discount.link}</Text>
              </Pressable>
            ) : null}

            {/* Thin divider before CTAs */}
            <View style={[styles.divider, { marginTop: 4 }]} />

            {/* CTA: "Я иду" — main emerald button */}
            <Pressable
              onPress={onGoing}
              style={[styles.ctaMain, discount.isGoing && styles.ctaMainActive]}
            >
              <LinearGradient
                colors={
                  discount.isGoing
                    ? [Colors.successLight, Colors.successLight]
                    : [Colors.primary, Colors.primaryDark]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaMainGradient}
              />
              <Text style={[styles.ctaMainText, discount.isGoing && styles.ctaMainTextActive]}>
                {discount.isGoing
                  ? `Я иду · ${discount.going} ${pluralGoing(discount.going)}`
                  : "Я иду"}
              </Text>
            </Pressable>

            {/* Secondary CTA: Open in 2GIS */}
            {isValidCoords(discount.lat, discount.lng) && (
              <Open2GisLink
                lat={discount.lat}
                lng={discount.lng}
                address={discount.address}
                city={discount.cityName}
              />
            )}

            {/* Thin divider before social */}
            <View style={styles.divider} />

            {/* Social engagement row */}
            <View style={styles.socialRow}>
              <Pressable onPress={onLike} hitSlop={6} style={styles.socialBtn}>
                <Heart
                  size={20}
                  color={discount.liked ? Colors.danger : Colors.textMuted}
                  strokeWidth={discount.liked ? 2.5 : 1.8}
                  fill={discount.liked ? Colors.danger : "transparent"}
                />
                <Text style={[styles.socialCount, discount.liked && { color: Colors.danger }]}>
                  {discount.likes}
                </Text>
              </Pressable>

              <Pressable onPress={onComment} hitSlop={6} style={styles.socialBtn}>
                <MessageCircle size={20} color={Colors.textMuted} strokeWidth={1.8} />
                <Text style={styles.socialCount}>{discount.comments}</Text>
              </Pressable>

              <View style={styles.socialBtn}>
                <Eye size={20} color={Colors.textMuted} strokeWidth={1.8} />
                <Text style={styles.socialCount}>{formatViews(discount.views)}</Text>
              </View>

              <Pressable hitSlop={6} style={styles.socialBtn} onPress={() => shareDiscount(discount)}>
                <Share2 size={19} color={Colors.textMuted} strokeWidth={1.8} />
              </Pressable>
            </View>
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
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },

  // ── Percentage badge — orange-to-gold gradient ──
  pctBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: Colors.percentGradientStart,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  pctGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
  },
  pctText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800" as const,
    letterSpacing: -0.6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  // ── Timer pill ──
  timerPill: {
    position: "absolute",
    top: 12,
    right: 50,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: "center",
    overflow: "hidden",
  },
  timerBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    borderRadius: 10,
  },
  timerElapsed: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.92)",
  },
  timerDivider: {
    width: 14,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 1,
  },
  timerExpiry: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.1,
    color: Colors.accent,
  },

  // ── Bookmark ──
  bookmarkBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Expired banner ──
  expiredBanner: {
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.danger + "20",
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
    paddingVertical: 13,
    gap: 10,
  },
  infoBarLeft: { flex: 1, gap: 6, minWidth: 0 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
    letterSpacing: -0.4,
    lineHeight: 20,
  },
  statsMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.1,
  },
  statTextLiked: { color: Colors.danger },

  // ── Chevron ──
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

  // ── Expanded body ──
  expandedBody: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 14,
  },

  // ── Divider ──
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },

  // ── Venue row ──
  venueRow: {
    flexDirection: "row",
    gap: 8,
  },
  venueTextCol: {
    flex: 1,
    gap: 1,
  },
  venueName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  venueAddress: {
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: -0.1,
    lineHeight: 18,
  },

  // ── Author row ──
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardSecondary,
  },
  authorTextCol: {
    flex: 1,
    gap: 1,
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
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: -0.1,
  },

  // ── Tags (category + location chips) ──
  tagsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.cardSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
    letterSpacing: -0.1,
  },

  // ── Info card (note / where to find) ──
  infoCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  infoCardLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.textMuted,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
  },
  infoCardText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    letterSpacing: -0.2,
  },

  // ── Link ──
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary,
    letterSpacing: -0.1,
    flex: 1,
  },

  // ── CTA: "Я иду" ──
  ctaMain: {
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaMainActive: {
    shadowColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaMainGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaMainText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  ctaMainTextActive: {
    color: Colors.primary,
  },

  // ── Social row ──
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 4,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  socialCount: {
    fontSize: 13,
    color: Colors.textMuted,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.1,
  },
});
