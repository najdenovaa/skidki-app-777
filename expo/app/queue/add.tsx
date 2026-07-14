import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Sparkles } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PercentSpinner } from "@/components/PercentSpinner";
import { StationForm, type StationFormValues } from "@/components/StationForm";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useQueue } from "@/providers/QueueProvider";
import { api } from "@/services/api";

export default function AddStationScreen() {
  const router = useRouter();
  const { isGuest, user, guestCity } = useAuth();
  const { loadStations } = useQueue();

  const [gpsLat, setGpsLat] = useState<number | undefined>(undefined);
  const [gpsLng, setGpsLng] = useState<number | undefined>(undefined);
  const [prefillAddress, setPrefillAddress] = useState<string | undefined>(undefined);
  const [locating, setLocating] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const cityId = user?.cityId ? Number(user.cityId) : guestCity?.cityId ? Number(guestCity.cityId) : undefined;
  const cityName = user?.city ?? guestCity?.cityName;

  useEffect(() => {
    if (isGuest) {
      Alert.alert(
        "Требуется авторизация",
        "Войди или зарегистрируйся, чтобы добавить АЗС",
        [
          { text: "Войти", onPress: () => router.replace("/auth/login") },
          { text: "Отмена", style: "cancel" as const, onPress: () => router.back() },
        ]
      );
    }
  }, [isGuest, router]);

  useEffect(() => {
    if (isGuest) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocating(false);
          Alert.alert(
            "Разреши геолокацию",
            "Добавить АЗС можно только у колонки",
            [{ text: "ОК", onPress: () => router.back() }]
          );
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!pos?.coords) {
          setLocating(false);
          Alert.alert(
            "Разреши геолокацию",
            "Добавить АЗС можно только у колонки",
            [{ text: "ОК", onPress: () => router.back() }]
          );
          return;
        }
        setGpsLat(pos.coords.latitude);
        setGpsLng(pos.coords.longitude);
        const geo = await api.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (geo.success && geo.data?.address) {
          setPrefillAddress(geo.data.address);
        }
      } catch {
        setLocating(false);
        Alert.alert(
          "Разреши геолокацию",
          "Добавить АЗС можно только у колонки",
          [{ text: "ОК", onPress: () => router.back() }]
        );
        return;
      } finally {
        setLocating(false);
      }
    })();
  }, [isGuest, router]);

  const handleSubmit = useCallback(
    async (values: StationFormValues) => {
      if (gpsLat === undefined || gpsLng === undefined) {
        Alert.alert("Нет геопозиции", "Включи доступ к геолокации, чтобы добавить АЗС");
        return;
      }
      setSubmitting(true);
      const res = await api.createStation({
        name: values.name,
        brand: values.brand,
        lat: gpsLat,
        lng: gpsLng,
        userLat: gpsLat,
        userLng: gpsLng,
        cityId,
        address: values.address,
        fuel92: values.fuel92,
        fuel95: values.fuel95,
        fuelDt: values.fuelDt,
        fuelLpg: values.fuelLpg,
        limitLiters: values.limitLiters,
      });
      setSubmitting(false);

      if (!res.success || !res.data) {
        Alert.alert("Ошибка", res.error ?? "Не удалось добавить АЗС");
        return;
      }

      const stationId = res.data.id;
      await loadStations();

      if (res.data.existing) {
        Alert.alert("АЗС уже есть рядом", "Рядом уже есть добавленная станция", [
          { text: "ОК", onPress: () => router.replace(`/queue/station/${stationId}`) },
        ]);
      } else {
        Alert.alert("АЗС добавлена", "Спасибо за вклад!", [
          { text: "ОК", onPress: () => router.replace(`/queue/station/${stationId}`) },
        ]);
      }
    },
    [gpsLat, gpsLng, cityId, loadStations, router]
  );

  if (isGuest) {
    return <SafeAreaView style={styles.root} edges={["top"]} />;
  }

  if (locating) {
    return (
      <SafeAreaView style={[styles.root, styles.center]} edges={["top"]}>
        <PercentSpinner />
      </SafeAreaView>
    );
  }

  if (gpsLat === undefined || gpsLng === undefined) {
    return <SafeAreaView style={styles.root} edges={["top"]} />;
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.banner}>
        <Sparkles size={16} color={Colors.primary} />
        <Text style={styles.bannerText}>
          Стоишь у колонки? Адрес можно ввести вручную или заполнить по GPS
        </Text>
      </View>
      <StationForm
        mode="create"
        stationLat={gpsLat}
        stationLng={gpsLng}
        prefillAddress={prefillAddress}
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
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: Colors.infoLight,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.info,
    fontWeight: "600" as const,
  },
});
