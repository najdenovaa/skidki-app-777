import { Linking } from "react-native";

export function isValidCoords(lat?: number, lng?: number): boolean {
  return lat != null && lng != null && !(lat === 0 && lng === 0);
}

export async function openIn2Gis(opts: {
  lat?: number;
  lng?: number;
  label?: string;
  address?: string;
}) {
  const { lat, lng, label, address } = opts;

  // With valid coords — open by coordinates
  if (isValidCoords(lat, lng)) {
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
    return;
  }

  // Without coords — search by address
  const query = address || label || "";
  const webUrl = `https://2gis.ru/search/${encodeURIComponent(query)}`;
  try {
    await Linking.openURL(webUrl);
  } catch {
    // fail silently
  }
}
