import createContextHook from "@nkzw/create-context-hook";
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

  const cityId = user?.cityId ? String(user.cityId) : guestCity?.cityId;

  const loadFeed = useCallback(async () => {
    const res = await api.getDiscounts({
      category: filter === "all" ? undefined : filter,
      city: cityId,
    });
    if (res.success && res.data) setDiscounts(res.data);
  }, [filter, cityId]);

  useEffect(() => {
    loadFeed().finally(() => setHydrated(true));
  }, [loadFeed]);

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
      const res = await api.toggleLike(id);
      if (res.success && res.data) {
        patchDiscount(id, { liked: res.data.liked });
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

  const incrementViews = useCallback(
    async (id: string) => {
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
    () => discounts.filter((d) => d.id.startsWith("user-")),
    [discounts]
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
      incrementViews,
      deletePost,
      savedList,
      myPosts,
      hydrated,
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
      incrementViews,
      deletePost,
      savedList,
      myPosts,
      hydrated,
    ]
  );
});

export function useDiscount(id: string) {
  const { discounts } = useDiscounts();
  return useMemo(() => discounts.find((d) => d.id === id), [discounts, id]);
}
