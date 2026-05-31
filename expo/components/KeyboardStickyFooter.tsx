import { KeyboardStickyView } from "react-native-keyboard-controller";
import { StyleSheet } from "react-native";
import React from "react";

export function KeyboardStickyFooter({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardStickyView offset={{ closed: 0, opened: 0 }} style={styles.wrap}>
      {children}
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({ wrap: { width: "100%" as const } });
