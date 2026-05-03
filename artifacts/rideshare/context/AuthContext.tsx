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

export type DriverRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  vehicleType: "moto" | "car";
  vehicleModel: string;
  vehiclePlate: string;
  status: DriverStatus;
  createdAt: number;
};

export type AuthUser = {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  passwordHash: string;
  avatarColor?: string;
  vehicleType?: "moto" | "car";
  vehicleModel?: string;
  vehiclePlate?: string;
  driverStatus?: DriverStatus;
  createdAt: number;
};

type AuthContextType = {
  user: AuthUser | null;
  hydrated: boolean;
  driverRequests: DriverRequest[];
  login: (role: UserRole, email: string, password: string) => Promise<AuthUser>;
  register: (input: {
    role: UserRole;
    name: string;
    email: string;
    phone: string;
    cpf: string;
    password: string;
    vehicleType?: "moto" | "car";
    vehicleModel?: string;
    vehiclePlate?: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<Pick<AuthUser, "name" | "email" | "phone" | "cpf" | "avatarColor">>) => Promise<void>;
  updatePassword: (newPasswordHash: string) => Promise<void>;
  switchRole: () => Promise<void>;
  approveDriver: (id: string) => Promise<void>;
  rejectDriver: (id: string) => Promise<void>;
  checkDriverStatus: () => Promise<DriverStatus | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);
const AUTH_KEY = "rideshare:auth:v1";
const REQUESTS_KEY = "rideshare:driver_requests:v1";
const ADMIN_EMAIL = "admin@rideshare.com";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function normalizeEmail(email: string): string { return email.trim().toLowerCase(); }
function normalizePhone(phone: string): string { return phone.replace(/\D/g, ""); }
function normalizeCpf(cpf: string): string { return cpf.replace(/\D/g, ""); }
function hashPassword(password: string): string { return `hashed_${password}`; }
async function syncUserToApi(u: AuthUser): Promise<void> {
  try {
    await api.upsertUser(u.id, {
      name: u.name,
      email: u.email,
      phone: u.phone,
      cpf: u.cpf,
      role: u.role,
      avatarColor: u.avatarColor,
      driverStatus: u.driverStatus,
      vehicleType: u.vehicleType,
      vehicleModel: u.vehicleModel,
      vehiclePlate: u.vehiclePlate,
    });
    await api.updatePassword(u.id, u.passwordHash);
  } catch {}
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

  const login = useCallback<AuthContextType["login"]>(async (role, email, password) => {
    const emailNorm = normalizeEmail(email);
    if (emailNorm === ADMIN_EMAIL) {
      const admin: AuthUser = {
        id: "admin",
        role: "admin",
        name: "Administrador",
        email: ADMIN_EMAIL,
        phone: "00000000000",
        cpf: "00000000000",
        passwordHash: hashPassword(password),
        createdAt: Date.now(),
      };
      setUser(admin);
      await persistUser(admin);
      return admin;
    }
    const found = await api.findExistingUser({ email: emailNorm, phone: "", cpf: "" });
    if (!found.exists || !found.user) throw new Error("Usuário não cadastrado. Faça o registro primeiro.");
    const existing = found.user as AuthUser;
    if (existing.passwordHash !== hashPassword(password)) throw new Error("Senha incorreta.");
    if (existing.role !== role && existing.role !== "admin") throw new Error("Tipo de usuário diferente do cadastro.");
    setUser(existing);
    await persistUser(existing);
    return existing;
  }, [persistUser]);

  const register = useCallback<AuthContextType["register"]>(async (input) => {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    const cpf = normalizeCpf(input.cpf);
    const duplicate = await api.findExistingUser({ email, phone, cpf });
    if (duplicate.exists) throw new Error("Já existe uma conta com este e-mail, telefone ou CPF.");
    const next: AuthUser = {
      id: generateId(),
      role: input.role,
      name: input.name,
      email,
      phone,
      cpf,
      passwordHash: hashPassword(input.password),
      vehicleType: input.vehicleType,
      vehicleModel: input.vehicleModel,
      vehiclePlate: input.vehiclePlate,
      driverStatus: input.role === "driver" ? "pending" : undefined,
      createdAt: Date.now(),
    };
    if (input.role === "driver") {
      const newReq: DriverRequest = {
        id: next.id,
        name: input.name,
        email,
        phone,
        cpf,
        vehicleType: input.vehicleType ?? "car",
        vehicleModel: input.vehicleModel ?? "",
        vehiclePlate: input.vehiclePlate ?? "",
        status: "pending",
        createdAt: Date.now(),
      };
      const updatedReqs = [...driverRequests, newReq];
      setDriverRequests(updatedReqs);
      await persistRequests(updatedReqs);
    }
    setUser(next);
    await persistUser(next);
    return next;
  }, [driverRequests, persistRequests, persistUser]);

  const logout = useCallback(async () => { setUser(null); await persistUser(null); }, [persistUser]);
  const updateUser = useCallback(async (patch: Partial<Pick<AuthUser, "name" | "email" | "phone" | "cpf" | "avatarColor">>) => {
    if (!user) return;
    const next: AuthUser = { ...user, ...patch };
    setUser(next);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(next));
    syncUserToApi(next);
  }, [user]);
  const updatePassword = useCallback(async (newPasswordHash: string) => {
    if (!user) return;
    const next = { ...user, passwordHash: newPasswordHash };
    setUser(next);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(next));
    syncUserToApi(next);
  }, [user]);
  const switchRole = useCallback(async () => {
    if (!user) return;
    const nextRole: UserRole = user.role === "passenger" ? "driver" : "passenger";
    const next: AuthUser = { ...user, role: nextRole, driverStatus: nextRole === "driver" ? "approved" : undefined };
    setUser(next);
    await persistUser(next);
  }, [user, persistUser]);
  const approveDriver = useCallback(async (id: string) => {
    const updated = driverRequests.map((r) => r.id === id ? { ...r, status: "approved" as DriverStatus } : r);
    setDriverRequests(updated);
    await persistRequests(updated);
  }, [driverRequests, persistRequests]);
  const rejectDriver = useCallback(async (id: string) => {
    const updated = driverRequests.map((r) => r.id === id ? { ...r, status: "rejected" as DriverStatus } : r);
    setDriverRequests(updated);
    await persistRequests(updated);
  }, [driverRequests, persistRequests]);
  const checkDriverStatus = useCallback(async (): Promise<DriverStatus | null> => user?.driverStatus ?? null, [user]);

  const value = useMemo<AuthContextType>(() => ({ user, hydrated, driverRequests, login, register, logout, updateUser, updatePassword, switchRole, approveDriver, rejectDriver, checkDriverStatus }), [user, hydrated, driverRequests, login, register, logout, updateUser, updatePassword, switchRole, approveDriver, rejectDriver, checkDriverStatus]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
