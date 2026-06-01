import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Plus } from "lucide-react-native";
import { useCallback, useEffect, useRef } from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const FAB_SIZE = 56;
const GLOW_SIZE = FAB_SIZE + 24;
const STORAGE_KEY = "skidki.fab.position";
const DRAGGED_KEY = "skidki.fab.dragged";
const LONG_PRESS_MS = 220;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type Props = {
  onPress: () => void;
};

function persistPosition(x: number, y: number): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y })).catch(() => {});
}

export function DraggableFab({ onPress }: Props) {
  const insets = useSafeAreaInsets();

  const HEADER_BOTTOM = insets.top + 80;
  const TAB_BAR_TOP = SCREEN_HEIGHT - insets.bottom - 50;

  const DEFAULT_X = SCREEN_WIDTH - FAB_SIZE - 20;
  const DEFAULT_Y = SCREEN_HEIGHT - FAB_SIZE - 94;

  const minX = useSharedValue<number>(0);
  const maxX = useSharedValue<number>(SCREEN_WIDTH - FAB_SIZE);
  const minY = useSharedValue<number>(HEADER_BOTTOM);
  const maxY = useSharedValue<number>(TAB_BAR_TOP - FAB_SIZE);

  const translateX = useSharedValue<number>(DEFAULT_X);
  const translateY = useSharedValue<number>(DEFAULT_Y);
  const scale = useSharedValue<number>(1);
  const pulseScale = useSharedValue<number>(1);
  const hintOpacity = useSharedValue<number>(1);

  const startX = useSharedValue<number>(0);
  const startY = useSharedValue<number>(0);

  const hasDragged = useRef<boolean>(false);

  const clamped = useCallback(
    (x: number, y: number) => ({
      x: Math.min(Math.max(x, 0), SCREEN_WIDTH - FAB_SIZE),
      y: Math.min(Math.max(y, HEADER_BOTTOM), TAB_BAR_TOP - FAB_SIZE),
    }),
    [HEADER_BOTTOM, TAB_BAR_TOP],
  );

  const dismissHint = useCallback(() => {
    if (hasDragged.current) return;
    hasDragged.current = true;
    cancelAnimation(hintOpacity);
    hintOpacity.value = withTiming(0, { duration: 350 });
    AsyncStorage.setItem(DRAGGED_KEY, "1").catch(() => {});
  }, [hintOpacity]);

  useEffect(() => {
    // Restore saved position
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const { x, y } = JSON.parse(raw) as { x: number; y: number };
          const pos = clamped(x, y);
          translateX.value = withSpring(pos.x, { duration: 350 });
          translateY.value = withSpring(pos.y, { duration: 350 });
        }
      })
      .catch(() => {});

    // Check if user has dragged before
    AsyncStorage.getItem(DRAGGED_KEY)
      .then((val) => {
        if (val === "1") {
          hasDragged.current = true;
          hintOpacity.value = 0;
        }
      })
      .catch(() => {});

    // Pulse animation — subtle breathing
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: 1100 }),
        withTiming(1, { duration: 1100 }),
      ),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      scale.value = withSpring(1.08);
      if (Platform.OS !== "web") {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      }
      runOnJS(dismissHint)();
    })
    .onUpdate((e) => {
      translateX.value = Math.min(
        Math.max(startX.value + e.translationX, minX.value),
        maxX.value,
      );
      translateY.value = Math.min(
        Math.max(startY.value + e.translationY, minY.value),
        maxY.value,
      );
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      const finalX = translateX.value;
      const finalY = translateY.value;
      runOnJS(persistPosition)(finalX, finalY);
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(onPress)();
  });

  const composed = Gesture.Exclusive(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value + (FAB_SIZE - GLOW_SIZE) / 2 },
      { translateY: translateY.value + (FAB_SIZE - GLOW_SIZE) / 2 },
      { scale: pulseScale.value },
    ],
    opacity: 0.45 + (pulseScale.value - 1) * 4,
  }));

  const hintStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value - 30 },
    ],
    opacity: hintOpacity.value,
  }));

  return (
    <>
      {/* Glow ring behind the FAB */}
      <Animated.View style={[styles.glowRing, glowStyle]} />

      {/* Hint: "Меня можно перемещать" */}
      <Animated.View style={[styles.hintWrap, hintStyle]} pointerEvents="none">
        <View style={styles.hintPill}>
          <Text style={styles.hintText}>Меня можно перемещать</Text>
        </View>
        <View style={styles.hintArrow} />
      </Animated.View>

      {/* The FAB itself */}
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.fab, animatedStyle]}>
          <Plus size={24} color={Colors.text} strokeWidth={2.5} />
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    left: 0,
    top: 0,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 20,
  },
  glowRing: {
    position: "absolute",
    left: 0,
    top: 0,
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: "rgba(22, 163, 74, 0.14)",
    zIndex: 19,
  },
  hintWrap: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 18,
    alignItems: "center" as const,
  },
  hintPill: {
    backgroundColor: "rgba(15, 42, 26, 0.92)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(180, 210, 195, 0.3)",
  },
  hintArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(15, 42, 26, 0.92)",
    marginTop: -1,
  },
  hintText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: -0.1,
    fontWeight: "400" as const,
  },
});
