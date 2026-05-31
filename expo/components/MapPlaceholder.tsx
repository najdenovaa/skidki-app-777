import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { CATEGORY_MAP } from "@/constants/categories";
import type { Discount } from "@/types/discount";

interface Props {
  discounts: Discount[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

export function MapPlaceholder({ discounts, selectedId, onSelect }: Props) {
  const pins = useMemo(() => {
    if (discounts.length === 0) return [];
    const minLat = Math.min(...discounts.map((d) => d.lat));
    const maxLat = Math.max(...discounts.map((d) => d.lat));
    const minLng = Math.min(...discounts.map((d) => d.lng));
    const maxLng = Math.max(...discounts.map((d) => d.lng));
    const latRange = Math.max(0.001, maxLat - minLat);
    const lngRange = Math.max(0.001, maxLng - minLng);
    return discounts.map((d) => ({
      d,
      x: ((d.lng - minLng) / lngRange) * 76 + 12,
      y: ((maxLat - d.lat) / latRange) * 66 + 16,
    }));
  }, [discounts]);

  return (
    <View style={styles.root}>
      {/* Grid */}
      {Array.from({ length: 10 }).map((_, i) => (
        <View key={`h${i}`} style={[styles.gridLine, { top: `${(i + 1) * 10}%` }]} />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={`v${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 12}%` }]} />
      ))}

      {/* Roads */}
      <View style={[styles.road, { top: "30%", left: -20, right: -20 }]} />
      <View style={[styles.road, { top: "62%", left: -20, right: -20 }]} />
      <View style={[styles.roadV, { left: "28%", top: -20, bottom: -20 }]} />
      <View style={[styles.roadV, { left: "68%", top: -20, bottom: -20 }]} />

      {/* Building blocks */}
      <View style={[styles.block, { top: "12%", left: "8%", width: 60, height: 40 }]} />
      <View style={[styles.block, { top: "14%", left: "44%", width: 80, height: 44 }]} />
      <View style={[styles.block, { top: "48%", left: "12%", width: 64, height: 50 }]} />
      <View style={[styles.block, { top: "72%", left: "44%", width: 84, height: 38 }]} />
      <View style={[styles.block, { top: "76%", left: "76%", width: 56, height: 44 }]} />

      {/* "You are here" dot */}
      <View style={[styles.you, { left: "48%", top: "48%" }]}>
        <View style={styles.youHalo} />
        <View style={styles.youDot} />
      </View>

      {/* Discount pins */}
      {pins.map(({ d, x, y }) => {
        const active = selectedId === d.id;
        const cat = CATEGORY_MAP[d.category];
        return (
          <Pressable
            key={d.id}
            onPress={() => onSelect?.(d.id)}
            style={[styles.pinWrap, { left: `${x}%`, top: `${y}%` }]}
            hitSlop={8}
          >
            <View
              style={[
                styles.pin,
                { backgroundColor: active ? cat.color : Colors.cardSecondary },
              ]}
            >
              <Text style={[styles.pinText, { color: active ? Colors.text : cat.color }]}>
                −{d.percent}%
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden", backgroundColor: "#0D1F14" },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(180,210,195,0.1)",
  },
  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(180,210,195,0.1)",
  },
  road: {
    position: "absolute",
    height: 10,
    backgroundColor: "#1A3A26",
  },
  roadV: {
    position: "absolute",
    width: 10,
    backgroundColor: "#1A3A26",
  },
  block: {
    position: "absolute",
    backgroundColor: "#153022",
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(180,210,195,0.12)",
  },

  you: {
    position: "absolute",
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  youHalo: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary + "4D",
  },
  youDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.text,
  },

  pinWrap: {
    position: "absolute",
    transform: [{ translateX: -28 }, { translateY: -16 }],
  },
  pin: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: "rgba(0,0,0,0.4)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  pinText: { fontSize: 12, letterSpacing: -0.3, fontWeight: "600" as const },
});
