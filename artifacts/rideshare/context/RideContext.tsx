import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { PaymentMethod, Ride } from "@/types";

const STORAGE_KEYS = {
  rides: "rideshare:rides:v1",
  platformRides: "rideshare:platform_rides:v1",
  payments: "rideshare:payments:v1",
  defaultPayment: "rideshare:defaultPayment:v1",
};

export const PAYMENT_OPTIONS: PaymentMethod[] = [
  {
    id: "pix",
    type: "wallet",
    label: "Pix",
    detail: "Transferência instantânea",
    isDefault: true,
  },
  {
    id: "cash",
    type: "cash",
    label: "Dinheiro",
    detail: "Pague ao motorista",
    isDefault: false,
  },
];

type RideContextType = {
  rides: Ride[];
  platformRides: Ride[];
  activeRide: Ride | null;
  payments: PaymentMethod[];
  defaultPaymentId: string;
  hydrated: boolean;
  addRide: (ride: Ride) => Promise<void>;
  updateRide: (id: string, patch: Partial<Ride>) => Promise<void>;
  cancelRide: (id: string) => Promise<void>;
  setDefaultPayment: (id: string) => Promise<void>;
  getRide: (id: string) => Ride | undefined;
};

const RideContext = createContext<RideContextType | null>(null);

export function RideProvider({ children }: { children: React.ReactNode }) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [platformRides, setPlatformRides] = useState<Ride[]>([]);
  const [payments] = useState<PaymentMethod[]>(PAYMENT_OPTIONS);
  const [defaultPaymentId, setDefaultPaymentIdState] = useState<string>("pix");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [ridesRaw, platformRaw, defaultPayRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.rides),
          AsyncStorage.getItem(STORAGE_KEYS.platformRides),
          AsyncStorage.getItem(STORAGE_KEYS.defaultPayment),
        ]);
        if (!mounted) return;
        if (ridesRaw) {
          try { setRides(JSON.parse(ridesRaw) as Ride[]); } catch {}
        }
        if (platformRaw) {
          try { setPlatformRides(JSON.parse(platformRaw) as Ride[]); } catch {}
        }
        if (defaultPayRaw) setDefaultPaymentIdState(defaultPayRaw);
      } finally {
        if (mounted) setHydrated(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const persistRides = useCallback(async (next: Ride[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.rides, JSON.stringify(next));
  }, []);

  const persistPlatformRides = useCallback(async (next: Ride[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.platformRides, JSON.stringify(next));
  }, []);

  const addRide = useCallback(
    async (ride: Ride) => {
      const nextRides = [ride, ...rides];
      setRides(nextRides);
      await persistRides(nextRides);

      const nextPlatform = [ride, ...platformRides];
      setPlatformRides(nextPlatform);
      await persistPlatformRides(nextPlatform);
    },
    [rides, platformRides, persistRides, persistPlatformRides],
  );

  const updateRide = useCallback(
    async (id: string, patch: Partial<Ride>) => {
      const nextRides = rides.map((r) => (r.id === id ? { ...r, ...patch } : r));
      setRides(nextRides);
      await persistRides(nextRides);

      const nextPlatform = platformRides.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      );
      setPlatformRides(nextPlatform);
      await persistPlatformRides(nextPlatform);
    },
    [rides, platformRides, persistRides, persistPlatformRides],
  );

  const cancelRide = useCallback(
    async (id: string) => {
      const patch = { status: "cancelled" as const, completedAt: Date.now() };
      const nextRides = rides.map((r) => (r.id === id ? { ...r, ...patch } : r));
      setRides(nextRides);
      await persistRides(nextRides);

      const nextPlatform = platformRides.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      );
      setPlatformRides(nextPlatform);
      await persistPlatformRides(nextPlatform);
    },
    [rides, platformRides, persistRides, persistPlatformRides],
  );

  const setDefaultPayment = useCallback(async (id: string) => {
    setDefaultPaymentIdState(id);
    await AsyncStorage.setItem(STORAGE_KEYS.defaultPayment, id);
  }, []);

  const getRide = useCallback(
    (id: string) => rides.find((r) => r.id === id),
    [rides],
  );

  const activeRide = useMemo(
    () =>
      rides.find(
        (r) =>
          r.status === "searching" ||
          r.status === "matched" ||
          r.status === "arriving" ||
          r.status === "in_progress",
      ) ?? null,
    [rides],
  );

  const value = useMemo<RideContextType>(
    () => ({
      rides,
      platformRides,
      activeRide,
      payments,
      defaultPaymentId,
      hydrated,
      addRide,
      updateRide,
      cancelRide,
      setDefaultPayment,
      getRide,
    }),
    [
      rides,
      platformRides,
      activeRide,
      payments,
      defaultPaymentId,
      hydrated,
      addRide,
      updateRide,
      cancelRide,
      setDefaultPayment,
      getRide,
    ],
  );

  return <RideContext.Provider value={value}>{children}</RideContext.Provider>;
}

export function useRides() {
  const ctx = useContext(RideContext);
  if (!ctx) throw new Error("useRides must be used within RideProvider");
  return ctx;
}
