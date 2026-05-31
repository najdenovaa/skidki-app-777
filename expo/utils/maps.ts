import { Linking } from "react-native";

export function isValidCoords(lat?: number, lng?: number): boolean {
  return lat != null && lng != null && !(lat === 0 && lng === 0);
}

/** Build a search query string from address and optional city. */
export function buildAddressQuery(address: string, city?: string): string {
  if (!city) return address;
  return `${address}, ${city}`;
}

export async function openIn2Gis(opts: {
  lat?: number;
  lng?: number;
  address?: string;
  city?: string;
}) {
  const { lat, lng, address, city } = opts;
  const query = address ? buildAddressQuery(address, city) : "";

  // With valid coords — open by coordinates
  if (isValidCoords(lat, lng)) {
    const geo = `${lng},${lat}`;
    const appUrl = `dgis://2gis.ru/geo/${geo}`;
    const webUrl = query
      ? `https://2gis.ru/search/${encodeURIComponent(query)}/geo/${geo}`
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
  if (query) {
    const webUrl = `https://2gis.ru/search/${encodeURIComponent(query)}`;
    try {
      await Linking.openURL(webUrl);
    } catch {
      // fail silently
    }
  }
}
