import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { CATEGORIES } from "@/constants/categories";
import type { Category } from "@/types/discount";

interface Props {
  value: Category | "all";
  onChange: (next: Category | "all") => void;
}

export function CategoryChips({ value, onChange }: Props) {
  const items: { id: Category | "all"; label: string; color?: string }[] = [
    { id: "all", label: "Всё", color: Colors.primary },
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.label, color: c.color })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((it) => {
        const active = value === it.id;
        return (
          <Pressable
            key={it.id}
            onPress={() => onChange(it.id)}
            style={[
              styles.chip,
              active
                ? { backgroundColor: it.color ?? Colors.primary }
                : { backgroundColor: Colors.backgroundSecondary },
            ]}
          >
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 20, gap: 8, paddingVertical: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    letterSpacing: -0.2,
  },
  labelActive: { color: Colors.text },
  labelInactive: { color: Colors.textSecondary },
});
