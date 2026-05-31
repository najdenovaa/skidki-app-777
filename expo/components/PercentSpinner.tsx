import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

interface Props {
  size?: number;
  color?: string;
}

export function PercentSpinner({ size = 56, color = Colors.primary }: Props) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Text style={[styles.pct, { fontSize: size * 0.6, color }]}>%</Text>
      </Animated.View>
    </View>
  );
}

export function PercentSpinnerCentered({ size = 56, color = Colors.primary }: Props) {
  return (
    <View style={styles.center}>
      <PercentSpinner size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cardSecondary,
  },
  pct: {
    fontWeight: "800",
    letterSpacing: -1,
    textAlign: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
});
