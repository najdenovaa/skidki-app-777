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
import { isValidCoords, openIn2Gis } from "@/utils/maps";
import { resolveImageUrl } from "@/utils/image";
import { CATEGORY_MAP } from "@/constants/categories";
import { useAuth } from "@/providers/AuthProvider";
import { useDiscounts } from "@/providers/DiscountsProvider";
import type { Discount } from "@/types/discount";
import { useTick } from "@/hooks/useTick";
import { formatTimeSince, formatDistance, formatTimeAgo, formatViews, formatTimeUntil, isIndefinite } from "@/utils/time";
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
  const cat = CATEGORY_MAP[discount.category];
  const Icon = cat.icon;
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

  const onAuthorPress = useCallback(() => {
    if (!discount.author?.id) return;
    router.push({
      pathname: `/user/${discount.author.id}`,
      params: {
        name: discount.author.name,
        avatar: discount.author.avatar,
      },
    });
  }, [router, discount.author.id, discount.author.name, discount.author.avatar]);

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
        {/* ── Image carousel (Instagram-style) ── */}
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

          {/* Timers — smooth gradient darkening on all 4 sides */}
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
              color={discount.saved ? Colors.primary : Colors.text}
              strokeWidth={2}
              fill={discount.saved ? Colors.primary : "transparent"}
            />
          </Pressable>

          {/* Title + location overlaid on the photo gradient */}
          <View style={styles.photoOverlay} pointerEvents="box-none">
            <Text style={styles.photoTitle} numberOfLines={2}>
              {discount.title}
            </Text>
            {discount.placeName ? (
              <Text style={styles.photoPlaceName} numberOfLines={1}>
                {discount.placeName}
              </Text>
            ) : null}
            <View style={styles.photoLocation}>
              <MapPin size={11} color="rgba(255,255,255,0.75)" strokeWidth={2.5} />
              <Text style={styles.photoLocationText} numberOfLines={1}>
                {discount.address || discount.locationName}
              </Text>
              {isValidCoords(discount.lat, discount.lng) ? (
                <>
                  <Text style={styles.photoLocationDot}>·</Text>
                  <Text style={styles.photoDistance}>{formatDistance(discount.distanceKm)}</Text>
                  <Pressable
                    onPress={(e) => { e.stopPropagation(); openIn2Gis({ lat: discount.lat, lng: discount.lng, address: discount.address }); }}
                    hitSlop={8}
                    style={styles.mapPinBtn}
                  >
                    <MapPin size={14} color={Colors.primary} strokeWidth={2.5} fill={Colors.primary} />
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>
        </ImageCarousel>

        {expired && (
          <View style={styles.expiredRibbon}>
            <Text style={styles.expiredRibbonText}>Скидка истекла</Text>
          </View>
        )}

        {/* ── Compact info bar (always visible) ── */}
        <View style={styles.infoBar}>
          <Pressable onPress={onAuthorPress} style={styles.authorMini}>
            <Image source={{ uri: resolveImageUrl(discount.author.avatar) }} style={styles.avatarMini} contentFit="cover" />
            <Text style={styles.authorName} numberOfLines={1}>
              {discount.author.name}
            </Text>
          </Pressable>

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

          {/* ── Expand / collapse chevron ── */}
          <Pressable onPress={handleToggleExpand} hitSlop={6} style={[styles.chevronBtn, expanded && styles.chevronBtnExpanded]}>
            <ChevronDown
              size={16}
              color={expanded ? Colors.text : Colors.textMuted}
              strokeWidth={2.5}
              style={expanded && styles.chevronRotated}
            />
          </Pressable>
        </View>

        {/* ── Expandable body ── */}
        {expanded && (
          <View style={styles.expandedBody}>
            {/* Category + city + time */}
            <View style={styles.metaRow}>
              <View style={styles.metaRowLeft}>
                <View style={styles.categoryChip}>
                  <Icon size={13} color={cat.color} strokeWidth={2} />
                  <Text style={[styles.categoryLabel, { color: cat.color }]}>{cat.label}</Text>
                </View>
                {discount.cityName ? (
                  <Text style={styles.cityLabel} numberOfLines={1}>{discount.cityName}</Text>
                ) : null}
              </View>
              <Text style={styles.metaTime}>{formatTimeAgo(discount.postedAt)}</Text>
            </View>

            {/* Prices */}
            {discount.discountedPrice !== undefined && (
              <View style={styles.priceRow}>
                <View style={styles.priceCol}>
                  <Text style={styles.priceLabel}>Со скидкой</Text>
                  <Text style={styles.priceNow}>
                    {discount.discountedPrice.toLocaleString("ru-RU")} ₽
                  </Text>
                </View>
                {discount.originalPrice !== undefined && (
                  <>
                    <View style={styles.priceDivider} />
                    <View style={styles.priceCol}>
                      <Text style={styles.priceLabel}>Обычно</Text>
                      <Text style={styles.priceWas}>
                        {discount.originalPrice.toLocaleString("ru-RU")} ₽
                      </Text>
                    </View>
                    <View style={styles.priceDivider} />
                    <View style={styles.priceCol}>
                      <Text style={styles.priceLabel}>Экономия</Text>
                      <Text style={styles.priceSave}>
                        {(discount.originalPrice - discount.discountedPrice).toLocaleString("ru-RU")} ₽
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

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
    shadowColor: "rgba(0,0,0,0.3)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
  discountNumber: { color: Colors.text, fontSize: 18, letterSpacing: -0.5, fontWeight: "700" as const },

  // ── Timers pill (smooth gradient darkening on all 4 sides) ──
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

  // ── Photo overlay: title + location on the gradient at bottom ──
  photoOverlay: {
    position: "absolute",
    bottom: 12,
    left: 14,
    right: 14,
    gap: 4,
  },
  photoTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    lineHeight: 24,
    letterSpacing: -0.5,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  photoPlaceName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: -0.2,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 2,
  },
  photoLocation: { flexDirection: "row", alignItems: "center", gap: 4 },
  photoLocationText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    flexShrink: 1,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  mapPinBtn: {
    marginLeft: 2,
    width: 24,
    height: 24,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
  },
  photoLocationDot: { color: "rgba(255,255,255,0.45)", fontSize: 12 },
  photoDistance: {
    fontSize: 13,
    color: Colors.primary,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  authorMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.cardSecondary,
  },
  authorName: {
    fontSize: 14,
    color: Colors.text,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  statsMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  expiredRibbonText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.danger,
    letterSpacing: -0.1,
  },

  // ── Expandable body ──
  expandedBody: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 14,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.cardSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  categoryLabel: { fontSize: 12, letterSpacing: 0.2 },
  cityLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  metaTime: { fontSize: 12, color: Colors.textMuted },

  // ── Price row ──
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardSecondary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  priceCol: { flex: 1, gap: 2 },
  priceDivider: { width: 1, height: 28, backgroundColor: Colors.border, marginHorizontal: 6 },
  priceLabel: { fontSize: 10, color: Colors.textMuted, letterSpacing: 0.3 },
  priceNow: { fontSize: 16, color: Colors.text, fontWeight: "700" as const, letterSpacing: -0.3 },
  priceWas: { fontSize: 14, color: Colors.textMuted, textDecorationLine: "line-through" as const },
  priceSave: { fontSize: 14, color: Colors.accent },

  // ── CTA ──
  cta: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  ctaText: {
    color: Colors.text,
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

  // ── Note in expanded body ──
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

  // ── Link in expanded body ──
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
