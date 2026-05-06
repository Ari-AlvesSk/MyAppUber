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

export type CouponValidateResult = {
  ok: boolean;
  couponId: string;
  code: string;
  description: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  discountCents: number;
};

export type CouponItem = {
  id: string;
  code: string;
  description: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minOrderCents: number;
  maxUses: number;
  usedCount: number;
  expiresAt: number | null;
  active: boolean;
  createdAt: number;
};

export type DriverLocation = {
  driverId: string;
  driverName: string;
  vehicleType: string;
  lat: number;
  lng: number;
  online: boolean;
  updatedAt: number;
};

export type ChatMessage = {
  _id: string;
  rideId: string;
  senderId: string;
  senderRole: "passenger" | "driver";
  text: string;
  createdAt: string;
};

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

  postDriverLocation: (data: { driverId: string; driverName: string; vehicleType: string; lat: number; lng: number; online: boolean; rideId?: string }) =>
    request<{ ok: boolean }>("/drivers/location", { method: "POST", body: JSON.stringify(data) }),
  getOnlineDrivers: () =>
    request<DriverLocation[]>("/drivers/online"),
  getDriverLocation: (driverId: string) =>
    request<DriverLocation>(`/drivers/${encodeURIComponent(driverId)}/location`),

  getCoupons: () => request<CouponItem[]>("/coupons"),
  createCoupon: (data: {
    code: string;
    description: string;
    discountType: "percent" | "fixed";
    discountValue: number;
    minOrderCents: number;
    maxUses: number;
    expiresAt: number | null;
    active: boolean;
  }) => request<{ ok: boolean; id: string }>("/coupons", { method: "POST", body: JSON.stringify(data) }),
  toggleCoupon: (id: string, active: boolean) =>
    request<{ ok: boolean }>(`/coupons/${id}`, { method: "PATCH", body: JSON.stringify({ active }) }),
  deleteCoupon: (id: string) =>
    request<{ ok: boolean }>(`/coupons/${id}`, { method: "DELETE" }),
  validateCoupon: (code: string, orderCents: number) =>
    request<CouponValidateResult>("/coupons/validate", { method: "POST", body: JSON.stringify({ code, orderCents }) }),

  getPublicPaymentSettings: () =>
    request<{
      pixEnabled: boolean; cardEnabled: boolean; cashEnabled: boolean;
      pixKey: string; pixKeyType: string;
      stripePublishableKey: string;
      pricePerKmCar: number; pricePerKmMoto: number;
      minPriceCar: number; minPriceMoto: number;
    }>("/admin/payment-settings/public"),

  createPaymentIntent: (data: { rideId: string; amountCents: number; paymentType: "card" | "pix"; paymentMethodId?: string }) =>
    request<{ clientSecret: string; paymentIntentId: string; status: string; pixData: { hosted_voucher_url?: string; image_url_png?: string; image_url_svg?: string; data?: string } | null }>("/stripe/payment-intent", { method: "POST", body: JSON.stringify(data) }),

  refundRide: (rideId: string) =>
    request<{ ok: boolean; refunded: boolean; refundId?: string }>("/stripe/refund", { method: "POST", body: JSON.stringify({ rideId }) }),

  getStripePublishableKey: () =>
    request<{ publishableKey: string }>("/stripe/publishable-key"),

  getAdminPaymentSettings: () =>
    request<{
      pixKey: string; pixKeyType: string;
      pixEnabled: boolean; cardEnabled: boolean; cashEnabled: boolean;
      cardFeePercent: number; commissionPercent: number;
      pricePerKmCar: number; pricePerKmMoto: number;
      minPriceCar: number; minPriceMoto: number;
      stripePublishableKey: string; stripeSecretKey: string;
    }>("/admin/payment-settings"),

  updateAdminPaymentSettings: (data: Record<string, unknown>) =>
    request<{ ok: boolean }>("/admin/payment-settings", { method: "PUT", body: JSON.stringify(data) }),

  createMpPix: (data: { rideId: string; amountCents: number; description?: string; payerEmail?: string }) =>
    request<{ mpPaymentId: string; qrCode: string; qrCodeBase64: string; ticketUrl: string; status: string }>(
      "/mp/pix", { method: "POST", body: JSON.stringify(data) },
    ),

  getMpPixStatus: (mpPaymentId: string) =>
    request<{ status: string; approved: boolean }>(`/mp/pix/${mpPaymentId}/status`),

  savePushToken: (userId: string, pushToken: string) =>
    request<{ ok: boolean }>("/notifications/token", { method: "POST", body: JSON.stringify({ userId, pushToken }) }),

  removePushToken: (userId: string) =>
    request<{ ok: boolean }>("/notifications/token", { method: "DELETE", body: JSON.stringify({ userId }) }),

  getChatMessages: (rideId: string) =>
    request<ChatMessage[]>(`/chat/${encodeURIComponent(rideId)}`),

  sendChatMessage: (rideId: string, data: { senderId: string; senderRole: "passenger" | "driver"; text: string }) =>
    request<ChatMessage>(`/chat/${encodeURIComponent(rideId)}`, { method: "POST", body: JSON.stringify(data) }),

  createReport: (data: { rideId: string; userId: string; driverId?: string | null; driverName?: string | null; reason: string; details?: string | null }) =>
    request<{ ok: boolean }>("/reports", { method: "POST", body: JSON.stringify(data) }),

  getReports: () =>
    request<Record<string, unknown>[]>("/reports"),

  updateReport: (id: string, status: "pending" | "reviewed" | "resolved") =>
    request<{ ok: boolean }>(`/reports/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
