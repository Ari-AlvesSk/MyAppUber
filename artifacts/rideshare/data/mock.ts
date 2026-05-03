import type { Driver, Place, RideOption } from "@/types";

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

export const DRIVERS: Driver[] = [
  {
    id: "d1",
    name: "Carlos Oliveira",
    rating: 4.93,
    trips: 4218,
    vehicleType: "car",
    car: "Toyota Corolla",
    plate: "ABC-1D23",
    color: "Prata",
    photoSeed: "Carlos",
  },
  {
    id: "d2",
    name: "Ana Santos",
    rating: 4.97,
    trips: 6802,
    vehicleType: "car",
    car: "Honda Civic",
    plate: "DEF-4E56",
    color: "Preto",
    photoSeed: "Ana",
  },
  {
    id: "d3",
    name: "Fernanda Lima",
    rating: 4.99,
    trips: 9320,
    vehicleType: "car",
    car: "Volkswagen Polo",
    plate: "GHI-7F89",
    color: "Branco",
    photoSeed: "Fernanda",
  },
  {
    id: "d4",
    name: "Rafael Souza",
    rating: 4.91,
    trips: 3147,
    vehicleType: "moto",
    car: "Honda CG 160",
    plate: "JKL-2G34",
    color: "Preto",
    photoSeed: "Rafael",
  },
  {
    id: "d5",
    name: "Pedro Alves",
    rating: 4.95,
    trips: 5420,
    vehicleType: "moto",
    car: "Yamaha Factor 150",
    plate: "MNO-5H67",
    color: "Azul",
    photoSeed: "Pedro",
  },
  {
    id: "d6",
    name: "Juliana Costa",
    rating: 4.89,
    trips: 2876,
    vehicleType: "moto",
    car: "Honda NXR Bros",
    plate: "PQR-8I90",
    color: "Vermelho",
    photoSeed: "Juliana",
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

export function pickRandomDriver(vehicleType?: Driver["vehicleType"]): Driver {
  const pool = vehicleType
    ? DRIVERS.filter((d) => d.vehicleType === vehicleType)
    : DRIVERS;
  const list = pool.length > 0 ? pool : DRIVERS;
  const i = Math.floor(Math.random() * list.length);
  return list[i]!;
}

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
