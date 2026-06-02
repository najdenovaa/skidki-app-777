import AsyncStorage from "@react-native-async-storage/async-storage";

import { ENV } from "@/config/env";
import { getDeviceFingerprint } from "@/utils/fingerprint";

const TOKEN_KEY = "skidki.token";
const TIMEOUT_MS = 10_000;
const UPLOAD_TIMEOUT_MS = 120_000;

/** Read the stored JWT token. */
export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Persist or clear the JWT token. */
export async function setToken(token: string | null): Promise<void> {
  try {
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // storage not available – ignore
  }
}

/** Error thrown when the server responds with 401. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  customHeaders?: Record<string, string>,
  timeoutMs?: number,
): Promise<T> {
  const token = await getToken();
  const fingerprint = await getDeviceFingerprint();

  const headers: Record<string, string> = {
    ...customHeaders,
    "X-Fingerprint": fingerprint,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(body instanceof FormData) && body != null) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs ?? TIMEOUT_MS);

  try {
    const res = await fetch(`${ENV.API_URL}${path}`, {
      method,
      headers,
      body: body instanceof FormData ? body : body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (res.status === 401) {
      await setToken(null);
      throw new UnauthorizedError();
    }

    // 204 No Content
    if (res.status === 204) {
      return undefined as unknown as T;
    }

    const text = await res.text();

    if (!res.ok) {
      let message = `Ошибка ${res.status}`;
      try {
        const errJson = JSON.parse(text);
        if (errJson.error) message = errJson.error;
        else if (errJson.message) message = errJson.message;
      } catch {
        // use default
      }
      throw new Error(message);
    }

    if (!text) return undefined as unknown as T;

    const parsed = JSON.parse(text);

    if (parsed && typeof parsed === 'object' && 'success' in parsed) {
      if (parsed.success === false) {
        throw new Error(parsed.error || 'Ошибка сервера');
      }
      return (parsed.data !== undefined ? parsed.data : parsed) as T;
    }

    return parsed as T;
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Нет подключения к серверу");
    }
    if (err instanceof TypeError && err.message.includes("Network")) {
      throw new Error("Нет подключения к серверу");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const http = {
  get<T>(path: string): Promise<T> {
    return request<T>("GET", path);
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("POST", path, body);
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("PATCH", path, body);
  },

  del<T>(path: string): Promise<T> {
    return request<T>("DELETE", path);
  },

  /** Upload multipart form data (no JSON content-type). Uses longer timeout for file uploads. */
  upload<T>(path: string, formData: FormData): Promise<T> {
    return request<T>("POST", path, formData, undefined, UPLOAD_TIMEOUT_MS);
  },
};
