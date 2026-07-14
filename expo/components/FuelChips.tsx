import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import Colors from "@/constants/colors";
import type { FuelType } from "@/types/queue";

interface Props {
  value: FuelType;
  onChange: (v: FuelType) => void;
  available: { fuel92: boolean; fuel95: boolean; fuelDt: boolean; fuelLpg: boolean };
}

const OPTIONS: { id: FuelType; label: string; key: keyof Props["available"] }[] = [
  { id: "92", label: "АИ-92", key: "fuel92" },
  { id: "95", label: "АИ-95", key: "fuel95" },
  { id: "dt", label: "ДТ", key: "fuelDt" },
  { id: "lpg", label: "Газ", key: "fuelLpg" },
];

export function FuelChips({ value, onChange, available }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {OPTIONS.map((opt) => {
        const isAvailable = available[opt.key];
        const active = value === opt.id;
        return (
          <Pressable
            key={opt.id}
            disabled={!isAvailable}
            onPress={() => onChange(opt.id)}
            style={[
              styles.chip,
              active
                ? { backgroundColor: Colors.primary }
                : { backgroundColor: Colors.backgroundSecondary },
              !isAvailable ? styles.chipDisabled : null,
            ]}
          >
            <Text
              style={[
                styles.label,
                active ? styles.labelActive : styles.labelInactive,
                !isAvailable ? styles.labelDisabled : null,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chipDisabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: 13,
    letterSpacing: -0.2,
    fontWeight: "600" as const,
  },
  labelActive: { color: Colors.textInverse },
  labelInactive: { color: Colors.textSecondary },
  labelDisabled: { color: Colors.textMuted },
});
