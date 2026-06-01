export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const discountMatch = normalized.match(/^\/discount\/([0-9a-f-]{36})$/i);
    if (discountMatch) return `/discount/${discountMatch[1]}`;
    const known =
      normalized === "/" ||
      normalized.startsWith("/(tabs)") ||
      normalized.startsWith("/auth/") ||
      normalized.startsWith("/admin") ||
      normalized.startsWith("/discount/") ||
      normalized.startsWith("/user/") ||
      normalized === "/post" ||
      normalized === "/edit-post" ||
      normalized === "/notifications" ||
      normalized === "/privacy" ||
      normalized === "/terms" ||
      normalized === "/support" ||
      normalized === "/edit-profile" ||
      normalized === "/delete-account";
    if (known) return normalized || "/(tabs)";
  } catch {}
  return "/(tabs)";
}
