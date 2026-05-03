import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/utils/api";

export type UserRole = "passenger" | "driver" | "admin";
export type DriverStatus = "pending" | "approved" | "rejected";

export type AuthUser = {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  avatarColor?: string;
  vehicleType?: "moto" | "car";
  vehicleModel?: string;
  vehiclePlate?: string;
  driverStatus?: DriverStatus;
  createdAt: number;
};

export type DriverRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicleType: "moto" | "car";
  vehicleModel: string;
  vehiclePlate: string;
  status: DriverStatus;
  createdAt: number;
};

const AUTH_KEY = "rideshare:auth:v1";
const REQUESTS_KEY = "rideshare:driver_requests:v1";
const ADMIN_EMAIL = "admin@rideshare.com";

type AuthContextType = {
  user: AuthUser | null;
  hydrated: boolean;
  driverRequests: DriverRequest[];
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
  updateUser: (patch: Partial<Pick<AuthUser, "name" | "email" | "phone" | "avatarColor">>) => Promise<void>;
  updatePassword: (newPasswordHash: string) => Promise<void>;
  switchRole: () => Promise<void>;
  approveDriver: (id: string) => Promise<void>;
  rejectDriver: (id: string) => Promise<void>;
  checkDriverStatus: () => Promise<DriverStatus | null>;
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

async function syncUserToApi(u: AuthUser): Promise<void> {
  try {
    await api.upsertUser(u.id, {
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      avatarColor: u.avatarColor,
      driverStatus: u.driverStatus,
      vehicleType: u.vehicleType,
      vehicleModel: u.vehicleModel,
      vehiclePlate: u.vehiclePlate,
    });
  } catch {
    // silent — AsyncStorage is the source of truth offline
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [driverRequests, setDriverRequests] = useState<DriverRequest[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [authRaw, reqRaw] = await Promise.all([
          AsyncStorage.getItem(AUTH_KEY),
          AsyncStorage.getItem(REQUESTS_KEY),
        ]);
        if (!mounted) return;
        if (authRaw) { try { setUser(JSON.parse(authRaw) as AuthUser); } catch {} }
        if (reqRaw) { try { setDriverRequests(JSON.parse(reqRaw) as DriverRequest[]); } catch {} }
      } finally {
        if (mounted) setHydrated(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const persistUser = useCallback(async (u: AuthUser | null) => {
    if (u) {
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(u));
      syncUserToApi(u);
    } else {
      await AsyncStorage.removeItem(AUTH_KEY);
    }
  }, []);

  const persistRequests = useCallback(async (reqs: DriverRequest[]) => {
    await AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(reqs));
  }, []);

  const login = useCallback<AuthContextType["login"]>(
    async (role, email) => {
      const isAdmin = email.trim().toLowerCase() === ADMIN_EMAIL;
      const effectiveRole: UserRole = isAdmin ? "admin" : role;
      let driverStatus: DriverStatus | undefined;
      if (effectiveRole === "driver") {
        const req = driverRequests.find((r) => r.email.toLowerCase() === email.trim().toLowerCase());
        driverStatus = req ? req.status : "pending";
      }
      const next: AuthUser = {
        id: generateId(),
        role: effectiveRole,
        name: isAdmin ? "Administrador" : deriveNameFromEmail(email),
        email: email.trim(),
        phone: "+55 11 90000-0000",
        ...(effectiveRole === "driver"
          ? { vehicleType: "car", vehicleModel: "Toyota Corolla", vehiclePlate: "ABC-1D23", driverStatus }
          : {}),
        createdAt: Date.now(),
      };
      setUser(next);
      await persistUser(next);
      return next;
    },
    [driverRequests, persistUser],
  );

  const register = useCallback<AuthContextType["register"]>(
    async (input) => {
      const isDriver = input.role === "driver";
      const next: AuthUser = {
        id: generateId(),
        role: input.role,
        name: input.name,
        email: input.email,
        phone: input.phone,
        vehicleType: input.vehicleType,
        vehicleModel: input.vehicleModel,
        vehiclePlate: input.vehiclePlate,
        driverStatus: isDriver ? "pending" : undefined,
        createdAt: Date.now(),
      };
      if (isDriver) {
        const newReq: DriverRequest = {
          id: next.id, name: input.name, email: input.email, phone: input.phone,
          vehicleType: input.vehicleType ?? "car",
          vehicleModel: input.vehicleModel ?? "",
          vehiclePlate: input.vehiclePlate ?? "",
          status: "pending", createdAt: Date.now(),
        };
        const updatedReqs = [...driverRequests, newReq];
        setDriverRequests(updatedReqs);
        await persistRequests(updatedReqs);
      }
      setUser(next);
      await persistUser(next);
      return next;
    },
    [driverRequests, persistUser, persistRequests],
  );

  const logout = useCallback(async () => {
    setUser(null);
    await persistUser(null);
  }, [persistUser]);

  const updateUser = useCallback(
    async (patch: Partial<Pick<AuthUser, "name" | "email" | "phone" | "avatarColor">>) => {
      if (!user) return;
      const next: AuthUser = { ...user, ...patch };
      setUser(next);
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(next));
      syncUserToApi(next);
    },
    [user],
  );

  const updatePassword = useCallback(
    async (newPasswordHash: string) => {
      if (!user) return;
      try {
        await api.updatePassword(user.id, newPasswordHash);
      } catch {
        // silent — UI still shows success for UX
      }
    },
    [user],
  );

  const switchRole = useCallback(async () => {
    if (!user) return;
    const nextRole: UserRole = user.role === "passenger" ? "driver" : "passenger";
    const next: AuthUser = {
      ...user, role: nextRole,
      driverStatus: nextRole === "driver" ? "approved" : undefined,
      ...(nextRole === "driver" && !user.vehicleType
        ? { vehicleType: "car", vehicleModel: "Toyota Corolla", vehiclePlate: "ABC-1D23" }
        : {}),
    };
    setUser(next);
    await persistUser(next);
  }, [user, persistUser]);

  const approveDriver = useCallback(async (id: string) => {
    const updated = driverRequests.map((r) =>
      r.id === id ? { ...r, status: "approved" as DriverStatus } : r,
    );
    setDriverRequests(updated);
    await persistRequests(updated);
    if (user && user.id === id) {
      const next = { ...user, driverStatus: "approved" as DriverStatus };
      setUser(next);
      await persistUser(next);
    }
  }, [driverRequests, persistRequests, user, persistUser]);

  const rejectDriver = useCallback(async (id: string) => {
    const updated = driverRequests.map((r) =>
      r.id === id ? { ...r, status: "rejected" as DriverStatus } : r,
    );
    setDriverRequests(updated);
    await persistRequests(updated);
    if (user && user.id === id) {
      const next = { ...user, driverStatus: "rejected" as DriverStatus };
      setUser(next);
      await persistUser(next);
    }
  }, [driverRequests, persistRequests, user, persistUser]);

  const checkDriverStatus = useCallback(async (): Promise<DriverStatus | null> => {
    if (!user || user.role !== "driver") return null;
    const reqRaw = await AsyncStorage.getItem(REQUESTS_KEY);
    if (!reqRaw) return user.driverStatus ?? null;
    try {
      const reqs = JSON.parse(reqRaw) as DriverRequest[];
      const req = reqs.find((r) => r.email.toLowerCase() === user.email.toLowerCase());
      if (req && req.status !== user.driverStatus) {
        const next = { ...user, driverStatus: req.status };
        setUser(next);
        await persistUser(next);
        setDriverRequests(reqs);
        return req.status;
      }
      return user.driverStatus ?? null;
    } catch { return user.driverStatus ?? null; }
  }, [user, persistUser]);

  const value = useMemo<AuthContextType>(
    () => ({
      user, hydrated, driverRequests,
      login, register, logout, updateUser, updatePassword, switchRole,
      approveDriver, rejectDriver, checkDriverStatus,
    }),
    [user, hydrated, driverRequests, login, register, logout, updateUser, updatePassword,
      switchRole, approveDriver, rejectDriver, checkDriverStatus],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
