import { http, setToken } from "./http";
import { prepareImageForUpload } from "@/utils/prepareImageForUpload";
import type {
  AdminDiscount,
  AdminStats,
  AdminUser,
  ApiResponse,
  CreateDiscountDTO,
  GeoCity,
  GeoRegion,
  NotificationSettings,
  NotificationSubscription,
  SignInDTO,
  SignUpDTO,
  UpdateProfileDTO,
} from "@/types/api";
import type { Category, Comment, Discount } from "@/types/discount";
import type { User } from "@/types/user";

// ── Helpers ───────────────────────────────────────────────────────────────

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

function fail(error: string): ApiResponse<never> {
  return { success: false, error };
}

/** Unwrap an error into an ApiResponse. */
function handleError(err: unknown): ApiResponse<never> {
  if (err instanceof Error) {
    return fail(err.message);
  }
  return fail("Нет подключения к серверу");
}

// ── API ───────────────────────────────────────────────────────────────────

export const api = {
  // ═══ Auth ═══════════════════════════════════════════════════════════════

  async signUp(data: SignUpDTO): Promise<ApiResponse<User>> {
    try {
      const res = await http.post<{ token: string; user: User }>(
        "/auth/register",
        data
      );
      await setToken(res.token);
      return ok(res.user);
    } catch (err) {
      return handleError(err);
    }
  },

  async signIn(data: SignInDTO): Promise<ApiResponse<User>> {
    try {
      const res = await http.post<{ token: string; user: User }>(
        "/auth/login",
        data
      );
      await setToken(res.token);
      return ok(res.user);
    } catch (err) {
      return handleError(err);
    }
  },

  async signOut(): Promise<ApiResponse<null>> {
    try {
      await setToken(null);
      return ok(null);
    } catch (err) {
      return handleError(err);
    }
  },

  async deleteAccount(): Promise<ApiResponse<null>> {
    try {
      await http.del("/auth/account");
      await setToken(null);
      return ok(null);
    } catch (err) {
      return handleError(err);
    }
  },

  async getProfile(): Promise<ApiResponse<User | null>> {
    try {
      const user = await http.get<User>("/auth/me");
      return ok(user);
    } catch (err) {
      // 401 means guest – not an error state for profile
      if (err instanceof Error && err.message === "Unauthorized") {
        return ok(null);
      }
      return handleError(err);
    }
  },

  async updateProfile(data: UpdateProfileDTO): Promise<ApiResponse<User>> {
    try {
      const user = await http.patch<User>("/auth/profile", data);
      return ok(user);
    } catch (err) {
      return handleError(err);
    }
  },

  // ═══ Discounts ══════════════════════════════════════════════════════════

  async getDiscounts(params?: {
    category?: string;
    page?: number;
    limit?: number;
    search?: string;
    city?: string;
    lat?: number;
    lng?: number;
  }): Promise<ApiResponse<Discount[]>> {
    try {
      const qs = new URLSearchParams();
      if (params?.category && params.category !== "all") qs.set("category", params.category);
      if (params?.page) qs.set("page", String(params.page));
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.search) qs.set("search", params.search);
      if (params?.city) qs.set("city", params.city);
      if (params?.lat !== undefined) qs.set("lat", String(params.lat));
      if (params?.lng !== undefined) qs.set("lng", String(params.lng));

      const path = `/discounts${qs.toString() ? "?" + qs.toString() : ""}`;
      const data = await http.get<Discount[]>(path);
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async getDiscount(id: string): Promise<ApiResponse<Discount>> {
    try {
      const data = await http.get<Discount>(`/discounts/${String(id)}`);
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async createDiscount(
    data: CreateDiscountDTO
  ): Promise<ApiResponse<Discount>> {
    try {
      const discount = await http.post<Discount>("/discounts", data);
      return ok(discount);
    } catch (err) {
      return handleError(err);
    }
  },

  async deleteDiscount(id: string): Promise<ApiResponse<null>> {
    try {
      await http.del(`/discounts/${String(id)}`);
      return ok(null);
    } catch (err) {
      return handleError(err);
    }
  },

  // ═══ Actions ════════════════════════════════════════════════════════════

  async toggleLike(id: string): Promise<ApiResponse<{ liked: boolean; likes: number }>> {
    try {
      const data = await http.post<{ liked: boolean }>(`/discounts/${String(id)}/like`);
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async toggleSave(id: string): Promise<ApiResponse<{ saved: boolean }>> {
    try {
      const data = await http.post<{ saved: boolean }>(`/discounts/${String(id)}/save`);
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async toggleGoing(
    id: string
  ): Promise<ApiResponse<{ isGoing: boolean; going: number }>> {
    try {
      const data = await http.post<{ isGoing: boolean; going: number }>(
        `/discounts/${String(id)}/going`
      );
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async incrementView(
    id: string
  ): Promise<ApiResponse<{ views: number }>> {
    try {
      const data = await http.post<{ views: number }>(`/discounts/${String(id)}/view`);
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  // ═══ Comments ═══════════════════════════════════════════════════════════

  async getComments(discountId: string): Promise<ApiResponse<Comment[]>> {
    try {
      const data = await http.get<Comment[]>(`/discounts/${String(discountId)}/comments`);
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async addComment(
    discountId: string,
    text: string
  ): Promise<ApiResponse<Comment>> {
    try {
      const data = await http.post<Comment>(`/discounts/${String(discountId)}/comments`, {
        text,
      });
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  // ═══ Geo ═════════════════════════════════════════════════════════════

  async reverseGeocode(
    lat: number,
    lng: number
  ): Promise<ApiResponse<{ address: string; city?: string }>> {
    try {
      const data = await http.get<{ address: string; city?: string }>(
        `/geo/reverse?lat=${lat}&lng=${lng}`
      );
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async getRegions(): Promise<ApiResponse<GeoRegion[]>> {
    try {
      const data = await http.get<GeoRegion[]>("/geo/regions");
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async getCities(regionId: string): Promise<ApiResponse<GeoCity[]>> {
    try {
      const data = await http.get<GeoCity[]>(`/geo/regions/${String(regionId)}/cities`);
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  // ═══ Notifications ══════════════════════════════════════════════════════

  async registerPushToken(token: string, platform: string): Promise<ApiResponse<null>> {
    try {
      await http.post("/notifications/token", { token, platform });
      return ok(null);
    } catch (err) {
      return handleError(err);
    }
  },

  async getNotificationSettings(): Promise<ApiResponse<NotificationSettings>> {
    try {
      const data = await http.get<NotificationSettings>("/notifications/settings");
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async updateNotificationSettings(
    settings: Partial<NotificationSettings>
  ): Promise<ApiResponse<NotificationSettings>> {
    try {
      const data = await http.patch<NotificationSettings>("/notifications/settings", settings);
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async getSubscriptions(): Promise<ApiResponse<NotificationSubscription[]>> {
    try {
      const data = await http.get<NotificationSubscription[]>("/notifications/subscriptions");
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async subscribeCategory(categoryId: string, cityId: string): Promise<ApiResponse<NotificationSubscription>> {
    try {
      const data = await http.post<NotificationSubscription>("/notifications/subscriptions", { categoryId, cityId });
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async unsubscribeCategory(subscriptionId: string): Promise<ApiResponse<null>> {
    try {
      await http.del(`/notifications/subscriptions/${String(subscriptionId)}`);
      return ok(null);
    } catch (err) {
      return handleError(err);
    }
  },

  // ═══ Media ══════════════════════════════════════════════════════════════

  async uploadAvatar(uri: string): Promise<ApiResponse<{ url: string }>> {
    try {
      const formData = new FormData();
      formData.append("avatar", {
        uri,
        type: "image/jpeg",
        name: "avatar.jpg",
      } as unknown as Blob);

      const data = await http.upload<{ url: string }>("/media/avatar", formData);
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async uploadImage(uri: string): Promise<ApiResponse<{ url: string }>> {
    try {
      const preparedUri = await prepareImageForUpload(uri);
      const formData = new FormData();
      formData.append("images", {
        uri: preparedUri,
        type: "image/jpeg",
        name: "photo.jpg",
      } as unknown as Blob);

      const data = await http.upload<{ url?: string; urls?: string[] }>("/media/upload", formData);
      const uploaded = data.url ?? data.urls?.[0];
      if (!uploaded) return fail("Сервер не вернул URL изображения");
      return ok({ url: uploaded });
    } catch (err) {
      return handleError(err);
    }
  },

  /** Upload multiple images one by one (not all in one FormData to avoid memory issues). */
  async uploadImages(uris: string[]): Promise<ApiResponse<{ urls: string[] }>> {
    try {
      const urls: string[] = [];
      for (const uri of uris) {
        const res = await api.uploadImage(uri);
        if (res.success && res.data) {
          urls.push(res.data.url);
        } else {
          return fail(res.error ?? "Не удалось загрузить изображение");
        }
      }
      return ok({ urls });
    } catch (err) {
      return handleError(err);
    }
  },

  // ═══ Admin ═══════════════════════════════════════════════════════════

  async getAdminStats(): Promise<ApiResponse<AdminStats>> {
    try {
      const data = await http.get<AdminStats>("/admin/stats");
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async getAdminDiscounts(): Promise<ApiResponse<AdminDiscount[]>> {
    try {
      const data = await http.get<AdminDiscount[]>("/admin/discounts");
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async deleteAdminDiscount(id: string): Promise<ApiResponse<null>> {
    try {
      await http.del(`/admin/discounts/${String(id)}`);
      return ok(null);
    } catch (err) {
      return handleError(err);
    }
  },

  async getAdminUsers(): Promise<ApiResponse<AdminUser[]>> {
    try {
      const data = await http.get<AdminUser[]>("/admin/users");
      return ok(data);
    } catch (err) {
      return handleError(err);
    }
  },
};
