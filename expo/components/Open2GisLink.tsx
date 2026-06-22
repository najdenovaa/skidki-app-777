import { Navigation } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import Colors from "@/constants/colors";
import { openIn2Gis } from "@/utils/maps";

interface Props {
  lat?: number;
  lng?: number;
  address?: string;
  city?: string;
}

export function Open2GisLink({ lat, lng, address, city }: Props) {
  return (
    <Pressable
      onPress={() => openIn2Gis({ lat, lng, address, city })}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
    >
      <Navigation size={17} color={Colors.textSecondary} strokeWidth={1.8} />
      <Text style={styles.btnText}>Открыть в 2ГИС</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnPressed: {
    backgroundColor: Colors.borderLight,
  },
  btnText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },
});
