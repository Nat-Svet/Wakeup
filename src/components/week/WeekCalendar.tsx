"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  DEADLINE_PASSED_BANNER,
  isPastOrderDeadline,
  monthGenitiveFromYmd,
} from "@/lib/week-dates";

export function WeekCalendar() {
  const {
    deliveries,
    selectedDayId,
    setSelectedDayId,
    isDeliveryPaid,
  } = useApp();
  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const [nowTick, setNowTick] = useState(() => new Date());

  // Обновляем правила около дедлайна 21:00
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const pastDeadline = useMemo(
    () => isPastOrderDeadline(nowTick),
    [nowTick]
  );

  const rangeLabel =
    deliveries.length > 0
      ? `${deliveries[0]!.dayNumber}–${deliveries[deliveries.length - 1]!.dayNumber} ${monthGenitiveFromYmd(deliveries[deliveries.length - 1]!.date)}`
      : "";

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selectedDayId, deliveries.length]);

  return (
    <section id="guide-week-calendar" className="mt-5">
      <div className="mb-3 flex items-end justify-between px-5">
        <h2 className="font-display text-2xl font-semibold text-[#3D2B22]">
          Моя неделя
        </h2>
        <p className="text-sm font-semibold text-[#A67C68]">{rangeLabel}</p>
      </div>

      {pastDeadline && (
        <div className="mx-5 mb-3 rounded-2xl bg-[#5C4033] px-3.5 py-3 text-sm font-extrabold leading-snug text-[#FFFDF9] shadow-[0_8px_20px_rgba(92,64,51,0.22)] ring-1 ring-[#E8A9A0]/50">
          {DEADLINE_PASSED_BANNER}
        </div>
      )}

      <div className="scrollbar-hide flex touch-pan-x gap-2 overflow-x-auto overscroll-x-contain px-5 pb-2 [-webkit-overflow-scrolling:touch]">
        {deliveries.map((day) => {
          const selected = day.id === selectedDayId;
          const paid = isDeliveryPaid(day.id);
          const hasDraft = day.items.some((item) => item.quantity > 0);
          const locked = Boolean(day.orderDisabled);
          const badge = day.calendarBadge ?? null;

          return (
            <button
              key={day.id}
              ref={selected ? selectedRef : undefined}
              type="button"
              disabled={locked}
              onClick={() => {
                if (locked) return;
                setSelectedDayId(day.id);
              }}
              aria-disabled={locked}
              title={
                locked
                  ? day.isToday
                    ? "Заказ день в день недоступен — печём ночью под заказы накануне"
                    : day.isTomorrow && pastDeadline
                      ? "Дедлайн 21:00 пройден — на завтра заказы закрыты"
                      : "День вне окна планирования"
                  : undefined
              }
              className={`w-[4.65rem] shrink-0 rounded-2xl px-2 py-3 text-center transition-all ${
                locked
                  ? "cursor-not-allowed bg-[#EBE4DA] text-[#A89A8C] opacity-80"
                  : selected
                    ? day.isNearestBreakfast
                      ? "bg-[#5C4033] text-[#FFFDF9] shadow-[0_10px_24px_rgba(92,64,51,0.28)] ring-2 ring-[#E8A9A0]"
                      : "bg-[#5C4033] text-[#FFFDF9] shadow-[0_10px_24px_rgba(92,64,51,0.25)]"
                    : day.isNearestBreakfast
                      ? "bg-[#FCEEEE] text-[#5C4033] ring-2 ring-[#E8A9A0] hover:bg-[#F3C6C0]"
                      : "bg-[#F7F0E6] text-[#5C4033] hover:bg-[#FCEEEE]"
              }`}
            >
              <span className="block text-[11px] font-bold uppercase tracking-wide opacity-80">
                {day.dayShort}
              </span>
              <span className="mt-1 block text-xl font-extrabold leading-none">
                {day.dayNumber}
              </span>
              {badge && (
                <span
                  className={`mt-2 block text-[9px] font-bold leading-tight ${
                    locked
                      ? "text-[#9A8B7C]"
                      : selected
                        ? "text-[#F3C6C0]"
                        : day.isNearestBreakfast
                          ? "text-[#C45C4A]"
                          : "text-[#E8A9A0]"
                  }`}
                >
                  {badge}
                </span>
              )}
              <span
                className={`mt-1.5 block text-[9px] font-bold ${
                  locked
                    ? "text-[#9A8B7C]"
                    : selected
                      ? "text-[#E8D9C8]"
                      : "text-[#A67C68]"
                }`}
              >
                {locked
                  ? day.isToday
                    ? "закрыто"
                    : "недоступно"
                  : paid
                    ? "оплачен"
                    : hasDraft
                      ? "заказ"
                      : "пусто"}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-1 px-5 text-[11px] font-semibold text-[#A67C68]">
        Доставка день в день недоступна. Завтрак на любой из ближайших 6 дней нужно оформить до 21:00 накануне
      </p>
    </section>
  );
}
