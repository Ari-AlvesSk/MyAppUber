import type { Driver, PaymentMethod, Place, RideOption } from "@/types";

export const SAVED_PLACES: Place[] = [
  {
    id: "home",
    label: "Home",
    address: "1814 Folsom St, San Francisco",
    icon: "home",
  },
  {
    id: "work",
    label: "Work",
    address: "535 Mission St, San Francisco",
    icon: "briefcase",
  },
];

export const RECENT_PLACES: Place[] = [
  {
    id: "r1",
    label: "Ferry Building",
    address: "1 Ferry Building, San Francisco",
  },
  {
    id: "r2",
    label: "SFO Airport — Terminal 2",
    address: "780 N McDonnell Rd, San Francisco",
  },
  {
    id: "r3",
    label: "Dolores Park",
    address: "Dolores St & 19th, San Francisco",
  },
  {
    id: "r4",
    label: "Tartine Bakery",
    address: "600 Guerrero St, San Francisco",
  },
  {
    id: "r5",
    label: "Salesforce Tower",
    address: "415 Mission St, San Francisco",
  },
];

export const SUGGESTED_PLACES: Place[] = [
  {
    id: "s1",
    label: "Chase Center",
    address: "1 Warriors Way, San Francisco",
  },
  {
    id: "s2",
    label: "Golden Gate Park",
    address: "501 Stanyan St, San Francisco",
  },
  {
    id: "s3",
    label: "Pier 39",
    address: "Beach St & The Embarcadero, SF",
  },
];

export const DRIVERS: Driver[] = [
  {
    id: "d1",
    name: "Marcus Chen",
    rating: 4.93,
    trips: 4218,
    car: "Tesla Model 3",
    plate: "8KZA294",
    color: "Pearl White",
    photoSeed: "Marcus",
  },
  {
    id: "d2",
    name: "Aisha Patel",
    rating: 4.97,
    trips: 6802,
    car: "Toyota Camry Hybrid",
    plate: "6BLM118",
    color: "Midnight Black",
    photoSeed: "Aisha",
  },
  {
    id: "d3",
    name: "Diego Vargas",
    rating: 4.88,
    trips: 1956,
    car: "Honda Civic",
    plate: "9RPT042",
    color: "Silver",
    photoSeed: "Diego",
  },
  {
    id: "d4",
    name: "Sofia Rossi",
    rating: 4.99,
    trips: 9320,
    car: "BMW 5 Series",
    plate: "4XHN770",
    color: "Carbon Grey",
    photoSeed: "Sofia",
  },
];

export const RIDE_OPTIONS: RideOption[] = [
  {
    tier: "economy",
    name: "Lite",
    description: "Affordable, everyday rides",
    capacity: 4,
    etaMinutes: 3,
    priceCents: 1240,
  },
  {
    tier: "comfort",
    name: "Comfort",
    description: "Newer cars with extra legroom",
    capacity: 4,
    etaMinutes: 4,
    priceCents: 1690,
  },
  {
    tier: "xl",
    name: "XL",
    description: "Affordable rides for groups up to 6",
    capacity: 6,
    etaMinutes: 6,
    priceCents: 2310,
  },
  {
    tier: "premium",
    name: "Black",
    description: "Premium cars with top-rated drivers",
    capacity: 4,
    etaMinutes: 8,
    priceCents: 3420,
  },
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "p1",
    type: "card",
    label: "Visa",
    detail: "•••• 4242",
    isDefault: true,
  },
  {
    id: "p2",
    type: "card",
    label: "Mastercard",
    detail: "•••• 8819",
    isDefault: false,
  },
  {
    id: "p3",
    type: "cash",
    label: "Cash",
    detail: "Pay driver directly",
    isDefault: false,
  },
];

export function pickRandomDriver(): Driver {
  const i = Math.floor(Math.random() * DRIVERS.length);
  return DRIVERS[i]!;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
