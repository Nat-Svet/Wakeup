"use client";

import { AlarmClock, Check } from "lucide-react";
import { TIME_SLOTS } from "@/data/db";
import { useApp } from "@/context/AppContext";

export function AlarmSlots() {
  const {
    selectedDelivery,
    updateTimeSlot,
    saveAlarm,
    alarmSaved,
    isDeliveryPaid,
    openCheckout,
    flowHint,
  } = useApp();

  const paid = isDeliveryPaid(selectedDelivery.id);

  const onSlotClick = (slot: string) => {
    if (!paid) {
      openCheckout();
      return;
    }
    updateTimeSlot(slot);
  };

  const onAlarmClick = () => {
    if (!paid) {
      openCheckout();
      return;
    }
    if (alarmSaved) return;
    saveAlarm();
  };

  return (
    <section id="alarm-slots" className="mt-6 px-5">
      <div className="mb-3 flex items-center gap-2">
        <AlarmClock size={20} className="text-[#E8A9A0]" />
        <h3 className="font-display text-xl font-semibold text-[#3D2B22]">
          Умный будильник
        </h3>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-[#8B6B5A]">
        {paid
          ? alarmSaved
            ? "Будильник заведён. Чтобы сменить время — выбери другой слот и заведи снова"
            : "Выбери 15-минутный слот — привезём ещё тёплым к пробуждению"
          : "Сначала оплати заказ — затем выбери слот к пробуждению"}
      </p>

      {flowHint && (
        <p className="mb-3 rounded-2xl bg-[#FCEEEE] px-3 py-2 text-sm font-bold text-[#8B4E4E]">
          {flowHint}
        </p>
      )}

      <div
        className={`grid grid-cols-2 gap-2 transition-opacity duration-300 ${
          paid ? "opacity-100" : "opacity-70"
        }`}
      >
        {TIME_SLOTS.map((slot) => {
          const active = selectedDelivery.timeSlot === slot;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => onSlotClick(slot)}
              aria-disabled={!paid}
              className={`min-h-12 rounded-2xl px-3 text-sm font-bold transition ${
                active
                  ? paid
                    ? "bg-[#5C4033] text-[#FFFDF9] shadow-[0_8px_20px_rgba(92,64,51,0.2)]"
                    : "bg-[#EDE4D8] text-[#8B6B5A]"
                  : paid
                    ? "bg-[#F7F0E6] text-[#5C4033] hover:bg-[#FCEEEE]"
                    : "bg-[#F7F0E6]/80 text-[#A67C68] hover:bg-[#F3EBE0]"
              }`}
            >
              {slot}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAlarmClick}
        disabled={paid && alarmSaved}
        aria-disabled={!paid ? undefined : alarmSaved}
        className={`mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-extrabold transition ${
          !paid
            ? "border border-[#E8D9C8] bg-transparent text-[#A67C68] hover:border-[#E8A9A0] hover:text-[#5C4033]"
            : alarmSaved
              ? "cursor-not-allowed bg-[#E8F3E8] text-[#3D5A3D] opacity-90"
              : "bg-[#E8A9A0] text-[#3D2B22] hover:bg-[#F3C6C0]"
        }`}
      >
        {!paid ? (
          <>
            <AlarmClock size={20} />
            Завести после оплаты
          </>
        ) : alarmSaved ? (
          <>
            <Check size={20} />
            Будильник заведён
          </>
        ) : (
          <>
            <AlarmClock size={20} />
            Завести будильник
          </>
        )}
      </button>
    </section>
  );
}
