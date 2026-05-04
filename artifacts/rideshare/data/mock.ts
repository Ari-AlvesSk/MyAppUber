import type { Place, RideOption } from "@/types";

export const SAVED_PLACES: Place[] = [
  {
    id: "home",
    label: "Casa",
    address: "Rua Augusta, 300 – Consolação, São Paulo",
    icon: "home",
  },
  {
    id: "work",
    label: "Trabalho",
    address: "Av. Paulista, 1374 – Bela Vista, São Paulo",
    icon: "briefcase",
  },
];

export const RECENT_PLACES: Place[] = [];

export const SUGGESTED_PLACES: Place[] = [
  {
    id: "s1",
    label: "Arena Corinthians",
    address: "Av. Miguel Inácio Curi, 111 – Artur Alvim, SP",
  },
  {
    id: "s2",
    label: "Mercadão de São Paulo",
    address: "R. da Cantareira, 306 – Centro Histórico, SP",
  },
  {
    id: "s3",
    label: "Pinacoteca do Estado",
    address: "Praça da Luz, 2 – Luz, São Paulo",
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
  return `${km.toFixed(1).replace(".", ",")} km`;
}

const PLACE_DISTANCE_OVERRIDES: Record<string, number> = {
  current: 0,
  home: 4.2,
  work: 6.0,
  s1: 4.5,
  s2: 7.3,
  s3: 6.1,
};

export function estimateDistanceKm(placeId: string): number {
  const override = PLACE_DISTANCE_OVERRIDES[placeId];
  if (override !== undefined) return override;
  let hash = 0;
  for (let i = 0; i < placeId.length; i++) {
    hash = (hash * 31 + placeId.charCodeAt(i)) | 0;
  }
  const positive = Math.abs(hash);
  return 2 + (positive % 240) / 10;
}

export function computePriceCents(
  distanceKm: number,
  pricePerKmCents: number,
  minPriceCents: number,
): number {
  return Math.max(minPriceCents, Math.round(distanceKm * pricePerKmCents));
}
