import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const KEY = "skidki.device.fingerprint";
let cached: string | null = null;

export async function getDeviceFingerprint(): Promise<string> {
  if (cached) return cached;
  try {
    let fp = await AsyncStorage.getItem(KEY);
    if (!fp) {
      fp = `${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem(KEY, fp);
    }
    cached = fp;
    return fp;
  } catch {
    return `${Platform.OS}-anon`;
  }
}
