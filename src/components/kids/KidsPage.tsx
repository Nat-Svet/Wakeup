"use client";

import { Check, PartyPopper, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { BunShape, GlazeColor, SecretFilling } from "@/types";
import { KIDS_SHAPE_TO_DISH, formatRub, getDishById } from "@/data/db";

const SHAPES: {
  id: BunShape;
  label: string;
  title: string;
  subtitle: string;
  image: string;
  emoji: string;
}[] = [
  {
    id: "bunny",
    label: "Зайчик",
    title: "Круассан-Зайчик",
    subtitle: "Герой утреннего меню",
    image: "/dishes/bunny-croissant.jpg",
    emoji: "🐰",
  },
  {
    id: "bear",
    label: "Мишка",
    title: "Круассан-Мишка",
    subtitle: "Мягкий и уютный",
    image: "/dishes/bear-croissant.jpg",
    emoji: "🐻",
  },
  {
    id: "volcano",
    label: "Краффин-вулкан",
    title: "Краффин-Вулкан",
    subtitle: "С ягодной «лавой»",
    image: "/dishes/volcano-cruffin.jpg",
    emoji: "🌋",
  },
];

const GLAZES: { id: GlazeColor; label: string; color: string }[] = [
  { id: "raspberry", label: "Розовый-малина", color: "#E8919A" },
  { id: "mango", label: "Желтый-манго", color: "#F0C75E" },
  { id: "spinach", label: "Зеленый-шпинат", color: "#7BAE7F" },
];

const DAY_ACCUSATIVE: Record<string, string> = {
  Понедельник: "понедельник",
  Вторник: "вторник",
  Среда: "среду",
  Четверг: "четверг",
  Пятница: "пятницу",
  Суббота: "субботу",
  Воскресенье: "воскресенье",
};

function dayToAccusative(dayLabel: string) {
  return DAY_ACCUSATIVE[dayLabel] ?? dayLabel.toLowerCase();
}

const FILLINGS: { id: SecretFilling; label: string; desc: string }[] = [
  {
    id: "caramel",
    label: "Домашняя карамель",
    desc: "Мягкая и тягучая",
  },
  {
    id: "banana",
    label: "Банановое пюре",
    desc: "Секретно полезно",
  },
];

function ConfettiBurst() {
  const pieces = Array.from({ length: 18 }, (_, i) => i);
  const colors = ["#E8A9A0", "#F0C75E", "#7BAE7F", "#F3C6C0", "#A67C68"];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((i) => (
        <span
          key={i}
          className="animate-confetti absolute top-4 h-2.5 w-2.5 rounded-sm"
          style={{
            left: `${8 + ((i * 5) % 84)}%`,
            backgroundColor: colors[i % colors.length],
            animationDelay: `${i * 0.04}s`,
            transform: `rotate(${i * 20}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function KidsPage() {
  const {
    kidsOrder,
    setKidsShape,
    setKidsGlaze,
    setKidsFilling,
    sendKidsConstructionToParent,
    selectedDelivery,
    selectedDayId,
    setSelectedDayId,
    deliveries,
  } = useApp();

  const selectedShape =
    SHAPES.find((shape) => shape.id === kidsOrder.shape) ?? SHAPES[0];
  const dayAccusative = dayToAccusative(selectedDelivery.dayLabel);
  const sentForSelectedDay = kidsOrder.sentForDayId === selectedDayId;

  return (
    <div className="safe-bottom relative animate-fade-in-up px-5 pb-4 pt-5">
      {sentForSelectedDay && <ConfettiBurst />}

      <div className="mb-1 flex items-center gap-2 text-[#E8A9A0]">
        <Sparkles size={18} />
        <span className="text-xs font-extrabold uppercase tracking-[0.16em]">
          Детская зона
        </span>
      </div>
      <h2 className="font-display text-3xl font-semibold text-[#3D2B22]">
        Собери свой завтрак
      </h2>
      <p className="mt-2 text-sm text-[#8B6B5A]">
        Собери форму, глазурь и начинку — количество выберет мама
      </p>

      <div className="scrollbar-hide mt-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {deliveries.map((day) => {
          const active = day.id === selectedDayId;
          const locked = Boolean(day.orderDisabled);
          return (
            <button
              key={day.id}
              type="button"
              disabled={locked}
              onClick={() => setSelectedDayId(day.id)}
              className={`min-w-[4.2rem] shrink-0 rounded-2xl px-3 py-2.5 text-center transition-all ${
                locked
                  ? "cursor-not-allowed bg-[#EBE4DA] text-[#A89A8C] opacity-80"
                  : active
                    ? "bg-[#5C4033] text-[#FFFDF9] shadow-[0_8px_20px_rgba(92,64,51,0.22)]"
                    : "bg-[#F7F0E6] text-[#5C4033] hover:bg-[#FCEEEE]"
              }`}
            >
              <span className="block text-[11px] font-bold uppercase tracking-wide opacity-80">
                {day.dayShort}
              </span>
              <span className="mt-0.5 block text-lg font-extrabold leading-none">
                {day.dayNumber}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative mt-5 overflow-hidden rounded-[1.75rem] bg-white shadow-[0_16px_40px_rgba(92,64,51,0.10)]">
        <div className="relative h-56 w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={selectedShape.id}
            src={selectedShape.image}
            alt={selectedShape.title}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#3D2B22]/50 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="font-display text-2xl font-semibold text-white">
              {selectedShape.title}
            </p>
            <p className="text-sm text-white/85">
              {selectedShape.subtitle} · {formatRub(getDishById(KIDS_SHAPE_TO_DISH[selectedShape.id]).price)}
            </p>
          </div>
        </div>
      </div>

      <section className="mt-6">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#A67C68]">
          Шаг 1 · Форма булочки
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SHAPES.map((shape) => {
            const active = kidsOrder.shape === shape.id;
            return (
              <button
                key={shape.id}
                type="button"
                onClick={() => setKidsShape(shape.id)}
                className={`flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 text-center transition ${
                  active
                    ? "bg-[#5C4033] text-[#FFFDF9] shadow-[0_10px_24px_rgba(92,64,51,0.22)]"
                    : "bg-[#F7F0E6] text-[#5C4033] hover:bg-[#FCEEEE]"
                }`}
              >
                <span className="text-2xl">{shape.emoji}</span>
                <span className="text-xs font-extrabold leading-tight">
                  {shape.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#A67C68]">
          Шаг 2 · Цвет глазури из соков
        </p>
        <div className="flex flex-wrap gap-4">
          {GLAZES.map((glaze) => {
            const active = kidsOrder.glaze === glaze.id;
            return (
              <button
                key={glaze.id}
                type="button"
                onClick={() => setKidsGlaze(glaze.id)}
                className="flex flex-col items-center gap-2"
              >
                <span
                  className={`flex h-16 w-16 items-center justify-center rounded-full transition ${
                    active
                      ? "ring-4 ring-[#E8A9A0] ring-offset-2 ring-offset-[#FFFDF9]"
                      : "ring-2 ring-transparent"
                  }`}
                  style={{ backgroundColor: glaze.color }}
                >
                  {active && <Check size={22} className="text-white drop-shadow" />}
                </span>
                <span className="max-w-[5.5rem] text-center text-xs font-bold text-[#5C4033]">
                  {glaze.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#A67C68]">
          Шаг 3 · Секретная полезная начинка
        </p>
        <div className="space-y-2">
          {FILLINGS.map((filling) => {
            const active = kidsOrder.filling === filling.id;
            return (
              <button
                key={filling.id}
                type="button"
                onClick={() => setKidsFilling(filling.id)}
                className={`flex min-h-16 w-full items-center justify-between rounded-2xl px-4 text-left transition ${
                  active
                    ? "bg-[#FCEEEE] ring-2 ring-[#E8A9A0]"
                    : "bg-[#F7F0E6] hover:bg-[#FCEEEE]"
                }`}
              >
                <span>
                  <span className="block text-sm font-extrabold text-[#3D2B22]">
                    {filling.label}
                  </span>
                  <span className="text-xs text-[#8B6B5A]">{filling.desc}</span>
                </span>
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${
                    active ? "bg-[#E8A9A0] text-[#3D2B22]" : "bg-white"
                  }`}
                >
                  {active && <Check size={14} />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <button
        type="button"
        onClick={sendKidsConstructionToParent}
        disabled={sentForSelectedDay}
        className={`mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-extrabold transition ${
          sentForSelectedDay
            ? "bg-[#3D5A3D] text-white"
            : "bg-[#E8A9A0] text-[#3D2B22] hover:bg-[#F3C6C0]"
        }`}
      >
        {sentForSelectedDay ? (
          <>
            <Check size={20} />
            Отправлено маме на {dayAccusative}!
          </>
        ) : (
          <>
            <PartyPopper size={20} />
            Готово — отправить маме на {dayAccusative}
          </>
        )}
      </button>
    </div>
  );
}
