"use client";

import Link from "next/link";
import { Bell, LogIn } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";

export function WeekHeader() {
  const { user, setActiveTab, setAuthOpen } = useApp();
  const { token } = useAuth();
  const isGuest = !token;

  return (
    <header className="flex items-center justify-between gap-3 px-5 pt-5">
      {isGuest ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setAuthOpen(true);
          }}
          className="flex min-w-0 items-center gap-3 text-left"
          aria-label="Войти или зарегистрироваться"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#F7F0E6] to-[#E8D9C8] text-sm font-extrabold text-[#8B6B5A] shadow-sm">
            ?
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A67C68]">
              Гость
            </p>
            <p className="truncate text-sm font-extrabold leading-tight text-[#3D2B22]">
              Полистай приложение
            </p>
            <p className="text-[11px] font-semibold text-[#A67C68]">
              нажми, чтобы войти
            </p>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setActiveTab("account")}
          className="flex items-center gap-3 text-left"
          aria-label="Открыть профиль"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#F3C6C0] to-[#E8A9A0] text-lg font-bold text-[#3D2B22] shadow-sm">
            {user.avatarInitials}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A67C68]">
              {user.name}
            </p>
            <p className="text-lg font-extrabold leading-tight text-[#3D2B22]">
              {user.bonusBalance} ₽
            </p>
            <p className="text-[11px] font-semibold text-[#A67C68]">бонусы</p>
          </div>
        </button>
      )}
      <div className="flex items-center gap-1.5">
        <Link
          href="/admin"
          className="px-1 py-2 text-[9px] font-medium tracking-wide text-[#D7C4B2] transition hover:text-[#A67C68]"
          title="Админка"
          aria-label="Админка"
        >
          адм
        </Link>
        {isGuest ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setAuthOpen(true);
            }}
            className="relative z-[80] flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#5C4033] text-[#FFFDF9] shadow-sm transition hover:bg-[#3D2B22] active:scale-95"
            aria-label="Войти или зарегистрироваться"
            title="Войти"
          >
            <LogIn size={20} />
          </button>
        ) : (
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F7F0E6] text-[#5C4033] transition hover:bg-[#FCEEEE]"
            aria-label="Уведомления"
          >
            <Bell size={20} />
          </button>
        )}
      </div>
    </header>
  );
}
