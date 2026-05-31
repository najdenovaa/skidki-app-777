import { ENV } from "@/config/env";

const BASE_URL = ENV.API_URL.replace(/\/api\/?$/, "");

/**
 * Resolve a possibly-relative image URL to an absolute URL.
 * If the URL already starts with "http", returns it unchanged.
 * Otherwise, prepends the API base origin.
 */
export function resolveImageUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Resolve all URLs in an array of image paths.
 */
export function resolveImageUrls(urls: string[] | undefined): string[] {
  if (!urls || urls.length === 0) return [];
  return urls.map(resolveImageUrl);
}
