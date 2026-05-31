import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { Camera, Check, MapPin, Navigation, X } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";

import { CityPicker } from "@/components/CityPicker";
import {
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

import Colors from "@/constants/colors";
import { CATEGORIES } from "@/constants/categories";
import { useAuth } from "@/providers/AuthProvider";
import { useDiscounts } from "@/providers/DiscountsProvider";
import { api } from "@/services/api";
import type { SelectedCity } from "@/types/api";
import type { Category } from "@/types/discount";

const EXPIRY_OPTIONS: { id: "today" | "date" | "stock"; label: string; hours: number }[] = [
  { id: "today", label: "Только сегодня", hours: 8 },
  { id: "date", label: "До завтра", hours: 24 },
  { id: "stock", label: "Пока в наличии", hours: 72 },
];

const PERCENT_PRESETS: number[] = [10, 20, 30, 50, 70];

export default function PostModalScreen() {
  const router = useRouter();
  const { user, guestCity } = useAuth();
  const { addPost } = useDiscounts();

  const [image, setImage] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<Category>("food");
  const [percentInput, setPercentInput] = useState<string>("");
  const [originalPrice, setOriginalPrice] = useState<string>("");
  const [discountedPrice, setDiscountedPrice] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<SelectedCity | null>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState<boolean>(false);
  const [expiry, setExpiry] = useState<"today" | "date" | "stock">("today");

  // Auto-fill city from user profile
  const displayCity = selectedCity?.cityName || user?.city;
  const displayRegion = selectedCity?.regionName;

  const canPublish = title.trim().length > 0;

  const effectivePercent = useMemo(() => {
    const orig = parseFloat(originalPrice);
    const disc = parseFloat(discountedPrice);
    if (orig > 0 && disc > 0 && disc < orig) {
      return Math.round(((orig - disc) / orig) * 100);
    }
    const v = parseInt(percentInput, 10);
    if (!isNaN(v)) return Math.min(99, Math.max(1, v));
    return 0;
  }, [originalPrice, discountedPrice, percentInput]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  }, []);

  const useMyLocation = useCallback(() => {
    setAddress("ул. Тверская, 12");
  }, []);

  const onSubmit = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert("Заполни название", "Расскажи, что за скидка");
      return;
    }
    const opt = EXPIRY_OPTIONS.find((e) => e.id === expiry) ?? EXPIRY_OPTIONS[0];
    const orig = parseFloat(originalPrice);
    const disc = parseFloat(discountedPrice);

    // Upload image first
    let imageUrl: string | undefined;
    if (image) {
      const uploadRes = await api.uploadImage(image);
      if (uploadRes.success && uploadRes.data) {
        imageUrl = uploadRes.data.url;
      }
    }

    const cityId = user?.cityId ? String(user.cityId) : guestCity?.cityId;

    const res = await api.createDiscount({
      title: title.trim(),
      category,
      percent: effectivePercent || 10,
      originalPrice: !isNaN(orig) ? orig : undefined,
      discountedPrice: !isNaN(disc) ? disc : undefined,
      images: imageUrl ? [imageUrl] : undefined,
      locationName: address || "Моё место",
      lat: 55.756,
      lng: 37.62,
      expiresAt: Date.now() + opt.hours * 60 * 60 * 1000,
      cityId,
    });

    if (res.success) {
      // Refresh feed via provider
      addPost(res.data!);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      router.back();
    } else {
      Alert.alert("Ошибка", res.error ?? "Не удалось опубликовать");
    }
  }, [title, category, image, address, effectivePercent, originalPrice, discountedPrice, expiry, addPost, router]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Modal header */}
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
            <X size={22} color={Colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>Новая скидка</Text>
          <Pressable
            onPress={onSubmit}
            disabled={!canPublish}
            hitSlop={10}
            style={[styles.publishBtn, !canPublish && styles.publishBtnDisabled]}
          >
            <Text style={[styles.publishBtnText, !canPublish && styles.publishBtnTextDisabled]}>
              Опубликовать
            </Text>
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
          {/* Image */}
          <Pressable style={styles.imagePicker} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.pickedImage} contentFit="cover" />
            ) : (
              <View style={styles.placeholder}>
                <View style={styles.placeholderIcon}>
                  <Camera size={28} color={Colors.primary} strokeWidth={2} />
                </View>
                <Text style={styles.placeholderTitle}>Добавить фото</Text>
                <Text style={styles.placeholderHint}>Покажи, что предлагаешь</Text>
              </View>
            )}
          </Pressable>

          <Field label="Название">
            <View style={styles.inputBox}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Пицца 50% на всё меню"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />
            </View>
          </Field>

          <Field label="Категория">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {CATEGORIES.map((c) => {
                const active = category === c.id;
                const IconCm = c.icon;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategory(c.id)}
                    style={[
                      styles.catChip,
                      { backgroundColor: active ? c.color : Colors.card },
                    ]}
                  >
                    <IconCm size={14} color={active ? Colors.text : c.color} strokeWidth={2} />
                    <Text style={[styles.catLabel, { color: active ? Colors.text : Colors.textSecondary }]}>
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Field>

          <Field label="Скидка">
            <View style={styles.percentRow}>
              {PERCENT_PRESETS.map((p) => {
                const active = parseInt(percentInput, 10) === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => setPercentInput(String(p))}
                    style={[
                      styles.percentChip,
                      active && { backgroundColor: Colors.primary },
                    ]}
                  >
                    <Text style={[styles.percentChipText, active && { color: Colors.text }]}>
                      {p}%
                    </Text>
                  </Pressable>
                );
              })}
              <View style={styles.percentCustom}>
                <TextInput
                  value={percentInput}
                  onChangeText={(v) => setPercentInput(v.replace(/[^0-9]/g, ""))}
                  placeholder="свой"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.percentInput}
                  maxLength={2}
                />
              </View>
            </View>
            {effectivePercent > 0 && (
              <Text style={styles.hint}>Итог: −{effectivePercent}%</Text>
            )}
          </Field>

          <View style={styles.priceRow}>
            <View style={styles.priceCol}>
              <Field label="Цена до">
                <View style={styles.inputBox}>
                  <TextInput
                    value={originalPrice}
                    onChangeText={(v) => setOriginalPrice(v.replace(/[^0-9.]/g, ""))}
                    placeholder="800"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </View>
              </Field>
            </View>
            <View style={styles.priceArrow}>
              <Text style={styles.priceArrowText}>→</Text>
            </View>
            <View style={styles.priceCol}>
              <Field label="Цена после">
                <View style={styles.inputBox}>
                  <TextInput
                    value={discountedPrice}
                    onChangeText={(v) => setDiscountedPrice(v.replace(/[^0-9.]/g, ""))}
                    placeholder="400"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </View>
              </Field>
            </View>
          </View>

          <Field label="Адрес">
            <View style={styles.addressRow}>
              <View style={[styles.inputBox, { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }]}>
                <MapPin size={16} color={Colors.textMuted} strokeWidth={2} />
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Введи адрес"
                  placeholderTextColor={Colors.textMuted}
                  style={[styles.input, { flex: 1, paddingVertical: 0 }]}
                />
              </View>
              <Pressable onPress={useMyLocation} style={styles.locBtn} hitSlop={8}>
                <Navigation size={18} color={Colors.primary} strokeWidth={2} />
              </Pressable>
            </View>
          </Field>

          <Field label="Город">
            <Pressable
              onPress={() => setCityPickerOpen(true)}
              style={styles.inputBox}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 14 }}>
                <MapPin size={16} color={displayCity ? Colors.primary : Colors.textMuted} strokeWidth={2} />
                <Text style={[styles.input, { flex: 1, paddingVertical: 0 }, !displayCity && { color: Colors.textMuted }]}>
                  {displayCity ? `${displayCity}${displayRegion ? `, ${displayRegion}` : ""}` : "Выбери город"}
                </Text>
              </View>
            </Pressable>
          </Field>

          <Field label="Действует до">
            <View style={styles.expiryRow}>
              {EXPIRY_OPTIONS.map((opt) => {
                const active = expiry === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setExpiry(opt.id)}
                    style={[
                      styles.expItem,
                      active && { backgroundColor: Colors.successLight },
                    ]}
                  >
                    <View style={[styles.radio, active && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}>
                      {active && <Check size={12} color={Colors.text} strokeWidth={3} />}
                    </View>
                    <Text style={[styles.expLabel, active && { color: Colors.text }]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <CityPicker
        visible={cityPickerOpen}
        onSelect={(c) => {
          setSelectedCity(c);
          setCityPickerOpen(false);
        }}
        onClose={() => setCityPickerOpen(false)}
      />
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  field: { marginTop: 20 },
  label: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.3,
    marginBottom: 10,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  headerSafe: {
    backgroundColor: Colors.background,
  },
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
  publishBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  publishBtnDisabled: {
    backgroundColor: Colors.cardSecondary,
  },
  publishBtnText: {
    color: Colors.text,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  publishBtnTextDisabled: {
    color: Colors.textMuted,
  },

  scroll: { padding: 20, paddingBottom: 60 },

  imagePicker: {
    height: 200,
    borderRadius: 16,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pickedImage: { width: "100%", height: "100%" },
  placeholder: { alignItems: "center", gap: 10 },
  placeholderIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderTitle: { fontSize: 16, color: Colors.text, letterSpacing: -0.3 },
  placeholderHint: { fontSize: 12, color: Colors.textMuted },

  inputBox: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  input: {
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 14,
    letterSpacing: -0.2,
  },
  hint: { fontSize: 13, color: Colors.primary, marginTop: 10, letterSpacing: -0.2 },

  chipsRow: { gap: 8, paddingVertical: 2 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.card,
  },
  catLabel: { fontSize: 13, letterSpacing: -0.2 },

  percentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  percentChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.card,
    minWidth: 60,
    alignItems: "center",
  },
  percentChipText: { fontSize: 15, color: Colors.textSecondary, letterSpacing: -0.3 },
  percentCustom: {
    paddingHorizontal: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    minWidth: 80,
    justifyContent: "center",
  },
  percentInput: {
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 10,
    textAlign: "center",
  },

  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  priceCol: { flex: 1 },
  priceArrow: { paddingBottom: 18 },
  priceArrowText: { fontSize: 20, color: Colors.textMuted },

  addressRow: { flexDirection: "row", gap: 10, alignItems: "stretch" },
  locBtn: {
    width: 50,
    backgroundColor: Colors.card,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  expiryRow: { gap: 10 },
  expItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderRadius: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  expLabel: { fontSize: 15, color: Colors.textSecondary, letterSpacing: -0.2 },
});
