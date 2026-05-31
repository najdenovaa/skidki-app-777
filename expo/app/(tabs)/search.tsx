import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Map as MapIcon, Search, Target } from "lucide-react-native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { withTiming } from "react-native-reanimated";

import { CategoryChips } from "@/components/CategoryChips";
import { Open2GisLink } from "@/components/Open2GisLink";
import Colors from "@/constants/colors";
import { CATEGORY_MAP } from "@/constants/categories";
import { resolveImageUrl } from "@/utils/image";
import { useTabBarVisible } from "@/hooks/TabBarScrollContext";
import { useDiscounts } from "@/providers/DiscountsProvider";
import type { Category } from "@/types/discount";
import { formatDistance, isIndefinite } from "@/utils/time";
import { isValidCoords } from "@/utils/maps";
import type { Discount } from "@/types/discount";

const RADIUS_PRESETS: { label: string; value: number }[] = [
  { label: "1 км", value: 1000 },
  { label: "3 км", value: 3000 },
  { label: "5 км", value: 5000 },
  { label: "10 км", value: 10000 },
  { label: "30 км", value: 30000 },
  { label: "Везде", value: 0 },
];

export default function SearchScreen() {
  const router = useRouter();
  const { discounts, filter, setFilter } = useDiscounts();
  const tabBarVisible = useTabBarVisible();
  const [query, setQuery] = useState<string>("");
  const [mapMode, setMapMode] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [radius, setRadius] = useState<number>(0);
  const lastY = useRef<number>(0);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastY.current;
      if (y <= 8) {
        tabBarVisible.value = withTiming(1, { duration: 200 });
      } else if (dy > 6) {
        tabBarVisible.value = withTiming(0, { duration: 200 });
      } else if (dy < -6) {
        tabBarVisible.value = withTiming(1, { duration: 200 });
      }
      lastY.current = y;
    },
    [tabBarVisible]
  );

  const results = useMemo<Discount[]>(() => {
    let list = filter === "all" ? discounts : discounts.filter((d) => d.category === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.author.name.toLowerCase().includes(q) ||
          d.locationName.toLowerCase().includes(q)
      );
    }
    // Radius filter — only if radius > 0 and discount has valid coords
    if (radius > 0) {
      list = list.filter(
        (d) => isValidCoords(d.lat, d.lng) && d.distanceKm * 1000 <= radius
      );
    }
    return list;
  }, [discounts, filter, query, radius]);

  const renderItem = ({ item }: { item: Discount }) => {
    const cat = CATEGORY_MAP[item.category];
    return (
      <Pressable
        onPress={() => router.push(`/discount/${item.id}`)}
        style={styles.resultCard}
      >
        <Image source={{ uri: resolveImageUrl(item.images[0]) }} style={styles.resultImg} contentFit="cover" />
        <View style={styles.resultBody}>
          <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.resultMeta}>
            <Text style={styles.resultBusiness} numberOfLines={1}>{item.author.name}</Text>
            {isValidCoords(item.lat, item.lng) ? (
              <>
                <Text style={styles.resultDot}>·</Text>
                <Text style={styles.resultDistance}>{formatDistance(item.distanceKm)}</Text>
              </>
            ) : null}
          </View>
        </View>
        <View style={[styles.resultBadge, { backgroundColor: cat.color + "20" }]}>
          <Text style={[styles.resultBadgeText, { color: cat.color }]}>−{item.percent}%</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      {mapMode ? (
        <>
          {selectedId && (() => {
            const d = results.find((r) => r.id === selectedId);
            if (!d) return null;
            return (
              <View style={styles.mapPreviewWrap}>
                <Text style={styles.mapAddressText}>
                  {d.address || d.locationName}
                </Text>
                <Open2GisLink
                  lat={d.lat}
                  lng={d.lng}
                  address={d.address}
                  city={d.cityName}
                />
              </View>
            );
          })()}
          {!selectedId && (
            <View style={[styles.mapPreviewWrap, { alignItems: "center", justifyContent: "center", backgroundColor: Colors.cardSecondary, borderRadius: 16 }]}>
              <MapIcon size={48} color={Colors.textMuted} strokeWidth={1.5} />
              <Text style={{ color: Colors.textMuted, fontSize: 14, marginTop: 12 }}>Выбери скидку из списка</Text>
            </View>
          )}
          <SafeAreaView edges={["top"]} style={styles.mapOverlay} pointerEvents="box-none">
            <View style={styles.mapTopRow}>
              <Pressable onPress={() => setMapMode(false)} style={styles.mapBackBtn}>
                <Search size={20} color={Colors.text} strokeWidth={2} />
              </Pressable>
              <View style={styles.mapSearchBar}>
                <Search size={18} color={Colors.textMuted} strokeWidth={2} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Поиск скидок"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.searchInput}
                />
              </View>
            </View>
          </SafeAreaView>
          <View style={styles.mapListToggle}>
            <Pressable onPress={() => setMapMode(false)} style={styles.mapToggleBtn}>
              <MapIcon size={18} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.mapToggleText}>Списком</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          {/* Header */}
          <SafeAreaView edges={["top"]} style={styles.headerSafe}>
            <View style={styles.searchRow}>
              <View style={styles.searchBar}>
                <Search size={20} color={Colors.textMuted} strokeWidth={2} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Поиск скидок, мест, категорий"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.searchInput}
                  returnKeyType="search"
                />
              </View>
            </View>
            {/* Radius chips */}
            <View style={styles.radiusRow}>
              <Target size={13} color={Colors.textMuted} strokeWidth={2} />
              {RADIUS_PRESETS.map((p) => (
                <Pressable
                  key={p.value}
                  onPress={() => setRadius(p.value)}
                  style={[
                    styles.radiusChip,
                    radius === p.value && styles.radiusChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      radius === p.value && styles.radiusChipTextActive,
                    ]}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <CategoryChips value={filter} onChange={setFilter} />
          </SafeAreaView>

          {/* Results */}
          <FlatList
            data={results}
            keyExtractor={(d) => String(d.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            removeClippedSubviews
            windowSize={7}
            maxToRenderPerBatch={4}
            initialNumToRender={3}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text style={styles.listCount}>
                  {results.length} {results.length === 1 ? "скидка" : results.length >= 2 && results.length <= 4 ? "скидки" : "скидок"}
                </Text>
                <Pressable onPress={() => setMapMode(true)} style={styles.mapBtn}>
                  <MapIcon size={16} color={Colors.primary} strokeWidth={2} />
                  <Text style={styles.mapBtnText}>На карте</Text>
                </Pressable>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Search size={48} color={Colors.textMuted} strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>Ничего не нашлось</Text>
                <Text style={styles.emptyText}>Попробуй изменить запрос или категорию</Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // ── List mode ──
  headerSafe: {
    backgroundColor: Colors.background,
  },
  searchRow: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 14,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text, padding: 0 },

  // ── Radius chips ──
  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  radiusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.cardSecondary,
  },
  radiusChipActive: {
    backgroundColor: Colors.primary,
  },
  radiusChipText: {
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.1,
  },
  radiusChipTextActive: {
    color: Colors.text,
  },

  list: { paddingBottom: 100 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  listCount: { fontSize: 13, color: Colors.textMuted, letterSpacing: -0.2 },
  mapBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  mapBtnText: { fontSize: 13, color: Colors.primary, letterSpacing: -0.2 },

  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 12,
    backgroundColor: Colors.card,
    borderRadius: 16,
  },
  resultImg: { width: 56, height: 56, borderRadius: 12, backgroundColor: Colors.cardSecondary },
  resultBody: { flex: 1, gap: 4 },
  resultTitle: { fontSize: 14, color: Colors.text, lineHeight: 18, letterSpacing: -0.2 },
  resultMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  resultBusiness: { fontSize: 12, color: Colors.textMuted, flex: 1 },
  resultDot: { color: Colors.textMuted, fontSize: 12 },
  resultDistance: { fontSize: 12, color: Colors.primary },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resultBadgeText: { fontSize: 14, letterSpacing: -0.3 },

  empty: { padding: 60, alignItems: "center" as const, gap: 12 },
  emptyTitle: { fontSize: 17, color: Colors.text, letterSpacing: -0.3 },
  emptyText: { fontSize: 14, color: Colors.textMuted, marginTop: 4, textAlign: "center" as const },

  // ── Map mode ──
  mapPreviewWrap: { flex: 1, marginHorizontal: 20, marginTop: 100, marginBottom: 80, gap: 12 },
  mapAddressText: {
    fontSize: 15,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  mapOverlay: { position: "absolute", top: 0, left: 0, right: 0 },
  mapTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  mapBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(0,0,0,0.15)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  mapSearchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: Colors.card,
    borderRadius: 12,
    shadowColor: "rgba(0,0,0,0.15)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  mapListToggle: {
    position: "absolute",
    right: 20,
    bottom: 120,
  },
  mapToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.card,
    borderRadius: 12,
    shadowColor: "rgba(0,0,0,0.15)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  mapToggleText: { fontSize: 13, color: Colors.text, letterSpacing: -0.2 },
});
