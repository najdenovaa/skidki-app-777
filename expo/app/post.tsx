import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Stack, useRouter } from "expo-router";
import { Camera, Check, ImageIcon, Link, MapPin, MessageSquareText, Navigation, Plus, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CategoryPicker } from "@/components/CategoryPicker";
import { CityPicker } from "@/components/CityPicker";
import { KeyboardSafeScrollView } from "@/components/KeyboardSafeScrollView";
import { Open2GisLink } from "@/components/Open2GisLink";
import { PercentSpinner } from "@/components/PercentSpinner";
import {
  ActionSheetIOS,
  Alert,
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
import type { PickedImage } from "@/types/pickedImage";
import WebImagePickerInput, { type WebImagePickerRef } from "@/components/WebImagePickerInput";

const EXPIRY_OPTIONS: { id: "today" | "date" | "stock"; label: string }[] = [
  { id: "today", label: "Только сегодня" },
  { id: "date", label: "До завтра" },
  { id: "stock", label: "Пока в наличии" },
];

function getExpiresAt(expiry: "today" | "date" | "stock"): number {
  const now = new Date();
  switch (expiry) {
    case "today": {
      const eod = new Date(now);
      eod.setHours(23, 59, 59, 999);
      return eod.getTime();
    }
    case "date": {
      const eod = new Date(now);
      eod.setDate(eod.getDate() + 1);
      eod.setHours(23, 59, 59, 999);
      return eod.getTime();
    }
    case "stock": {
      const far = new Date(now);
      far.setFullYear(far.getFullYear() + 100);
      return far.getTime();
    }
  }
}

const PERCENT_PRESETS: number[] = [10, 20, 30, 50, 70];

export default function PostModalScreen() {
  const router = useRouter();
  const { user, guestCity } = useAuth();
  const { addPost } = useDiscounts();

  const [images, setImages] = useState<PickedImage[]>([]);
  const [cameraFacing, setCameraFacing] = useState<ImagePicker.CameraType>(ImagePicker.CameraType.back);
  const webPickerRef = useRef<WebImagePickerRef>(null);
  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<Category>("other");
  const [percentInput, setPercentInput] = useState<string>("");
  const [originalPrice, setOriginalPrice] = useState<string>("");
  const [discountedPrice, setDiscountedPrice] = useState<string>("");
  const [placeName, setPlaceName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [addressFromGps, setAddressFromGps] = useState<boolean>(false);
  const [selectedCity, setSelectedCity] = useState<SelectedCity | null>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState<boolean>(false);
  const [expiry, setExpiry] = useState<"today" | "date" | "stock">("today");
  const [publishing, setPublishing] = useState<boolean>(false);
  const [categoryOpen, setCategoryOpen] = useState<boolean>(false);

  // Init city from profile / guest on mount
  useEffect(() => {
    if (user?.cityId) {
      setSelectedCity({
        cityId: String(user.cityId),
        cityName: user.city,
        regionId: String(user.regionId ?? ""),
        regionName: "",
      });
    } else if (guestCity) {
      setSelectedCity(guestCity);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fill city from user profile
  const displayCity = selectedCity?.cityName || user?.city;
  const displayRegion = selectedCity?.regionName;

  const canPublish = title.trim().length > 0 && !publishing;

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

  const takePhoto = useCallback(async () => {
    const remaining = 5 - images.length;
    if (remaining <= 0) return;

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Нет доступа", "Разреши доступ к камере в настройках телефона");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
      exif: false,
      cameraType: cameraFacing,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImages((prev) => [...prev, ...result.assets.map((a) => ({ uri: a.uri }))]);
    }
  }, [images.length, cameraFacing]);

  const pickImages = useCallback(async () => {
    const remaining = 5 - images.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      exif: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImages((prev) => [...prev, ...result.assets.map((a) => ({ uri: a.uri }))]);
    }
  }, [images.length]);

  /** Show native action sheet: camera or gallery (web: file picker) */
  const showImageSource = useCallback(() => {
    const remaining = 5 - images.length;
    if (remaining <= 0) return;

    if (Platform.OS === "web") {
      webPickerRef.current?.open();
      return;
    }

    const options = ["Снять фото", "Выбрать из галереи", "Отмена"];
    const cancelIdx = 2;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIdx, tintColor: Colors.primary },
        (idx) => {
          if (idx === 0) takePhoto();
          else if (idx === 1) pickImages();
        },
      );
    } else {
      Alert.alert("Добавить фото", undefined, [
        { text: "Снять фото", onPress: takePhoto },
        { text: "Выбрать из галереи", onPress: pickImages },
        { text: "Отмена", style: "cancel" },
      ]);
    }
  }, [takePhoto, pickImages]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const useMyLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Нет доступа", "Разреши доступ к геолокации в настройках");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      setLat(latitude);
      setLng(longitude);

      let addr = "";

      // Server reverse geocode first (better address with house number)
      const serverRes = await api.reverseGeocode(latitude, longitude);
      if (serverRes.success && serverRes.data?.address) {
        addr = serverRes.data.address;
      }

      // Device fallback — streetNumber + street
      if (!addr) {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo.length > 0) {
          const g = geo[0];
          const streetWithNumber = [g.street, g.streetNumber].filter(Boolean).join(", д. ");
          const parts = [streetWithNumber, g.city, g.region].filter(Boolean);
          addr = parts.join(", ");
        }
      }

      setAddress(addr || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      setAddressFromGps(true);
    } catch {
      Alert.alert("Ошибка", "Не удалось определить местоположение");
    }
  }, []);

  const onSubmit = useCallback(async () => {
    if (publishing) return;
    if (!title.trim()) {
      Alert.alert("Заполни название", "Расскажи, что за скидка");
      return;
    }
    setPublishing(true);
    try {
    const orig = parseFloat(originalPrice);
    const disc = parseFloat(discountedPrice);

    // Upload images first
    let imageUrls: string[] | undefined;
    if (images.length > 0) {
      const uploadRes = await api.uploadImages(images);
      if (!uploadRes.success || !uploadRes.data) {
        Alert.alert("Ошибка", uploadRes.error ?? "Не удалось загрузить изображения");
        return;
      }
      imageUrls = uploadRes.data.urls;
    }

    // Geocode address if user typed it manually (no GPS coords)
    let finalLat = lat;
    let finalLng = lng;
    if (address.trim() && !addressFromGps) {
      const geoRes = await api.geocodeAddress(address.trim(), displayCity);
      if (geoRes.success && geoRes.data) {
        finalLat = geoRes.data.lat;
        finalLng = geoRes.data.lng;
      } else {
        Alert.alert("Адрес не найден", "Проверь адрес или нажми на стрелку GPS для автоопределения");
        return;
      }
    }

    const cityId = selectedCity?.cityId ?? (user?.cityId ? String(user.cityId) : guestCity?.cityId);

    const res = await api.createDiscount({
      title: title.trim(),
      category,
      percent: effectivePercent || 10,
      originalPrice: !isNaN(orig) ? orig : undefined,
      discountedPrice: !isNaN(disc) ? disc : undefined,
      images: imageUrls && imageUrls.length > 0 ? imageUrls : undefined,
      locationName: address || placeName || "Моё место",
      lat: finalLat ?? 0,
      lng: finalLng ?? 0,
      placeName: placeName.trim() || undefined,
      address: address.trim() || undefined,
      note: note.trim() || undefined,
      link: link.trim() || undefined,
      expiresAt: getExpiresAt(expiry),
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
    } finally {
      setPublishing(false);
    }
  }, [publishing, title, category, images, address, placeName, note, link, lat, lng, addressFromGps, displayCity, effectivePercent, originalPrice, discountedPrice, expiry, addPost, router, selectedCity, user, guestCity]);

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
            style={[styles.publishBtn, (!canPublish || publishing) && styles.publishBtnDisabled]}
          >
            {publishing ? (
              <PercentSpinner size={22} color={Colors.primary} />
            ) : (
              <Text style={[styles.publishBtnText, !canPublish && styles.publishBtnTextDisabled]}>
                Опубликовать
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardSafeScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]}
      >
          {/* Images — horizontal preview strip */}
          <View style={styles.imagesSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesRow}>
              {images.map((img, i) => (
                <View key={i} style={styles.thumbnailWrap}>
                  <Image source={{ uri: img.uri }} style={styles.thumbnail} contentFit="cover" />
                  <Pressable
                    onPress={() => removeImage(i)}
                    style={styles.thumbnailRemove}
                    hitSlop={6}
                  >
                    <X size={10} color={Colors.text} strokeWidth={2.5} />
                  </Pressable>
                </View>
              ))}
              {images.length < 5 && (
                <Pressable onPress={showImageSource} style={styles.addPhotoBtn}>
                  <View style={styles.addPhotoIcon}>
                    <Plus size={20} color={Colors.primary} strokeWidth={2} />
                  </View>
                  <Text style={styles.addPhotoLabel}>
                    {images.length === 0 ? "Фото" : "Ещё"}
                  </Text>
                </Pressable>
              )}
            </ScrollView>
            {images.length === 0 && (
              <Text style={styles.imagesHint}>Сними на камеру или выбери до 5 фото из галереи</Text>
            )}
          </View>

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

          <Field label="Точка продаж / услуг">
            <View style={styles.inputBox}>
              <TextInput
                value={placeName}
                onChangeText={setPlaceName}
                placeholder="Кофейня «Уют», магазин «Продукты»"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />
            </View>
          </Field>

          <Field label="Категория">
            <CategoryPicker
              value={category}
              onChange={(v) => setCategory(v as Category)}
              open={categoryOpen}
              onOpenChange={setCategoryOpen}
              variant="form"
              includeAll={false}
            />
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
            <View style={styles.addressInputWrap}>
              <MapPin size={18} color={Colors.primary} strokeWidth={2} style={{ marginLeft: 2 }} />
              <TextInput
                value={address}
                onChangeText={(v) => { setAddress(v); setAddressFromGps(false); setLat(undefined); setLng(undefined); }}
                placeholder="Улица, дом"
                placeholderTextColor={Colors.textMuted}
                style={styles.addressField}
              />
              <Pressable onPress={useMyLocation} style={styles.locBtnInline} hitSlop={8}>
                <Navigation size={20} color={Colors.primary} strokeWidth={2} />
              </Pressable>
            </View>
          </Field>

          {lat != null && lng != null ? (
            <Open2GisLink lat={lat} lng={lng} address={address || undefined} city={displayCity} />
          ) : null}

          <Field label="Примечание">
            <View style={styles.noteBox}>
              <MessageSquareText size={18} color={Colors.primary} strokeWidth={2} style={{ marginTop: 16 }} />
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Условия акции, кодовое слово, время действия..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={styles.noteInput}
              />
            </View>
          </Field>

          <Field label="Ссылка">
            <View style={styles.linkBox}>
              <Link size={18} color={Colors.primary} strokeWidth={2} style={{ marginLeft: 2 }} />
              <TextInput
                value={link}
                onChangeText={setLink}
                placeholder="https://example.com/akciya"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={styles.linkInput}
              />
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
      </KeyboardSafeScrollView>

      <WebImagePickerInput ref={webPickerRef} onPick={(imgs) => setImages((prev) => [...prev, ...imgs])} />

      <CityPicker
        visible={cityPickerOpen}
        onSelect={(c) => {
          setSelectedCity(c);
          setCityPickerOpen(false);
        }}
        onClose={() => setCityPickerOpen(false)}
      />

      {/* Publishing overlay */}
      {publishing && (
        <View style={styles.publishOverlay} pointerEvents="auto">
          <View style={styles.publishOverlayInner}>
            <PercentSpinner size={40} color={Colors.primary} />
            <Text style={styles.publishOverlayText}>Публикуем…</Text>
          </View>
        </View>
      )}
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
  field: { marginTop: 14 },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
    marginBottom: 10,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // ── Publishing overlay ──
  publishOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  publishOverlayInner: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 40,
    paddingVertical: 32,
    alignItems: "center",
    gap: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  publishOverlayText: {
    fontSize: 16,
    color: Colors.text,
    letterSpacing: -0.2,
    fontWeight: "500" as const,
  },

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

  imagesSection: { marginBottom: 0 },
  imagesRow: { gap: 10, paddingVertical: 4 },
  thumbnailWrap: {
    width: 120,
    height: 120,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  thumbnail: { width: 120, height: 120 },
  thumbnailRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtn: {
    width: 120,
    height: 120,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderStyle: "dashed",
    backgroundColor: Colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addPhotoIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoLabel: { fontSize: 15, color: Colors.textMuted },
  imagesHint: { fontSize: 14, color: Colors.textMuted, marginTop: 4, marginBottom: 16 },

  inputBox: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  input: {
    fontSize: 17,
    color: Colors.text,
    paddingVertical: 14,
    letterSpacing: -0.2,
  },
  hint: { fontSize: 15, color: Colors.primary, marginTop: 10, letterSpacing: -0.2 },

  chipsRow: { gap: 8, paddingVertical: 2 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.backgroundSecondary,
  },
  catLabel: { fontSize: 13, letterSpacing: -0.2 },

  percentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  percentChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.backgroundSecondary,
    minWidth: 60,
    alignItems: "center",
  },
  percentChipText: { fontSize: 17, color: Colors.textSecondary, letterSpacing: -0.3 },
  percentCustom: {
    paddingHorizontal: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    minWidth: 80,
    justifyContent: "center",
  },
  percentInput: {
    fontSize: 17,
    color: Colors.text,
    paddingVertical: 10,
    textAlign: "center",
  },

  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  priceCol: { flex: 1 },
  priceArrow: { paddingBottom: 18 },
  priceArrowText: { fontSize: 20, color: Colors.textMuted },

  addressInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addressField: {
    flex: 1,
    fontSize: 17,
    color: Colors.text,
    paddingVertical: 14,
    letterSpacing: -0.2,
  },
  locBtnInline: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },

  noteBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 110,
  },
  noteInput: {
    flex: 1,
    fontSize: 17,
    color: Colors.text,
    paddingVertical: 14,
    letterSpacing: -0.2,
    lineHeight: 24,
    minHeight: 100,
  },

  linkBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkInput: {
    flex: 1,
    fontSize: 17,
    color: Colors.primary,
    paddingVertical: 14,
    letterSpacing: -0.2,
  },

  expiryRow: { gap: 10 },
  expItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  expLabel: { fontSize: 17, color: Colors.textSecondary, letterSpacing: -0.2 },
});
