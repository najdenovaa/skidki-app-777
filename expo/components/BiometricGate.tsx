import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform, StyleSheet, View } from "react-native";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";

const BIOMETRIC_KEY = "skidki.biometric.enabled";

export function getBiometricEnabled(): Promise<boolean> {
  return AsyncStorage.getItem(BIOMETRIC_KEY).then((v) => v === "true");
}

export function setBiometricEnabled(enabled: boolean): Promise<void> {
  return AsyncStorage.setItem(BIOMETRIC_KEY, enabled ? "true" : "false");
}

// ── Context for biometric setting ────────────────────────────────────────

interface BiometricSettingCtx {
  enabled: boolean;
  available: boolean;
  setEnabled: (v: boolean) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const BiometricSettingContext = createContext<BiometricSettingCtx>({
  enabled: false,
  available: false,
  setEnabled: async () => false,
  refresh: async () => {},
});

export function useBiometricSetting(): BiometricSettingCtx {
  return useContext(BiometricSettingContext);
}

// ── BiometricGate component ──────────────────────────────────────────────

interface BiometricGateProps {
  children: React.ReactNode;
}

export function BiometricGate({ children }: BiometricGateProps) {
  const { user } = useAuth();
  const [enabled, setEnabledState] = useState<boolean>(false);
  const [available, setAvailable] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [locked, setLocked] = useState<boolean>(false);
  const wasBackgrounded = useRef<boolean>(false);
  const authInProgress = useRef<boolean>(false);
  const attemptingRef = useRef<boolean>(false);

  // ── Check biometric availability on mount ────────────────────────────
  useEffect(() => {
    if (Platform.OS === "web") {
      setHydrated(true);
      return;
    }
    Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      getBiometricEnabled(),
    ]).then(([hasHardware, isEnrolled, stored]) => {
      setAvailable(hasHardware && isEnrolled);
      setEnabledState(stored);
      setHydrated(true);
    });
  }, []);

  // ── Authenticate using system dialog only ────────────────────────────
  const authenticate = useCallback(async () => {
    if (authInProgress.current || attemptingRef.current) return;
    authInProgress.current = true;
    attemptingRef.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Подтвердите вход",
        fallbackLabel: "Ввести пароль",
      });
      if (result.success) {
        setLocked(false);
      }
    } catch {
      // user cancelled or error — stay locked
    } finally {
      authInProgress.current = false;
      attemptingRef.current = false;
    }
  }, []);

  // ── Listen for AppState changes (background→active only) ─────────────
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        wasBackgrounded.current = true;
      }
      // Only lock when returning from actual background,
      // NOT from inactive→active (e.g. Face ID dialog dismissal).
      if (wasBackgrounded.current && nextState === "active") {
        wasBackgrounded.current = false;
        if (enabled && user && !authInProgress.current) {
          setLocked(true);
        }
      }
    });
    return () => sub.remove();
  }, [enabled, user]);

  // ── Cold-start lock ──────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    if (Platform.OS === "web") return;
    if (enabled && user) {
      setLocked(true);
    }
  }, [hydrated, enabled, user]);

  // ── Auto-authenticate when locked ────────────────────────────────────
  useEffect(() => {
    if (locked && !authInProgress.current) {
      authenticate();
    }
  }, [locked, authenticate]);

  // ── Refresh stored value ─────────────────────────────────────────────
  const refresh = useCallback(async () => {
    const stored = await getBiometricEnabled();
    setEnabledState(stored);
  }, []);

  // ── Setter: on web returns false, on enable requires auth ────────────
  const setEnabled = useCallback(
    async (v: boolean): Promise<boolean> => {
      if (Platform.OS === "web") return false;

      if (v) {
        // Require successful biometric auth to enable
        try {
          const res = await LocalAuthentication.authenticateAsync({
            promptMessage: "Подтвердите для включения",
          });
          if (!res.success) return false;
        } catch {
          return false;
        }
      }

      setEnabledState(v);
      await setBiometricEnabled(v);
      return true;
    },
    []
  );

  const ctxValue = useMemo<BiometricSettingCtx>(
    () => ({ enabled, available, setEnabled, refresh }),
    [enabled, available, setEnabled, refresh]
  );

  // Web — skip biometric entirely
  if (Platform.OS === "web") {
    return (
      <BiometricSettingContext.Provider value={ctxValue}>
        {children}
      </BiometricSettingContext.Provider>
    );
  }

  return (
    <BiometricSettingContext.Provider value={ctxValue}>
      {/* Empty dark overlay while locked — no text, no button, system dialog only */}
      {locked && <View style={styles.lockOverlay} />}
      {children}
    </BiometricSettingContext.Provider>
  );
}

const styles = StyleSheet.create({
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    zIndex: 10000,
  },
});
