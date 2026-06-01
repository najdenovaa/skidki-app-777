export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  city: string;
  cityId?: number | string;
  regionId?: number | string;
  avatar: string;
  createdAt: number;
  role: 'user' | 'admin';
  displayId?: number;
}

export interface AuthState {
  user: User | null;
  isGuest: boolean;
}

export function validateEmail(email: string): boolean {
  // RFC 5322 basic check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password: string): boolean {
  return password.length >= 6;
}

/** Check if input looks like a phone number (starts with + or contains 7+ digits). */
export function isPhoneInput(value: string): boolean {
  const cleaned = value.trim().replace(/[\s\-\(\)]/g, "");
  return /^\+?\d{7,}$/.test(cleaned);
}

/** Validate Russian phone: +7 followed by 10 digits. */
export function validatePhone(phone: string): boolean {
  const cleaned = phone.trim().replace(/[\s\-\(\)]/g, "");
  return /^\+7\d{10}$/.test(cleaned);
}

/** Normalise phone to +7XXXXXXXXXX format. */
export function normalisePhone(phone: string): string {
  const cleaned = phone.trim().replace(/[\s\-\(\)]/g, "");
  if (/^\d{10}$/.test(cleaned)) return `+7${cleaned}`;
  if (/^7\d{10}$/.test(cleaned)) return `+${cleaned}`;
  if (/^8\d{10}$/.test(cleaned)) return `+7${cleaned.slice(1)}`;
  return cleaned;
}
