import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type UserRole = "passenger" | "driver";

export type AuthUser = {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  vehicleType?: "moto" | "car";
  vehicleModel?: string;
  vehiclePlate?: string;
  createdAt: number;
};

const STORAGE_KEY = "rideshare:auth:v1";

type AuthContextType = {
  user: AuthUser | null;
  hydrated: boolean;
  login: (role: UserRole, email: string) => Promise<AuthUser>;
  register: (input: {
    role: UserRole;
    name: string;
    email: string;
    phone: string;
    vehicleType?: "moto" | "car";
    vehicleModel?: string;
    vehiclePlate?: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  switchRole: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function deriveNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "Usuário";
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as AuthUser;
            setUser(parsed);
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

  const persist = useCallback(async (u: AuthUser | null) => {
    if (u) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback<AuthContextType["login"]>(
    async (role, email) => {
      const next: AuthUser = {
        id: generateId(),
        role,
        name: deriveNameFromEmail(email),
        email,
        phone: "+55 11 90000-0000",
        ...(role === "driver"
          ? {
              vehicleType: "car",
              vehicleModel: "Toyota Corolla",
              vehiclePlate: "ABC-1D23",
            }
          : {}),
        createdAt: Date.now(),
      };
      setUser(next);
      await persist(next);
      return next;
    },
    [persist],
  );

  const register = useCallback<AuthContextType["register"]>(
    async (input) => {
      const next: AuthUser = {
        id: generateId(),
        role: input.role,
        name: input.name,
        email: input.email,
        phone: input.phone,
        vehicleType: input.vehicleType,
        vehicleModel: input.vehicleModel,
        vehiclePlate: input.vehiclePlate,
        createdAt: Date.now(),
      };
      setUser(next);
      await persist(next);
      return next;
    },
    [persist],
  );

  const logout = useCallback(async () => {
    setUser(null);
    await persist(null);
  }, [persist]);

  const switchRole = useCallback(async () => {
    if (!user) return;
    const nextRole: UserRole =
      user.role === "passenger" ? "driver" : "passenger";
    const next: AuthUser = {
      ...user,
      role: nextRole,
      ...(nextRole === "driver" && !user.vehicleType
        ? {
            vehicleType: "car",
            vehicleModel: "Toyota Corolla",
            vehiclePlate: "ABC-1D23",
          }
        : {}),
    };
    setUser(next);
    await persist(next);
  }, [user, persist]);

  const value = useMemo<AuthContextType>(
    () => ({ user, hydrated, login, register, logout, switchRole }),
    [user, hydrated, login, register, logout, switchRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
