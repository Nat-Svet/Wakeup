"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CreditCard, FileText, Sparkles, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import {
  formatRub,
  getDeliveryTotalPrice,
  getPendingKidsItems,
  hasPendingKidsQuantity,
} from "@/data/db";
import { apiClient, ApiError, type PaymentDto } from "@/lib/api-client";
import { fetchReceiptHtml } from "@/lib/receipt-download";
import { monthGenitiveFromYmd } from "@/lib/week-dates";
import { ReceiptViewerModal } from "@/components/account/ReceiptViewerModal";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
}

export function CheckoutModal({ open, onClose }: CheckoutModalProps) {
  const {
    selectedDelivery,
    user,
    setBonusBalance,
    openKidsQtyWarning,
    markDeliveryPaid,
    finalizePaidDelivery,
    syncWeekDraftToApi,
    isDeliveryPaid,
    setAuthOpen,
  } = useApp();
  const { token, apiOnline } = useAuth();

  const itemsTotal = getDeliveryTotalPrice(selectedDelivery.items);
  const maxBonus = Math.min(user.bonusBalance, itemsTotal);
  const [bonusToSpend, setBonusToSpend] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paidPayment, setPaidPayment] = useState<PaymentDto | null>(null);
  const [receiptHtml, setReceiptHtml] = useState<string | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);

  const amountDue = itemsTotal - bonusToSpend;
  const alreadyPaid = isDeliveryPaid(selectedDelivery.id);

  useEffect(() => {
    if (!open || token) return;
    onClose();
    setAuthOpen(true);
  }, [open, token, onClose, setAuthOpen]);

  const closeAndFocusAlarm = () => {
    onClose();
    window.setTimeout(() => {
      document.getElementById("alarm-slots")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPaidPayment(null);
    setBonusToSpend(0);
  }, [open, selectedDelivery.id, user.bonusBalance, itemsTotal]);

  useEffect(() => {
    if (!open || !token || !apiOnline) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiClient.getPayments(token, {
          deliveryId: selectedDelivery.id,
        });
        if (cancelled) return;
        const paid = data.payments.find((p) => p.status === "paid");
        if (paid) {
          markDeliveryPaid(selectedDelivery.id, {
            receipt: paid.receiptCode ?? true,
            itemsTotal: paid.itemsTotal,
            bonusSpent: paid.bonusSpent,
            amountPaid: paid.amountPaid,
            paymentId: paid.id,
          });
          setPaidPayment(paid);
        }
      } catch {
        // ignore — local paid flag still works
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, token, apiOnline, selectedDelivery.id, markDeliveryPaid]);

  const pendingKids = useMemo(
    () => getPendingKidsItems(selectedDelivery.items),
    [selectedDelivery.items]
  );

  const handleOpenReceipt = async () => {
    if (!token || !paidPayment) return;
    setError(null);
    setReceiptBusy(true);
    try {
      const html = await fetchReceiptHtml(token, paidPayment.id);
      setReceiptHtml(html);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось открыть чек"
      );
    } finally {
      setReceiptBusy(false);
    }
  };

  if (!open) return null;

  const handlePay = async () => {
    setError(null);
    if (hasPendingKidsQuantity(selectedDelivery.items)) {
      openKidsQtyWarning();
      return;
    }
    if (itemsTotal <= 0) {
      setError("Заказ пуст — добавь выпечку");
      return;
    }
    if (!token || !apiOnline) {
      setError("API недоступен — перезапусти сервер");
      return;
    }

    setBusy(true);
    try {
      await syncWeekDraftToApi(selectedDelivery.id);

      const idempotencyKey = `chk-${selectedDelivery.id}-${Date.now()}`;
      const created = await apiClient.checkout(token, {
        deliveryId: selectedDelivery.id,
        bonusToSpend,
        idempotencyKey,
      });
      const confirmed = await apiClient.confirmPayment(
        token,
        created.payment.id
      );
      setBonusBalance(confirmed.bonusBalance);
      await finalizePaidDelivery(selectedDelivery.id, {
        receipt: confirmed.payment.receiptCode ?? true,
        itemsTotal: confirmed.payment.itemsTotal,
        bonusSpent: confirmed.payment.bonusSpent,
        amountPaid: confirmed.payment.amountPaid,
        paymentId: confirmed.payment.id,
      });
      setPaidPayment(confirmed.payment);
    } catch (err) {
      let message = "Не удалось оплатить. Попробуй ещё раз.";
      if (err instanceof ApiError) {
        if (err.message === "Checkout failed" || err.status === 500) {
          message =
            "Оплата временно недоступна. Перезапусти npm run dev и попробуй снова.";
        } else {
          message = err.message;
        }
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-[#3D2B22]/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="modal-above-nav relative z-10 max-h-[min(78dvh,calc(100dvh-6.5rem))] w-full max-w-md animate-fade-in-up overflow-y-auto rounded-t-[1.75rem] bg-[#FFFDF9] shadow-2xl sm:max-h-[85dvh] sm:rounded-[1.75rem]">
        <div className="flex items-start justify-between px-5 pt-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E8A9A0]">
              Оплата заказа
            </p>
            <h3 className="font-display mt-1 text-2xl font-semibold text-[#3D2B22]">
              {selectedDelivery.dayLabel}, {selectedDelivery.dayNumber}{" "}
              {monthGenitiveFromYmd(selectedDelivery.date)}
            </h3>
            <p className="mt-1 text-sm text-[#8B6B5A]">
              {alreadyPaid || paidPayment
                ? "Слот будильника ещё не выбран — укажи его на «Неделе»"
                : "Слот будильника выберешь после оплаты"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F0E6] text-[#5C4033]"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3 px-5 pb-5">
          {(alreadyPaid || paidPayment) && (
            <div className="rounded-2xl bg-[#E8F3E8] px-4 py-3 text-sm font-bold text-[#3D5A3D]">
              <span className="inline-flex items-center gap-2">
                <Check size={16} />
                Оплачено
                {paidPayment?.receiptCode
                  ? ` · № ${paidPayment.receiptCode}`
                  : ""}
              </span>
            </div>
          )}

          {pendingKids.length > 0 && (
            <div className="rounded-2xl bg-[#FCEEEE] px-4 py-3 text-sm font-bold text-[#8B4E4E]">
              Сначала укажи количество детских позиций ({pendingKids.length})
            </div>
          )}

          <div className="rounded-2xl bg-[#F7F0E6] px-4 py-3">
            <div className="flex justify-between text-sm font-bold text-[#5C4033]">
              <span>Сумма заказа</span>
              <span>{formatRub(itemsTotal)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm font-semibold text-[#A67C68]">
              <span className="inline-flex items-center gap-1">
                <Sparkles size={14} />
                Бонусы
              </span>
              <span>доступно {formatRub(user.bonusBalance)}</span>
            </div>
          </div>

          {!alreadyPaid && !paidPayment && itemsTotal > 0 && (
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-[#5C4033]">
                <span>Списать бонусы</span>
                <span>{formatRub(bonusToSpend)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={maxBonus}
                step={10}
                value={bonusToSpend}
                onChange={(e) => setBonusToSpend(Number(e.target.value))}
                className="mt-2 w-full accent-[#E8A9A0]"
                disabled={maxBonus <= 0 || busy}
              />
            </div>
          )}

          {!alreadyPaid && !paidPayment && (
            <div className="flex items-center justify-between rounded-2xl bg-[#5C4033] px-4 py-3 text-[#FFFDF9]">
              <span className="text-sm font-bold">К оплате картой</span>
              <span className="text-lg font-extrabold">
                {formatRub(amountDue)}
              </span>
            </div>
          )}

          {error && (
            <p className="text-sm font-bold text-[#8B4E4E]">{error}</p>
          )}

          {!alreadyPaid && !paidPayment ? (
            <button
              type="button"
              disabled={busy || itemsTotal <= 0 || pendingKids.length > 0}
              onClick={() => {
                void handlePay();
              }}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#E8A9A0] text-base font-extrabold text-[#3D2B22] transition enabled:hover:bg-[#F3C6C0] disabled:opacity-40"
            >
              <CreditCard size={18} />
              {busy ? "Оплачиваем…" : "Оплатить заказ"}
            </button>
          ) : (
            <div className="space-y-2">
              {paidPayment && (
                <button
                  type="button"
                  disabled={receiptBusy}
                  onClick={() => {
                    void handleOpenReceipt();
                  }}
                  className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#5C4033] text-base font-extrabold text-[#FFFDF9] transition hover:bg-[#3D2B22] disabled:opacity-50"
                >
                  <FileText size={18} />
                  {receiptBusy ? "Открываем…" : "Открыть чек"}
                </button>
              )}
              <button
                type="button"
                onClick={closeAndFocusAlarm}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#E8A9A0] text-sm font-extrabold text-[#3D2B22]"
              >
                Выбрать слот будильника
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FCEEEE] text-sm font-extrabold text-[#5C4033]"
              >
                Готово
              </button>
            </div>
          )}

          <p className="text-center text-[11px] font-semibold text-[#A67C68]">
            Демо-провайдер · без реальной карты · бонусы списываются сразу
          </p>
        </div>
      </div>

      {receiptHtml && (
        <ReceiptViewerModal
          title={
            paidPayment?.receiptCode
              ? `Чек · ${paidPayment.receiptCode}`
              : "Электронный чек"
          }
          html={receiptHtml}
          onClose={() => setReceiptHtml(null)}
        />
      )}
    </div>
  );
}
