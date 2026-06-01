import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Colors from "@/constants/colors";

const { width } = Dimensions.get("window");

/* ── Background image ── */
const SCENE_IMAGE =
  "https://r2-pub.rork.com/generated-images/64e4f76f-0381-4bd2-977a-298612bc8f17.png";

/* ── Haptic helper ── */
async function fireHaptic(style: "heavy" | "medium" | "light" = "heavy") {
  if (Platform.OS === "web") return;
  try {
    const impact =
      style === "heavy"
        ? Haptics.ImpactFeedbackStyle.Heavy
        : style === "medium"
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light;
    await Haptics.impactAsync(impact);
  } catch {
    /* silent */
  }
}

/* ═══════════════════════════════════════════
   BrandSplash
   Timeline (total ~2.0 s + safety 6.0 s)
   ───────────────────────────────────────────
   0.0 s  – light haptic, Ken Burns starts
   0.7 s  – medium haptic
   1.1 s  – dark overlay fully in
   1.1 s  – «Скидос» flies in (spring)
   1.6 s  – heavy haptic, glow ring flash
   1.6 s  – subtitle «Твой выгодный помощник» fades in
   ~2.0 s – onFinish()
   6.0 s  – safety timeout
   ═══════════════════════════════════════════ */
type BrandSplashProps = {
  onFinish: () => void;
};

export default function BrandSplash({ onFinish }: BrandSplashProps) {
  /* ---- animated values ---- */
  const sceneScale = useRef(new Animated.Value(1)).current;
  const sceneTranslateY = useRef(new Animated.Value(0)).current;
  const darkenOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.08)).current;
  const titleTranslateY = useRef(new Animated.Value(60)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const finishedRef = useRef(false);

  useEffect(() => {
    /* ── safety: force-finish after 6 s ── */
    const safety = setTimeout(() => {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onFinish();
      }
    }, 6000);

    /* ── haptic sequence ── */
    void fireHaptic("light");
    const hMid = setTimeout(() => void fireHaptic("medium"), 700);

    /* ═══ Phase 1: Ken Burns + dark overlay ═══ */
    Animated.sequence([
      Animated.parallel([
        Animated.timing(sceneScale, {
          toValue: 1.08,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(sceneTranslateY, {
          toValue: -10,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(darkenOpacity, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]),

      /* ═══ Phase 2: title flies in ═══ */
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.spring(titleScale, {
          toValue: 1,
          tension: 55,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      /* ── heavy impact at title reveal ── */
      void fireHaptic("heavy");

      /* ── glow ring flash ── */
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();

      /* ── subtitle fade-in → finish ── */
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        clearTimeout(safety);
        clearTimeout(hMid);
        if (!finishedRef.current) {
          finishedRef.current = true;
          onFinish();
        }
      });
    });

    return () => {
      clearTimeout(safety);
      clearTimeout(hMid);
    };
  }, [
    sceneScale,
    sceneTranslateY,
    darkenOpacity,
    titleOpacity,
    titleScale,
    titleTranslateY,
    glowOpacity,
    subtitleOpacity,
    onFinish,
  ]);

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <View style={styles.container}>
      {/* ── Background image (Ken Burns) ── */}
      <Animated.View
        style={[
          styles.sceneWrap,
          {
            transform: [
              { scale: sceneScale },
              { translateY: sceneTranslateY },
            ],
          },
        ]}
      >
        <Image
          source={{ uri: SCENE_IMAGE }}
          style={styles.sceneImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <View style={styles.sceneVignette} />
      </Animated.View>

      {/* ── Dark overlay ── */}
      <Animated.View style={[styles.darkOverlay, { opacity: darkenOpacity }]} />

      {/* ── Centre brand block ── */}
      <View style={styles.brandCenter} pointerEvents="none">
        {/* Glow ring */}
        <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />

        {/* Title: С (green) + кидос (white) */}
        <Animated.View
          style={[
            styles.titleRow,
            {
              opacity: titleOpacity,
              transform: [
                { scale: titleScale },
                { translateY: titleTranslateY },
              ],
            },
          ]}
        >
          <Text style={styles.letterS}>С</Text>
          <Text style={styles.restLetters}>кидос</Text>
        </Animated.View>

        {/* Green underline */}
        <Animated.View
          style={[styles.titleUnderline, { opacity: titleOpacity }]}
        />

        {/* Subtitle */}
        <Animated.Text style={[styles.tagline, { opacity: subtitleOpacity }]}>
          Твой выгодный помощник
        </Animated.Text>
      </View>
    </View>
  );
}

/* ═══════════════════ STYLES ═══════════════════ */
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 9999,
  },

  /* ── Scene ── */
  sceneWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  sceneImage: {
    width: "100%",
    height: "100%",
  },
  sceneVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  /* ── Overlay ── */
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 15, 8, 0.92)",
  },

  /* ── Brand ── */
  brandCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Glow ring */
  glowRing: {
    position: "absolute",
    width: width * 0.85,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(80, 216, 72, 0.12)",
    shadowColor: "#50D848",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 60,
    elevation: 20,
  },

  /* Title row */
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  letterS: {
    fontSize: 58,
    fontWeight: "900",
    color: "#50D848",
    letterSpacing: -1,
    textShadowColor: "rgba(80,216,72,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,
    includeFontPadding: false,
  },
  restLetters: {
    fontSize: 58,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 4,
    textShadowColor: "rgba(255,255,255,0.2)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    includeFontPadding: false,
  },

  /* Underline */
  titleUnderline: {
    width: width * 0.5,
    height: 2,
    backgroundColor: "#50D848",
    marginTop: 8,
    borderRadius: 1,
    shadowColor: "#50D848",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },

  /* Tagline */
  tagline: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
    letterSpacing: 4,
    textTransform: "uppercase",
  },
});
