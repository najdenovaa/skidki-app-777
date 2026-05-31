export type Category =
  | "food"
  | "beauty"
  | "auto"
  | "services"
  | "sport"
  | "animals"
  | "construction"
  | "realestate"
  | "health"
  | "production"
  | "other";

export interface CategoryInfo {
  id: Category;
  label: string;
}

export interface Author {
  id: string;
  name: string;
  avatar: string;
  verified: boolean;
}

export interface Discount {
  id: string;
  author: Author;
  category: Category;
  title: string;
  images: string[];
  locationName: string;
  distanceKm: number;
  percent: number;
  originalPrice?: number;
  discountedPrice?: number;
  postedAt: number;
  expiresAt: number;
  views: number;
  going: number;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
  isGoing: boolean;
  lat: number;
  lng: number;
  cityName?: string;
  cityId?: number | string;
  placeName?: string;
  address?: string;
  note?: string;
}

export interface Comment {
  id: string;
  author: Author;
  text: string;
  postedAt: number;
  createdAt?: number;
}
