export type FuelType = "92" | "95" | "dt" | "lpg";

export interface Station {
  id: string;
  name: string;
  brand: string;
  lat: number;
  lng: number;
  cityId: number | null;
  address: string;
  fuel92: boolean;
  fuel95: boolean;
  fuelDt: boolean;
  fuelLpg: boolean;
  limitLiters: number | null;
  status: "active" | "closed" | "no_fuel";
  queueCount: number;
  avgWaitMin: number;
  distanceKm?: number;
  updatedAt: number;
}

export interface QueueEntry {
  id: string;
  stationId: string;
  userId: string;
  fuelType: FuelType;
  position: number;
  status: "waiting" | "approaching" | "fueling" | "left" | "auto_left";
  joinedAt: number;
  zone: "green" | "yellow" | "red";
  estimatedMinutes: number;
  peopleBefore: number;
  stationName?: string;
  stationLat?: number;
  stationLng?: number;
}

export interface StationMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  body: string;
  msgType: "text" | "alert" | "system";
  createdAt: number;
}

export interface QueueStationInfo {
  count: number;
  queueCount: number;
  avgWaitMin: number;
  entries: Array<{
    id: string;
    position: number;
    fuelType: FuelType;
    status: string;
    joinedAt: number;
    userName: string;
  }>;
  appUsersCount: number;
  viralHint: string | null;
}
