import { Share } from "react-native";

export function shareDiscount(opts: {
  title: string;
  address?: string;
  placeName?: string;
  originalPrice?: number;
  discountedPrice?: number;
  note?: string;
}) {
  const { title, address, placeName, originalPrice, discountedPrice, note } = opts;

  const lines: string[] = [title];

  if (placeName) lines.push(placeName);
  if (address) lines.push(address);

  if (discountedPrice !== undefined) {
    if (originalPrice !== undefined) {
      lines.push(`${discountedPrice.toLocaleString("ru-RU")} ₽ вместо ${originalPrice.toLocaleString("ru-RU")} ₽`);
    } else {
      lines.push(`${discountedPrice.toLocaleString("ru-RU")} ₽`);
    }
  }

  if (note) lines.push(note);

  const message = lines.join("\n");

  Share.share({ message, title });
}
