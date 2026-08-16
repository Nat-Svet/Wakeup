"use client";

import { useMemo } from "react";
import { Baby, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getDishById } from "@/data/db";

const JOKES = [
  {
    title: "Про самого главного — забыли!",
    body: "Детская позиция с «0». Без главного героя заказ не состоится.",
    emoji: "🌟",
  },
  {
    title: "Главного не посчитали",
    body: "Всё готово, а звезда заказа — 0 шт. Укажи количество!",
    emoji: "👑",
  },
  {
    title: "Ой, забыли героя!",
    body: "Взрослый заказ ок, а про самого важного — тишина. Поставь число.",
    emoji: "🐰",
  },
  {
    title: "Звезда без билета",
    body: "Главный круассан ждёт свою цифру. Ноль — не порция!",
    emoji: "🎭",
  },
] as const;

export function KidsQtyWarningModal() {
  const {
    kidsQtyWarningOpen,
    dismissKidsQtyWarning,
    fixPendingKidsQuantity,
    selectedDelivery,
  } = useApp();

  const pending = useMemo(
    () =>
      selectedDelivery.items.filter(
        (item) => item.kidsCustom && item.quantity === 0
      ),
    [selectedDelivery.items]
  );

  const joke = useMemo(() => {
    const index = pending.length % JOKES.length;
    return JOKES[index] ?? JOKES[0];
  }, [pending.length]);

  if (!kidsQtyWarningOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#3D2B22]/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div
        className="absolute inset-0"
        onClick={dismissKidsQtyWarning}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kids-qty-warning-title"
        className="modal-above-nav relative z-10 max-h-[min(78dvh,calc(100dvh-6.5rem))] w-full max-w-md animate-fade-in-up overflow-y-auto rounded-t-[1.75rem] bg-[#FFFDF9] shadow-2xl sm:max-h-[85dvh] sm:rounded-[1.75rem]"
      >
        <div className="relative bg-gradient-to-br from-[#FCEEEE] via-[#FFFDF9] to-[#F7F0E6] px-5 pb-4 pt-5">
          <button
            type="button"
            onClick={dismissKidsQtyWarning}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[#5C4033]"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>

          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-3xl shadow-sm">
            {joke.emoji}
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#E8A9A0]">
            <Baby size={14} />
            Заказ на паузе
          </p>
          <h3
            id="kids-qty-warning-title"
            className="font-display mt-2 text-2xl font-semibold text-[#3D2B22]"
          >
            {joke.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#8B6B5A]">
            {joke.body}
          </p>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#A67C68]">
            Ждут количество · {pending.length}
          </p>
          <ul className="mt-2 space-y-2">
            {pending.map((item) => {
              const dish = getDishById(item.dishId);
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl bg-[#F7F0E6] px-3 py-2.5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dish.imageUrl}
                    alt={dish.name}
                    className="h-11 w-11 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[#3D2B22]">
                      {dish.name}
                    </p>
                    <p className="text-xs font-semibold text-[#8B4E4E]">
                      главный в заказе · сейчас 0 шт
                    </p>
                  </div>
                  <span className="text-lg font-extrabold text-[#E8A9A0]">0</span>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={fixPendingKidsQuantity}
            className="mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#E8A9A0] text-base font-extrabold text-[#3D2B22] transition hover:bg-[#F3C6C0]"
          >
            К позициям без количества
          </button>
          <button
            type="button"
            onClick={dismissKidsQtyWarning}
            className="mt-2 flex min-h-12 w-full items-center justify-center rounded-2xl text-sm font-bold text-[#A67C68] transition hover:bg-[#F7F0E6]"
          >
            Ладно, чуть позже
          </button>
        </div>
      </div>
    </div>
  );
}
