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
    vehicleType: "car",
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
    vehicleType: "car",
    car: "Toyota Camry Hybrid",
    plate: "6BLM118",
    color: "Midnight Black",
    photoSeed: "Aisha",
  },
  {
    id: "d3",
    name: "Sofia Rossi",
    rating: 4.99,
    trips: 9320,
    vehicleType: "car",
    car: "BMW 5 Series",
    plate: "4XHN770",
    color: "Carbon Grey",
    photoSeed: "Sofia",
  },
  {
    id: "d4",
    name: "Diego Vargas",
    rating: 4.91,
    trips: 3147,
    vehicleType: "moto",
    car: "Honda CB 500F",
    plate: "9RPT042",
    color: "Matte Black",
    photoSeed: "Diego",
  },
  {
    id: "d5",
    name: "Lucas Almeida",
    rating: 4.95,
    trips: 5420,
    vehicleType: "moto",
    car: "Yamaha MT-07",
    plate: "2KFL880",
    color: "Racing Blue",
    photoSeed: "Lucas",
  },
  {
    id: "d6",
    name: "Camila Torres",
    rating: 4.89,
    trips: 2876,
    vehicleType: "moto",
    car: "Kawasaki Z400",
    plate: "7XGD521",
    color: "Lime Green",
    photoSeed: "Camila",
  },
];

export const RIDE_OPTIONS: RideOption[] = [
  {
    tier: "moto",
    name: "Moto",
    description: "Llega más rápido esquivando el tráfico",
    capacity: 1,
    etaMinutes: 2,
    priceCents: 780,
  },
  {
    tier: "car",
    name: "Carro",
    description: "Comodidad y espacio para hasta 4 personas",
    capacity: 4,
    etaMinutes: 4,
    priceCents: 1490,
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

export function pickRandomDriver(vehicleType?: Driver["vehicleType"]): Driver {
  const pool = vehicleType
    ? DRIVERS.filter((d) => d.vehicleType === vehicleType)
    : DRIVERS;
  const list = pool.length > 0 ? pool : DRIVERS;
  const i = Math.floor(Math.random() * list.length);
  return list[i]!;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
