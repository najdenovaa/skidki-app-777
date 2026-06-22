import { useRouter } from "expo-router";
import { Bell, LifeBuoy, MapPin, Tag } from "lucide-react-native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryPicker } from "@/components/CategoryPicker";
import { CityPicker } from "@/components/CityPicker";
import { DiscountCard } from "@/components/DiscountCard";
import { DraggableFab } from "@/components/DraggableFab";
import { PercentSpinner } from "@/components/PercentSpinner";
import { SkeletonCard } from "@/components/SkeletonCard";
import Colors from "@/constants/colors";
import { useTabBarVisible } from "@/hooks/TabBarScrollContext";
import { useAuth } from "@/providers/AuthProvider";
import { useDiscounts } from "@/providers/DiscountsProvider";
import { usePush } from "@/providers/PushProvider";
import type { Discount } from "@/types/discount";

const CHIPS_HEIGHT = 60;

function FeedHeader() {
  const router = useRouter();
  const { isGuest, guestCity, saveGuestCity, user, updateProfile } = useAuth();
  const { unreadCount } = usePush();
  const [cityPickerOpen, setCityPickerOpen] = useState<boolean>(false);

  const cityLabel = isGuest
    ? guestCity?.cityName
    : user?.city;

  const onBellPress = useCallback(() => {
    if (isGuest) {
      Alert.alert(
        "Требуется авторизация",
        "Войди или зарегистрируйся, чтобы настроить уведомления",
        [
          { text: "Войти", onPress: () => router.push("/auth/login") },
          { text: "Позже", style: "cancel" as const },
        ]
      );
      return;
    }
    router.push("/notifications");
  }, [isGuest, router]);

  const onSupportPress = useCallback(() => {
    if (isGuest) {
      Alert.alert(
        "Требуется авторизация",
        "Войди или зарегистрируйся, чтобы написать в поддержку",
        [
          { text: "Войти", onPress: () => router.push("/auth/login") },
          { text: "Позже", style: "cancel" as const },
        ]
      );
      return;
    }
    router.push("/support");
  }, [isGuest, router]);

  return (
    <>
      <View style={styles.headerRow} pointerEvents="box-none">
        <View style={styles.headerLeft}>
          <Text style={styles.brandTitle}>Скидос</Text>
          <Pressable
            onPress={() => setCityPickerOpen(true)}
            style={styles.cityRow}
            hitSlop={8}
          >
            <MapPin size={11} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.cityLabel} numberOfLines={1}>
              {cityLabel || "Выбери город"}
            </Text>
          </Pressable>
        </View>
        <View style={styles.headerActions}>
          <Pressable hitSlop={10} style={styles.iconBtn} onPress={onSupportPress}>
            <LifeBuoy size={20} color={Colors.textSecondary} strokeWidth={1.8} />
          </Pressable>
          <Pressable hitSlop={10} style={styles.iconBtn} onPress={onBellPress}>
            <Bell size={22} color={Colors.textSecondary} strokeWidth={1.8} />
            {unreadCount > 0 ? (
              <View style={styles.notifyBadge}>
                <Text style={styles.notifyBadgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            ) : (
              <View style={styles.notifyDot} />
            )}
          </Pressable>
        </View>
      </View>

      <CityPicker
        visible={cityPickerOpen}
        onSelect={(c) => {
          if (isGuest) {
            saveGuestCity(c);
          } else {
            updateProfile({ cityId: c.cityId, city: c.cityName, regionId: c.regionId });
          }
          setCityPickerOpen(false);
        }}
        onClose={() => setCityPickerOpen(false)}
      />
    </>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const { filtered, filter, setFilter, hydrated, refreshing, onRefresh } = useDiscounts();
  const tabBarVisible = useTabBarVisible();
  const { user, guestCity, isGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const hasCity = !!(user?.cityId || guestCity?.cityId);
  const [categoryOpen, setCategoryOpen] = useState<boolean>(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<any>>(null);
  const expandedAtIndex = useRef<number | null>(null);
  const scrollY = useRef<number>(0);

  const handleFabPress = useCallback(() => {
    if (isGuest) {
      Alert.alert(
        "Требуется авторизация",
        "Чтобы публиковать скидки, войди или зарегистрируйся",
        [
          { text: "Войти", onPress: () => router.push("/auth/login") },
          { text: "Позже", style: "cancel" as const },
        ]
      );
      return;
    }
    router.push("/post");
  }, [isGuest, router]);

  const HEADER_HEIGHT = useMemo(() => insets.top + 72 + CHIPS_HEIGHT, [insets.top]);

  const chipsVisible = useSharedValue<number>(1);
  const lastY = useSharedValue<number>(0);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastY.value;
      scrollY.current = y;

      if (y <= 8) {
        chipsVisible.value = withTiming(1, { duration: 200 });
        tabBarVisible.value = withTiming(1, { duration: 200 });
      } else if (dy > 6) {
        chipsVisible.value = withTiming(0, { duration: 200 });
        tabBarVisible.value = withTiming(0, { duration: 200 });
        if (categoryOpen) setCategoryOpen(false);
      } else if (dy < -6) {
        chipsVisible.value = withTiming(1, { duration: 200 });
        tabBarVisible.value = withTiming(1, { duration: 200 });
      }

      lastY.value = y;
    },
    [chipsVisible, tabBarVisible, lastY, categoryOpen]
  );

  const handleToggleExpand = useCallback((id: string, index: number) => {
    if (Platform.OS === "ios") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const wasExpanded = expandedCardId === id;

    if (wasExpanded) {
      setExpandedCardId(null);
      expandedAtIndex.current = null;
    } else {
      expandedAtIndex.current = index;
      setExpandedCardId(id);

      // Auto-scroll so the expanded card is fully visible
      setTimeout(() => {
        if (flatListRef.current && expandedAtIndex.current === index) {
          flatListRef.current.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.15,
            viewOffset: insets.top + 100,
          });
        }
      }, 150);
    }
  }, [expandedCardId, insets.top]);

  const chipsContainerStyle = useAnimatedStyle(() => ({
    height: interpolate(chipsVisible.value, [0, 1], [0, CHIPS_HEIGHT], Extrapolation.CLAMP),
    opacity: chipsVisible.value,
    transform: [
      {
        translateY: interpolate(chipsVisible.value, [0, 1], [-12, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  const renderItem = useCallback(
    ({ item, index }: { item: Discount; index: number }) => (
      <DiscountCard
        discount={item}
        index={index}
        isExpanded={expandedCardId === item.id}
        onToggleExpand={() => handleToggleExpand(item.id, index)}

      />
    ),
    [expandedCardId, handleToggleExpand]
  );

  return (
    <View style={styles.root}>
      {!hydrated ? (
        <View style={styles.loadingWrap}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
      <FlatList
        ref={flatListRef}
        data={filtered}
        keyExtractor={(d) => String(d.id)}
        renderItem={renderItem}
        extraData={expandedCardId}
        contentContainerStyle={[styles.list, { paddingTop: HEADER_HEIGHT }]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        removeClippedSubviews
        windowSize={7}
        maxToRenderPerBatch={4}
        initialNumToRender={3}
        refreshing={refreshing}
        onRefresh={onRefresh}
        progressViewOffset={HEADER_HEIGHT}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
              viewPosition: 0,
            });
          }, 200);
        }}
        ListHeaderComponent={<View style={{ height: 8 }} />}
        ListEmptyComponent={
          !hasCity ? (
            <View style={styles.empty}>
              <MapPin size={48} color={Colors.textMuted} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>Выбери город</Text>
              <Text style={styles.emptyText}>Укажи город, чтобы видеть скидки рядом</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Tag size={48} color={Colors.textMuted} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>Скидок пока нет</Text>
              <Text style={styles.emptyText}>Загляни позже или добавь первую</Text>
            </View>
          )
        }
      />
      )}

      {/* Spinner overlay on pull-to-refresh */}
      {refreshing && (
        <View style={styles.refreshOverlay} pointerEvents="none">
          <PercentSpinner size={72} />
        </View>
      )}

      <DraggableFab onPress={handleFabPress} />

      {/* Transparent header */}
      <SafeAreaView
        edges={["top"]}
        style={styles.headerSafe}
        pointerEvents="box-none"
      >
        {/* Clean header row */}
        <FeedHeader />

        {/* Collapsible category picker */}
        <Animated.View
          style={[styles.chipsWrapper, chipsContainerStyle]}
          pointerEvents="box-none"
        >
          <CategoryPicker value={filter} onChange={setFilter} open={categoryOpen} onOpenChange={setCategoryOpen} />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  list: { paddingBottom: 110 },

  headerSafe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerLeft: { gap: 2 },
  brandTitle: {
    fontSize: 30,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -1,
  },
  brandSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: -0.2,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  cityLabel: {
    fontSize: 13,
    color: Colors.primary,
    letterSpacing: -0.2,
    fontWeight: "500" as const,
  },
  headerActions: { flexDirection: "row", gap: 12, paddingTop: 4 },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  notifyDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.accent,
  },
  notifyBadge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.danger,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 4,
  },
  notifyBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#fff",
  },

  chipsWrapper: {
    overflow: "hidden",
    paddingHorizontal: 20,
  },

  empty: { padding: 60, alignItems: "center" as const, gap: 12 },
  emptyTitle: { fontSize: 17, color: Colors.text, letterSpacing: -0.3 },
  emptyText: { fontSize: 14, color: Colors.textMuted, marginTop: 4, textAlign: "center" as const },
  loadingWrap: { paddingTop: 100, gap: 8 },
  refreshOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "transparent",
    zIndex: 5,
    paddingTop: 0,
  },
});
