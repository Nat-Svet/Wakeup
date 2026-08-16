"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import {
  DISHES,
  MAX_ITEM_QUANTITY,
  formatRub,
  getDeliveryTotalPieces,
  getDeliveryTotalPrice,
  upsertAdultDeliveryItem,
} from "@/data/db";
import { useApp } from "@/context/AppContext";
import type { DeliveryItem } from "@/types";

export function ReplaceModal() {
  const { replaceOpen, setReplaceOpen, saveDayItems, selectedDelivery } =
    useApp();
  const [draft, setDraft] = useState<DeliveryItem[]>([]);

  useEffect(() => {
    if (replaceOpen) {
      setDraft(selectedDelivery.items.map((item) => ({ ...item })));
    }
  }, [replaceOpen, selectedDelivery.items]);

  const totalPieces = useMemo(() => getDeliveryTotalPieces(draft), [draft]);
  const totalPrice = useMemo(() => getDeliveryTotalPrice(draft), [draft]);

  if (!replaceOpen) return null;

  const setQty = (dishId: string, quantity: number) => {
    const clamped = Math.max(0, Math.min(MAX_ITEM_QUANTITY, quantity));
    setDraft((prev) => upsertAdultDeliveryItem(prev, dishId, clamped));
  };

  const catalog = DISHES.filter((dish) => !dish.isKids);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#3D2B22]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div
        className="absolute inset-0"
        onClick={() => setReplaceOpen(false)}
        aria-hidden
      />
      <div
        className="modal-above-nav relative z-10 flex max-h-[min(78dvh,calc(100dvh-6.5rem))] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] bg-[#FFFDF9] shadow-2xl sm:max-h-[85dvh] sm:rounded-[1.75rem]"
      >
        <div className="flex shrink-0 items-center justify-between px-5 pt-5">
          <div>
            <h3 className="font-display text-2xl font-semibold text-[#3D2B22]">
              Взрослый состав
            </h3>
            <p className="mt-1 text-sm text-[#8B6B5A]">
              Детские конструкции задаются в «Детской» · {totalPieces} шт ·{" "}
              {formatRub(totalPrice)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReplaceOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F7F0E6] text-[#5C4033]"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 pb-3">
          {catalog.map((dish) => {
            const qty =
              draft.find(
                (item) => item.dishId === dish.id && !item.kidsCustom
              )?.quantity ?? 0;
            const selected = qty > 0;

            return (
              <div
                key={dish.id}
                className={`flex gap-3 rounded-2xl p-3 transition ${
                  selected
                    ? "bg-[#FCEEEE] ring-2 ring-[#E8A9A0]"
                    : "bg-white shadow-[0_8px_24px_rgba(92,64,51,0.06)]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dish.imageUrl}
                  alt={dish.name}
                  className="h-20 w-20 shrink-0 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-[#3D2B22]">{dish.name}</p>
                    <span className="shrink-0 text-sm font-extrabold text-[#5C4033]">
                      {formatRub(dish.price)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-[#8B6B5A]">
                    {dish.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {dish.isHealthy && (
                      <span className="rounded-full bg-[#E8F3E8] px-2 py-0.5 text-[10px] font-bold text-[#3D5A3D]">
                        ПП
                      </span>
                    )}
                    <span className="rounded-full bg-[#F7F0E6] px-2 py-0.5 text-[10px] font-bold text-[#8B6B5A]">
                      {dish.calories} ккал
                    </span>
                    {qty > 0 && (
                      <span className="rounded-full bg-[#FCEEEE] px-2 py-0.5 text-[10px] font-bold text-[#8B4E4E]">
                        {formatRub(dish.price * qty)}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Уменьшить ${dish.name}`}
                      onClick={() => setQty(dish.id, qty - 1)}
                      disabled={qty <= 0}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F0E6] text-[#5C4033] transition enabled:hover:bg-white disabled:opacity-35"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="min-w-8 text-center text-base font-extrabold text-[#3D2B22]">
                      {qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Увеличить ${dish.name}`}
                      onClick={() => setQty(dish.id, qty + 1)}
                      disabled={qty >= MAX_ITEM_QUANTITY}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F0E6] text-[#5C4033] transition enabled:hover:bg-white disabled:opacity-35"
                    >
                      <Plus size={16} />
                    </button>
                    {qty === 0 && (
                      <button
                        type="button"
                        onClick={() => setQty(dish.id, 1)}
                        className="ml-auto rounded-xl bg-[#5C4033] px-3 py-2 text-xs font-extrabold text-[#FFFDF9]"
                      >
                        Добавить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="shrink-0 border-t border-[#EBE4DA] bg-[#FFFDF9] px-5 py-3 sm:py-4">
          <button
            type="button"
            onClick={() => saveDayItems(draft)}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#E8A9A0] text-base font-extrabold text-[#3D2B22] transition hover:bg-[#F3C6C0]"
          >
            <Check size={20} />
            Сохранить · {totalPieces} шт · {formatRub(totalPrice)}
          </button>
        </div>
      </div>
    </div>
  );
}
