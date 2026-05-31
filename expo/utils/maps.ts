import { Linking } from "react-native";

export function staticMapUrl(lat: number, lng: number, width = 600, height = 240): string {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=${width}x${height}&markers=${lat},${lng},red-pushpin`;
}

export function isValidCoords(lat?: number, lng?: number): boolean {
  return lat != null && lng != null && !(lat === 0 && lng === 0);
}

export async function openIn2Gis(lat: number, lng: number, label?: string) {
  const geo = `${lng},${lat}`;
  const appUrl = `dgis://2gis.ru/geo/${geo}`;
  const webUrl = label
    ? `https://2gis.ru/search/${encodeURIComponent(label)}/geo/${geo}`
    : `https://2gis.ru/geo/${geo}`;
  try {
    const canApp = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canApp ? appUrl : webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}
