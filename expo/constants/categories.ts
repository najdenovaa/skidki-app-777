import { Car, Heart, Pill, ShoppingBasket, Sparkles, UtensilsCrossed } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

import type { Category, CategoryInfo } from "@/types/discount";

export interface CategoryDef extends CategoryInfo {
  color: string;
  icon: LucideIcon;
}

export const CATEGORIES: CategoryDef[] = [
  { id: "food", label: "Еда", color: "#F59E0B", icon: UtensilsCrossed },
  { id: "beauty", label: "Красота", color: "#F472B6", icon: Sparkles },
  { id: "market", label: "Рынок", color: "#22C55E", icon: ShoppingBasket },
  { id: "pharmacy", label: "Аптека", color: "#38BDF8", icon: Pill },
  { id: "auto", label: "Авто", color: "#94A3B8", icon: Car },
  { id: "services", label: "Услуги", color: "#A78BFA", icon: Heart },
];

export const CATEGORY_MAP: Record<Category, CategoryDef> = CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.id]: c }),
  {} as Record<Category, CategoryDef>
);
