"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, LogIn, Save, Shield, Trash2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatRub } from "@/data/db";
import { formatUserAddress } from "@/lib/serializers";
import { OrderHistorySection } from "@/components/account/OrderHistory";

export function AccountPage() {
  const {
    user: authUser,
    subscription: authSub,
    logout,
    refreshMe,
    token,
  } = useAuth();
  const { applyAuthProfile, resetClientSession, setAuthOpen } = useApp();

  const [name, setName] = useState(authUser?.name ?? "");
  const [city, setCity] = useState(authUser?.city ?? "");
  const [street, setStreet] = useState(authUser?.street ?? "");
  const [building, setBuilding] = useState(authUser?.building ?? "");
  const [apartment, setApartment] = useState(authUser?.apartment ?? "");
  const [phone, setPhone] = useState(authUser?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    setName(authUser.name);
    setCity(authUser.city ?? "");
    setStreet(authUser.street ?? "");
    setBuilding(authUser.building);
    setApartment(authUser.apartment);
    setPhone(authUser.phone ?? "");
  }, [authUser]);

  if (!authUser) {
    return (
      <div className="safe-bottom animate-fade-in-up px-5 pb-8 pt-5">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E8A9A0]">
          Аккаунт
        </p>
        <h2 className="font-display mt-1 text-3xl font-semibold text-[#3D2B22]">
          Гостевой режим
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#8B6B5A]">
          Ты можешь полистать неделю, меню и трекер. Чтобы оформлять заказы и
          копить бонусы — войди или создай аккаунт.
        </p>
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#5C4033] text-sm font-extrabold text-[#FFFDF9] transition hover:bg-[#3D2B22]"
        >
          <LogIn size={18} />
          Войти или зарегистрироваться
        </button>
      </div>
    );
  }

  const save = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = (await apiClient.updateMe(token, {
        name: name.trim(),
        city: city.trim(),
        street: street.trim(),
        building: building.trim(),
        apartment: apartment.trim(),
        phone: phone.trim() ? phone.trim() : null,
      })) as {
        user: {
          id: string;
          name: string;
          city: string;
          street: string;
          building: string;
          apartment: string;
          bonusBalance: number;
          avatarInitials: string;
          phone?: string | null;
        };
        subscription: typeof authSub;
      };
      await refreshMe();
      applyAuthProfile(updated.user, updated.subscription);
      setMessage("Профиль сохранён");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.deleteMe(token);
      resetClientSession();
      logout();
      setDeleteOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось удалить аккаунт"
      );
      setBusy(false);
    }
  };

  return (
    <div className="safe-bottom animate-fade-in-up px-5 pb-8 pt-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E8A9A0]">
        Аккаунт
      </p>
      <h2 className="font-display mt-1 text-3xl font-semibold text-[#3D2B22]">
        Профиль
      </h2>

      <div className="mt-5 flex items-center gap-3 rounded-[1.5rem] bg-[#F7F0E6] px-4 py-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#F3C6C0] to-[#E8A9A0] text-lg font-bold text-[#3D2B22]">
          {authUser.avatarInitials}
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-[#3D2B22]">{authUser.name}</p>
          <p className="text-sm font-semibold text-[#8B6B5A]">{authUser.email}</p>
          <p className="mt-0.5 text-xs font-bold text-[#A67C68]">
            Бонусы · {formatRub(authUser.bonusBalance)}
          </p>
          <p className="mt-1 text-xs font-semibold leading-snug text-[#8B6B5A]">
            {formatUserAddress(authUser)}
          </p>
        </div>
      </div>

      <OrderHistorySection />

      <div className="mt-5 space-y-3">
        <Field label="Имя" value={name} onChange={setName} />
        <Field label="Город" value={city} onChange={setCity} />
        <Field label="Улица" value={street} onChange={setStreet} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Дом" value={building} onChange={setBuilding} />
          <Field label="Квартира" value={apartment} onChange={setApartment} />
        </div>
        <Field label="Телефон" value={phone} onChange={setPhone} type="tel" />
      </div>

      {error && (
        <p className="mt-3 text-sm font-bold text-[#8B4E4E]">{error}</p>
      )}
      {message && (
        <p className="mt-3 text-sm font-bold text-[#3D5A3D]">{message}</p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#5C4033] text-sm font-extrabold text-[#FFFDF9] disabled:opacity-50"
      >
        <Save size={16} />
        Сохранить профиль
      </button>

      {authUser.role === "admin" && (
        <Link
          href="/admin"
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FCEEEE] text-sm font-extrabold text-[#5C4033]"
        >
          <Shield size={16} />
          Открыть админку
        </Link>
      )}

      <button
        type="button"
        onClick={logout}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#3D2B22] text-sm font-extrabold text-[#FFFDF9]"
      >
        <LogOut size={16} />
        Выйти
      </button>

      <button
        type="button"
        onClick={() => setDeleteOpen(true)}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#E8A9A0] text-sm font-extrabold text-[#8B4E4E]"
      >
        <Trash2 size={16} />
        Удалить аккаунт
      </button>

      {deleteOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#3D2B22]/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div className="absolute inset-0" onClick={() => !busy && setDeleteOpen(false)} aria-hidden />
          <div className="modal-above-nav relative z-10 max-h-[min(78dvh,calc(100dvh-6.5rem))] w-full max-w-md overflow-y-auto rounded-t-[1.75rem] bg-[#FFFDF9] p-5 shadow-2xl sm:max-h-[85dvh] sm:rounded-[1.75rem]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E8A9A0]">
                  Удаление
                </p>
                <h3 className="font-display mt-1 text-2xl font-semibold text-[#3D2B22]">
                  Удалить аккаунт?
                </h3>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeleteOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F0E6] text-[#5C4033]"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#8B6B5A]">
              Будут безвозвратно удалены профиль, заказы, оплаты,
              бонусы и отзывы. Восстановить данные нельзя.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteAccount()}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#8B4E4E] text-sm font-extrabold text-white disabled:opacity-50"
              >
                <Trash2 size={16} />
                {busy ? "Удаляем…" : "Да, удалить всё"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeleteOpen(false)}
                className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#F7F0E6] text-sm font-extrabold text-[#5C4033]"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm font-bold text-[#5C4033]">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-2xl border border-[#EBE4DA] bg-white px-4 py-3 text-sm font-semibold text-[#3D2B22] outline-none focus:border-[#E8A9A0]"
      />
    </label>
  );
}
