import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { QueueProgress } from "@/components/QueueProgress";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useQueue } from "@/providers/QueueProvider";
import { usePush } from "@/providers/PushProvider";

const POLL_INTERVAL = 15_000;

const FUEL_CHIP_LABEL: Record<string, string> = {
  "92": "АИ-92",
  "95": "АИ-95",
  dt: "ДТ",
  lpg: "Газ",
};

const ZONE_CARD_TEXT: Record<string, string> = {
  green: "Можешь отойти",
  yellow: "Возвращайся",
  red: "Подходи!",
};

const ZONE_CARD_COLOR: Record<string, string> = {
  green: Colors.success,
  yellow: Colors.warning,
  red: Colors.danger,
};

export default function MyQueueScreen() {
  const router = useRouter();
  useAuth();
  const { currentQueue, leaveQueue, loadStations, refreshMyQueue } = useQueue();
  const { messages } = usePush();

  // Poll my queue position every 15s
  useEffect(() => {
    if (!currentQueue) return;
    const interval = setInterval(refreshMyQueue, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [currentQueue, refreshMyQueue]);

  // React to queue_zone push notifications
  useEffect(() => {
    if (messages.length === 0) return;
    const latest = messages[0];
    const dataType = (latest?.data as Record<string, string> | undefined)?.type;
    if (dataType === "queue_zone") {
      refreshMyQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const handleLeave = useCallback(() => {
    Alert.alert("Покинуть очередь?", "Ты потеряешь свою позицию в очереди", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Покинуть",
        style: "destructive",
        onPress: async () => {
          const success = await leaveQueue();
          if (success) router.back();
        },
      },
    ]);
  }, [leaveQueue, router]);

  const handleShare = useCallback(() => {
    const text = "Скидос — цифровая очередь на АЗС";
    Share.share({ message: text });
  }, []);

  if (!currentQueue) {
    return (
      <SafeAreaView style={[styles.root, styles.center]} edges={["top"]}>
        <Text style={styles.emptyText}>Ты не в очереди</Text>
        <Pressable
          onPress={() => {
            loadStations();
            router.replace("/queue");
          }}
          style={styles.findBtn}
        >
          <Text style={styles.findBtnText}>Найти АЗС</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const zoneText = ZONE_CARD_TEXT[currentQueue.zone] ?? "";
  const zoneColor = ZONE_CARD_COLOR[currentQueue.zone] ?? Colors.textMuted;
  const fuelLabel = FUEL_CHIP_LABEL[currentQueue.fuelType] ?? currentQueue.fuelType;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.card}>
        <Text style={styles.stationName} numberOfLines={1}>
          {currentQueue.stationName ?? "Станция"}
        </Text>
        <View style={styles.fuelChip}>
          <Text style={styles.fuelChipText}>{fuelLabel}</Text>
        </View>

        <QueueProgress
          zone={currentQueue.zone}
          position={currentQueue.position}
          peopleBefore={currentQueue.peopleBefore}
          estimatedMinutes={currentQueue.estimatedMinutes}
        />
      </View>

      <View style={[styles.zoneCard, { backgroundColor: zoneColor }]}>
        <Text style={styles.zoneCardText}>{zoneText}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={handleShare} style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>Поделиться</Text>
        </Pressable>

        <Pressable onPress={handleLeave} style={styles.leaveBtn}>
          <Text style={styles.leaveBtnText}>Выйти из очереди</Text>
        </Pressable>
      </View>
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
    gap: 16,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 15,
  },
  findBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  findBtnText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: "700" as const,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  stationName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  fuelChip: {
    backgroundColor: Colors.cardSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 4,
  },
  fuelChipText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.textSecondary,
  },
  zoneCard: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  zoneCardText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: "800" as const,
  },
  actions: {
    gap: 12,
    marginBottom: 20,
  },
  shareBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: Colors.cardSecondary,
  },
  shareBtnText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700" as const,
  },
  leaveBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: Colors.dangerLight,
  },
  leaveBtnText: {
    color: Colors.danger,
    fontSize: 15,
    fontWeight: "700" as const,
  },
});
