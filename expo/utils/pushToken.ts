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

/** iOS: native APNs token (hex). Android/web: Expo push token. */
export async function fetchPushToken(): Promise<string | null> {
  if (Platform.OS === "ios") {
    try {
      const { data } = await Notifications.getDevicePushTokenAsync();
      if (typeof data === "string" && data.length > 0) return data;
    } catch (err) {
      console.warn("[push] getDevicePushTokenAsync failed:", err);
    }
    return null;
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
