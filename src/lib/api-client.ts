/**
 * API client for MVP + tracking endpoints.
 * Uses same-origin `/api/v1` in the browser.
 */

const API_BASE =
  typeof window !== "undefined"
    ? "/api/v1"
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1");

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = {
  ok: false;
  error: { code: string; message: string; details?: unknown };
};

export type TrackingPayload = {
  delivery: {
    id: string;
    date: string;
    timeSlot: string;
    status: "mixing" | "baking" | "en_route" | "at_door";
    leaveAtDoor: boolean;
    silentPush: boolean;
    items: Array<{
      id: string;
      dishId: string;
      quantity: number;
      kidsCustom?: {
        shape: string;
        glaze: string;
        filling: string;
      };
    }>;
  };
  tracking: {
    deliveryId: string;
    status: "mixing" | "baking" | "en_route" | "at_door";
    etaMinutes: number | null;
    courierName: string | null;
    courierPhone: string | null;
    courierNote: string | null;
    neighborBonusAwarded: boolean;
  };
  bonusBalance: number;
  bonusAwarded?: number;
  advanced?: boolean;
};

async function request<T>(
  path: string,
  init?: RequestInit & { token?: string }
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("Content-Type", "application/json");
  if (init?.token) headers.set("Authorization", `Bearer ${init.token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  const body = (await response.json()) as ApiSuccess<T> | ApiFailure;
  if (!response.ok || !("ok" in body) || !body.ok) {
    const failure = body as ApiFailure;
    throw new ApiError(
      response.status,
      failure.error?.code ?? "UNKNOWN",
      failure.error?.message ?? "Request failed",
      failure.error?.details
    );
  }
  return body.data;
}

export const apiClient = {
  health: () =>
    fetch("/api/health").then((r) => r.json()) as Promise<{
      ok: boolean;
      data: Record<string, unknown>;
    }>,
  register: (payload: unknown) =>
    request<{ token: string; user: unknown }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload: { email: string; password: string }) =>
    request<{ token: string; user: unknown }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMe: (token: string) =>
    request<{ user: unknown }>("/me", { method: "GET", token }),
  updateMe: (token: string, payload: unknown) =>
    request("/me", { method: "PATCH", token, body: JSON.stringify(payload) }),
  deleteMe: (token: string) =>
    request<{ deleted: boolean; userId: string }>("/me", {
      method: "DELETE",
      token,
    }),
  getDishes: () => request("/dishes", { method: "GET" }),
  getSubscription: (token: string) =>
    request("/subscription", { method: "GET", token }),
  pauseSubscription: (token: string) =>
    request("/subscription/pause", { method: "POST", token }),
  resumeSubscription: (token: string) =>
    request("/subscription/resume", { method: "POST", token }),
  getDeliveries: (token: string, query?: { from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (query?.from) params.set("from", query.from);
    if (query?.to) params.set("to", query.to);
    const qs = params.toString();
    return request(`/deliveries${qs ? `?${qs}` : ""}`, {
      method: "GET",
      token,
    });
  },
  updateDelivery: (token: string, id: string, payload: unknown) =>
    request(`/deliveries/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }),
  putDeliveryItems: (token: string, id: string, payload: unknown) =>
    request(`/deliveries/${id}/items`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
  addKidsItem: (token: string, id: string, payload: unknown) =>
    request(`/deliveries/${id}/kids-items`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  getTracking: (token: string, id: string) =>
    request<TrackingPayload>(`/deliveries/${id}/tracking`, {
      method: "GET",
      token,
    }),
  updateTracking: (token: string, id: string, payload: unknown) =>
    request<TrackingPayload>(`/deliveries/${id}/tracking`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }),
  advanceTracking: (token: string, id: string) =>
    request<TrackingPayload>(`/deliveries/${id}/tracking/advance`, {
      method: "POST",
      token,
    }),
  resetTracking: (token: string, id: string) =>
    request<TrackingPayload>(`/deliveries/${id}/tracking/reset`, {
      method: "POST",
      token,
    }),
  trackingStreamUrl: (token: string, id: string) =>
    `${API_BASE}/deliveries/${id}/tracking/stream?token=${encodeURIComponent(token)}`,
  getBonuses: (token: string) => request("/bonuses", { method: "GET", token }),
  accrueBonus: (token: string, payload: unknown) =>
    request("/bonuses", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  submitFeedback: (token: string, payload: unknown) =>
    request("/feedback", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  checkout: (
    token: string,
    payload: {
      deliveryId: string;
      bonusToSpend: number;
      idempotencyKey: string;
    }
  ) =>
    request<{
      payment: PaymentDto;
      reused: boolean;
      bonusBalance: number;
    }>("/checkout", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  confirmPayment: (token: string, paymentId: string) =>
    request<{
      payment: PaymentDto;
      alreadyPaid: boolean;
      bonusBalance: number;
    }>(`/payments/${paymentId}/confirm`, {
      method: "POST",
      token,
    }),
  getPayments: (token: string, query?: { deliveryId?: string }) => {
    const params = new URLSearchParams();
    if (query?.deliveryId) params.set("deliveryId", query.deliveryId);
    const qs = params.toString();
    return request<{ payments: PaymentDto[] }>(
      `/payments${qs ? `?${qs}` : ""}`,
      { method: "GET", token }
    );
  },
  downloadReceipt: async (token: string, paymentId: string) => {
    const response = await fetch(`${API_BASE}/payments/${paymentId}/receipt`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ApiFailure | null;
      throw new ApiError(
        response.status,
        body?.error?.code ?? "UNKNOWN",
        body?.error?.message ?? "Не удалось скачать чек",
        body?.error?.details
      );
    }
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const match = /filename="([^"]+)"/.exec(disposition);
    return { blob, filename: match?.[1] ?? `prosyvaisya-check-${paymentId}.html` };
  },

  adminStats: (token: string) =>
    request<AdminStatsDto>("/admin/stats", { method: "GET", token }),
  adminDishes: (token: string) =>
    request<AdminDishDto[]>("/admin/dishes", { method: "GET", token }),
  adminCreateDish: (token: string, payload: unknown) =>
    request<AdminDishDto>("/admin/dishes", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  adminUpdateDish: (token: string, id: string, payload: unknown) =>
    request<AdminDishDto>(`/admin/dishes/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }),
  adminDeactivateDish: (token: string, id: string) =>
    request<AdminDishDto>(`/admin/dishes/${id}`, {
      method: "DELETE",
      token,
    }),
  adminDeliveries: (
    token: string,
    query?: { from?: string; to?: string; status?: string }
  ) => {
    const params = new URLSearchParams();
    if (query?.from) params.set("from", query.from);
    if (query?.to) params.set("to", query.to);
    if (query?.status) params.set("status", query.status);
    const qs = params.toString();
    return request<{ deliveries: AdminDeliveryDto[] }>(
      `/admin/deliveries${qs ? `?${qs}` : ""}`,
      { method: "GET", token }
    );
  },
  adminSetTracking: (
    token: string,
    deliveryId: string,
    status: string
  ) =>
    request(`/admin/deliveries/${deliveryId}/tracking`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status }),
    }),
  adminAdvanceTracking: (token: string, deliveryId: string) =>
    request(`/admin/deliveries/${deliveryId}/tracking`, {
      method: "POST",
      token,
    }),
  adminUsers: (token: string) =>
    request<{ users: AdminUserDto[] }>("/admin/users", {
      method: "GET",
      token,
    }),
  adminAdjustBonus: (
    token: string,
    userId: string,
    payload: { amount: number; note?: string }
  ) =>
    request<{ user: AdminUserDto }>(`/admin/users/${userId}/bonuses`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
};

export type PaymentDto = {
  id: string;
  userId: string;
  deliveryId: string;
  status: "pending" | "paid" | "failed" | "cancelled";
  currency: string;
  itemsTotal: number;
  bonusSpent: number;
  amountDue: number;
  amountPaid: number;
  provider: string;
  providerPaymentId: string | null;
  receiptCode: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminDishDto = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  isKids: boolean;
  isHealthy: boolean;
  isActive: boolean;
};

export type AdminStatsDto = {
  usersCount: number;
  dishesActive: number;
  dishesTotal: number;
  deliveriesToday: number;
  paidPayments: number;
  pendingPayments: number;
  weekByStatus: Array<{ status: string; count: number }>;
};

export type AdminUserDto = {
  id: string;
  email: string;
  name: string;
  city: string;
  street: string;
  building: string;
  apartment: string;
  bonusBalance: number;
  role: "user" | "admin";
  avatarInitials: string;
  subscription: {
    active: boolean;
    paused: boolean;
    price: number;
  } | null;
  deliveriesCount?: number;
  paymentsCount?: number;
};

export type AdminDeliveryDto = {
  id: string;
  userId: string;
  date: string;
  timeSlot: string;
  status: string;
  leaveAtDoor: boolean;
  silentPush: boolean;
  items: Array<{
    id: string;
    dishId: string;
    dishName: string | null;
    quantity: number;
  }>;
  user: AdminUserDto;
  payment: PaymentDto | null;
  tracking: {
    status: string;
    etaMinutes: number | null;
    courierName: string | null;
    neighborBonusAwarded: boolean;
  } | null;
};
