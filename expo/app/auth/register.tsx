import { useRouter } from "expo-router";
import { MapPin, X } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CityPicker } from "@/components/CityPicker";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import type { SignUpError } from "@/providers/AuthProvider";
import type { SelectedCity } from "@/types/api";
import { validateEmail } from "@/types/user";

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [city, setCity] = useState<SelectedCity | null>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<SignUpError>(null);

  const emailRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);

  const onSubmit = useCallback(async () => {
    setError(null);
    if (!name.trim()) {
      Alert.alert("Укажи имя", "Как тебя называть?");
      return;
    }
    if (!validateEmail(email.trim())) {
      setError("weakPassword");
      return;
    }
    if (password.length < 6) {
      setError("weakPassword");
      return;
    }
    setLoading(true);
    const err = await signUp({
      name,
      email,
      password,
      cityId: city?.cityId,
      regionId: city?.regionId,
    });
    setLoading(false);
    if (err === "emailTaken") {
      setError("emailTaken");
      return;
    }
    if (err === "weakPassword") {
      setError("weakPassword");
      return;
    }
    router.back();
  }, [name, email, password, city, signUp, router]);

  const errorText =
    error === "emailTaken"
      ? "Этот email уже занят. Попробуй войти."
      : error === "weakPassword"
      ? "Пароль должен быть минимум 6 символов."
      : null;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        {/* Close button */}
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.closeBtn}
        >
          <X size={22} color={Colors.textMuted} strokeWidth={2} />
        </Pressable>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoWrap}>
              <Text style={styles.logo}>Скидки</Text>
              <Text style={styles.subtitle}>Создай аккаунт</Text>
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
                value={name}
                onChangeText={setName}
                placeholder="Имя"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                style={styles.input}
              />
              <TextInput
                ref={emailRef}
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
                returnKeyType="next"
                style={styles.input}
              />
              <Pressable
                onPress={() => setCityPickerOpen(true)}
                style={[styles.input, { justifyContent: "center" }]}
              >
                {city ? (
                  <View style={styles.cityChip}>
                    <MapPin size={14} color={Colors.primary} strokeWidth={2} />
                    <Text style={styles.cityText}>
                      {city.cityName}, {city.regionName}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.placeholder}>Город (необязательно)</Text>
                )}
              </Pressable>
            </View>

            {/* Submit */}
            <Pressable
              onPress={onSubmit}
              disabled={loading}
              style={[styles.btn, loading && styles.btnDisabled]}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text} size="small" />
              ) : (
                <Text style={styles.btnText}>Создать аккаунт</Text>
              )}
            </Pressable>

            {/* Privacy */}
            <Text style={styles.privacyNote}>
              Регистрируясь, вы принимаете{" "}
              <Text style={styles.privacyNoteLink} onPress={() => router.push("/privacy")}>
                Политику конфиденциальности
              </Text>
            </Text>

            {/* Footer link */}
            <View style={styles.footer}>
              <Text style={styles.footerLabel}>Уже есть аккаунт?</Text>
              <Pressable onPress={() => router.replace("/auth/login")} hitSlop={10}>
                <Text style={styles.footerLink}>Войди</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <CityPicker
        visible={cityPickerOpen}
        onSelect={setCity}
        onClose={() => setCityPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  closeBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoWrap: { alignItems: "center", marginBottom: 40, gap: 6 },
  logo: {
    fontSize: 34,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -1,
  },
  subtitle: { fontSize: 15, color: Colors.textMuted, letterSpacing: -0.2 },
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
  cityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cityText: {
    fontSize: 17,
    color: Colors.text,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  placeholder: {
    fontSize: 17,
    color: Colors.textMuted,
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
