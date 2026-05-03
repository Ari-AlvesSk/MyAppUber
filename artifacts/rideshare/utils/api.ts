import Constants from "expo-constants";
import { Platform } from "react-native";

function getApiBase(): string {
  if (Platform.OS === "web") return "/api";
  const extra = Constants.expoConfig?.extra as { apiBase?: string } | undefined;
  return extra?.apiBase ?? "/api";
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const base = getApiBase();
  const url = `${base}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Users
  getUser: (id: string) => request<Record<string, unknown>>(`/users/${id}`),

  upsertUser: (id: string, data: Record<string, unknown>) =>
    request<{ ok: boolean }>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updatePassword: (id: string, passwordHash: string) =>
    request<{ ok: boolean }>(`/users/${id}/password`, {
      method: "PATCH",
      body: JSON.stringify({ passwordHash }),
    }),

  // Rides
  getRides: (userId: string) =>
    request<unknown[]>(`/rides?userId=${encodeURIComponent(userId)}`),

  createRide: (data: Record<string, unknown>) =>
    request<{ ok: boolean }>("/rides", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateRide: (id: string, data: Record<string, unknown>) =>
    request<{ ok: boolean }>(`/rides/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Payments
  getPayments: (userId: string) =>
    request<unknown[]>(`/payments?userId=${encodeURIComponent(userId)}`),

  createPayment: (data: Record<string, unknown>) =>
    request<{ ok: boolean }>("/payments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deletePayment: (id: string, userId: string) =>
    request<{ ok: boolean }>(`/payments/${id}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
};
