import { Eye, EyeOff } from "lucide-react-native";
import React, { forwardRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import Colors from "@/constants/colors";

type PasswordInputProps = TextInputProps;

const PasswordInput = forwardRef<TextInput, PasswordInputProps>(
  function PasswordInput({ style, ...props }, ref) {
    const [show, setShow] = useState<boolean>(false);

    return (
      <View style={styles.wrapper}>
        <TextInput
          ref={ref}
          {...props}
          secureTextEntry={!show}
          style={[styles.input, style]}
          placeholderTextColor={
            props.placeholderTextColor ?? Colors.textMuted
          }
        />
        <Pressable
          onPress={() => setShow((v) => !v)}
          hitSlop={8}
          style={({ pressed }) => [
            styles.eyeBtn,
            pressed && { opacity: 0.6 },
          ]}
        >
          {show ? (
            <EyeOff size={20} color={Colors.textMuted} strokeWidth={1.8} />
          ) : (
            <Eye size={20} color={Colors.textMuted} strokeWidth={1.8} />
          )}
        </Pressable>
      </View>
    );
  }
);

export default PasswordInput;

const styles = StyleSheet.create({
  wrapper: {
    position: "relative" as const,
  },
  input: {
    height: 52,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingRight: 48,
    fontSize: 17,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  eyeBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
