import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { Camera, ChevronLeft, Lock, MapPin, Phone } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { PercentSpinner } from "@/components/PercentSpinner";

import { KeyboardSafeScrollView } from "@/components/KeyboardSafeScrollView";
import PasswordInput from "@/components/PasswordInput";
import { SafeAreaView } from "react-native-safe-area-context";

import { CityPicker } from "@/components/CityPicker";
import Colors from "@/constants/colors";
import { prepareImageForUpload } from "@/utils/prepareImageForUpload";
import { resolveImageUrl } from "@/utils/image";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/services/api";
import type { SelectedCity } from "@/types/api";
import { isPhoneInput, normalisePhone, validatePhone } from "@/types/user";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const phoneRef = useRef<TextInput>(null);

  const [avatar, setAvatar] = useState<string>(resolveImageUrl(user?.avatar));
  const [avatarFile, setAvatarFile] = useState<string | undefined>(undefined);
  const [name, setName] = useState<string>(user?.name ?? "");
  const [email, setEmail] = useState<string>(user?.email ?? "");
  const [phone, setPhone] = useState<string>(user?.phone ?? "");
  const [city, setCity] = useState<SelectedCity | null>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Password fields
  const [currentPw, setCurrentPw] = useState<string>("");
  const [newPw, setNewPw] = useState<string>("");
  const [confirmPw, setConfirmPw] = useState<string>("");
  const [changingPw, setChangingPw] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email ?? "");
      setPhone(user.phone ?? "");
      setAvatar(resolveImageUrl(user.avatar));
      if (user.cityId) {
        setCity({
          cityId: String(user.cityId),
          cityName: user.city,
          regionId: String(user.regionId ?? ""),
          regionName: "",
        });
      }
    }
  }, [user]);

  const pickAvatar = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setAvatar(result.assets[0].uri);
      setAvatarFile(result.assets[0].uri);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);

    let avatarUrl: string | undefined;
    if (avatarFile) {
      const preparedUri = await prepareImageForUpload(avatarFile);
      const uploadRes = await api.uploadAvatar(preparedUri);
      if (uploadRes.success && uploadRes.data) {
        avatarUrl = uploadRes.data.url;
      } else {
        Alert.alert("Ошибка", "Не удалось загрузить аватар");
        setSaving(false);
        return;
      }
    }

    const phoneTrimmed = phone.trim();
    const normalisedPhone = phoneTrimmed && isPhoneInput(phoneTrimmed)
      ? normalisePhone(phoneTrimmed)
      : undefined;

    if (phoneTrimmed && !normalisedPhone) {
      Alert.alert("Неверный номер", "Введи номер в формате +7XXXXXXXXXX");
      setSaving(false);
      return;
    }

    await updateProfile({
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      phone: normalisedPhone,
      avatar: avatarUrl,
      cityId: city?.cityId,
      city: city?.cityName,
      regionId: city?.regionId,
    });

    setSaving(false);
    router.back();
  }, [user, name, email, phone, avatarFile, city, updateProfile, router]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPw || !newPw) {
      Alert.alert("Заполни поля", "Введи текущий и новый пароль");
      return;
    }
    if (newPw.length < 6) {
      Alert.alert("Минимум 6 символов", "Новый пароль должен быть не короче 6 символов");
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert("Пароли не совпадают", "Новый пароль и повтор не совпадают");
      return;
    }
    setChangingPw(true);
    const res = await api.changePassword({
      currentPassword: currentPw,
      newPassword: newPw,
    });
    setChangingPw(false);
    if (res.success) {
      Alert.alert("Готово", "Пароль изменён");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } else {
      Alert.alert("Ошибка", res.error ?? "Не удалось сменить пароль");
    }
  }, [currentPw, newPw, confirmPw]);

  if (!user) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Stack.Screen options={{ title: "Учётная запись" }} />
        <Text style={{ color: Colors.textMuted }}>Загрузка...</Text>
      </View>
    );
  }

  const displayCity = city?.cityName || user.city;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
            <ChevronLeft size={22} color={Colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>Учётная запись</Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            hitSlop={10}
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          >
            {saving ? (
              <PercentSpinner size={20} color={Colors.textInverse} />
            ) : (
              <Text style={styles.saveBtnText}>Сохранить</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardSafeScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar */}
        <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
          <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
          <View style={styles.avatarOverlay}>
            <Camera size={20} color={Colors.text} strokeWidth={2} />
          </View>
        </Pressable>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Имя</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Твоё имя"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="words"
            style={styles.input}
          />
        </View>

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            style={styles.input}
          />
        </View>

        {/* Phone */}
        <View style={styles.field}>
          <Text style={styles.label}>Телефон</Text>
          <View style={styles.phoneInputRow}>
            <Phone size={16} color={phone ? Colors.primary : Colors.textMuted} strokeWidth={2} />
            <TextInput
              ref={phoneRef}
              value={phone}
              onChangeText={setPhone}
              placeholder="+7XXXXXXXXXX"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={12}
              style={styles.phoneInput}
            />
          </View>
        </View>

        {/* City */}
        <View style={styles.field}>
          <Text style={styles.label}>Город</Text>
          <Pressable onPress={() => setCityPickerOpen(true)} style={styles.input}>
            <View style={styles.cityRow}>
              <MapPin size={16} color={displayCity ? Colors.primary : Colors.textMuted} strokeWidth={2} />
              <Text style={[styles.cityText, !displayCity && { color: Colors.textMuted }]}>
                {displayCity || "Выбери город"}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Security section */}
        <Text style={styles.sectionTitle}>Безопасность</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Текущий пароль</Text>
          <PasswordInput
            value={currentPw}
            onChangeText={setCurrentPw}
            placeholder="••••••••"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Новый пароль</Text>
          <PasswordInput
            value={newPw}
            onChangeText={setNewPw}
            placeholder="Минимум 6 символов"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Повтор нового пароля</Text>
          <PasswordInput
            value={confirmPw}
            onChangeText={setConfirmPw}
            placeholder="Повтори пароль"
          />
        </View>

        <Pressable
          onPress={handleChangePassword}
          disabled={changingPw}
          style={[styles.pwBtn, changingPw && { opacity: 0.6 }]}
        >
          {changingPw ? (
            <PercentSpinner size={20} color={Colors.text} />
          ) : (
            <>
              <Lock size={16} color={Colors.text} strokeWidth={2} />
              <Text style={styles.pwBtnText}>Сменить пароль</Text>
            </>
          )}
        </Pressable>
      </KeyboardSafeScrollView>

      <CityPicker
        visible={cityPickerOpen}
        onSelect={(c) => {
          setCity(c);
          setCityPickerOpen(false);
        }}
        onClose={() => setCityPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  headerSafe: { backgroundColor: Colors.background },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    minWidth: 100,
    alignItems: "center",
  },
  saveBtnText: {
    color: Colors.text,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  scroll: { padding: 20, paddingBottom: 60 },
  avatarWrap: {
    alignSelf: "center",
    marginBottom: 32,
    marginTop: 12,
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.cardSecondary,
  },
  avatarOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.background,
  },
  field: { marginBottom: 20 },
  label: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cityText: {
    fontSize: 15,
    color: Colors.text,
    letterSpacing: -0.2,
    flex: 1,
  },
  phoneInputRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    gap: 10,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 20,
  },
  pwBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 48,
    marginTop: 4,
  },
  pwBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
});
