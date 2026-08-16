"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { todayYmd } from "@/lib/week-dates";

const TOKEN_KEY = "prosyvaisya_token";
const DEMO_EMAIL = "anna@prosyvaisya.local";
const DEMO_PASSWORD = "demo12345";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  bonusBalance: number;
  city: string;
  street: string;
  building: string;
  apartment: string;
  avatarInitials: string;
  avatarUrl?: string | null;
  role?: "user" | "admin";
};

export type AuthSubscription = {
  id: string;
  userId: string;
  active: boolean;
  paused: boolean;
  price: number;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  subscription: AuthSubscription | null;
  ready: boolean;
  apiOnline: boolean;
  todayDeliveryId: string | null;
  needsAuth: boolean;
  refreshMe: () => Promise<void>;
  setBonusBalance: (balance: number) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    city: string;
    street: string;
    building: string;
    apartment: string;
  }) => Promise<void>;
  loginAsDemo: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function clearSavedToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

function saveToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

async function loadSession(accessToken: string) {
  const me = (await apiClient.getMe(accessToken)) as {
    user: AuthUser;
    subscription: AuthSubscription | null;
  };
  const today = todayYmd();
  const deliveries = (await apiClient.getDeliveries(accessToken, {
    from: today,
    to: today,
  })) as Array<{ id: string }>;
  return {
    user: me.user,
    subscription: me.subscription,
    todayDeliveryId: deliveries[0]?.id ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [subscription, setSubscription] = useState<AuthSubscription | null>(
    null
  );
  const [ready, setReady] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [todayDeliveryId, setTodayDeliveryId] = useState<string | null>(null);

  const applySession = useCallback(
    async (accessToken: string, presetUser?: AuthUser) => {
      saveToken(accessToken);
      setToken(accessToken);
      if (presetUser) setUser(presetUser);
      const session = await loadSession(accessToken);
      setUser(session.user);
      setSubscription(session.subscription);
      setTodayDeliveryId(session.todayDeliveryId);
      setApiOnline(true);
    },
    []
  );

  const clearSession = useCallback(() => {
    clearSavedToken();
    setToken(null);
    setUser(null);
    setSubscription(null);
    setTodayDeliveryId(null);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = (await apiClient.login({ email, password })) as {
        token: string;
        user: AuthUser;
        subscription: AuthSubscription | null;
      };
      await applySession(data.token, data.user);
      if (data.subscription) setSubscription(data.subscription);
    },
    [applySession]
  );

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      name: string;
      phone?: string;
      city: string;
      street: string;
      building: string;
      apartment: string;
    }) => {
      const data = (await apiClient.register(payload)) as {
        token: string;
        user: AuthUser;
        subscription: AuthSubscription | null;
      };
      await applySession(data.token, data.user);
      if (data.subscription) setSubscription(data.subscription);
    },
    [applySession]
  );

  const loginAsDemo = useCallback(async () => {
    await login(DEMO_EMAIL, DEMO_PASSWORD);
  }, [login]);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const refreshMe = useCallback(async () => {
    if (!token) return;
    try {
      const session = await loadSession(token);
      setUser(session.user);
      setSubscription(session.subscription);
      setTodayDeliveryId(session.todayDeliveryId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        return;
      }
      throw error;
    }
  }, [token, clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const health = await apiClient.health();
        const online = Boolean(health?.data?.databaseOk);
        if (cancelled) return;
        if (!online) {
          setApiOnline(false);
          return;
        }
        setApiOnline(true);

        const saved =
          typeof window !== "undefined"
            ? window.localStorage.getItem(TOKEN_KEY)
            : null;

        if (!saved) return;

        try {
          const session = await loadSession(saved);
          if (cancelled) return;
          setToken(saved);
          setUser(session.user);
          setSubscription(session.subscription);
          setTodayDeliveryId(session.todayDeliveryId);
        } catch (error) {
          console.warn("Saved session invalid", error);
          clearSavedToken();
        }
      } catch (error) {
        console.warn("API auth bootstrap failed", error);
        if (!cancelled) {
          setApiOnline(false);
          clearSavedToken();
          setToken(null);
          setUser(null);
          setSubscription(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const setBonusBalance = useCallback((balance: number) => {
    setUser((prev) => (prev ? { ...prev, bonusBalance: balance } : prev));
  }, []);

  const needsAuth = ready && apiOnline && !token;

  const value = useMemo(
    () => ({
      token,
      user,
      subscription,
      ready,
      apiOnline,
      todayDeliveryId,
      needsAuth,
      refreshMe,
      setBonusBalance,
      login,
      register,
      loginAsDemo,
      logout,
    }),
    [
      token,
      user,
      subscription,
      ready,
      apiOnline,
      todayDeliveryId,
      needsAuth,
      refreshMe,
      setBonusBalance,
      login,
      register,
      loginAsDemo,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
