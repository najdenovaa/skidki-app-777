import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";

type Zone = "green" | "yellow" | "red";

interface QueueProgressProps {
  zone: Zone;
  position: number;
  peopleBefore: number;
  estimatedMinutes: number;
}

const ZONE_FILL_WIDTH: Record<Zone, `${number}%`> = {
  green: "33%",
  yellow: "66%",
  red: "100%",
};

const ZONE_FILL_COLOR: Record<Zone, string> = {
  green: Colors.success,
  yellow: Colors.warning,
  red: Colors.danger,
};

const ZONE_MARKS: { key: Zone; label: string }[] = [
  { key: "green", label: "Далеко" },
  { key: "yellow", label: "Скоро" },
  { key: "red", label: "Подходи" },
];

export function QueueProgress({ zone, position, peopleBefore, estimatedMinutes }: QueueProgressProps) {
  const fillWidth = ZONE_FILL_WIDTH[zone];
  const fillColor = ZONE_FILL_COLOR[zone];

  const carsLabel = useMemo(() => {
    return `Перед тобой ${peopleBefore} машин · ~${estimatedMinutes} мин`;
  }, [peopleBefore, estimatedMinutes]);

  return (
    <View style={styles.root}>
      <Text style={styles.position}>{position}</Text>
      <Text style={styles.hint}>{carsLabel}</Text>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: fillWidth, backgroundColor: fillColor }]} />
      </View>

      <View style={styles.marksRow}>
        {ZONE_MARKS.map((m) => {
          const active = m.key === zone;
          return (
            <Text
              key={m.key}
              style={[styles.markLabel, active ? styles.markLabelActive : null]}
            >
              {m.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    gap: 10,
  },
  position: {
    fontSize: 72,
    fontWeight: "700" as const,
    color: Colors.text,
    lineHeight: 80,
  },
  hint: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "600" as const,
  },
  barTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: "hidden",
    marginTop: 8,
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  marksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 2,
  },
  markLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "500" as const,
  },
  markLabelActive: {
    color: Colors.text,
    fontWeight: "600" as const,
  },
});
