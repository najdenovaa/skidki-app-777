import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { PercentSpinner } from "@/components/PercentSpinner";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { KeyboardSafeScrollView } from "@/components/KeyboardSafeScrollView";
import { useAuth } from "@/providers/AuthProvider";
import type { SignInError } from "@/providers/AuthProvider";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<SignInError>(null);

  const passwordRef = useRef<TextInput>(null);

  const onSubmit = useCallback(async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("notFound");
      return;
    }
    setLoading(true);
    const err = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    router.back();
  }, [email, password, signIn, router]);

  const errorText = error === "notFound"
    ? "Пользователь не найден. Проверь email или зарегистрируйся."
    : error === "wrongPassword"
    ? "Неверный пароль. Минимум 6 символов."
    : null;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <KeyboardSafeScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 }}
        >
            {/* Logo */}
            <View style={styles.logoWrap}>
              <Text style={styles.logo}>Скидос</Text>
            </View>

            {/* Error */}
            {errorText && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorText}</Text>
              </View>
            )}

            {/* Fields */}
            <View style={styles.fields}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                style={styles.input}
              />
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={setPassword}
                placeholder="Пароль"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                style={styles.input}
              />
            </View>

            {/* Submit */}
            <Pressable
              onPress={onSubmit}
              disabled={loading}
              style={[styles.btn, loading && styles.btnDisabled]}
            >
              {loading ? (
                <PercentSpinner size={20} color={Colors.text} />
              ) : (
                <Text style={styles.btnText}>Войти</Text>
              )}
            </Pressable>

            {/* Privacy */}
            <Text style={styles.privacyNote}>
              Входя, вы принимаете{" "}
              <Text style={styles.privacyNoteLink} onPress={() => router.push("/privacy")}>
                Политику конфиденциальности
              </Text>
            </Text>

            {/* Footer link */}
            <View style={styles.footer}>
              <Text style={styles.footerLabel}>Нет аккаунта?</Text>
              <Pressable onPress={() => router.replace("/auth/register")} hitSlop={10}>
                <Text style={styles.footerLink}>Зарегистрируйся</Text>
              </Pressable>
            </View>
          </KeyboardSafeScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoWrap: { alignItems: "center", marginBottom: 40 },
  logo: {
    fontSize: 34,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -1,
  },
  errorBox: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    color: Colors.danger,
    letterSpacing: -0.2,
  },
  fields: { gap: 12 },
  input: {
    height: 52,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  btn: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 32,
  },
  privacyNote: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center" as const,
    marginTop: 16,
    lineHeight: 17,
  },
  privacyNoteLink: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "500" as const,
  },
  footerLabel: { fontSize: 14, color: Colors.textMuted },
  footerLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600",
  },
});
