import { Tabs } from "expo-router";
import { Home, Search, User } from "lucide-react-native";
import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import Colors from "@/constants/colors";
import { TabBarScrollProvider, useTabBarVisible } from "@/hooks/TabBarScrollContext";

const ICONS = {
  index: Home,
  search: Search,
  profile: User,
} as const;

const LABELS: Record<string, string> = {
  index: "Лента",
  search: "Поиск",
  profile: "Профиль",
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visible = useTabBarVisible();

  const barAnimated = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(visible.value, [0, 1], [100, 0], Extrapolation.CLAMP),
      },
    ],
    opacity: interpolate(visible.value, [0, 0.5, 1], [0, 0, 1], Extrapolation.CLAMP),
  }));

  const onPress = useCallback(
    (routeKey: string, routeName: string, focused: boolean) => {
      const event = navigation.emit({
        type: "tabPress",
        target: routeKey,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(routeName);
      }
    },
    [navigation]
  );

  return (
    <Animated.View
      style={[
        styles.barWrap,
        { paddingBottom: insets.bottom + 6 },
        barAnimated,
      ]}
      pointerEvents="box-none"
    >
      {/* Frosted backdrop */}
      <View style={styles.backdrop} />
      <View style={styles.topBorder} />
      <View style={styles.bar} pointerEvents="box-none">
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const Icon = ICONS[route.name as keyof typeof ICONS] ?? Home;
          const label = LABELS[route.name] ?? route.name;
          return (
            <Pressable
              key={route.key}
              onPress={() => onPress(route.key, route.name, focused)}
              hitSlop={8}
              style={[
                styles.capsule,
                focused ? styles.capsuleActive : styles.capsuleInactive,
              ]}
            >
              <Icon
                size={20}
                color={focused ? Colors.textInverse : Colors.tabInactiveText}
                strokeWidth={focused ? 2.4 : 1.8}
              />
              <Text
                style={[
                  styles.label,
                  focused ? styles.labelActive : styles.labelInactive,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

export default function TabLayout() {
  return (
    <TabBarScrollProvider>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Лента" }} />
      <Tabs.Screen name="search" options={{ title: "Поиск" }} />
      <Tabs.Screen name="profile" options={{ title: "Профиль" }} />
    </Tabs>
    </TabBarScrollProvider>
  );
}

const styles = StyleSheet.create({
  barWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 32,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.tabBar,
  },
  topBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
  },
  bar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    justifyContent: "center",
    gap: 10,
  },
  capsule: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 50,
  },
  capsuleInactive: {
    backgroundColor: "transparent",
  },
  capsuleActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  labelActive: {
    color: Colors.textInverse,
  },
  labelInactive: {
    color: Colors.tabInactiveText,
    opacity: 0.7,
  },
});
