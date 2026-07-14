import createContextHook from "@nkzw/create-context-hook";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/services/api";
import type { FuelType, QueueEntry, Station } from "@/types/queue";

const PING_INTERVAL_MS = 30_000;

export const [QueueProvider, useQueue] = createContextHook(() => {
  const { user, guestCity } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [currentQueue, setCurrentQueue] = useState<QueueEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [gpsLat, setGpsLat] = useState<number | undefined>(undefined);
  const [gpsLng, setGpsLng] = useState<number | undefined>(undefined);

  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cityId = user?.cityId ? Number(user.cityId) : guestCity?.cityId ? Number(guestCity.cityId) : undefined;

  // Fetch GPS once on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setGpsLat(pos.coords.latitude);
          setGpsLng(pos.coords.longitude);
        }
      } catch {
        // GPS unavailable — proceed without it
      }
    })();
  }, []);

  const loadStations = useCallback(async () => {
    const res = await api.getStations({ cityId, lat: gpsLat, lng: gpsLng });
    if (res.success && res.data) setStations(res.data);
  }, [cityId, gpsLat, gpsLng]);

  useEffect(() => {
    loadStations().finally(() => setLoading(false));
  }, [loadStations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStations();
    setRefreshing(false);
  }, [loadStations]);

  const refreshMyQueue = useCallback(async (): Promise<void> => {
    const res = await api.getMyQueue();
    if (res.success) {
      setCurrentQueue(res.data ?? null);
    }
  }, []);

  // On mount, restore an existing queue entry for logged-in users
  useEffect(() => {
    if (user) {
      refreshMyQueue();
    } else {
      setCurrentQueue(null);
    }
  }, [user, refreshMyQueue]);

  const stopPing = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const pingLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const res = await api.pingQueue({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      if (res.success && res.data) setCurrentQueue(res.data);
    } catch {
      // ignore — will retry on next interval tick
    }
  }, []);

  // Start/stop the 30s ping interval based on whether the user is in a queue
  useEffect(() => {
    if (currentQueue !== null) {
      if (!pingIntervalRef.current) {
        pingIntervalRef.current = setInterval(pingLocation, PING_INTERVAL_MS);
      }
    } else {
      stopPing();
    }
    return () => {
      stopPing();
    };
  }, [currentQueue, pingLocation, stopPing]);

  const joinQueue = useCallback(
    async (stationId: string, fuelType: FuelType): Promise<boolean> => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return false;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const res = await api.joinQueue({
          stationId,
          fuelType,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        if (res.success && res.data) {
          setCurrentQueue(res.data);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    []
  );

  const leaveQueue = useCallback(async (): Promise<boolean> => {
    const res = await api.leaveQueue();
    if (res.success) {
      stopPing();
      setCurrentQueue(null);
      return true;
    }
    return false;
  }, [stopPing]);

  return useMemo(
    () => ({
      stations,
      currentQueue,
      loading,
      refreshing,
      gpsLat,
      gpsLng,
      loadStations,
      onRefresh,
      joinQueue,
      leaveQueue,
      pingLocation,
      refreshMyQueue,
    }),
    [
      stations,
      currentQueue,
      loading,
      refreshing,
      gpsLat,
      gpsLng,
      loadStations,
      onRefresh,
      joinQueue,
      leaveQueue,
      pingLocation,
      refreshMyQueue,
    ]
  );
});
