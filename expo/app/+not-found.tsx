import { Link, Stack } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Не найдено" }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🔎</Text>
        <Text style={styles.title}>Страница не найдена</Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>Вернуться в ленту</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: Colors.bg },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 20, color: Colors.text, marginBottom: 16 },
  link: { paddingVertical: 12, paddingHorizontal: 18, backgroundColor: Colors.primary, borderRadius: 14 },
  linkText: { color: Colors.text, fontSize: 14 },
});
