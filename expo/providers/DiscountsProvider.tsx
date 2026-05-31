import createContextHook from "@nkzw/create-context-hook";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/services/api";
import type { Category, Discount } from "@/types/discount";

export const [DiscountsProvider, useDiscounts] = createContextHook(() => {
  const { user, guestCity } = useAuth();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [hydrated, setHydrated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [gpsLat, setGpsLat] = useState<number | undefined>(undefined);
  const [gpsLng, setGpsLng] = useState<number | undefined>(undefined);

  // Try to get device GPS once for distance calculation
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
        // GPS unavailable — server returns distance without it
      }
    })();
  }, []);

  const cityId = user?.cityId ? String(user.cityId) : guestCity?.cityId;
  const hasCity = !!cityId;

  const loadFeed = useCallback(async () => {
    if (!cityId) return;
    const res = await api.getDiscounts({
      category: filter === "all" ? undefined : filter,
      city: cityId,
      lat: gpsLat,
      lng: gpsLng,
    });
    if (res.success && res.data) setDiscounts(res.data);
  }, [filter, cityId, gpsLat, gpsLng]);

  useEffect(() => {
    if (hasCity) {
      loadFeed().finally(() => setHydrated(true));
    } else {
      setHydrated(true);
      setDiscounts([]);
    }
  }, [loadFeed, hasCity]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }, [loadFeed]);

  const filtered = useMemo<Discount[]>(() => {
    if (filter === "all") return discounts;
    return discounts.filter((d) => d.category === filter);
  }, [discounts, filter]);

  /** Update a single discount in local state without refetching the feed. */
  const patchDiscount = useCallback((id: string, patch: Partial<Discount>) => {
    setDiscounts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
    );
  }, []);

  /** Fetch one discount from server and merge into local state. */
  const refreshOne = useCallback(
    async (id: string) => {
      const res = await api.getDiscount(id);
      if (res.success && res.data) {
        patchDiscount(id, res.data);
      }
    },
    [patchDiscount]
  );

  const toggleLike = useCallback(
    async (id: string) => {
      let prevLiked = false;
      let prevLikes = 0;
      // Optimistic update
      setDiscounts((prev) =>
        prev.map((d) => {
          if (d.id !== id) return d;
          prevLiked = d.liked;
          prevLikes = d.likes;
          const nextLiked = !d.liked;
          return { ...d, liked: nextLiked, likes: d.likes + (nextLiked ? 1 : -1) };
        })
      );
      try {
        const res = await api.toggleLike(id);
        if (res.success && res.data) {
          patchDiscount(id, { liked: res.data.liked, likes: res.data.likes });
        }
      } catch {
        // Revert optimistic on network error
        patchDiscount(id, { liked: prevLiked, likes: prevLikes });
      }
    },
    [patchDiscount]
  );

  const toggleSave = useCallback(
    async (id: string) => {
      const res = await api.toggleSave(id);
      if (res.success && res.data) {
        patchDiscount(id, { saved: res.data.saved });
      }
    },
    [patchDiscount]
  );

  const toggleGoing = useCallback(
    async (id: string) => {
      const res = await api.toggleGoing(id);
      if (res.success && res.data) {
        patchDiscount(id, {
          isGoing: res.data.isGoing,
          going: res.data.going,
        });
      }
    },
    [patchDiscount]
  );

  const addPost = useCallback(
    async (d: Discount) => {
      // Prepend the new discount returned by server
      setDiscounts((prev) => [d, ...prev]);
    },
    []
  );

  const updatePost = useCallback(
    async (id: string, data: Record<string, unknown>): Promise<boolean> => {
      const res = await api.updateDiscount(id, data as Parameters<typeof api.updateDiscount>[1]);
      if (res.success && res.data) {
        patchDiscount(id, res.data);
      }
      return res.success;
    },
    [patchDiscount]
  );

  const incrementViews = useCallback(
    async (id: string) => {
      // Optimistic increment — works for guests
      setDiscounts((prev) =>
        prev.map((d) => (d.id === id ? { ...d, views: d.views + 1 } : d))
      );
      const res = await api.incrementView(id);
      if (res.success && res.data) {
        patchDiscount(id, { views: res.data.views });
      }
    },
    [patchDiscount]
  );

  const deletePost = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await api.deleteDiscount(id);
      if (res.success) {
        setDiscounts((prev) => prev.filter((d) => d.id !== id));
      }
      return res.success;
    },
    []
  );

  const savedList = useMemo<Discount[]>(
    () => discounts.filter((d) => d.saved),
    [discounts]
  );

  const myPosts = useMemo<Discount[]>(
    () => (user ? discounts.filter((d) => d.author.id === user.id) : []),
    [discounts, user]
  );

  return useMemo(
    () => ({
      discounts,
      filtered,
      filter,
      setFilter,
      refreshing,
      onRefresh,
      toggleLike,
      toggleSave,
      toggleGoing,
      addPost,
      updatePost,
      incrementViews,
      deletePost,
      savedList,
      myPosts,
      hydrated,
      gpsLat,
      gpsLng,
    }),
    [
      discounts,
      filtered,
      filter,
      refreshing,
      onRefresh,
      toggleLike,
      toggleSave,
      toggleGoing,
      addPost,
      updatePost,
      incrementViews,
      deletePost,
      savedList,
      myPosts,
      hydrated,
      gpsLat,
      gpsLng,
    ]
  );
});

export function useDiscount(id: string) {
  const { discounts } = useDiscounts();
  return useMemo(() => discounts.find((d) => d.id === id), [discounts, id]);
}
