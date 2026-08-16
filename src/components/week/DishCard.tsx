"use client";

import { Minus, Plus, ShoppingBag, CreditCard, Check, Bike } from "lucide-react";
import {
  FILLING_LABELS,
  GLAZE_LABELS,
  formatRub,
  getDeliveryTotalPieces,
  getDeliveryTotalPrice,
  getDishById,
} from "@/data/db";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";

function pluralRu(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function DishCard() {
  const {
    selectedDelivery,
    setReplaceOpen,
    updateItemQuantity,
    openCheckout,
    setCheckoutOpen,
    isDeliveryPaid,
    getPaidReceipt,
    setActiveTab,
    flowHint,
    setAuthOpen,
  } = useApp();
  const { token } = useAuth();

  const requestCheckout = () => {
    if (!token) {
      setAuthOpen(true);
      return;
    }
    openCheckout();
  };
  const items = selectedDelivery.items;
  const hero = getDishById(items[0]?.dishId ?? "d1");
  const totalPieces = getDeliveryTotalPieces(items);
  const totalPrice = getDeliveryTotalPrice(items);
  const pendingKids = items.filter(
    (item) => item.kidsCustom && item.quantity === 0
  ).length;
  const firstPendingKidsId = items.find(
    (item) => item.kidsCustom && item.quantity === 0
  )?.id;
  const hasKidsLines = items.some((item) => item.kidsCustom);
  const paid = isDeliveryPaid(selectedDelivery.id);
  const receipt = getPaidReceipt(selectedDelivery.id);

  return (
    <section id="guide-order-card" className="mt-5 px-5">
      <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_16px_40px_rgba(92,64,51,0.10)]">
        <div className="relative h-52 w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero.imageUrl}
            alt={hero.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#3D2B22]/55 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {hero.isHealthy && (
                <span className="rounded-full bg-[#E8F3E8]/95 px-3 py-1 text-xs font-bold text-[#3D5A3D]">
                  ПП
                </span>
              )}
              {pendingKids > 0 && (
                <span className="rounded-full bg-[#FCEEEE]/95 px-3 py-1 text-xs font-bold text-[#8B4E4E]">
                  Детское · укажи кол-во
                </span>
              )}
              {paid && (
                <span className="rounded-full bg-[#E8F3E8]/95 px-3 py-1 text-xs font-bold text-[#3D5A3D]">
                  Оплачено
                </span>
              )}
            </div>
            {!paid && (
              <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold text-[#5C4033]">
                {totalPieces} шт · {formatRub(totalPrice)}
              </span>
            )}
          </div>
        </div>

        <div className="p-4">
          <p className="text-sm font-semibold text-[#A67C68]">
            {selectedDelivery.dayLabel}
            {selectedDelivery.isNearestBreakfast
              ? " · Ближайший завтрак"
              : selectedDelivery.isToday
                ? " · Сегодня · заказ закрыт"
                : selectedDelivery.isTomorrow
                  ? selectedDelivery.orderDisabled
                    ? " · Завтра · закрыто после 21:00"
                    : " · Завтра"
                  : ""}
          </p>
          <h3 className="font-display mt-1 text-xl font-semibold text-[#3D2B22]">
            {paid
              ? "Заказ оплачен"
              : selectedDelivery.orderDisabled
                ? "День недоступен для заказа"
                : "Собери заказ"}
          </h3>
          {hasKidsLines && !paid && (
            <p className="mt-1 text-sm leading-relaxed text-[#8B6B5A]">
              Детские конструкции приходят с количеством 0 — родитель ставит
              нужное число
            </p>
          )}
          {paid && (
            <p className="mt-1 text-sm leading-relaxed text-[#8B6B5A]">
              Состав и доставка — во вкладке «Трекер». Здесь можно завести
              будильник.
            </p>
          )}

          {flowHint && (
            <p className="mt-3 rounded-2xl bg-[#FCEEEE] px-3 py-2 text-sm font-bold text-[#8B4E4E]">
              {flowHint}
            </p>
          )}

          <ul className="mt-4 space-y-3">
            {items.length === 0 ? (
              <li className="rounded-2xl bg-[#F7F0E6] px-4 py-5 text-center text-sm font-semibold text-[#8B6B5A]">
                {paid
                  ? "Состав очищен после оплаты — заказ сохранён в трекере"
                  : "В заказе пока ничего нет — добавь выпечку"}
              </li>
            ) : (
              items.map((item) => {
                const dish = getDishById(item.dishId);
                const awaitingQty = Boolean(
                  item.kidsCustom && item.quantity === 0
                );
                const linePrice = dish.price * item.quantity;
                return (
                  <li
                    key={item.id}
                    id={
                      item.id === firstPendingKidsId
                        ? "pending-kids-qty"
                        : undefined
                    }
                    className={`flex items-center gap-3 rounded-2xl p-2.5 ${
                      awaitingQty
                        ? "bg-[#FCEEEE] ring-1 ring-[#E8A9A0]"
                        : "bg-[#F7F0E6]"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={dish.imageUrl}
                      alt={dish.name}
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-[#3D2B22]">
                        {dish.name}
                      </p>
                      {item.kidsCustom ? (
                        <p className="mt-0.5 text-xs font-semibold text-[#8B6B5A]">
                          {GLAZE_LABELS[item.kidsCustom.glaze]} ·{" "}
                          {FILLING_LABELS[item.kidsCustom.filling]}
                          {awaitingQty ? " · ждёт количество" : ""}
                        </p>
                      ) : (
                        <p className="text-xs font-semibold text-[#A67C68]">
                          {formatRub(dish.price)} ·{" "}
                          {dish.calories * item.quantity} ккал
                        </p>
                      )}
                      {item.kidsCustom && (
                        <p className="mt-0.5 text-xs font-semibold text-[#A67C68]">
                          {formatRub(dish.price)}
                          {item.quantity > 0 ? ` · ${formatRub(linePrice)}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {item.quantity > 0 && (
                        <span className="text-[11px] font-extrabold text-[#5C4033]">
                          {formatRub(linePrice)}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label={`Уменьшить ${dish.name}`}
                          onClick={() =>
                            updateItemQuantity(item.id, item.quantity - 1)
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#5C4033] transition hover:bg-[#FCEEEE]"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="min-w-7 text-center text-sm font-extrabold text-[#3D2B22]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Увеличить ${dish.name}`}
                          onClick={() =>
                            updateItemQuantity(item.id, item.quantity + 1)
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#5C4033] transition hover:bg-[#FCEEEE]"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          {!paid && (
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#F7F0E6] px-4 py-3">
              <span className="text-sm font-bold text-[#A67C68]">
                Итого · {totalPieces}{" "}
                {pluralRu(totalPieces, "шт", "шт", "шт")}
              </span>
              <span className="text-base font-extrabold text-[#3D2B22]">
                {formatRub(totalPrice)}
              </span>
            </div>
          )}

          {!paid && (
            <button
              id="guide-cart-cta"
              type="button"
              disabled={Boolean(selectedDelivery.orderDisabled)}
              onClick={() => {
                if (selectedDelivery.orderDisabled) return;
                setReplaceOpen(true);
              }}
              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FCEEEE] text-sm font-extrabold text-[#5C4033] transition hover:bg-[#F3C6C0] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShoppingBag size={18} />
              Меню
            </button>
          )}

          {paid ? (
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => setCheckoutOpen(true)}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#E8F3E8] text-sm font-extrabold text-[#3D5A3D] transition hover:bg-[#DCEFDC]"
              >
                <Check size={18} />
                Оплачено{receipt ? ` · ${receipt}` : ""} · чек
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tracker")}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FCEEEE] text-sm font-extrabold text-[#5C4033] transition hover:bg-[#F3C6C0]"
              >
                <Bike size={18} />
                Смотреть в трекере
              </button>
            </div>
          ) : (
            <button
              id="guide-pay-cta"
              type="button"
              onClick={requestCheckout}
              disabled={
                totalPieces <= 0 || Boolean(selectedDelivery.orderDisabled)
              }
              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#5C4033] text-sm font-extrabold text-[#FFFDF9] transition enabled:hover:bg-[#3D2B22] disabled:opacity-40"
            >
              <CreditCard size={18} />
              Оплатить заказ · {formatRub(totalPrice)}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
