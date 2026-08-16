"use client";

import { Bike, Gift, Home } from "lucide-react";
import type { DeliveryStatus } from "@/types";
import { NEIGHBOR_SHARE_BONUS } from "@/data/tracker";

export function MicrodistrictMap({
  status,
  bonusJustAwarded,
  bonusAlreadyAwarded,
}: {
  status: DeliveryStatus;
  bonusJustAwarded: boolean;
  bonusAlreadyAwarded: boolean;
}) {
  const showBonus = bonusJustAwarded || bonusAlreadyAwarded || status === "at_door";

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] bg-[#EFE6DA] shadow-[inset_0_0_0_1px_rgba(92,64,51,0.06)]">
      <div className="relative h-64 w-full">
        <div className="absolute inset-0 opacity-80">
          <div className="absolute left-[12%] top-0 h-full w-3 rounded-full bg-[#E2D5C5]" />
          <div className="absolute left-[42%] top-0 h-full w-4 rounded-full bg-[#E6DACB]" />
          <div className="absolute left-[72%] top-0 h-full w-3 rounded-full bg-[#E2D5C5]" />
          <div className="absolute left-0 top-[22%] h-3 w-full rounded-full bg-[#E2D5C5]" />
          <div className="absolute left-0 top-[48%] h-4 w-full rounded-full bg-[#E6DACB]" />
          <div className="absolute left-0 top-[74%] h-3 w-full rounded-full bg-[#E2D5C5]" />
        </div>

        <div className="absolute left-[18%] top-[10%] h-10 w-16 rounded-xl bg-[#D9CBB8]/90" />
        <div className="absolute left-[50%] top-[12%] h-12 w-14 rounded-xl bg-[#D4C4AF]/90" />
        <div className="absolute left-[20%] top-[56%] h-14 w-14 rounded-xl bg-[#D9CBB8]/90" />
        <div className="absolute left-[78%] top-[56%] h-12 w-12 rounded-xl bg-[#D4C4AF]/90" />
        <div className="absolute left-[52%] top-[78%] h-8 w-20 rounded-xl bg-[#CFBFA9]/90" />

        <div className="absolute left-[58%] top-[30%] h-16 w-16 rounded-full bg-[#C9D6C0]/85" />
        <div className="absolute left-[64%] top-[36%] h-6 w-6 rounded-full bg-[#A8C0A0]/70" />

        <div className="absolute right-[14%] top-[18%] flex flex-col items-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5C4033] text-[#FFFDF9] shadow-lg">
            <Home size={18} />
          </span>
          <span className="mt-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-extrabold text-[#5C4033]">
            Дом Анны
          </span>
        </div>

        <div className="absolute bottom-[14%] left-[8%] rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold text-[#8B6B5A]">
          Пекарня
        </div>

        <div className={`courier-pos courier-pos-${status} absolute`}>
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-[#E8A9A0] text-[#3D2B22] shadow-[0_10px_24px_rgba(232,169,160,0.55)] ${
              status === "en_route" ? "animate-soft-pulse" : ""
            }`}
          >
            <Bike size={20} />
          </span>
        </div>
      </div>

      {showBonus && (
        <div
          className={`m-3 flex items-start gap-2 rounded-2xl px-3 py-3 shadow-sm transition ${
            bonusJustAwarded
              ? "bg-[#E8F3E8] ring-2 ring-[#7BAE7F]"
              : "bg-[#FFFDF9]/95"
          }`}
        >
          <Gift size={18} className="mt-0.5 shrink-0 text-[#E8A9A0]" />
          <p className="text-sm font-semibold leading-snug text-[#5C4033]">
            {bonusJustAwarded
              ? `Бонус соседского шеринга зачислен: +${NEIGHBOR_SHARE_BONUS} ₽`
              : bonusAlreadyAwarded
                ? `Соседский шеринг сегодня: уже начислено +${NEIGHBOR_SHARE_BONUS} ₽`
                : `Ваш дом сегодня активен! Соседский шеринг логистики: +${NEIGHBOR_SHARE_BONUS} бонусов при доставке`}
          </p>
        </div>
      )}
    </div>
  );
}
