"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Star } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import {
  FILLING_LABELS,
  GLAZE_LABELS,
  formatRub,
  getDeliveryTotalPieces,
  getDeliveryTotalPrice,
  getDishById,
} from "@/data/db";
import {
  TRACKER_STEP_MS,
  getCourierQuote,
  getEtaLabel,
  nextTrackerStatus,
} from "@/data/tracker";
import { apiClient, type TrackingPayload } from "@/lib/api-client";
import { DeliveryStepper } from "./DeliveryStepper";
import { MicrodistrictMap } from "./MicrodistrictMap";
import { CourierCard } from "./CourierCard";
import { BreakfastFeedbackModal } from "@/components/feedback/BreakfastFeedbackModal";
import type { DeliveryStatus } from "@/types";
import {
  formatDeliveryDayLine,
  type ApiDelivery,
} from "@/lib/delivery-map";
import { monthGenitiveFromYmd } from "@/lib/week-dates";

const STATUS_LABEL: Record<string, string> = {
  mixing: "Замешиваем",
  baking: "Выпекаем",
  en_route: "В пути",
  at_door: "У двери",
};

export function TrackerPage() {
  const {
    user,
    trackerDeliveries,
    trackerSelectedDelivery: selectedDelivery,
    selectedDayId,
    setSelectedDayId,
    activeTab,
    updateDeliveryStatus,
    awardNeighborShareBonus,
    resetTrackerDemo,
    neighborBonusAwardedFor,
    setBonusBalance,
    setNeighborBonusAwarded,
    apiSynced,
    mergeApiDelivery,
    isDeliveryPaid,
    getPaidPayment,
    setActiveTab,
  } = useApp();

  const deliveries = trackerDeliveries;
  const hasOrder = selectedDelivery.items.some((item) => item.quantity > 0);
  const dayPaid = isDeliveryPaid(selectedDelivery.id);
  const paidPayment = getPaidPayment(selectedDelivery.id);
  const isLiveDay =
    Boolean(selectedDelivery.isToday) && (dayPaid || hasOrder);

  const { token, apiOnline, ready } = useAuth();
  const apiDeliveryId = apiSynced && isLiveDay ? selectedDelivery.id : null;
  const useApi =
    ready && apiOnline && apiSynced && isLiveDay && Boolean(token && apiDeliveryId);

  const [bonusFlash, setBonusFlash] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackPrompted, setFeedbackPrompted] = useState(false);
  const advancingRef = useRef(false);

  const status = selectedDelivery.status;
  const eta = getEtaLabel(selectedDelivery.timeSlot, status);
  const quote = getCourierQuote(status, {
    leaveAtDoor: selectedDelivery.leaveAtDoor,
    silentPush: selectedDelivery.silentPush,
  });
  const pieces = getDeliveryTotalPieces(selectedDelivery.items);
  const totalPrice = getDeliveryTotalPrice(selectedDelivery.items);
  const bonusAwarded = Boolean(neighborBonusAwardedFor[selectedDelivery.id]);
  const dayLine = formatDeliveryDayLine(selectedDelivery);

  const orderItems = useMemo(
    () => selectedDelivery.items.filter((item) => item.quantity > 0),
    [selectedDelivery.items]
  );

  const applyTrackingPayload = useCallback(
    (payload: TrackingPayload, opts?: { showBonusToast?: boolean }) => {
      const nextStatus = payload.tracking.status as DeliveryStatus;
      mergeApiDelivery(payload.delivery as ApiDelivery);
      updateDeliveryStatus(payload.delivery.id, nextStatus);
      setNeighborBonusAwarded(
        payload.delivery.id,
        payload.tracking.neighborBonusAwarded
      );
      if (typeof payload.bonusBalance === "number") {
        setBonusBalance(payload.bonusBalance);
      }

      if (
        opts?.showBonusToast &&
        payload.bonusAwarded &&
        payload.bonusAwarded > 0
      ) {
        setBonusFlash(true);
        setToast(`+${payload.bonusAwarded} ₽ соседского шеринга начислено`);
        window.setTimeout(() => {
          setBonusFlash(false);
          setToast(null);
        }, 2800);
      }

      if (nextStatus === "at_door" && !feedbackPrompted) {
        window.setTimeout(() => {
          setFeedbackOpen(true);
          setFeedbackPrompted(true);
        }, 1200);
      }
    },
    [
      mergeApiDelivery,
      updateDeliveryStatus,
      setNeighborBonusAwarded,
      setBonusBalance,
      feedbackPrompted,
    ]
  );

  useEffect(() => {
    setFeedbackPrompted(false);
    setFeedbackOpen(false);
    setBonusFlash(false);
  }, [selectedDelivery.id]);

  // Live tracking only for today's delivery
  useEffect(() => {
    if (activeTab !== "tracker") return;
    if (!isLiveDay) return;
    if (!useApi || !token || !apiDeliveryId) return;

    let cancelled = false;
    let source: EventSource | null = null;

    async function sync() {
      try {
        const payload = await apiClient.getTracking(token!, apiDeliveryId!);
        if (cancelled) return;
        applyTrackingPayload(payload);
      } catch (error) {
        console.warn("Failed to load tracking", error);
      }
    }

    void sync();

    try {
      source = new EventSource(
        apiClient.trackingStreamUrl(token, apiDeliveryId)
      );
      source.addEventListener("tracking", (event) => {
        try {
          const data = JSON.parse(
            (event as MessageEvent).data
          ) as TrackingPayload;
          applyTrackingPayload(data);
        } catch (error) {
          console.warn("Bad SSE tracking payload", error);
        }
      });
    } catch (error) {
      console.warn("SSE unavailable, using advance polling only", error);
    }

    return () => {
      cancelled = true;
      source?.close();
    };
  }, [
    activeTab,
    isLiveDay,
    useApi,
    token,
    apiDeliveryId,
    applyTrackingPayload,
  ]);

  useEffect(() => {
    if (activeTab !== "tracker") return;
    if (!isLiveDay) return;
    if (status !== "at_door") return;
    if (feedbackPrompted) return;
    const timer = window.setTimeout(() => {
      setFeedbackOpen(true);
      setFeedbackPrompted(true);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [activeTab, isLiveDay, status, feedbackPrompted, selectedDelivery.id]);

  useEffect(() => {
    if (activeTab !== "tracker") return;
    if (!isLiveDay) return;
    if (status === "at_door") return;

    const timer = window.setTimeout(async () => {
      if (useApi && token && apiDeliveryId) {
        if (advancingRef.current) return;
        advancingRef.current = true;
        try {
          const payload = await apiClient.advanceTracking(token, apiDeliveryId);
          applyTrackingPayload(payload, { showBonusToast: true });
        } catch (error) {
          console.warn("Advance tracking failed, falling back locally", error);
          const next = nextTrackerStatus(status);
          if (!next) return;
          updateDeliveryStatus(selectedDelivery.id, next);
          if (next === "at_door") {
            const awarded = awardNeighborShareBonus(selectedDelivery.id);
            if (awarded) {
              setBonusFlash(true);
              setToast(`+50 ₽ соседского шеринга начислено`);
              window.setTimeout(() => {
                setBonusFlash(false);
                setToast(null);
              }, 2800);
            }
          }
        } finally {
          advancingRef.current = false;
        }
        return;
      }

      const next = nextTrackerStatus(status);
      if (!next) return;
      updateDeliveryStatus(selectedDelivery.id, next);

      if (next === "at_door") {
        const awarded = awardNeighborShareBonus(selectedDelivery.id);
        if (awarded) {
          setBonusFlash(true);
          setToast(`+50 ₽ соседского шеринга начислено`);
          window.setTimeout(() => {
            setBonusFlash(false);
            setToast(null);
          }, 2800);
        }
        if (!feedbackPrompted) {
          window.setTimeout(() => {
            setFeedbackOpen(true);
            setFeedbackPrompted(true);
          }, 1200);
        }
      }
    }, TRACKER_STEP_MS);

    return () => window.clearTimeout(timer);
  }, [
    activeTab,
    isLiveDay,
    status,
    selectedDelivery.id,
    updateDeliveryStatus,
    awardNeighborShareBonus,
    feedbackPrompted,
    useApi,
    token,
    apiDeliveryId,
    applyTrackingPayload,
  ]);

  const handleReset = async () => {
    if (!isLiveDay) return;
    setBonusFlash(false);
    setFeedbackPrompted(false);
    setFeedbackOpen(false);

    if (useApi && token && apiDeliveryId) {
      try {
        const payload = await apiClient.resetTracking(token, apiDeliveryId);
        applyTrackingPayload(payload);
        setToast("Демо перезапущено с этапа «Замешиваем» (API)");
        window.setTimeout(() => setToast(null), 2000);
        return;
      } catch (error) {
        console.warn("Reset tracking API failed", error);
      }
    }

    resetTrackerDemo(selectedDelivery.id);
    setToast("Демо перезапущено с этапа «Замешиваем»");
    window.setTimeout(() => setToast(null), 2000);
  };

  const liveHeadline =
    status === "at_door"
      ? `Доброе утро, ${user.name}! Завтрак уже у двери`
      : selectedDelivery.timeSlot?.trim()
        ? `Доброе утро, ${user.name}! Твой завтрак приедет ориентировочно в ${eta}`
        : `Доброе утро, ${user.name}! Выбери слот будильника на «Неделе»`;

  return (
    <div className="safe-bottom relative animate-fade-in-up px-5 pb-4 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#E8A9A0]">
            {isLiveDay ? "Трекер доставки" : "Заказ"}
            {useApi ? " · live" : ""}
          </p>
          <h2 className="font-display mt-2 text-[1.65rem] leading-snug font-semibold text-[#3D2B22]">
            {isLiveDay
              ? liveHeadline
              : `${selectedDelivery.dayLabel}, ${selectedDelivery.dayNumber} ${monthGenitiveFromYmd(selectedDelivery.date)}`}
          </h2>
          {!isLiveDay && (
            <p className="mt-2 text-sm text-[#8B6B5A]">
              {selectedDelivery.timeSlot?.trim()
                ? `Слот ${selectedDelivery.timeSlot} · живой трек — в день доставки`
                : "Слот будильника ещё не выбран · живой трек — в день доставки"}
            </p>
          )}
        </div>
        {isLiveDay && (
          <button
            type="button"
            onClick={() => {
              void handleReset();
            }}
            className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F7F0E6] text-[#5C4033]"
            aria-label="Перезапустить демо трекера"
            title="Перезапустить демо"
          >
            <RotateCcw size={18} />
          </button>
        )}
      </div>

      <div className="scrollbar-hide mt-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {deliveries.map((day) => {
          const active = day.id === selectedDayId;
          return (
            <button
              key={day.id}
              type="button"
              onClick={() => setSelectedDayId(day.id)}
              className={`min-w-[4.2rem] rounded-2xl px-3 py-2.5 text-center transition-all ${
                active
                  ? "bg-[#5C4033] text-[#FFFDF9] shadow-[0_8px_20px_rgba(92,64,51,0.22)]"
                  : "bg-[#F7F0E6] text-[#5C4033] hover:bg-[#FCEEEE]"
              }`}
            >
              <span className="block text-[11px] font-bold uppercase tracking-wide opacity-80">
                {day.isToday ? "Сег" : day.dayShort}
              </span>
              <span className="mt-0.5 block text-lg font-extrabold leading-none">
                {day.dayNumber}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl bg-[#F7F0E6] px-4 py-3">
        <p className="text-xs font-extrabold uppercase tracking-wide text-[#A67C68]">
          {dayLine}
        </p>
        {isLiveDay && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedDelivery.leaveAtDoor && (
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-[#5C4033]">
                У двери
              </span>
            )}
            {selectedDelivery.silentPush && (
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-[#5C4033]">
                Тихий пуш
              </span>
            )}
            <span className="rounded-full bg-[#FCEEEE] px-2.5 py-1 text-[10px] font-extrabold text-[#8B4E4E]">
              {STATUS_LABEL[status]}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-[1.75rem] bg-white shadow-[0_16px_40px_rgba(92,64,51,0.08)]">
        <ul className="divide-y divide-[#F0E8DC]">
          {orderItems.length === 0 ? (
            <li className="px-4 py-5 text-sm font-semibold text-[#8B6B5A]">
              {dayPaid
                ? "Оплаченный заказ пуст"
                : "Здесь появляются только оплаченные заказы. Собери заказ во вкладке «Неделя» и оплати."}
              {!dayPaid && (
                <button
                  type="button"
                  onClick={() => setActiveTab("week")}
                  className="mt-3 flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#FCEEEE] text-sm font-extrabold text-[#5C4033]"
                >
                  К неделе → оплатить
                </button>
              )}
            </li>
          ) : (
            orderItems.map((item) => {
              const dish = getDishById(item.dishId);
              const line = dish.price * item.quantity;
              return (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dish.imageUrl}
                    alt={dish.name}
                    className="h-12 w-12 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[#3D2B22]">
                      {dish.name} ×{item.quantity}
                    </p>
                    {item.kidsCustom ? (
                      <p className="mt-0.5 text-xs font-semibold text-[#8B6B5A]">
                        {GLAZE_LABELS[item.kidsCustom.glaze]} ·{" "}
                        {FILLING_LABELS[item.kidsCustom.filling]}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs font-semibold text-[#A67C68]">
                        {formatRub(dish.price)} / шт
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-extrabold text-[#5C4033]">
                    {formatRub(line)}
                  </span>
                </li>
              );
            })
          )}
        </ul>
        <div className="space-y-2 border-t border-[#F0E8DC] bg-[#FFFDF9] px-4 py-3">
          {dayPaid && paidPayment ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#A67C68]">
                  Товары · {pieces} шт
                </span>
                <span className="text-sm font-extrabold text-[#3D2B22]">
                  {formatRub(paidPayment.itemsTotal)}
                </span>
              </div>
              {paidPayment.bonusSpent > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#A67C68]">
                    Списано бонусов
                  </span>
                  <span className="text-sm font-extrabold text-[#3D5A3D]">
                    −{formatRub(paidPayment.bonusSpent)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#A67C68]">
                  По чеку
                  {paidPayment.receiptCode
                    ? ` · № ${paidPayment.receiptCode}`
                    : ""}
                </span>
                <span className="text-base font-extrabold text-[#3D2B22]">
                  {formatRub(paidPayment.amountPaid)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#F7F0E6] px-3 py-2">
                <span className="text-sm font-bold text-[#8B6B5A]">
                  Остаток баллов
                </span>
                <span className="text-sm font-extrabold text-[#5C4033]">
                  {formatRub(user.bonusBalance)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#A67C68]">
                Итого · {pieces} шт
              </span>
              <span className="text-base font-extrabold text-[#3D2B22]">
                {formatRub(totalPrice)}
              </span>
            </div>
          )}
        </div>
      </div>

      {isLiveDay && (
        <>
          <div className="mt-5">
            <DeliveryStepper current={status} />
          </div>

          <div className="mt-5">
            <MicrodistrictMap
              status={status}
              bonusJustAwarded={bonusFlash}
              bonusAlreadyAwarded={bonusAwarded}
            />
          </div>

          <div className="mt-5">
            <CourierCard quote={quote} statusLabel={STATUS_LABEL[status]} />
          </div>

          {status === "at_door" && (
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#FCEEEE] text-base font-extrabold text-[#5C4033] transition hover:bg-[#F3C6C0]"
            >
              <Star size={18} className="fill-[#E8A9A0] text-[#E8A9A0]" />
              Оценить завтрак
            </button>
          )}

          <BreakfastFeedbackModal
            open={feedbackOpen}
            onClose={() => setFeedbackOpen(false)}
          />

          {toast && (
            <div className="fixed inset-x-0 bottom-24 z-[80] mx-auto w-[min(92%,24rem)] rounded-2xl bg-[#5C4033] px-4 py-3 text-center text-sm font-extrabold text-[#FFFDF9] shadow-lg">
              {toast}
            </div>
          )}
        </>
      )}
    </div>
  );
}
