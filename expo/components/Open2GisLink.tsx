import { Navigation } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import Colors from "@/constants/colors";
import { openIn2Gis } from "@/utils/maps";

interface Props {
  lat?: number;
  lng?: number;
  label?: string;
  address?: string;
}

export function Open2GisLink({ lat, lng, label, address }: Props) {
  return (
    <Pressable
      onPress={() => openIn2Gis({ lat, lng, label, address })}
      style={styles.btn}
    >
      <Navigation size={14} color={Colors.primary} strokeWidth={2} />
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
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.card,
  },
  btnText: {
    color: Colors.text,
    fontSize: 14,
    letterSpacing: -0.2,
  },
});
