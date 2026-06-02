import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import type { ScrollViewProps } from "react-native";
import React from "react";

export function KeyboardSafeScrollView({
  children,
  contentContainerStyle,
  ...rest
}: ScrollViewProps) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={64}
      extraKeyboardSpace={24}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={contentContainerStyle}
      {...rest}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
