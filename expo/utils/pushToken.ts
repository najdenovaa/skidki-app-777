import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

export function getExpoProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as Record<string, unknown>).easConfig?.projectId ??
    undefined
  );
}

export async function fetchExpoPushToken(): Promise<string | null> {
  const projectId = getExpoProjectId();
  if (!projectId) return null;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    return result.data;
  } catch {
    return null;
  }
}
