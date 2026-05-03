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
  rejectionReason?: string;
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
  driverRejectionReason?: string;
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
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  switchRole: () => Promise<void>;
  approveDriver: (id: string) => Promise<void>;
  rejectDriver: (id: string, reason: string) => Promise<void>;
  checkDriverStatus: () => Promise<DriverStatus | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);
const AUTH_KEY = "rideshare:auth:v2";
const REQUESTS_KEY = "rideshare:driver_requests:v2";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function normalizeEmail(e: string) { return e.trim().toLowerCase(); }
function normalizePhone(p: string) { return p.replace(/\D/g, ""); }
function normalizeCpf(c: string) { return c.replace(/\D/g, ""); }
function hashPassword(p: string) { return `hashed_${p}`; }

function syncUserToApi(u: AuthUser) {
  api.upsertUser(u.id, {
    name: u.name, email: u.email, phone: u.phone, cpf: u.cpf,
    role: u.role, avatarColor: u.avatarColor, driverStatus: u.driverStatus,
    driverRejectionReason: u.driverRejectionReason,
    vehicleType: u.vehicleType, vehicleModel: u.vehicleModel, vehiclePlate: u.vehiclePlate,
  }).catch(() => {});
  api.updatePassword(u.id, u.passwordHash).catch(() => {});
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
        if (authRaw) {
          try { setUser(JSON.parse(authRaw) as AuthUser); }
          catch { await AsyncStorage.removeItem(AUTH_KEY); }
        }
        if (reqRaw) {
          try { setDriverRequests(JSON.parse(reqRaw) as DriverRequest[]); }
          catch { await AsyncStorage.removeItem(REQUESTS_KEY); }
        }
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
    const result = await api.loginUser(emailNorm, password);
    const raw = result.user;
    const dbUser = raw as {
      id: string; role: string; name: string; email: string;
      phone: string; cpf: string; avatarColor?: string;
      vehicleType?: string; vehicleModel?: string; vehiclePlate?: string;
      driverStatus?: string; driverRejectionReason?: string; createdAt: number;
    };
    if (dbUser.role !== "admin" && dbUser.role !== role) {
      throw new Error(`Você está cadastrado como ${dbUser.role === "driver" ? "Motorista" : "Passageiro"}. Selecione o tipo correto.`);
    }
    if (dbUser.role === "driver" && dbUser.driverStatus === "rejected") {
      throw new Error(`Seu registro como motorista não foi aprovado. Motivo: ${dbUser.driverRejectionReason ?? "não informado"}`);
    }
    const authed: AuthUser = {
      id: dbUser.id,
      role: dbUser.role as UserRole,
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone,
      cpf: dbUser.cpf,
      passwordHash: hashPassword(password),
      avatarColor: dbUser.avatarColor,
      vehicleType: dbUser.vehicleType as AuthUser["vehicleType"],
      vehicleModel: dbUser.vehicleModel,
      vehiclePlate: dbUser.vehiclePlate,
      driverStatus: dbUser.driverStatus as AuthUser["driverStatus"],
      driverRejectionReason: dbUser.driverRejectionReason,
      createdAt: dbUser.createdAt,
    };
    setUser(authed);
    await persistUser(authed);
    return authed;
  }, [persistUser]);

  const register = useCallback<AuthContextType["register"]>(async (input) => {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    const cpf = normalizeCpf(input.cpf);
    const duplicate = await api.checkUserExists(email, phone, cpf);
    if (duplicate.exists) throw new Error("Já existe uma conta com este e-mail, telefone ou CPF.");
    const id = generateId();
    const pwdHash = hashPassword(input.password);
    const next: AuthUser = {
      id,
      role: input.role,
      name: input.name,
      email,
      phone,
      cpf,
      passwordHash: pwdHash,
      vehicleType: input.vehicleType,
      vehicleModel: input.vehicleModel,
      vehiclePlate: input.vehiclePlate,
      driverStatus: input.role === "driver" ? "pending" : undefined,
      createdAt: Date.now(),
    };
    await api.upsertUser(id, {
      name: next.name, email: next.email, phone: next.phone, cpf: next.cpf,
      role: next.role, driverStatus: next.driverStatus,
      vehicleType: next.vehicleType, vehicleModel: next.vehicleModel, vehiclePlate: next.vehiclePlate,
    });
    await api.updatePassword(id, pwdHash);
    if (input.role === "driver") {
      const newReq: DriverRequest = {
        id, name: input.name, email, phone, cpf,
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
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(next));
    return next;
  }, [driverRequests, persistRequests]);

  const logout = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem(AUTH_KEY);
  }, []);

  const updateUser = useCallback(async (patch: Partial<Pick<AuthUser, "name" | "email" | "phone" | "cpf" | "avatarColor">>) => {
    if (!user) return;
    const next: AuthUser = { ...user, ...patch };
    setUser(next);
    await persistUser(next);
  }, [user, persistUser]);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) return;
    if (user.passwordHash !== hashPassword(currentPassword)) throw new Error("Senha atual incorreta.");
    const newHash = hashPassword(newPassword);
    const next: AuthUser = { ...user, passwordHash: newHash };
    setUser(next);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(next));
    await api.updatePassword(user.id, newHash);
  }, [user]);

  const switchRole = useCallback(async () => {
    if (!user) return;
    const nextRole: UserRole = user.role === "passenger" ? "driver" : "passenger";
    const next: AuthUser = { ...user, role: nextRole, driverStatus: nextRole === "driver" ? "approved" : undefined };
    setUser(next);
    await persistUser(next);
  }, [user, persistUser]);

  const approveDriver = useCallback(async (id: string) => {
    const updated = driverRequests.map((r) => r.id === id ? { ...r, status: "approved" as DriverStatus, rejectionReason: undefined } : r);
    setDriverRequests(updated);
    await persistRequests(updated);
  }, [driverRequests, persistRequests]);

  const rejectDriver = useCallback(async (id: string, reason: string) => {
    const rejectionReason = reason.trim();
    const updated = driverRequests.map((r) => r.id === id ? { ...r, status: "rejected" as DriverStatus, rejectionReason } : r);
    setDriverRequests(updated);
    await persistRequests(updated);
  }, [driverRequests, persistRequests]);

  const checkDriverStatus = useCallback(async (): Promise<DriverStatus | null> => user?.driverStatus ?? null, [user]);

  const value = useMemo<AuthContextType>(() => ({
    user, hydrated, driverRequests,
    login, register, logout, updateUser, updatePassword,
    switchRole, approveDriver, rejectDriver, checkDriverStatus,
  }), [user, hydrated, driverRequests, login, register, logout, updateUser, updatePassword, switchRole, approveDriver, rejectDriver, checkDriverStatus]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
