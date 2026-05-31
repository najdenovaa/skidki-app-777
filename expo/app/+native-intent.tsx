export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const match = normalized.match(/^\/discount\/([0-9a-f-]{36})$/i);
    if (match) {
      return `/discount/${match[1]}`;
    }
    if (normalized && normalized !== "/") {
      return normalized;
    }
  } catch {
    // ignore
  }
  return "/";
}
