import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { PaymentMethod, Place, Ride } from "@/types";
import { PAYMENT_METHODS } from "@/data/mock";

const STORAGE_KEYS = {
  rides: "rideshare:rides:v1",
  payments: "rideshare:payments:v1",
  defaultPayment: "rideshare:defaultPayment:v1",
  profile: "rideshare:profile:v1",
};

type Profile = {
  name: string;
  email: string;
  phone: string;
};

const DEFAULT_PROFILE: Profile = {
  name: "Alex Rivera",
  email: "alex.rivera@example.com",
  phone: "+1 (415) 555-0142",
};

type RideContextType = {
  rides: Ride[];
  activeRide: Ride | null;
  payments: PaymentMethod[];
  defaultPaymentId: string;
  profile: Profile;
  hydrated: boolean;
  addRide: (ride: Ride) => Promise<void>;
  updateRide: (id: string, patch: Partial<Ride>) => Promise<void>;
  cancelRide: (id: string) => Promise<void>;
  setDefaultPayment: (id: string) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  getRide: (id: string) => Ride | undefined;
};

const RideContext = createContext<RideContextType | null>(null);

export function RideProvider({ children }: { children: React.ReactNode }) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [payments, setPayments] = useState<PaymentMethod[]>(PAYMENT_METHODS);
  const [defaultPaymentId, setDefaultPaymentIdState] = useState<string>(
    PAYMENT_METHODS.find((p) => p.isDefault)?.id ?? PAYMENT_METHODS[0]!.id,
  );
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [ridesRaw, paymentsRaw, defaultPayRaw, profileRaw] =
          await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.rides),
            AsyncStorage.getItem(STORAGE_KEYS.payments),
            AsyncStorage.getItem(STORAGE_KEYS.defaultPayment),
            AsyncStorage.getItem(STORAGE_KEYS.profile),
          ]);
        if (!mounted) return;
        if (ridesRaw) {
          try {
            const parsed = JSON.parse(ridesRaw) as Ride[];
            setRides(parsed);
          } catch {}
        }
        if (paymentsRaw) {
          try {
            const parsed = JSON.parse(paymentsRaw) as PaymentMethod[];
            setPayments(parsed);
          } catch {}
        }
        if (defaultPayRaw) {
          setDefaultPaymentIdState(defaultPayRaw);
        }
        if (profileRaw) {
          try {
            const parsed = JSON.parse(profileRaw) as Profile;
            setProfile(parsed);
          } catch {}
        }
      } finally {
        if (mounted) setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persistRides = useCallback(async (next: Ride[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.rides, JSON.stringify(next));
  }, []);

  const addRide = useCallback(
    async (ride: Ride) => {
      const next = [ride, ...rides];
      setRides(next);
      await persistRides(next);
    },
    [rides, persistRides],
  );

  const updateRide = useCallback(
    async (id: string, patch: Partial<Ride>) => {
      const next = rides.map((r) => (r.id === id ? { ...r, ...patch } : r));
      setRides(next);
      await persistRides(next);
    },
    [rides, persistRides],
  );

  const cancelRide = useCallback(
    async (id: string) => {
      const next = rides.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "cancelled" as const,
              completedAt: Date.now(),
            }
          : r,
      );
      setRides(next);
      await persistRides(next);
    },
    [rides, persistRides],
  );

  const setDefaultPayment = useCallback(async (id: string) => {
    setDefaultPaymentIdState(id);
    await AsyncStorage.setItem(STORAGE_KEYS.defaultPayment, id);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      const next = { ...profile, ...patch };
      setProfile(next);
      await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(next));
    },
    [profile],
  );

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
      activeRide,
      payments,
      defaultPaymentId,
      profile,
      hydrated,
      addRide,
      updateRide,
      cancelRide,
      setDefaultPayment,
      updateProfile,
      getRide,
    }),
    [
      rides,
      activeRide,
      payments,
      defaultPaymentId,
      profile,
      hydrated,
      addRide,
      updateRide,
      cancelRide,
      setDefaultPayment,
      updateProfile,
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

export type { Profile };
