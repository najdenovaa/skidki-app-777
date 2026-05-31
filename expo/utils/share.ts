import { Share } from "react-native";
import * as Linking from "expo-linking";
import { CATEGORY_MAP } from "@/constants/categories";
import { formatFullDate, formatTimeUntil, isIndefinite, formatDistance } from "@/utils/time";
import type { Discount } from "@/types/discount";

function buildShareText(discount: Discount): string {
  const cat = CATEGORY_MAP[discount.category];
  const lines: string[] = [];

  // Title + percent
  lines.push(`🔥 ${discount.title} — скидка ${discount.percent}%`);

  // Place
  const location = discount.address || discount.placeName || discount.locationName;
  if (location) {
    lines.push(`📍 ${location}${discount.cityName ? `, ${discount.cityName}` : ""}`);
  }

  // Category
  if (cat) {
    lines.push(`🏷 ${cat.label}`);
  }

  // Prices
  if (discount.discountedPrice !== undefined) {
    if (discount.originalPrice !== undefined) {
      const saved = discount.originalPrice - discount.discountedPrice;
      lines.push(`💰 ${discount.discountedPrice.toLocaleString("ru-RU")} ₽ вместо ${discount.originalPrice.toLocaleString("ru-RU")} ₽ (экономия ${saved.toLocaleString("ru-RU")} ₽)`);
    } else {
      lines.push(`💰 ${discount.discountedPrice.toLocaleString("ru-RU")} ₽`);
    }
  }

  // Distance
  if (discount.distanceKm !== undefined && discount.distanceKm > 0) {
    lines.push(`📏 ${formatDistance(discount.distanceKm)} от вас`);
  }

  // Posted
  lines.push(`⏰ Опубликовано: ${formatFullDate(discount.postedAt)}`);

  // Expiry
  if (!isIndefinite(discount.expiresAt)) {
    const remaining = formatTimeUntil(discount.expiresAt);
    lines.push(`⏳ До конца: ${remaining}`);
  } else {
    lines.push("⏳ Пока в наличии");
  }

  // Note
  if (discount.note) {
    lines.push(`📝 ${discount.note}`);
  }

  // Stats
  const stats: string[] = [];
  if (discount.views > 0) stats.push(`👀 ${discount.views}`);
  if (discount.likes > 0) stats.push(`❤️ ${discount.likes}`);
  if (discount.comments > 0) stats.push(`💬 ${discount.comments}`);
  if (discount.going > 0) stats.push(`🚶 ${discount.going} идут`);
  if (stats.length > 0) lines.push(stats.join(" · "));

  // Links
  lines.push("");
  lines.push(`🔗 Открыть в приложении: ${Linking.createURL(`discount/${discount.id}`)}`);
  lines.push(`🌐 https://rork.com/discount/${discount.id}`);

  return lines.join("\n");
}

export function shareDiscount(discount: Discount): void {
  const message = buildShareText(discount);
  Share.share({ message, title: discount.title });
}
