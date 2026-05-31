import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";

interface Props {
  size?: number;
}

export function Logo({ size = 14 }: Props) {
  return (
    <View style={styles.row}>
      <Text style={[styles.letter, styles.green, { fontSize: size }]}>С</Text>
      <Text style={[styles.letter, { fontSize: size }]}>кину</Text>
      <Text style={[styles.letter, { fontSize: size, marginLeft: size * 0.4 }]}>скидку</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "baseline" },
  letter: {
    color: Colors.text,
    letterSpacing: -0.3,
  },
  green: { color: Colors.primary },
});
