import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useQueue } from "@/providers/QueueProvider";

const ZONE_LABEL: Record<string, string> = {
  green: "Спокойно",
  yellow: "Скоро твоя очередь",
  red: "Подходи!",
};

const ZONE_COLOR: Record<string, string> = {
  green: Colors.success,
  yellow: Colors.warning,
  red: Colors.danger,
};

export default function MyQueueScreen() {
  const router = useRouter();
  const { currentQueue, leaveQueue } = useQueue();
  const [leaving, setLeaving] = useState<boolean>(false);

  const handleLeave = useCallback(async () => {
    setLeaving(true);
    const success = await leaveQueue();
    setLeaving(false);
    if (success) {
      router.back();
    }
  }, [leaveQueue, router]);

  if (!currentQueue) {
    return (
      <SafeAreaView style={[styles.root, styles.center]} edges={["top"]}>
        <Text style={styles.emptyText}>Ты не в очереди</Text>
      </SafeAreaView>
    );
  }

  const zoneColor = ZONE_COLOR[currentQueue.zone] ?? Colors.textMuted;
  const zoneLabel = ZONE_LABEL[currentQueue.zone] ?? "";

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.card}>
        <Text style={styles.stationName}>{currentQueue.stationName ?? "Станция"}</Text>
        <View style={[styles.zoneBadge, { backgroundColor: zoneColor }]}>
          <Text style={styles.zoneLabel}>{zoneLabel}</Text>
        </View>
        <Text style={styles.position}>#{currentQueue.position}</Text>
        <Text style={styles.hint}>
          Впереди тебя {currentQueue.peopleBefore}{" "}
          {currentQueue.peopleBefore === 1 ? "человек" : "человек"}
        </Text>
        <Text style={styles.eta}>~{currentQueue.estimatedMinutes} мин ожидания</Text>
      </View>

      <Pressable onPress={handleLeave} disabled={leaving} style={styles.leaveBtn}>
        <X size={18} color={Colors.danger} />
        <Text style={styles.leaveBtnText}>{leaving ? "Выходим..." : "Покинуть очередь"}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
    justifyContent: "space-between",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 15,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  stationName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  zoneBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
  zoneLabel: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: "700" as const,
  },
  position: {
    fontSize: 48,
    fontWeight: "800" as const,
    color: Colors.primary,
    marginTop: 8,
  },
  hint: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  eta: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "600" as const,
  },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.dangerLight,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  leaveBtnText: {
    color: Colors.danger,
    fontSize: 15,
    fontWeight: "700" as const,
  },
});
