const months = [
  "янв", "фев", "мар", "апр", "мая", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

export function formatTimeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return "только что";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч`;
  const d = Math.floor(h / 24);
  if (d <= 6) return `${d} дн`;
  const date = new Date(ms);
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

export function formatFullDate(ms: number): string {
  const date = new Date(ms);
  const day = date.getDate();
  const month = months[date.getMonth()];
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month}, ${hours}:${minutes}`;
}

export function formatViews(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1)}K`;
  return `${Math.round(n / 1000)}K`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Таймер, тикающий вверх от момента публикации. */
export function formatTimeSince(postedAt: number): string {
  const diff = Date.now() - postedAt;
  if (diff <= 0) return "только что";
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}д ${h % 24}ч`;
  }
  if (h >= 1) return `${h}ч ${pad(m)}м`;
  if (m >= 1) return `${m}м ${pad(s)}с`;
  return `${s}с`;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} м`;
  return `${km.toFixed(1)} км`;
}

export function formatPrice(p: number): string {
  return `${p.toLocaleString("ru-RU")} ₽`;
}
