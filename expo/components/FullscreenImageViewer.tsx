import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { X } from "lucide-react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const MAX_SCALE = 5;
const MIN_SCALE = 1;
const DISMISS_THRESHOLD = SCREEN_H * 0.12;
const SWIPE_THRESHOLD = SCREEN_W * 0.15;
const SWIPE_VELOCITY_THRESHOLD = 400;
const DISMISS_VELOCITY_THRESHOLD = 500;

/** Clamp translation so the zoomed image never leaves the screen entirely. */
function clampTranslation(offset: number, s: number, screenSize: number): number {
  const img = screenSize * s;
  const max = Math.max(0, (img - screenSize) / 2);
  if (max <= 0) return 0;
  if (offset > max) return max;
  if (offset < -max) return -max;
  return offset;
}

interface Props {
  images: string[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
}

export function FullscreenImageViewer({
  images,
  initialIndex,
  visible,
  onClose,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // ── Shared values ──
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const baseTranslateX = useSharedValue(0);
  const baseTranslateY = useSharedValue(0);
  const bgOpacity = useSharedValue(1);

  // Track ongoing gesture to suppress tap
  const gestureActive = useSharedValue(false);
  const panMoved = useSharedValue(false);

  // Double-tap detection via manual timing
  const lastTapTs = useSharedValue(0);

  // Reset everything when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      baseTranslateX.value = 0;
      baseTranslateY.value = 0;
      bgOpacity.value = 1;
      lastTapTs.value = 0;
    }
  }, [visible, initialIndex]);

  // ── Helpers (worklets) ──

  const resetZoom = useCallback(() => {
    "worklet";
    scale.value = withSpring(1, { damping: 20, stiffness: 200 });
    translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    baseTranslateX.value = 0;
    baseTranslateY.value = 0;
    savedScale.value = 1;
    bgOpacity.value = withTiming(1, { duration: 200 });
  }, []);

  const navigateTo = useCallback(
    (idx: number) => {
      "worklet";
      resetZoom();
      runOnJS(setCurrentIndex)(idx);
    },
    [resetZoom],
  );

  const dismissScreen = useCallback(() => {
    "worklet";
    runOnJS(onClose)();
  }, [onClose]);

  // ── Pinch-to-zoom gesture ──
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      gestureActive.value = true;
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * e.scale));
      scale.value = ns;
      bgOpacity.value = ns > 1.15 ? Math.max(0.75, 1 - (ns - 1) * 0.4) : 1;
    })
    .onEnd(() => {
      gestureActive.value = false;
      savedScale.value = scale.value;
      if (scale.value < MIN_SCALE) {
        resetZoom();
      }
    });

  // ── Pan gesture (dismiss / carousel / pan-zoomed) ──
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onBegin(() => {
      gestureActive.value = true;
      panMoved.value = false;
      baseTranslateX.value = translateX.value;
      baseTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (e.numberOfPointers >= 2) return; // pinch handles it

      const dx = e.translationX;
      const dy = e.translationY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        panMoved.value = true;
      }

      const zoomed = savedScale.value > 1.01;

      if (zoomed) {
        translateX.value = baseTranslateX.value + dx;
        translateY.value = baseTranslateY.value + dy;
      } else {
        // 1x — horizontal for carousel, vertical for dismiss
        if (images.length > 1) {
          translateX.value = dx;
        }
        translateY.value = dy;

        const absY = Math.abs(dy);
        const progress = Math.min(1, absY / (SCREEN_H * 0.35));
        bgOpacity.value = 1 - progress * 0.55;
      }
    })
    .onEnd((e) => {
      gestureActive.value = false;
      const zoomed = savedScale.value > 1.01;

      if (zoomed) {
        // Clamp zoomed image position
        const cx = clampTranslation(baseTranslateX.value + e.translationX, scale.value, SCREEN_W);
        const cy = clampTranslation(baseTranslateY.value + e.translationY, scale.value, SCREEN_H);
        translateX.value = withSpring(cx, { damping: 20, stiffness: 200 });
        translateY.value = withSpring(cy, { damping: 20, stiffness: 200 });
        baseTranslateX.value = cx;
        baseTranslateY.value = cy;
      } else {
        const absX = Math.abs(e.translationX);
        const absY = Math.abs(e.translationY);
        const velX = Math.abs(e.velocityX);
        const velY = Math.abs(e.velocityY);

        // ── Dismiss (vertical swipe) ──
        if (
          absY > absX &&
          (absY > DISMISS_THRESHOLD || velY > DISMISS_VELOCITY_THRESHOLD)
        ) {
          const targetY = e.translationY > 0 ? SCREEN_H : -SCREEN_H;
          translateX.value = withSpring(0, { damping: 20, stiffness: 150 });
          translateY.value = withSpring(targetY, { damping: 20, stiffness: 150 });
          bgOpacity.value = withTiming(0, { duration: 250 }, (done) => {
            if (done) runOnJS(onClose)();
          });
          return;
        }

        // ── Carousel (horizontal swipe) ──
        if (
          images.length > 1 &&
          absX > absY &&
          (absX > SWIPE_THRESHOLD || velX > SWIPE_VELOCITY_THRESHOLD)
        ) {
          if (e.translationX > 0 && currentIndex > 0) {
            translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
            translateX.value = withSpring(SCREEN_W * 1.1, { damping: 20, stiffness: 200 });
            bgOpacity.value = withTiming(0.85, { duration: 150 });
            runOnJS(setCurrentIndex)(currentIndex - 1);
            // Reset after navigation
            scale.value = withSpring(1, { damping: 20, stiffness: 200 });
            translateX.value = withSpring(0, { damping: 20, stiffness: 200 }, (done) => {
              if (done) {
                bgOpacity.value = withTiming(1, { duration: 150 });
              }
            });
            return;
          } else if (e.translationX < 0 && currentIndex < images.length - 1) {
            translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
            translateX.value = withSpring(-SCREEN_W * 1.1, { damping: 20, stiffness: 200 });
            bgOpacity.value = withTiming(0.85, { duration: 150 });
            runOnJS(setCurrentIndex)(currentIndex + 1);
            scale.value = withSpring(1, { damping: 20, stiffness: 200 });
            translateX.value = withSpring(0, { damping: 20, stiffness: 200 }, (done) => {
              if (done) {
                bgOpacity.value = withTiming(1, { duration: 150 });
              }
            });
            return;
          }
        }

        // ── Bounce back ──
        resetZoom();
      }
    });

  // ── Tap gesture ──
  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      // If we were panning / pinching, ignore this tap
      if (gestureActive.value || panMoved.value) {
        gestureActive.value = false;
        panMoved.value = false;
        return;
      }

      const now = Date.now();
      const prev = lastTapTs.value;

      if (now - prev < 300) {
        // Double-tap → zoom in / out
        lastTapTs.value = 0;

        if (savedScale.value > 1.01) {
          resetZoom();
        } else {
          const targetScale = 2.8;
          scale.value = withSpring(targetScale, { damping: 15, stiffness: 180 });
          savedScale.value = targetScale;

          const cx = (e.x - SCREEN_W / 2) * (targetScale - 1);
          const cy = (e.y - SCREEN_H / 2) * (targetScale - 1);
          translateX.value = withSpring(-cx, { damping: 15, stiffness: 180 });
          translateY.value = withSpring(-cy, { damping: 15, stiffness: 180 });
          baseTranslateX.value = -cx;
          baseTranslateY.value = -cy;
          bgOpacity.value = withTiming(0.85, { duration: 200 });
        }
      } else {
        // Single tap → reset zoom or dismiss
        lastTapTs.value = now;

        if (savedScale.value > 1.01) {
          resetZoom();
        } else {
          runOnJS(onClose)();
        }
      }
    });

  // ── Compose gestures ──
  // Image gesture (pinch + pan together)
  const imageGesture = Gesture.Simultaneous(pinchGesture, panGesture);
  // Tap gestures (double-tap detection is manual inside tapGesture)
  // Race: image interaction wins over taps (tap only activates if no pan/pinch occurs)
  const composedGesture = Gesture.Race(imageGesture, tapGesture);

  // ── Animated styles ──
  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0, 0, 0, ${bgOpacity.value})`,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <Animated.View style={[styles.backdrop, bgStyle]}>
        {/* Header bar */}
        <View style={styles.header} pointerEvents="box-none">
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={styles.closeBtn}
          >
            <X size={24} color="#FFFFFF" strokeWidth={2} />
          </Pressable>

          {images.length > 1 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {currentIndex + 1} / {images.length}
              </Text>
            </View>
          )}
        </View>

        {/* Gesture area */}
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={styles.gestureArea}>
            <Animated.View style={[styles.imageWrapper, imageStyle]}>
              <Image
                source={{ uri: images[currentIndex] }}
                style={styles.image}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </Animated.View>

            {/* Arrow hints for carousel */}
            {images.length > 1 && currentIndex > 0 && (
              <View style={[styles.arrowHint, styles.arrowLeft]} pointerEvents="none">
                <Text style={styles.arrowSymbol}>‹</Text>
              </View>
            )}
            {images.length > 1 && currentIndex < images.length - 1 && (
              <View style={[styles.arrowHint, styles.arrowRight]} pointerEvents="none">
                <Text style={styles.arrowSymbol}>›</Text>
              </View>
            )}
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 58 : 44,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  counterText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
    fontVariant: ["tabular-nums"],
  },
  gestureArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imageWrapper: {
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H * 0.8,
  },
  arrowHint: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  arrowLeft: {
    left: 12,
  },
  arrowRight: {
    right: 12,
  },
  arrowSymbol: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 42,
    fontWeight: "300",
  },
});
