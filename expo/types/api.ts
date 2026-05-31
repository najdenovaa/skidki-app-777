import type { Category } from "./discount";

export interface CreateDiscountDTO {
  title: string;
  category: Category;
  percent: number;
  originalPrice?: number;
  discountedPrice?: number;
  images?: string[];
  locationName: string;
  lat: number;
  lng: number;
  expiresAt: number;
}

export interface SignUpDTO {
  name: string;
  email: string;
  password: string;
  cityId?: string;
  regionId?: string;
}

export interface SignInDTO {
  email: string;
  password: string;
}

export interface UpdateProfileDTO {
  name?: string;
  cityId?: string;
  avatar?: string;
}

export interface GeoRegion {
  id: number | string;
  name: string;
}

export interface GeoCity {
  id: number | string;
  name: string;
}

export interface SelectedCity {
  regionId: string;
  cityId: string;
  cityName: string;
  regionName: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface NotificationSettings {
  pushEnabled: boolean;
  newDiscounts: boolean;
  likesComments: boolean;
}

export interface NotificationSubscription {
  id: string;
  categoryId: string;
  cityId: string;
}

export interface AdminStats {
  totalDiscounts: number;
  activeDiscounts: number;
  totalUsers: number;
  viewsToday: number;
}

export interface AdminDiscount {
  id: string;
  title: string;
  authorName: string;
  postedAt: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: number;
  postCount: number;
}
