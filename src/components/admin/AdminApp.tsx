"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  LogOut,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { AdminOverview } from "./AdminOverview";
import { AdminDishes } from "./AdminDishes";
import { AdminOrders } from "./AdminOrders";
import { AdminUsers } from "./AdminUsers";

const TOKEN_KEY = "prosyvaisya_admin_token";

type AdminTab = "overview" | "dishes" | "orders" | "users";

type AdminSession = {
  token: string;
  name: string;
  email: string;
};

const TABS: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Обзор", icon: LayoutDashboard },
  { id: "dishes", label: "Блюда", icon: ShoppingBag },
  { id: "orders", label: "Заказы", icon: Package },
  { id: "users", label: "Пользователи", icon: Users },
];

export function AdminApp() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [email, setEmail] = useState("admin@prosyvaisya.local");
  const [password, setPassword] = useState("demo12345");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const boot = useCallback(async () => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem(TOKEN_KEY)
        : null;
    if (!saved) {
      setReady(true);
      return;
    }
    try {
      const me = (await apiClient.getMe(saved)) as {
        user: { name: string; email: string; role?: string };
      };
      if (me.user.role !== "admin") {
        window.localStorage.removeItem(TOKEN_KEY);
        setSession(null);
      } else {
        setSession({
          token: saved,
          name: me.user.name,
          email: me.user.email,
        });
      }
    } catch {
      window.localStorage.removeItem(TOKEN_KEY);
      setSession(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = (await apiClient.login({ email, password })) as {
        token: string;
        user: { name: string; email: string; role?: string };
      };
      if (data.user.role !== "admin") {
        setError("Нужен аккаунт с ролью admin");
        return;
      }
      window.localStorage.setItem(TOKEN_KEY, data.token);
      setSession({
        token: data.token,
        name: data.user.name,
        email: data.user.email,
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Не удалось войти. Проверь API и seed."
      );
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    setSession(null);
  };

  const content = useMemo(() => {
    if (!session) return null;
    switch (tab) {
      case "overview":
        return <AdminOverview token={session.token} />;
      case "dishes":
        return <AdminDishes token={session.token} />;
      case "orders":
        return <AdminOrders token={session.token} />;
      case "users":
        return <AdminUsers token={session.token} />;
    }
  }, [session, tab]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F0E6] text-[#8B6B5A]">
        Загрузка…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#FCEEEE,#F7F0E6_45%,#EFE6DA)] px-4">
        <form
          onSubmit={login}
          className="w-full max-w-md rounded-[1.75rem] bg-[#FFFDF9] p-6 shadow-[0_20px_50px_rgba(92,64,51,0.12)]"
        >
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E8A9A0]">
            Просыпайся!
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold text-[#3D2B22]">
            Админка
          </h1>
          <p className="mt-2 text-sm text-[#8B6B5A]">
            Войди как admin@prosyvaisya.local / demo12345
          </p>
          <label className="mt-5 block text-sm font-bold text-[#5C4033]">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-[#EBE4DA] bg-white px-4 py-3 text-sm outline-none focus:border-[#E8A9A0]"
              required
            />
          </label>
          <label className="mt-3 block text-sm font-bold text-[#5C4033]">
            Пароль
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-[#EBE4DA] bg-white px-4 py-3 text-sm outline-none focus:border-[#E8A9A0]"
              required
            />
          </label>
          {error && (
            <p className="mt-3 text-sm font-bold text-[#8B4E4E]">{error}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#5C4033] text-sm font-extrabold text-[#FFFDF9] transition hover:bg-[#3D2B22] disabled:opacity-50"
          >
            {busy ? "Входим…" : "Войти"}
          </button>
          <Link
            href="/"
            className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-[#A67C68] hover:text-[#5C4033]"
          >
            <ArrowLeft size={16} />К приложению
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F0E6]">
      <header className="border-b border-[#EBE4DA] bg-[#FFFDF9]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E8A9A0]">
              Просыпайся!
            </p>
            <h1 className="font-display text-2xl font-semibold text-[#3D2B22]">
              Админка
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#FCEEEE] px-3 py-1.5 text-xs font-bold text-[#5C4033]">
              {session.name} · {session.email}
            </span>
            <Link
              href="/"
              className="rounded-full bg-[#F7F0E6] px-3 py-1.5 text-xs font-bold text-[#5C4033] hover:bg-[#F3C6C0]"
            >
              Приложение
            </Link>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1 rounded-full bg-[#5C4033] px-3 py-1.5 text-xs font-bold text-[#FFFDF9]"
            >
              <LogOut size={14} />
              Выйти
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl px-4 pb-3">
          <ul className="flex flex-wrap gap-2">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setTab(id)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold transition ${
                      active
                        ? "bg-[#FCEEEE] text-[#5C4033]"
                        : "bg-white text-[#A67C68] hover:bg-[#F7F0E6]"
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{content}</main>
    </div>
  );
}
