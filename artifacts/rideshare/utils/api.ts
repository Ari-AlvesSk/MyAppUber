import { Platform } from "react-native";

function getApiBase(): string {
  if (Platform.OS === "web") {
    return "/api";
  }
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  return "http://localhost:8080/api";
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getApiBase();
  const url = `${base}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
      ...options,
    });
  } catch (err) {
    throw new Error(`Sem conexão com o servidor. Verifique sua internet.`);
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json() as { error?: string };
      if (body?.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  loginUser: (email: string, password: string) =>
    request<{ ok: boolean; user: Record<string, unknown> }>("/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  checkUserExists: (email: string, phone: string, cpf: string) =>
    request<{ exists: boolean; user?: unknown }>(
      `/users/lookup/check?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&cpf=${encodeURIComponent(cpf)}`,
    ),
  getUser: (id: string) => request<Record<string, unknown>>(`/users/${id}`),
  upsertUser: (id: string, data: Record<string, unknown>) =>
    request<{ ok: boolean }>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  updatePassword: (id: string, passwordHash: string) =>
    request<{ ok: boolean }>(`/users/${id}/password`, { method: "PATCH", body: JSON.stringify({ passwordHash }) }),
  getRides: (userId: string) => request<unknown[]>(`/rides?userId=${encodeURIComponent(userId)}`),
  getDriverRides: (driverId: string) => request<unknown[]>(`/rides?driverId=${encodeURIComponent(driverId)}`),
  getRideById: (id: string) => request<Record<string, unknown>>(`/rides/${id}`),
  getPendingRides: (tier: string) => request<unknown[]>(`/rides/pending?tier=${encodeURIComponent(tier)}`),
  createRide: (data: Record<string, unknown>) =>
    request<{ ok: boolean }>("/rides", { method: "POST", body: JSON.stringify(data) }),
  updateRide: (id: string, data: Record<string, unknown>) =>
    request<{ ok: boolean }>(`/rides/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  getPayments: (userId: string) => request<unknown[]>(`/payments?userId=${encodeURIComponent(userId)}`),
  createPayment: (data: Record<string, unknown>) =>
    request<{ ok: boolean }>("/payments", { method: "POST", body: JSON.stringify(data) }),
  deletePayment: (id: string, userId: string) =>
    request<{ ok: boolean }>(`/payments/${id}?userId=${encodeURIComponent(userId)}`, { method: "DELETE" }),

  getWithdrawals: (driverId?: string) =>
    request<unknown[]>(`/withdrawals${driverId ? `?driverId=${encodeURIComponent(driverId)}` : ""}`),
  createWithdrawal: (data: { driverId: string; driverName: string; pixKey: string; amountCents: number }) =>
    request<{ ok: boolean; id: string }>("/withdrawals", { method: "POST", body: JSON.stringify(data) }),
  processWithdrawal: (id: string, data: { status: "approved" | "rejected"; rejectionReason?: string }) =>
    request<{ ok: boolean }>(`/withdrawals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  postDriverLocation: (data: { driverId: string; driverName: string; vehicleType: string; lat: number; lng: number; online: boolean }) =>
    request<{ ok: boolean }>("/drivers/location", { method: "POST", body: JSON.stringify(data) }),
  getOnlineDrivers: () =>
    request<{ driverId: string; driverName: string; vehicleType: string; lat: number; lng: number; online: boolean; updatedAt: number }[]>("/drivers/online"),
};
