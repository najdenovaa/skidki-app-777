import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PercentSpinner } from "@/components/PercentSpinner";
import { StationForm, type StationFormValues } from "@/components/StationForm";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/services/api";
import type { Station } from "@/types/queue";

export default function EditStationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const stationId = String(id);
  const router = useRouter();
  const { user, guestCity } = useAuth();

  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [gpsLat, setGpsLat] = useState<number | undefined>(undefined);
  const [gpsLng, setGpsLng] = useState<number | undefined>(undefined);

  const cityName = user?.city ?? guestCity?.cityName;

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await api.getStation(stationId);
      if (!active) return;
      if (res.success && res.data) setStation(res.data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [stationId]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setGpsLat(pos.coords.latitude);
        setGpsLng(pos.coords.longitude);
      } catch {
        // GPS unavailable
      }
    })();
  }, []);

  const handleSubmit = useCallback(
    async (values: StationFormValues) => {
      if (gpsLat === undefined || gpsLng === undefined) {
        Alert.alert("Нет геопозиции", "Включи доступ к геолокации, чтобы исправить АЗС");
        return;
      }
      setSubmitting(true);
      const res = await api.updateStation(stationId, {
        lat: gpsLat,
        lng: gpsLng,
        name: values.name,
        brand: values.brand,
        address: values.address,
        fuel92: values.fuel92,
        fuel95: values.fuel95,
        fuelDt: values.fuelDt,
        fuelLpg: values.fuelLpg,
        limitLiters: values.limitLiters,
        note: values.note,
      });
      setSubmitting(false);

      if (!res.success) {
        if (res.error?.includes("500")) {
          Alert.alert("Слишком далеко", "Подойди ближе к АЗС");
        } else {
          Alert.alert("Ошибка", res.error ?? "Не удалось сохранить правки");
        }
        return;
      }

      Alert.alert("Спасибо!", "Информация обновлена", [
        { text: "ОК", onPress: () => router.back() },
      ]);
    },
    [gpsLat, gpsLng, stationId, router]
  );

  if (loading || !station) {
    return (
      <SafeAreaView style={[styles.root, styles.center]} edges={["top"]}>
        <PercentSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <StationForm
        mode="edit"
        initial={station}
        stationLat={gpsLat}
        stationLng={gpsLng}
        cityName={cityName}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});
