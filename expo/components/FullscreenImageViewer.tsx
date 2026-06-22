import { Image } from "expo-image";
import React, { useCallback, useEffect, useState } from "react";
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
const DISMISS_THRESHOLD = 100;
const SWIPE_THRESHOLD = SCREEN_W * 0.2;

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
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const bgOpacity = useSharedValue(1);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      bgOpacity.value = 1;
    }
  }, [visible, initialIndex]);

  const resetToNeutral = useCallback(() => {
    "worklet";
    scale.value = withSpring(1, { damping: 20, stiffness: 200 });
    translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      resetToNeutral();
      runOnJS(setCurrentIndex)(currentIndex + 1);
    }
  }, [currentIndex, images.length, resetToNeutral]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      resetToNeutral();
      runOnJS(setCurrentIndex)(currentIndex - 1);
    }
  }, [currentIndex, resetToNeutral]);

  const dismiss = useCallback(() => {
    runOnJS(onClose)();
  }, [onClose]);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, savedScale.value * e.scale),
      );
      scale.value = newScale;
      // Update background opacity based on scale
      bgOpacity.value =
        newScale > 1.2
          ? Math.max(0.7, 1 - (newScale - 1) * 0.3)
          : 1;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1) {
        resetToNeutral();
      }
    });

  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (e.numberOfPointers >= 2) return; // Let pinch handle it

      const isZoomed = savedScale.value > 1.01;

      if (isZoomed) {
        // Pan around zoomed image
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      } else {
        // At 1x: horizontal = carousel, vertical = dismiss
        translateX.value = e.translationX;
        translateY.value = e.translationY;

        // Fade background on vertical swipe
        const absY = Math.abs(e.translationY);
        const progress = Math.min(1, absY / DISMISS_THRESHOLD);
        bgOpacity.value = 1 - progress * 0.6;
      }
    })
    .onEnd((e) => {
      const isZoomed = savedScale.value > 1.01;

      if (isZoomed) {
        // Clamp translation to keep image visible
        const imgW = SCREEN_W * savedScale.value;
        const imgH = SCREEN_H * savedScale.value;
        const maxX = Math.max(0, (imgW - SCREEN_W) / 2);
        const maxY = Math.max(0, (imgH - SCREEN_H) / 2);

        const clampedX = Math.min(maxX, Math.max(-maxX, savedTranslateX.value + e.translationX));
        const clampedY = Math.min(maxY, Math.max(-maxY, savedTranslateY.value + e.translationY));

        translateX.value = withSpring(clampedX, { damping: 20, stiffness: 200 });
        translateY.value = withSpring(clampedY, { damping: 20, stiffness: 200 });
        savedTranslateX.value = clampedX;
        savedTranslateY.value = clampedY;
      } else {
        // At 1x: decide navigation vs dismiss
        const absX = Math.abs(e.translationX);
        const absY = Math.abs(e.translationY);

        if (absY > absX && absY > DISMISS_THRESHOLD) {
          // Vertical swipe — dismiss
          const velocityY = e.velocityY;
          translateY.value = withSpring(
            velocityY > 0 ? SCREEN_H : -SCREEN_H,
            { damping: 20, stiffness: 150 },
            (finished) => {
              if (finished) runOnJS(dismiss)();
            },
          );
          bgOpacity.value = withTiming(0, { duration: 200 });
        } else if (absX > SWIPE_THRESHOLD && images.length > 1) {
          // Horizontal swipe — navigate carousel
          if (e.translationX > 0 && currentIndex > 0) {
            translateX.value = withSpring(SCREEN_W, { damping: 20, stiffness: 200 }, () => {
              runOnJS(goPrev)();
            });
          } else if (e.translationX < 0 && currentIndex < images.length - 1) {
            translateX.value = withSpring(-SCREEN_W, { damping: 20, stiffness: 200 }, () => {
              runOnJS(goNext)();
            });
          } else {
            resetToNeutral();
          }
        } else {
          resetToNeutral();
          bgOpacity.value = withTiming(1, { duration: 200 });
        }
      }
    });

  const tapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      if (savedScale.value > 1.01) {
        resetToNeutral();
      } else {
        runOnJS(dismiss)();
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (savedScale.value > 1.01) {
        resetToNeutral();
      } else {
        const targetScale = 3;
        scale.value = withSpring(targetScale, { damping: 15, stiffness: 180 });
        savedScale.value = targetScale;
        // Zoom toward tap point
        const centerX = e.x - SCREEN_W / 2;
        const centerY = e.y - SCREEN_H / 2;
        translateX.value = withSpring(-centerX, { damping: 15, stiffness: 180 });
        translateY.value = withSpring(-centerY, { damping: 15, stiffness: 180 });
        savedTranslateX.value = -centerX;
        savedTranslateY.value = -centerY;
        bgOpacity.value = withTiming(0.85, { duration: 200 });
      }
    });

  const composedGesture = Gesture.Exclusive(
    doubleTapGesture,
    Gesture.Simultaneous(panGesture, pinchGesture),
    tapGesture,
  );

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
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Animated.View style={[styles.backdrop, bgStyle]}>
        {/* Close button */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <X size={24} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          {/* Page indicator */}
          {images.length > 1 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {currentIndex + 1} / {images.length}
              </Text>
            </View>
          )}
        </View>

        <GestureDetector gesture={composedGesture}>
          <Animated.View style={styles.imageContainer}>
            <Animated.View style={[styles.imageWrapper, imageStyle]}>
              <Image
                source={{ uri: images[currentIndex] }}
                style={styles.image}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </Animated.View>
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
    paddingTop: Platform.OS === "ios" ? 54 : 40,
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
  imageContainer: {
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
    height: SCREEN_H * 0.85,
  },
});
