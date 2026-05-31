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
