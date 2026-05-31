import { Image } from "expo-image";
import { MapPin, Navigation } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { isValidCoords, openIn2Gis, staticMapUrl } from "@/utils/maps";

interface Props {
  lat?: number;
  lng?: number;
  height?: number;
  label?: string;
}

export function StaticMapPreview({ lat, lng, height = 160, label }: Props) {
  const hasCoords = isValidCoords(lat, lng);

  return (
    <View style={styles.root}>
      {hasCoords ? (
        <Image
          source={{ uri: staticMapUrl(lat!, lng!, 600, Math.round(height * 2)) }}
          style={[styles.map, { height }]}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.placeholder, { height }]}>
          <MapPin size={28} color={Colors.textMuted} strokeWidth={1.5} />
          <Text style={styles.placeholderText}>
            Укажи адрес или нажми GPS
          </Text>
        </View>
      )}

      {hasCoords && (
        <Pressable
          onPress={() => openIn2Gis(lat!, lng!, label)}
          style={styles.btn}
        >
          <Navigation size={14} color={Colors.primary} strokeWidth={2} />
          <Text style={styles.btnText}>Открыть в 2ГИС</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 0 },
  map: {
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  placeholder: {
    width: "100%",
    backgroundColor: Colors.cardSecondary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  placeholderText: {
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: -0.2,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: Colors.card,
  },
  btnText: {
    color: Colors.text,
    fontSize: 14,
    letterSpacing: -0.2,
  },
});
