import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Bookmark, ChevronDown, Eye, Heart, MapPin, MessageCircle, Share2, Users } from "lucide-react-native";
import React, { memo, useCallback, useState } from "react";
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

const isIos = Platform.OS === "ios";

import { ImageCarousel } from "@/components/ImageCarousel";

import Colors from "@/constants/colors";
import { isValidCoords, openIn2Gis } from "@/utils/maps";
import { resolveImageUrl } from "@/utils/image";
import { CATEGORY_MAP } from "@/constants/categories";
import { useDiscounts } from "@/providers/DiscountsProvider";
import type { Discount } from "@/types/discount";
import { useTick } from "@/hooks/useTick";
import { formatTimeSince, formatDistance, formatTimeAgo, formatViews } from "@/utils/time";

interface Props {
  discount: Discount;
  index?: number;
}

function impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== "web") Haptics.impactAsync(style).catch(() => {});
}

function DiscountCardBase({ discount, index = 0 }: Props) {
  useTick(1000);
  const router = useRouter();
  const { toggleGoing, toggleLike, toggleSave } = useDiscounts();
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_MAP[discount.category];
  const Icon = cat.icon;
  const elapsed = formatTimeSince(discount.postedAt);

  const onOpen = useCallback(() => {
    router.push(`/discount/${discount.id}`);
  }, [router, discount.id]);

  const onToggleExpand = useCallback(() => {
    if (isIos) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  }, []);

  const onGoing = useCallback(() => {
    impact(Haptics.ImpactFeedbackStyle.Medium);
    toggleGoing(discount.id);
  }, [toggleGoing, discount.id]);

  const onLike = useCallback(() => {
    impact();
    toggleLike(discount.id);
  }, [toggleLike, discount.id]);

  const onSave = useCallback(() => {
    toggleSave(discount.id);
  }, [toggleSave, discount.id]);

  return (
    <Animated.View
      entering={isIos ? FadeIn.delay(index * 80).duration(200) : undefined}
      style={styles.outer}
    >
      <View style={styles.card}>
        {/* ── Image carousel (Instagram-style) ── */}
        <ImageCarousel images={discount.images.map(resolveImageUrl)} height={240} onPress={onOpen} gradient>
          {/* Discount badge */}
          <View style={styles.discountBadge} pointerEvents="box-none">
            <Text style={styles.discountNumber}>−{discount.percent}%</Text>
          </View>

          {/* Elapsed time — no background, just shadowed text */}
          <View style={styles.timerBadge} pointerEvents="box-none">
            <Text style={styles.timerText}>
              {elapsed}
            </Text>
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
              <Text style={styles.photoLocationDot}>·</Text>
              <Text style={styles.photoDistance}>{formatDistance(discount.distanceKm)}</Text>
              {isValidCoords(discount.lat, discount.lng) ? (
                <Pressable
                  onPress={(e) => { e.stopPropagation(); openIn2Gis({ lat: discount.lat, lng: discount.lng, label: discount.placeName || discount.title, address: discount.address }); }}
                  hitSlop={8}
                  style={styles.mapPinBtn}
                >
                  <MapPin size={14} color={Colors.primary} strokeWidth={2.5} fill={Colors.primary} />
                </Pressable>
              ) : null}
            </View>
            {discount.cityName ? <Text style={styles.photoCity}>{discount.cityName}</Text> : null}
          </View>
        </ImageCarousel>

        {/* ── Compact info bar (always visible, tap to expand) ── */}
        <Pressable onPress={onToggleExpand} style={styles.infoBar}>
          <View style={styles.authorMini}>
            <Image source={{ uri: resolveImageUrl(discount.author.avatar) }} style={styles.avatarMini} contentFit="cover" />
            <Text style={styles.authorName} numberOfLines={1}>
              {discount.author.name}
            </Text>
          </View>

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
          <View style={[styles.chevronBtn, expanded && styles.chevronBtnExpanded]}>
            <ChevronDown
              size={16}
              color={expanded ? Colors.text : Colors.textInverse}
              strokeWidth={2.5}
              style={expanded && styles.chevronRotated}
            />
          </View>
        </Pressable>

        {/* ── Expandable body ── */}
        {expanded && (
          <View style={styles.expandedBody}>
            {/* Category + time */}
            <View style={styles.metaRow}>
              <View style={styles.categoryChip}>
                <Icon size={13} color={cat.color} strokeWidth={2} />
                <Text style={[styles.categoryLabel, { color: cat.color }]}>{cat.label}</Text>
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
              <Pressable hitSlop={8} style={styles.actionBtn}>
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

  timerBadge: {
    position: "absolute",
    top: 14,
    right: 46,
  },
  timerText: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.1,
    color: Colors.text,
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    bottom: 26,
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
  photoCity: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginTop: 2,
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

  // ── Expandable body ──
  expandedBody: {
    paddingHorizontal: 14,
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
});
