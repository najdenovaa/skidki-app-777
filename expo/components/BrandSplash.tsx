import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
 runOnJS,
 useAnimatedStyle,
 useSharedValue,
 withDelay,
 withSpring,
 withTiming,
} from "react-native-reanimated";

import Colors from "@/constants/colors";

function fireHaptic() {
 if (Platform.OS !== "web") {
 void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
 }
}

type BrandSplashProps = {
 onFinish: () => void;
};

export default function BrandSplash({ onFinish }: BrandSplashProps) {
 const fly = useSharedValue(0);
 const subtitleFade = useSharedValue(0);
 const leave = useSharedValue(0);

 useEffect(() => {
 fly.value = withSpring(1, { damping: 14, stiffness: 100 });

 const hapticId = setTimeout(() => {
 fireHaptic();
 }, 1000);

 subtitleFade.value = withDelay(
 1300,
 withTiming(1, { duration: 500 }),
 );

 leave.value = withDelay(
 3000,
 withTiming(1, { duration: 1400 }, (finished) => {
 if (finished) {
 runOnJS(onFinish)();
 }
 }),
 );

 return () => clearTimeout(hapticId);
 }, [fly, subtitleFade, leave, onFinish]);

 const brandStyle = useAnimatedStyle(() => {
 const t = fly.value;
 return {
 opacity: t,
 transform: [
 { translateY: (1 - t) * -70 },
 { scale: 0.24 + t * 0.76 },
 ],
 };
 });

 const subtitleStyle = useAnimatedStyle(() => ({
 opacity: subtitleFade.value,
 }));

 const shellStyle = useAnimatedStyle(() => ({
 opacity: 1 - leave.value,
 }));

 return (
 <Animated.View style={[styles.root, shellStyle]} pointerEvents="auto">
 <View style={styles.content}>
 <Animated.View style={[styles.row, brandStyle]}>
 <Text style={styles.letter}>С</Text>
 <Text style={styles.suffix}>кидос</Text>
 </Animated.View>
 <Animated.View style={subtitleStyle}>
 <Text style={styles.subtitle}>Твой выгодный помощник</Text>
 </Animated.View>
 </View>
 </Animated.View>
 );
}

const styles = StyleSheet.create({
 root: {
 ...StyleSheet.absoluteFillObject,
 zIndex: 9999,
 backgroundColor: Colors.background,
 alignItems: "center",
 justifyContent: "center",
 },
 content: {
 alignItems: "center",
 },
 row: {
 flexDirection: "row",
 alignItems: "baseline",
 },
 letter: {
 fontSize: 42,
 fontWeight: "800",
 color: "#50D848",
 letterSpacing: 4,
 includeFontPadding: false,
 lineHeight: 46,
 },
 suffix: {
 fontSize: 34,
 fontWeight: "800",
 color: "#FFFFFF",
 letterSpacing: 2,
 marginLeft: 4,
 includeFontPadding: false,
 lineHeight: 40,
 },
 subtitle: {
 fontSize: 16,
 fontWeight: "400",
 color: "rgba(255,255,255,0.5)",
 marginTop: 20,
 letterSpacing: 0.5,
 },
});
