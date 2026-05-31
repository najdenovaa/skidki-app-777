import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Plus } from "lucide-react-native";
import { useCallback, useEffect } from "react";
import { Dimensions, Platform, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const FAB_SIZE = 56;
const STORAGE_KEY = "skidki.fab.position";
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

  const startX = useSharedValue<number>(0);
  const startY = useSharedValue<number>(0);

  const clamped = useCallback(
    (x: number, y: number) => ({
      x: Math.min(Math.max(x, 0), SCREEN_WIDTH - FAB_SIZE),
      y: Math.min(Math.max(y, HEADER_BOTTOM), TAB_BAR_TOP - FAB_SIZE),
    }),
    [HEADER_BOTTOM, TAB_BAR_TOP],
  );

  useEffect(() => {
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

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.fab, animatedStyle]}>
        <Plus size={24} color={Colors.text} strokeWidth={2.5} />
      </Animated.View>
    </GestureDetector>
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
    shadowColor: "rgba(0,0,0,0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
});
