import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import type { Station } from "@/types/queue";
import { formatDistance } from "@/utils/time";

interface Props {
  station: Station;
  onPress: () => void;
}

function statusColor(station: Station): string {
  if (station.status !== "active") return Colors.textMuted;
  if (station.queueCount <= 5) return Colors.success;
  if (station.queueCount <= 15) return Colors.warning;
  return Colors.danger;
}

function StationCardComponent({ station, onPress }: Props) {
  const dotColor = statusColor(station);
  const subtitle = [station.brand, station.address].filter(Boolean).join(" · ");
  const distanceText =
    station.distanceKm !== undefined ? ` · ${formatDistance(station.distanceKm)}` : "";

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {station.name}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <Text style={styles.queueBadge}>
          {station.queueCount} в очереди · ~{station.avgWaitMin} мин
          {distanceText}
        </Text>
      </View>
    </Pressable>
  );
}

export const StationCard = memo(StationCardComponent);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  queueBadge: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
});
