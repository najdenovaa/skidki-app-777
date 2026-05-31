import { Activity, Building2, Car, Dumbbell, Ellipsis, Factory, Hammer, Heart, Paintbrush, PawPrint, Plane, ShoppingBasket, Sparkles, UtensilsCrossed, Wrench } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

import type { Category, CategoryInfo } from "@/types/discount";

export interface CategoryDef extends CategoryInfo {
  color: string;
  icon: LucideIcon;
}

export const CATEGORIES: CategoryDef[] = [
  { id: "groceries", label: "Продукты", color: "#22C55E", icon: ShoppingBasket },
  { id: "beauty", label: "Красота", color: "#F472B6", icon: Sparkles },
  { id: "catering", label: "Общепит", color: "#F59E0B", icon: UtensilsCrossed },
  { id: "services", label: "Услуги", color: "#A78BFA", icon: Heart },
  { id: "sport", label: "Спорт", color: "#EF4444", icon: Dumbbell },
  { id: "animals", label: "Животные", color: "#EAB308", icon: PawPrint },
  { id: "construction", label: "Строительство", color: "#F97316", icon: Hammer },
  { id: "realestate", label: "Недвижимость", color: "#3B82F6", icon: Building2 },
  { id: "health", label: "Здоровье", color: "#EC4899", icon: Activity },
  { id: "production", label: "Производство", color: "#6366F1", icon: Factory },
  { id: "travel", label: "Путешествия", color: "#06B6D4", icon: Plane },
  { id: "household", label: "Хозяйство", color: "#8B5CF6", icon: Wrench },
  { id: "renovation", label: "Ремонт помещений", color: "#14B8A6", icon: Paintbrush },
  { id: "automoto", label: "Авто-мото", color: "#64748B", icon: Car },
  { id: "other", label: "Разное", color: "#6B7280", icon: Ellipsis },
];

export const CATEGORY_MAP: Record<Category, CategoryDef> = CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.id]: c }),
  {} as Record<Category, CategoryDef>
);
