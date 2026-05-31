import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import Colors from "@/constants/colors";

export function SkeletonCard() {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.card, { opacity: pulse }]}>
      <View style={styles.image} />
      <View style={styles.body}>
        <View style={styles.line} />
        <View style={[styles.line, { width: "70%" }]} />
        <View style={[styles.line, { width: "45%", height: 10 }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 200,
    backgroundColor: Colors.cardSecondary,
  },
  body: {
    padding: 14,
    gap: 10,
  },
  line: {
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.cardSecondary,
  },
});
