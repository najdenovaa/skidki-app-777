import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PercentSpinner } from "@/components/PercentSpinner";
import { StationCard } from "@/components/StationCard";
import { StationMap } from "@/components/StationMap";
import Colors from "@/constants/colors";
import { useQueue } from "@/providers/QueueProvider";
import type { Station } from "@/types/queue";

type Mode = "map" | "list";

export default function QueueScreen() {
  const router = useRouter();
  const { stations, currentQueue, loading, refreshing, onRefresh, gpsLat, gpsLng } = useQueue();
  const [mode, setMode] = useState<Mode>("map");

  const nearestStations = useMemo(() => stations.slice(0, 5), [stations]);

  const goToStation = useCallback(
    (station: Station) => {
      router.push(`/queue/station/${station.id}`);
    },
    [router]
  );

  const goToMyQueue = useCallback(() => {
    router.push("/queue/my");
  }, [router]);

  const goToAddStation = useCallback(() => {
    router.push("/queue/add");
  }, [router]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, styles.center]} edges={["top"]}>
        <PercentSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Очередь на АЗС</Text>
          <Pressable onPress={goToAddStation} style={styles.addBtn}>
            <Plus size={16} color={Colors.textInverse} strokeWidth={2.5} />
            <Text style={styles.addBtnText}>Добавить</Text>
          </Pressable>
        </View>
        <View style={styles.segment}>
          <Pressable
            onPress={() => setMode("map")}
            style={[styles.segmentBtn, mode === "map" ? styles.segmentBtnActive : null]}
          >
            <Text style={[styles.segmentLabel, mode === "map" ? styles.segmentLabelActive : null]}>
              Карта
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("list")}
            style={[styles.segmentBtn, mode === "list" ? styles.segmentBtnActive : null]}
          >
            <Text style={[styles.segmentLabel, mode === "list" ? styles.segmentLabelActive : null]}>
              Список
            </Text>
          </Pressable>
        </View>
      </View>

      {currentQueue ? (
        <Pressable onPress={goToMyQueue} style={styles.banner}>
          <Text style={styles.bannerText}>
            Ты #{currentQueue.position} · ~{currentQueue.estimatedMinutes} мин
          </Text>
        </Pressable>
      ) : null}

      {mode === "map" ? (
        <View style={styles.mapWrap}>
          <StationMap
            stations={stations}
            onMarkerPress={goToStation}
            userLat={gpsLat}
            userLng={gpsLng}
          />
          <View style={styles.overlayList}>
            <FlatList
              data={nearestStations}
              horizontal={false}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <StationCard station={item} onPress={() => goToStation(item)} />
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.overlayListContent}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={stations}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <StationCard station={item} onPress={() => goToStation(item)} />
          )}
          removeClippedSubviews
          windowSize={7}
          maxToRenderPerBatch={4}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Пока нет АЗС рядом</Text>
              <Text style={styles.emptySubtitle}>
                Стань первым и добавь станцию, которой нет на карте
              </Text>
              <Pressable onPress={goToAddStation} style={styles.emptyAddBtn}>
                <Plus size={16} color={Colors.textInverse} strokeWidth={2.5} />
                <Text style={styles.emptyAddBtnText}>Добавить АЗС</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -0.4,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  segmentLabelActive: {
    color: Colors.textInverse,
  },
  banner: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bannerText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: "700" as const,
    textAlign: "center",
  },
  mapWrap: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  overlayList: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 180,
  },
  overlayListContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyAddBtnText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: "700" as const,
  },
});
