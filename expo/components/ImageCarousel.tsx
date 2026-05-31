import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import Colors from "@/constants/colors";

interface Props {
  images: string[];
  height?: number;
  onPress?: () => void;
  /** Overlay content rendered on top of the carousel (badges, etc.) */
  children?: React.ReactNode;
  /** Dot color override for active dot */
  activeDotColor?: string;
  /** Dot color override for inactive dot */
  inactiveDotColor?: string;
  /** Show a dark gradient overlay at the bottom of each photo */
  gradient?: boolean;
}

/**
 * Instagram-style image carousel.
 * Horizontal paged ScrollView with dot indicators.
 */
export function ImageCarousel({
  images,
  height = 240,
  onPress,
  children,
  activeDotColor = Colors.primary,
  inactiveDotColor = "rgba(255,255,255,0.45)",
  gradient = false,
}: Props) {
  const [current, setCurrent] = useState<number>(0);
  const [carouselWidth, setCarouselWidth] = useState<number>(0);
  const scrollRef = useRef<ScrollView>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setCarouselWidth(e.nativeEvent.layout.width);
  }, []);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (carouselWidth <= 0) return;
      const page = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
      setCurrent(page);
    },
    [carouselWidth],
  );

  if (images.length === 0) {
    return (
      <View style={[styles.placeholder, { height }]} onLayout={onLayout}>
        {children}
      </View>
    );
  }

  return (
    <View style={{ height, position: "relative" }} onLayout={onLayout}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        style={{ flex: 1 }}
      >
        {images.map((uri, i) => (
          <Pressable key={i} onPress={onPress} style={{ width: carouselWidth || "100%", height }}>
            <Image
              source={{ uri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
            {gradient && (
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.75)"]}
                style={styles.gradient}
                pointerEvents="none"
              />
            )}
          </Pressable>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      {images.length > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {images.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === current ? activeDotColor : inactiveDotColor,
                  width: i === current ? 7 : 6,
                  height: i === current ? 7 : 6,
                },
              ]}
            />
          ))}
        </View>
      )}

      {/* Overlay content (badges, etc.) */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: Colors.cardSecondary,
    width: "100%",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  dots: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    borderRadius: 7,
  },
});
