import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Trash2,
  Camera,
  ChevronDown,
  X,
  MapPin,
  Clock,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Image as RNImage,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { CATEGORIES, CATEGORY_MAP } from "@/constants/categories";
import { PercentSpinnerCentered } from "@/components/PercentSpinner";
import { api } from "@/services/api";
import { formatFullDate } from "@/utils/time";
import type { Discount } from "@/types/discount";
import type { Category } from "@/types/discount";

export default function AdminDiscountEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [discount, setDiscount] = useState<Discount | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Form
  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<Category>("other");
  const [percent, setPercent] = useState<string>("");
  const [originalPrice, setOriginalPrice] = useState<string>("");
  const [discountedPrice, setDiscountedPrice] = useState<string>("");
  const [locationName, setLocationName] = useState<string>("");
  const [placeName, setPlaceName] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [expiresIn, setExpiresIn] = useState<string>(""); // hours from now, or empty = no limit
  const [images, setImages] = useState<string[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);

  const fetchDiscount = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await api.getAdminDiscount(id);
    if (res.success && res.data) {
      const d = res.data;
      setDiscount(d);
      setTitle(d.title);
      setCategory(d.category);
      setPercent(String(d.percent));
      setOriginalPrice(d.originalPrice ? String(d.originalPrice) : "");
      setDiscountedPrice(d.discountedPrice ? String(d.discountedPrice) : "");
      setLocationName(d.locationName ?? "");
      setPlaceName(d.placeName ?? "");
      setNote(d.note ?? "");
      setImages(d.images ?? []);

      // Calculate remaining hours from expiresAt
      if (d.expiresAt && d.expiresAt > Date.now()) {
        const hoursLeft = Math.ceil((d.expiresAt - Date.now()) / 3600000);
        setExpiresIn(String(hoursLeft));
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchDiscount();
  }, [fetchDiscount]);

  const selectedCat = useMemo(() => CATEGORY_MAP[category] ?? CATEGORY_MAP.other, [category]);

  const handleSave = useCallback(async () => {
    if (!id) return;
    if (!title.trim()) {
      Alert.alert("Ошибка", "Введите название скидки");
      return;
    }
    if (!percent || Number(percent) <= 0 || Number(percent) > 99) {
      Alert.alert("Ошибка", "Скидка должна быть от 1 до 99%");
      return;
    }

    setSaving(true);
    const payload: Record<string, unknown> = {
      title: title.trim(),
      category,
      percent: Number(percent),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      discountedPrice: discountedPrice ? Number(discountedPrice) : undefined,
      locationName: locationName.trim() || undefined,
      placeName: placeName.trim() || undefined,
      note: note.trim() || undefined,
    };

    if (expiresIn) {
      payload.expiresAt = Date.now() + Number(expiresIn) * 3600000;
    }

    const res = await api.updateAdminDiscount(id, payload as any);
    if (res.success) {
      Alert.alert("Сохранено", "Скидка обновлена", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } else {
      Alert.alert("Ошибка", res.error ?? "Не удалось сохранить");
    }
    setSaving(false);
  }, [id, title, category, percent, originalPrice, discountedPrice, locationName, placeName, note, expiresIn, router]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    Alert.alert("Удалить скидку?", "Это действие нельзя отменить", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          const res = await api.deleteAdminDiscount(id);
          if (res.success) {
            router.back();
          } else {
            Alert.alert("Ошибка", res.error ?? "Не удалось удалить");
          }
        },
      },
    ]);
  }, [id, router]);

  if (loading) {
    return (
      <View style={styles.root}>
        <PercentSpinnerCentered />
      </View>
    );
  }

  if (!discount) {
    return (
      <View style={styles.root}>
        <Text style={styles.errorText}>Скидка не найдена</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: "Редактировать",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerRight: () => (
            <Pressable onPress={handleDelete} hitSlop={8}>
              <Trash2 size={18} color={Colors.danger} strokeWidth={2} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView edges={["bottom"]} style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Author info */}
            <View style={styles.authorRow}>
              <Text style={styles.authorText}>
                Автор: #{discount.author?.id ? "..." : ""} {discount.author?.name ?? "—"}
              </Text>
              <Text style={styles.authorDate}>
                {formatFullDate(discount.postedAt)}
              </Text>
            </View>

            {/* Title */}
            <Text style={styles.label}>Название</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Что за скидка?"
              placeholderTextColor={Colors.textMuted}
              maxLength={120}
            />

            {/* Category */}
            <Text style={styles.label}>Категория</Text>
            <Pressable
              style={styles.pickerBtn}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <View style={[styles.catBadge, { backgroundColor: selectedCat.color + "22" }]}>
                <selectedCat.icon size={16} color={selectedCat.color} strokeWidth={2} />
              </View>
              <Text style={styles.pickerText}>{selectedCat.label}</Text>
              <ChevronDown size={16} color={Colors.textMuted} strokeWidth={2} />
            </Pressable>

            {showCategoryPicker && (
              <View style={styles.catGrid}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.catChip,
                      category === c.id && { backgroundColor: c.color + "22", borderColor: c.color },
                    ]}
                    onPress={() => {
                      setCategory(c.id);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <c.icon size={14} color={c.color} strokeWidth={2} />
                    <Text
                      style={[
                        styles.catChipText,
                        category === c.id && { color: c.color, fontWeight: "600" },
                      ]}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Percent + Prices */}
            <View style={styles.rowFields}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Скидка %</Text>
                <TextInput
                  style={styles.input}
                  value={percent}
                  onChangeText={setPercent}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={2}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Старая цена</Text>
                <TextInput
                  style={styles.input}
                  value={originalPrice}
                  onChangeText={setOriginalPrice}
                  keyboardType="numeric"
                  placeholder="1000"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.rowFields}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Новая цена</Text>
                <TextInput
                  style={styles.input}
                  value={discountedPrice}
                  onChangeText={setDiscountedPrice}
                  keyboardType="numeric"
                  placeholder="700"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>До конца (часов)</Text>
                <TextInput
                  style={styles.input}
                  value={expiresIn}
                  onChangeText={setExpiresIn}
                  keyboardType="numeric"
                  placeholder="Без срока"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            {/* Address */}
            <Text style={styles.label}>Адрес (магазин/локация)</Text>
            <View style={styles.inputRow}>
              <MapPin size={16} color={Colors.textMuted} strokeWidth={1.5} />
              <TextInput
                style={styles.inputFlex}
                value={locationName}
                onChangeText={setLocationName}
                placeholder="ул. Ленина, 5"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Place name */}
            <Text style={styles.label}>Место (название)</Text>
            <TextInput
              style={styles.input}
              value={placeName}
              onChangeText={setPlaceName}
              placeholder='ТЦ "Галерея"'
              placeholderTextColor={Colors.textMuted}
            />

            {/* Note */}
            <Text style={styles.label}>Примечание</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={note}
              onChangeText={setNote}
              placeholder="Условия, детали..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Images (read-only display) */}
            {images.length > 0 && (
              <>
                <Text style={styles.label}>Фото ({images.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                  {images.map((uri, i) => (
                    <RNImage key={i} source={{ uri }} style={styles.photo} />
                  ))}
                </ScrollView>
              </>
            )}

            {/* Save */}
            <Pressable
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>
                {saving ? "Сохранение..." : "Сохранить"}
              </Text>
            </Pressable>

            {/* Delete */}
            <Pressable style={styles.deleteBtn} onPress={handleDelete}>
              <Trash2 size={16} color={Colors.danger} strokeWidth={2} />
              <Text style={styles.deleteBtnText}>Удалить скидку</Text>
            </Pressable>

            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  errorText: { fontSize: 15, color: Colors.textMuted, textAlign: "center", marginTop: 100 },

  authorRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.card,
    borderRadius: 10,
  },
  authorText: { fontSize: 13, color: Colors.textSecondary, letterSpacing: -0.2 },
  authorDate: { fontSize: 12, color: Colors.textMuted, letterSpacing: -0.1 },

  label: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.textMuted,
    marginTop: 16,
    marginBottom: 6,
    marginLeft: 4,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
  },

  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  inputFlex: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    letterSpacing: -0.2,
    padding: 0,
  },
  inputRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },

  rowFields: {
    flexDirection: "row" as const,
    gap: 12,
  },
  halfField: { flex: 1 },

  pickerBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  catBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  catGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginTop: 8,
  },
  catChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 6,
  },
  catChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
  },

  photoRow: { marginTop: 4, marginBottom: 8 },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: Colors.cardSecondary,
  },

  saveBtn: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center" as const,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#fff",
    letterSpacing: -0.3,
  },
  btnDisabled: { opacity: 0.5 },

  deleteBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 12,
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.danger,
    letterSpacing: -0.3,
  },
});
