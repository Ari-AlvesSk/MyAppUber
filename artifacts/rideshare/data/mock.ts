import type { Place, RideOption } from "@/types";

export const SAVED_PLACES: Place[] = [
  {
    id: "home",
    label: "Casa",
    address: "Setor Central – Paraúna, GO",
    icon: "home",
    lat: -16.0050,
    lng: -49.7920,
  },
  {
    id: "work",
    label: "Trabalho",
    address: "Setor Comercial – Paraúna, GO",
    icon: "briefcase",
    lat: -16.0010,
    lng: -49.7880,
  },
];

export const RECENT_PLACES: Place[] = [];

export const SUGGESTED_PLACES: Place[] = [
  {
    id: "s1",
    label: "Praça Joaquim Pereira",
    address: "Centro – Paraúna, GO",
    lat: -16.0028,
    lng: -49.7903,
  },
  {
    id: "s2",
    label: "Hospital Municipal",
    address: "Setor Hospitalar – Paraúna, GO",
    lat: -16.0060,
    lng: -49.7940,
  },
  {
    id: "s3",
    label: "Câmara Municipal",
    address: "Centro – Paraúna, GO",
    lat: -16.0020,
    lng: -49.7895,
  },
  {
    id: "s4",
    label: "Feira Livre",
    address: "Setor Central – Paraúna, GO",
    lat: -16.0035,
    lng: -49.7910,
  },
  {
    id: "s5",
    label: "Igreja Matriz",
    address: "Centro – Paraúna, GO",
    lat: -16.0025,
    lng: -49.7900,
  },
];

export const RIDE_OPTIONS: RideOption[] = [
  {
    tier: "moto",
    name: "Moto",
    description: "Chega mais rápido desviando do trânsito",
    capacity: 1,
    etaMinutes: 2,
    pricePerKmCents: 500,
    minPriceCents: 500,
  },
  {
    tier: "car",
    name: "Carro",
    description: "Conforto e espaço para até 4 pessoas",
    capacity: 4,
    etaMinutes: 4,
    pricePerKmCents: 1000,
    minPriceCents: 800,
  },
];

export function formatPrice(cents: number): string {
  const reais = (cents / 100).toFixed(2).replace(".", ",");
  return `R$ ${reais}`;
}

export function formatDistanceKm(km: number): string {
  if (km < 0.1) return "< 0,1 km";
  return `${km.toFixed(1).replace(".", ",")} km`;
}

/** Real Haversine distance between two GPS coordinates, in km. */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Add ~20% factor to approximate road distance vs straight line
  return R * c * 1.2;
}

/** Fallback: estimate distance when coords are missing (legacy places without lat/lng). */
export function estimateDistanceKm(placeId: string): number {
  const OVERRIDES: Record<string, number> = {
    current: 0,
    home: 1.2,
    work: 0.8,
    s1: 0.3,
    s2: 0.7,
    s3: 0.4,
    s4: 0.5,
    s5: 0.3,
  };
  const override = OVERRIDES[placeId];
  if (override !== undefined) return override;
  let hash = 0;
  for (let i = 0; i < placeId.length; i++) {
    hash = (hash * 31 + placeId.charCodeAt(i)) | 0;
  }
  return 0.5 + (Math.abs(hash) % 60) / 10;
}

export function computePriceCents(
  distanceKm: number,
  pricePerKmCents: number,
  minPriceCents: number,
): number {
  return Math.max(minPriceCents, Math.round(distanceKm * pricePerKmCents));
}
