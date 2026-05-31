import { Check, ChevronLeft, MapPin, Search, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { api } from "@/services/api";
import type { GeoCity, GeoRegion, SelectedCity } from "@/types/api";

interface CityPickerProps {
  visible: boolean;
  onSelect: (city: SelectedCity) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  showSkip?: boolean;
  onSkip?: () => void;
}

export function CityPicker({ visible, onSelect, onClose, title, subtitle, showSkip, onSkip }: CityPickerProps) {
  const [regions, setRegions] = useState<GeoRegion[]>([]);
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<GeoRegion | null>(null);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [search, setSearch] = useState("");

  // Load regions on open
  useEffect(() => {
    if (visible) {
      setLoadingRegions(true);
      api.getRegions().then((res) => {
        if (res.success && res.data) setRegions(res.data);
        setLoadingRegions(false);
      });
    }
  }, [visible]);

  // Load cities when region selected
  const pickRegion = useCallback((region: GeoRegion) => {
    setSelectedRegion(region);
    setCities([]);
    setSearch("");
    setLoadingCities(true);
    api.getCities(String(region.id)).then((res) => {
      if (res.success && res.data) setCities(res.data);
      setLoadingCities(false);
    });
  }, []);

  const goBack = useCallback(() => {
    setSelectedRegion(null);
    setCities([]);
    setSearch("");
  }, []);

  const handleSelect = useCallback(
    (city: GeoCity) => {
      if (!selectedRegion) return;
      onSelect({
        regionId: String(selectedRegion.id),
        cityId: String(city.id),
        cityName: city.name,
        regionName: selectedRegion.name,
      });
      onClose();
    },
    [selectedRegion, onSelect, onClose]
  );

  const handleClose = useCallback(() => {
    setSelectedRegion(null);
    setCities([]);
    setSearch("");
    onClose();
  }, [onClose]);

  const filteredCities = useMemo(() => {
    if (!search.trim()) return cities;
    const q = search.toLowerCase().trim();
    return cities.filter((c) => c.name.toLowerCase().includes(q));
  }, [cities, search]);

  const isStepRegions = selectedRegion === null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.root}>
        <SafeAreaView edges={["top"]} style={styles.safe}>
          {/* Header */}
          <View style={styles.header}>
            {isStepRegions ? (
              <>
                <View style={styles.headerSpacer} />
                <Text style={styles.headerTitle}>{title || "Выбери регион"}</Text>
                <Pressable onPress={handleClose} hitSlop={12} style={styles.headerBtn}>
                  <X size={22} color={Colors.textMuted} strokeWidth={2} />
                </Pressable>
              </>
            ) : (
              <>
                <Pressable onPress={goBack} hitSlop={12} style={styles.headerBtn}>
                  <ChevronLeft size={22} color={Colors.text} strokeWidth={2} />
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {selectedRegion.name}
                </Text>
                <View style={styles.headerSpacer} />
              </>
            )}
          </View>

          {/* Subtitle / Skip for guest gate */}
          {isStepRegions && subtitle ? (
            <View style={styles.guestGate}>
              <Text style={styles.guestSubtitle}>{subtitle}</Text>
              {showSkip && onSkip && (
                <Pressable onPress={onSkip} style={styles.skipBtn} hitSlop={10}>
                  <Text style={styles.skipText}>Пропустить</Text>
                </Pressable>
              )}
            </View>
          ) : null}

          {/* Content */}
          {isStepRegions ? (
            loadingRegions ? (
              <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
              </View>
            ) : (
              <FlatList
                data={regions}
                keyExtractor={(r) => String(r.id)}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => pickRegion(item)}
                    style={({ pressed }) => [
                      styles.item,
                      pressed && styles.itemPressed,
                    ]}
                  >
                    <Text style={styles.itemText}>{item.name}</Text>
                    <ChevronLeft
                      size={16}
                      color={Colors.textMuted}
                      strokeWidth={2}
                      style={{ transform: [{ rotate: "180deg" }] }}
                    />
                  </Pressable>
                )}
                ItemSeparatorComponent={Separator}
              />
            )
          ) : (
            <View style={{ flex: 1 }}>
              {/* Search */}
              <View style={styles.searchWrap}>
                <Search size={16} color={Colors.textMuted} strokeWidth={2} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Поиск города"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.searchInput}
                  autoFocus={false}
                  returnKeyType="search"
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch("")} hitSlop={8}>
                    <X size={16} color={Colors.textMuted} strokeWidth={2} />
                  </Pressable>
                )}
              </View>

              {loadingCities ? (
                <View style={styles.centered}>
                  <ActivityIndicator color={Colors.primary} size="large" />
                </View>
              ) : (
                <FlatList
                  data={filteredCities}
                  keyExtractor={(c) => String(c.id)}
                  contentContainerStyle={styles.list}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handleSelect(item)}
                      style={({ pressed }) => [
                        styles.item,
                        pressed && styles.itemPressed,
                      ]}
                    >
                      <View style={styles.cityLeft}>
                        <MapPin size={14} color={Colors.textMuted} strokeWidth={2} />
                        <Text style={styles.itemText}>{item.name}</Text>
                      </View>
                      <Text style={styles.regionHint}>{selectedRegion.name}</Text>
                    </Pressable>
                  )}
                  ItemSeparatorComponent={Separator}
                  ListEmptyComponent={
                    <View style={styles.centered}>
                      <Text style={styles.emptyText}>
                        {search ? "Ничего не найдено" : "Нет городов"}
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safe: { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerSpacer: { width: 40 },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: Colors.text,
    letterSpacing: -0.3,
  },

  // ── Search ──
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 14,
    letterSpacing: -0.2,
  },

  // ── List ──
  list: { paddingBottom: 40 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background,
  },
  itemPressed: {
    backgroundColor: Colors.card,
  },
  cityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    color: Colors.text,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  regionHint: {
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: -0.1,
    marginLeft: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 20,
  },

  // ── Misc ──
  guestGate: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  guestSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  skipBtn: {
    alignSelf: "flex-start",
    marginTop: 10,
  },
  skipText: {
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: -0.2,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textMuted,
    letterSpacing: -0.2,
  },
});
