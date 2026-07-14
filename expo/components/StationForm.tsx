import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { MapPin, Search } from "lucide-react-native";

import Colors from "@/constants/colors";
import { api } from "@/services/api";
import type { Station } from "@/types/queue";

const BRANDS = ["Лукойл", "Газпромнефть", "Роснефть", "Татнефть", "Башнефть", "Другая"];

export interface StationFormValues {
  name: string;
  brand?: string;
  address?: string;
  fuel92: boolean;
  fuel95: boolean;
  fuelDt: boolean;
  fuelLpg: boolean;
  limitLiters?: number | null;
  note?: string;
}

interface Props {
  mode: "create" | "edit";
  initial?: Partial<Station>;
  stationLat?: number;
  stationLng?: number;
  prefillAddress?: string;
  cityName?: string;
  onSubmit: (values: StationFormValues) => void;
  submitting: boolean;
}

export function StationForm({
  mode,
  initial,
  stationLat,
  stationLng,
  prefillAddress,
  cityName,
  onSubmit,
  submitting,
}: Props) {
  const [name, setName] = useState<string>(initial?.name ?? "");
  const initialBrand = initial?.brand ?? "";
  const isKnownBrand = BRANDS.slice(0, -1).includes(initialBrand);
  const [brandChoice, setBrandChoice] = useState<string>(
    initialBrand ? (isKnownBrand ? initialBrand : "Другая") : ""
  );
  const [customBrand, setCustomBrand] = useState<string>(
    initialBrand && !isKnownBrand ? initialBrand : ""
  );
  const [address, setAddress] = useState<string>(initial?.address ?? prefillAddress ?? "");
  const [addressFromGps, setAddressFromGps] = useState<boolean>(!!prefillAddress && !initial?.address);
  const [geoLoading, setGeoLoading] = useState<boolean>(false);

  const [fuel92, setFuel92] = useState<boolean>(initial?.fuel92 ?? false);
  const [fuel95, setFuel95] = useState<boolean>(initial?.fuel95 ?? false);
  const [fuelDt, setFuelDt] = useState<boolean>(initial?.fuelDt ?? false);
  const [fuelLpg, setFuelLpg] = useState<boolean>(initial?.fuelLpg ?? false);

  const [limitLiters, setLimitLiters] = useState<string>(
    initial?.limitLiters != null ? String(initial.limitLiters) : ""
  );
  const [note, setNote] = useState<string>("");

  const handleFillFromGps = useCallback(async () => {
    if (stationLat === undefined || stationLng === undefined) return;
    setGeoLoading(true);
    const res = await api.reverseGeocode(stationLat, stationLng);
    setGeoLoading(false);
    if (res.success && res.data?.address) {
      setAddress(res.data.address);
      setAddressFromGps(true);
    }
  }, [stationLat, stationLng]);

  const handleFindAddress = useCallback(async () => {
    if (!address.trim()) return;
    setGeoLoading(true);
    const res = await api.geocodeAddress(address, cityName);
    setGeoLoading(false);
    if (res.success && res.data?.address) {
      setAddress(res.data.address);
      setAddressFromGps(false);
    }
  }, [address, cityName]);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return;
    const brand = brandChoice === "Другая" ? customBrand.trim() : brandChoice;
    const liters = limitLiters.trim() ? Number(limitLiters.trim()) : null;
    onSubmit({
      name: name.trim(),
      brand: brand || undefined,
      address: address.trim() || undefined,
      fuel92,
      fuel95,
      fuelDt,
      fuelLpg,
      limitLiters: Number.isFinite(liters) ? liters : null,
      note: mode === "edit" ? note.trim() || undefined : undefined,
    });
  }, [name, brandChoice, customBrand, address, fuel92, fuel95, fuelDt, fuelLpg, limitLiters, note, mode, onSubmit]);

  const canSubmit = name.trim().length > 0 && !submitting;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.field}>
        <Text style={styles.label}>Название *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Например: АЗС на Ленина 12"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Бренд</Text>
        <View style={styles.chipsRow}>
          {BRANDS.map((b) => {
            const active = brandChoice === b;
            return (
              <Pressable
                key={b}
                onPress={() => setBrandChoice(b)}
                style={[styles.chip, active ? styles.chipActive : null]}
              >
                <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>{b}</Text>
              </Pressable>
            );
          })}
        </View>
        {brandChoice === "Другая" ? (
          <TextInput
            value={customBrand}
            onChangeText={setCustomBrand}
            placeholder="Название бренда"
            placeholderTextColor={Colors.textMuted}
            style={[styles.input, styles.inputSpaced]}
          />
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Адрес</Text>
        <Text style={styles.hint}>Можно ввести вручную или заполнить по GPS</Text>
        <TextInput
          value={address}
          onChangeText={(v) => {
            setAddress(v);
            setAddressFromGps(false);
          }}
          placeholder="Адрес АЗС"
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, styles.inputMultiline]}
          multiline
        />
        {addressFromGps ? <Text style={styles.gpsTag}>Адрес из GPS</Text> : null}
        <View style={styles.addressActions}>
          <Pressable onPress={handleFillFromGps} disabled={geoLoading} style={styles.actionBtn}>
            <MapPin size={15} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Заполнить по GPS</Text>
          </Pressable>
          {mode === "edit" ? (
            <Pressable onPress={handleFindAddress} disabled={geoLoading || !address.trim()} style={styles.actionBtn}>
              <Search size={15} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Найти адрес</Text>
            </Pressable>
          ) : null}
        </View>
        {geoLoading ? <ActivityIndicator size="small" color={Colors.primary} style={styles.geoSpinner} /> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Топливо</Text>
        <View style={styles.fuelCard}>
          <FuelRow label="АИ-92" value={fuel92} onChange={setFuel92} />
          <FuelRow label="АИ-95" value={fuel95} onChange={setFuel95} />
          <FuelRow label="ДТ" value={fuelDt} onChange={setFuelDt} />
          <FuelRow label="Газ" value={fuelLpg} onChange={setFuelLpg} />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Лимит литров (необязательно)</Text>
        <TextInput
          value={limitLiters}
          onChangeText={(v) => setLimitLiters(v.replace(/[^0-9]/g, ""))}
          placeholder="Например: 40"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          keyboardType="number-pad"
        />
      </View>

      {mode === "edit" ? (
        <View style={styles.field}>
          <Text style={styles.label}>Комментарий</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Что изменилось? (необязательно)"
            placeholderTextColor={Colors.textMuted}
            style={[styles.input, styles.inputMultiline]}
            multiline
          />
        </View>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={[styles.submitBtn, !canSubmit ? styles.submitBtnDisabled : null]}
      >
        {submitting ? (
          <ActivityIndicator size="small" color={Colors.textInverse} />
        ) : (
          <Text style={styles.submitBtnText}>
            {mode === "create" ? "Добавить АЗС" : "Сохранить правки"}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function FuelRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.fuelRow}>
      <Text style={styles.fuelLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.border, true: Colors.primaryLight }}
        thumbColor={value ? Colors.primary : Colors.card}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 20,
  },
  field: { gap: 8 },
  label: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: -4,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  inputSpaced: { marginTop: 4 },
  inputMultiline: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  chipLabelActive: {
    color: Colors.textInverse,
  },
  gpsTag: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.info,
    backgroundColor: Colors.infoLight,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  addressActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  geoSpinner: { marginTop: 4 },
  fuelCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  fuelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  fuelLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: "600" as const,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.textMuted,
  },
  submitBtnText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: "700" as const,
  },
});
