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
  customPayments: "rideshare:custom_payments:v1",
  defaultPayment: "rideshare:defaultPayment:v1",
};

const BASE_PAYMENTS: PaymentMethod[] = [
  { id: "pix", type: "wallet", label: "Pix", detail: "Transferência instantânea", isDefault: true },
  { id: "cash", type: "cash", label: "Dinheiro", detail: "Pague ao motorista", isDefault: false },
];

export const PAYMENT_OPTIONS = BASE_PAYMENTS;

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
  addPaymentMethod: (method: Omit<PaymentMethod, "id" | "isDefault">) => Promise<void>;
  removePaymentMethod: (id: string) => Promise<void>;
  getRide: (id: string) => Ride | undefined;
};

const RideContext = createContext<RideContextType | null>(null);

export function RideProvider({ children }: { children: React.ReactNode }) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [platformRides, setPlatformRides] = useState<Ride[]>([]);
  const [customPayments, setCustomPayments] = useState<PaymentMethod[]>([]);
  const [defaultPaymentId, setDefaultPaymentIdState] = useState<string>("pix");
  const [hydrated, setHydrated] = useState(false);

  const payments = useMemo<PaymentMethod[]>(
    () => [...BASE_PAYMENTS, ...customPayments],
    [customPayments],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [ridesRaw, platformRaw, customPayRaw, defaultPayRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.rides),
          AsyncStorage.getItem(STORAGE_KEYS.platformRides),
          AsyncStorage.getItem(STORAGE_KEYS.customPayments),
          AsyncStorage.getItem(STORAGE_KEYS.defaultPayment),
        ]);
        if (!mounted) return;
        if (ridesRaw) { try { setRides(JSON.parse(ridesRaw) as Ride[]); } catch {} }
        if (platformRaw) { try { setPlatformRides(JSON.parse(platformRaw) as Ride[]); } catch {} }
        if (customPayRaw) { try { setCustomPayments(JSON.parse(customPayRaw) as PaymentMethod[]); } catch {} }
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

  const persistCustomPayments = useCallback(async (next: PaymentMethod[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.customPayments, JSON.stringify(next));
  }, []);

  const addRide = useCallback(async (ride: Ride) => {
    const nextRides = [ride, ...rides];
    setRides(nextRides);
    await persistRides(nextRides);
    const nextPlatform = [ride, ...platformRides];
    setPlatformRides(nextPlatform);
    await persistPlatformRides(nextPlatform);
  }, [rides, platformRides, persistRides, persistPlatformRides]);

  const updateRide = useCallback(async (id: string, patch: Partial<Ride>) => {
    const nextRides = rides.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setRides(nextRides);
    await persistRides(nextRides);
    const nextPlatform = platformRides.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setPlatformRides(nextPlatform);
    await persistPlatformRides(nextPlatform);
  }, [rides, platformRides, persistRides, persistPlatformRides]);

  const cancelRide = useCallback(async (id: string) => {
    const patch = { status: "cancelled" as const, completedAt: Date.now() };
    const nextRides = rides.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setRides(nextRides);
    await persistRides(nextRides);
    const nextPlatform = platformRides.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setPlatformRides(nextPlatform);
    await persistPlatformRides(nextPlatform);
  }, [rides, platformRides, persistRides, persistPlatformRides]);

  const setDefaultPayment = useCallback(async (id: string) => {
    setDefaultPaymentIdState(id);
    await AsyncStorage.setItem(STORAGE_KEYS.defaultPayment, id);
  }, []);

  const addPaymentMethod = useCallback(
    async (method: Omit<PaymentMethod, "id" | "isDefault">) => {
      const newMethod: PaymentMethod = {
        ...method,
        id: `custom_${Date.now()}`,
        isDefault: false,
      };
      const next = [...customPayments, newMethod];
      setCustomPayments(next);
      await persistCustomPayments(next);
    },
    [customPayments, persistCustomPayments],
  );

  const removePaymentMethod = useCallback(
    async (id: string) => {
      const next = customPayments.filter((p) => p.id !== id);
      setCustomPayments(next);
      await persistCustomPayments(next);
      if (defaultPaymentId === id) {
        setDefaultPaymentIdState("pix");
        await AsyncStorage.setItem(STORAGE_KEYS.defaultPayment, "pix");
      }
    },
    [customPayments, defaultPaymentId, persistCustomPayments],
  );

  const getRide = useCallback((id: string) => rides.find((r) => r.id === id), [rides]);

  const activeRide = useMemo(
    () => rides.find((r) =>
      r.status === "searching" || r.status === "matched" ||
      r.status === "arriving" || r.status === "in_progress"
    ) ?? null,
    [rides],
  );

  const value = useMemo<RideContextType>(
    () => ({
      rides, platformRides, activeRide, payments, defaultPaymentId, hydrated,
      addRide, updateRide, cancelRide, setDefaultPayment,
      addPaymentMethod, removePaymentMethod, getRide,
    }),
    [rides, platformRides, activeRide, payments, defaultPaymentId, hydrated,
      addRide, updateRide, cancelRide, setDefaultPayment,
      addPaymentMethod, removePaymentMethod, getRide],
  );

  return <RideContext.Provider value={value}>{children}</RideContext.Provider>;
}

export function useRides() {
  const ctx = useContext(RideContext);
  if (!ctx) throw new Error("useRides must be used within RideProvider");
  return ctx;
}
