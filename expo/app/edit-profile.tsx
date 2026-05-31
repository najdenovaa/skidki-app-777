import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { Camera, ChevronLeft, MapPin } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CityPicker } from "@/components/CityPicker";
import Colors from "@/constants/colors";
import { resolveImageUrl } from "@/utils/image";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/services/api";
import type { SelectedCity } from "@/types/api";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const [avatar, setAvatar] = useState<string>(resolveImageUrl(user?.avatar));
  const [avatarFile, setAvatarFile] = useState<string | undefined>(undefined);
  const [name, setName] = useState<string>(user?.name ?? "");
  const [city, setCity] = useState<SelectedCity | null>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
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
      const uploadRes = await api.uploadAvatar(avatarFile);
      if (uploadRes.success && uploadRes.data) {
        avatarUrl = uploadRes.data.url;
      } else {
        Alert.alert("Ошибка", "Не удалось загрузить аватар");
        setSaving(false);
        return;
      }
    }

    await updateProfile({
      name: name.trim() || undefined,
      avatar: avatarUrl,
      cityId: city?.cityId,
      city: city?.cityName,
      regionId: city?.regionId,
    });

    setSaving(false);
    router.back();
  }, [user, name, avatarFile, city, updateProfile, router]);

  if (!user) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Stack.Screen options={{ title: "Редактирование" }} />
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
          <Text style={styles.headerTitle}>Редактировать профиль</Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            hitSlop={10}
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          >
            {saving ? (
              <ActivityIndicator color={Colors.text} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Сохранить</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
        </ScrollView>
      </KeyboardAvoidingView>

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
  field: { marginBottom: 24 },
  label: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  input: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
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
});
