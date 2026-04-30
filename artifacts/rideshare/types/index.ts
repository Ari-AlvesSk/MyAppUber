export type RideTier = "moto" | "car";

export type RideStatus =
  | "searching"
  | "matched"
  | "arriving"
  | "in_progress"
  | "completed"
  | "cancelled";

export type Place = {
  id: string;
  label: string;
  address: string;
  icon?: string;
};

export type RideOption = {
  tier: RideTier;
  name: string;
  description: string;
  capacity: number;
  etaMinutes: number;
  pricePerKmCents: number;
  minPriceCents: number;
};

export type Driver = {
  id: string;
  name: string;
  rating: number;
  trips: number;
  vehicleType: RideTier;
  car: string;
  plate: string;
  color: string;
  photoSeed: string;
};

export type Ride = {
  id: string;
  pickup: Place;
  dropoff: Place;
  tier: RideTier;
  tierName: string;
  priceCents: number;
  distanceKm: number;
  durationMinutes: number;
  status: RideStatus;
  driver: Driver | null;
  createdAt: number;
  completedAt: number | null;
};

export type PaymentMethod = {
  id: string;
  type: "card" | "cash" | "wallet";
  label: string;
  detail: string;
  isDefault: boolean;
};
