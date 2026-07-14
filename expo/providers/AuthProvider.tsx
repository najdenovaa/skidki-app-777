import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@/services/api";
import { getToken } from "@/services/http";
import type { SelectedCity } from "@/types/api";
import type { User } from "@/types/user";
import { isPhoneInput, normalisePhone, validateEmail, validatePassword, validatePhone } from "@/types/user";

const GUEST_CITY_KEY = "skidki.guest.city";

type SignUpInput = {
  name: string;
  email: string;
  password: string;
  cityId?: string;
  regionId?: string;
  city?: string;
  acceptedTerms?: boolean;
};

type SignInError = "wrongEmail" | "wrongPassword" | "notFound" | null;
type SignUpError = "emailTaken" | "weakPassword" | null;

export type { User, SignUpInput, SignInError, SignUpError };

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [guestCity, setGuestCity] = useState<SelectedCity | null>(null);

  // Hydrate: check token for auth, load guest city from storage
  useEffect(() => {
    getToken().then((token) => {
      if (token) {
        api.getProfile().then((res) => {
          if (res.success && res.data) setUser(res.data);
          setHydrated(true);
        });
      } else {
        // Load saved guest city
        AsyncStorage.getItem(GUEST_CITY_KEY).then((raw) => {
          if (raw) {
            try {
              setGuestCity(JSON.parse(raw) as SelectedCity);
            } catch {
              // corrupt — ignore
            }
          }
          setHydrated(true);
        });
      }
    });
  }, []);

  const saveGuestCity = useCallback(async (city: SelectedCity | null) => {
    setGuestCity(city);
    if (city) {
      await AsyncStorage.setItem(GUEST_CITY_KEY, JSON.stringify(city));
    } else {
      await AsyncStorage.removeItem(GUEST_CITY_KEY);
    }
  }, []);

  const signUp = useCallback(
    async (input: SignUpInput): Promise<SignUpError> => {
      const rawLogin = input.email.trim();
      if (!validatePassword(input.password)) return "weakPassword";

      let dto: Parameters<typeof api.signUp>[0];

      if (isPhoneInput(rawLogin)) {
        const phone = normalisePhone(rawLogin);
        if (!validatePhone(phone)) return "weakPassword";
        dto = {
          name: input.name,
          phone,
          password: input.password,
          cityId: input.cityId,
          regionId: input.regionId,
          city: input.city,
          acceptedTerms: input.acceptedTerms,
        };
      } else {
        if (!validateEmail(rawLogin)) return "weakPassword";
        dto = {
          name: input.name,
          email: rawLogin.toLowerCase(),
          password: input.password,
          cityId: input.cityId,
          regionId: input.regionId,
          city: input.city,
          acceptedTerms: input.acceptedTerms,
        };
      }

      const res = await api.signUp(dto);

      if (!res.success) {
        if (res.error?.includes("уже зарегистрирован") || res.error?.includes("уже занят")) return "emailTaken";
        return "weakPassword";
      }

      setUser(res.data!);
      return null;
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInError> => {
      if (!validatePassword(password)) return "wrongPassword";

      const res = await api.signIn({
        email: email.trim(),
        password,
      });

      if (!res.success) {
        if (res.error?.includes("Неверный пароль")) return "wrongPassword";
        if (res.error?.includes("не найден")) return "notFound";
        return "wrongPassword";
      }

      setUser(res.data!);
      return null;
    },
    []
  );

  const signOut = useCallback(() => {
    api.signOut().catch(() => {});
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!user) return;
    await api.deleteAccount();
    setUser(null);
    // Clear all stored data
    await AsyncStorage.multiRemove([
      "skidki.token",
      "skidki.guest.city",
    ]);
  }, [user]);

  const updateProfile = useCallback(
    async (patch: { name?: string; email?: string; phone?: string; cityId?: string; city?: string; regionId?: string; avatar?: string }) => {
      if (!user) return;
      const res = await api.updateProfile(patch);
      if (res.success && res.data) setUser(res.data);
    },
    [user]
  );

  const isGuest = user === null;

  return useMemo(
    () => ({
      user,
      isGuest,
      hydrated,
      guestCity,
      saveGuestCity,
      signUp,
      signIn,
      signOut,
      deleteAccount,
      updateProfile,
    }),
    [user, isGuest, hydrated, guestCity, saveGuestCity, signUp, signIn, signOut, deleteAccount, updateProfile]
  );
});
