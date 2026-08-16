"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";

type Mode = "login" | "register";

export function AuthGate({ onClose }: { onClose?: () => void }) {
  const { login, register, loginAsDemo, apiOnline } = useAuth();
  const [mode, setMode] = useState<Mode>("register");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  /** Не закрывать по клику, который только что открыл модалку. */
  const [canDismiss, setCanDismiss] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("Москва");
  const [street, setStreet] = useState("");
  const [building, setBuilding] = useState("");
  const [apartment, setApartment] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    setMounted(true);
    const t = window.setTimeout(() => setCanDismiss(true), 280);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    if (!canDismiss || !onClose) return;
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register({
          email: email.trim(),
          password,
          name: name.trim(),
          phone: phone.trim() || undefined,
          city: city.trim(),
          street: street.trim(),
          building: building.trim(),
          apartment: apartment.trim(),
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.code === "EMAIL_TAKEN"
            ? "Этот email уже зарегистрирован"
            : err.code === "INVALID_CREDENTIALS"
              ? "Неверный email или пароль"
              : err.message
        );
      } else {
        setError("Не удалось выполнить запрос");
      }
    } finally {
      setBusy(false);
    }
  };

  const demo = async () => {
    setBusy(true);
    setError(null);
    try {
      await loginAsDemo();
    } catch {
      setError("Демо-вход недоступен. Проверь seed и API.");
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#3D2B22]/45 backdrop-blur-[2px]"
        aria-label="Закрыть и продолжить как гость"
        onClick={dismiss}
      />
      <div
        className="modal-above-nav relative z-10 flex max-h-[min(78dvh,calc(100dvh-6.5rem))] w-full max-w-md flex-col overflow-y-auto rounded-t-[1.75rem] bg-[radial-gradient(ellipse_at_top,#FCEEEE_0%,#FFFDF9_55%,#F7F0E6_100%)] px-5 py-6 shadow-2xl sm:max-h-[min(92dvh,720px)] sm:rounded-[1.75rem]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {onClose && (
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={dismiss}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[#5C4033]"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <h1 className="font-display text-4xl font-semibold text-[#3D2B22]">
          Просыпайся!
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#8B6B5A]">
          {mode === "register"
            ? "Чтобы оформлять заказы — создай аккаунт. До этого можно просто полистать приложение."
            : "С возвращением. После входа откроется неделя заказов."}
        </p>

        {!apiOnline && (
          <p className="mt-4 rounded-2xl bg-[#FCEEEE] px-4 py-3 text-sm font-bold text-[#8B4E4E]">
            API недоступен — запусти сервер и обнови страницу
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-[#F7F0E6] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`rounded-xl py-2.5 text-sm font-extrabold transition ${
              mode === "register"
                ? "bg-white text-[#5C4033] shadow-sm"
                : "text-[#A67C68]"
            }`}
          >
            Регистрация
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`rounded-xl py-2.5 text-sm font-extrabold transition ${
              mode === "login"
                ? "bg-white text-[#5C4033] shadow-sm"
                : "text-[#A67C68]"
            }`}
          >
            Уже есть аккаунт
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "register" && (
            <>
              <Field label="Имя" value={name} onChange={setName} required />
              <Field label="Город" value={city} onChange={setCity} required />
              <Field label="Улица" value={street} onChange={setStreet} required />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Дом"
                  value={building}
                  onChange={setBuilding}
                  required
                />
                <Field
                  label="Квартира"
                  value={apartment}
                  onChange={setApartment}
                  required
                />
              </div>
              <Field
                label="Телефон (необязательно)"
                value={phone}
                onChange={setPhone}
                type="tel"
              />
            </>
          )}
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            required
            autoComplete="email"
          />
          <Field
            label="Пароль"
            value={password}
            onChange={setPassword}
            type="password"
            required
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            minLength={8}
            placeholder={
              mode === "register"
                ? "создай свой пароль для входа в приложение"
                : undefined
            }
          />

          {error && (
            <p className="text-sm font-bold text-[#8B4E4E]">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy || !apiOnline}
            className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#5C4033] text-sm font-extrabold text-[#FFFDF9] transition hover:bg-[#3D2B22] disabled:opacity-50"
          >
            {busy
              ? "Подождите…"
              : mode === "login"
                ? "Войти"
                : "Создать аккаунт"}
          </button>
        </form>

        <button
          type="button"
          disabled={busy || !apiOnline}
          onClick={() => void demo()}
          className="mt-3 flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#FCEEEE] text-sm font-extrabold text-[#5C4033] transition hover:bg-[#F3C6C0] disabled:opacity-50"
        >
          Войти как Анна (демо)
        </button>

        {onClose && (
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 text-center text-sm font-bold text-[#A67C68]"
          >
            Продолжить как гость
          </button>
        )}

        <p className="mt-6 pb-2 text-center text-[10px] font-medium text-[#D7C4B2]">
          <a href="/admin" className="hover:text-[#A67C68]">
            адм
          </a>
        </p>
      </div>
    </div>,
    document.body
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
  minLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-bold text-[#5C4033]">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-2xl border border-[#EBE4DA] bg-white px-4 py-3 text-sm font-semibold text-[#3D2B22] outline-none placeholder:font-medium placeholder:text-[#C4A994] focus:border-[#E8A9A0]"
      />
    </label>
  );
}
