import { Image } from "expo-image";
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

const LOGO = require("../assets/images/splash-icon.png") as number;

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
 const leave = useSharedValue(0);

 useEffect(() => {
 fly.value = withSpring(1, { damping: 14, stiffness: 130 });

 const hapticId = setTimeout(() => {
 fireHaptic();
 }, 700);

 leave.value = withDelay(
 1300,
 withTiming(1, { duration: 1100 }, (finished) => {
 if (finished) {
 runOnJS(onFinish)();
 }
 }),
 );

 return () => clearTimeout(hapticId);
 }, [fly, leave, onFinish]);

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

 const shellStyle = useAnimatedStyle(() => ({
 opacity: 1 - leave.value,
 }));

 return (
 <Animated.View style={[styles.root, shellStyle]} pointerEvents="auto">
 <Animated.View style={[styles.row, brandStyle]}>
 <Image source={LOGO} style={styles.icon} contentFit="contain" />
 <Text style={styles.suffix}>кидос</Text>
 </Animated.View>
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
 row: {
 flexDirection: "row",
 alignItems: "center",
 },
 icon: {
 width: 64,
 height: 64,
 },
 suffix: {
 fontSize: 34,
 fontWeight: "800",
 color: "#50D848",
 letterSpacing: -1,
 marginLeft: -2,
 includeFontPadding: false,
 },
});
