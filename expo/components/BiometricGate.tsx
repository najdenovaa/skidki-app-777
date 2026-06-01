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
import { AppState, Platform, StyleSheet, Text, View } from "react-native";

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
  setEnabled: (v: boolean) => void;
}

const BiometricSettingContext = createContext<BiometricSettingCtx>({
  enabled: false,
  available: false,
  setEnabled: () => {},
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

  // ── Listen for AppState changes ──────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        wasBackgrounded.current = true;
      }
      // Only lock when returning from actual background, not from
      // inactive→active transitions (e.g. Face ID dialog dismissal).
      if (wasBackgrounded.current && nextState === "active") {
        wasBackgrounded.current = false;
        if (enabled && user) {
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

  // ── Authenticate ─────────────────────────────────────────────────────
  const authenticate = useCallback(async () => {
    if (authInProgress.current) return;
    authInProgress.current = true;
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
    }
  }, []);

  // ── Setter with AsyncStorage persistence ─────────────────────────────
  const setEnabled = useCallback(
    async (v: boolean) => {
      setEnabledState(v);
      await setBiometricEnabled(v);
    },
    []
  );

  const ctxValue = useMemo(
    () => ({ enabled, available, setEnabled }),
    [enabled, available, setEnabled]
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
      {children}

      {/* Lock overlay */}
      {locked && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.title}>Вход по биометрии</Text>
            <Text style={styles.hint}>
              Подтвердите вход с помощью Face ID / Touch ID
            </Text>
            <View style={styles.buttonOuter}>
              <View style={styles.button} onTouchEnd={authenticate}>
                <Text style={styles.buttonText}>
                  Face ID / Touch ID
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </BiometricSettingContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingVertical: 36,
    alignItems: "center",
    marginHorizontal: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    shadowColor: "rgba(0,0,0,0.5)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: "center",
  },
  hint: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
    letterSpacing: -0.1,
  },
  buttonOuter: {
    borderRadius: 14,
    overflow: "hidden",
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 200,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
