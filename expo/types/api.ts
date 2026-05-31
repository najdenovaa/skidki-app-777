import type { Category } from "./discount";

export type UpdateDiscountDTO = CreateDiscountDTO;

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
  placeName?: string;
  address?: string;
  note?: string;
  expiresAt: number;
  cityId?: string;
}

export interface SignUpDTO {
  name: string;
  email: string;
  password: string;
  cityId?: string;
  regionId?: string;
  city?: string;
  acceptedTerms?: boolean;
}

export interface SignInDTO {
  email: string;
  password: string;
}

export interface UpdateProfileDTO {
  name?: string;
  email?: string;
  cityId?: string;
  city?: string;
  regionId?: string;
  avatar?: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
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
  unreadSupport?: number;
}

export interface AdminDiscount {
  id: string;
  title: string;
  authorName: string;
  authorId?: string;
  authorDisplayId?: number;
  postedAt: number;
  percent?: number;
  views?: number;
  likes?: number;
  city?: string;
  category?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: number;
  postCount: number;
  displayId: number;
  city?: string;
  cityId?: number;
  username?: string;
}

export interface SupportMessage {
  id: string;
  body: string;
  isAdmin: boolean;
  createdAt: number;
}

export interface AdminSupportThread {
  userId: string;
  displayId: number;
  userName: string;
  userEmail: string;
  lastMessage?: string;
  lastMessageAt: number;
  unreadCount: number;
}

export interface AdminUserDetail {
  user: AdminUser;
  posts: { id: string; title: string; percent: number; views: number; likes: number; createdAt: number }[];
}
