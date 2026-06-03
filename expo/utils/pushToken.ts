import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export function getExpoProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined
  );
}

async function fetchNativeDeviceToken(retries = 3): Promise<string | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { data } = await Notifications.getDevicePushTokenAsync();
      if (typeof data === "string" && data.length > 0) return data;
    } catch (err) {
      console.warn(`[push] getDevicePushTokenAsync attempt ${attempt + 1} failed:`, err);
    }
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  return null;
}

/** iOS/Android: native device token. Web: Expo push token. */
export async function fetchPushToken(): Promise<string | null> {
  if (Platform.OS === "ios" || Platform.OS === "android") {
    return fetchNativeDeviceToken();
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    console.warn("[push] Missing EAS projectId — push token unavailable");
    return null;
  }
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    return result.data;
  } catch (err) {
    console.warn("[push] getExpoPushTokenAsync failed:", err);
    return null;
  }
}
