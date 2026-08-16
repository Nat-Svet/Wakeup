"use client";

import { DoorOpen, BellOff } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function ConciergeOptions() {
  const { selectedDelivery, toggleLeaveAtDoor, toggleSilentPush } = useApp();

  return (
    <section className="mt-6 px-5 pb-2">
      <h3 className="font-display text-xl font-semibold text-[#3D2B22]">
        Умный консьерж
      </h3>
      <p className="mt-1 text-sm text-[#8B6B5A]">
        Настройки доставки «до ручки двери»
      </p>

      <div className="mt-4 space-y-3">
        <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl bg-[#F7F0E6] px-4 py-3">
          <input
            type="checkbox"
            checked={selectedDelivery.leaveAtDoor}
            onChange={toggleLeaveAtDoor}
            className="peer sr-only"
          />
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition ${
              selectedDelivery.leaveAtDoor
                ? "border-[#E8A9A0] bg-[#E8A9A0] text-[#3D2B22]"
                : "border-[#D7C4B2] bg-white"
            }`}
          >
            {selectedDelivery.leaveAtDoor && <DoorOpen size={14} />}
          </span>
          <span className="text-sm font-bold text-[#3D2B22]">
            Оставить на ручке двери
          </span>
        </label>

        <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl bg-[#F7F0E6] px-4 py-3">
          <input
            type="checkbox"
            checked={selectedDelivery.silentPush}
            onChange={toggleSilentPush}
            className="peer sr-only"
          />
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition ${
              selectedDelivery.silentPush
                ? "border-[#E8A9A0] bg-[#E8A9A0] text-[#3D2B22]"
                : "border-[#D7C4B2] bg-white"
            }`}
          >
            {selectedDelivery.silentPush && <BellOff size={14} />}
          </span>
          <span className="text-sm font-bold text-[#3D2B22]">
            Тихое пуш-уведомление (без звонка в дверь)
          </span>
        </label>
      </div>

      <div className="mt-5 rounded-2xl border border-[#F3C6C0]/80 bg-[#FCEEEE] px-4 py-3 text-sm font-semibold text-[#5C4033]">
        Изменения принимаются сегодня до 21:00
      </div>
    </section>
  );
}
