"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import {
  FILLING_LABELS,
  GLAZE_LABELS,
  getDishById,
} from "@/data/db";
import { apiClient, type PaymentDto } from "@/lib/api-client";
import { fetchReceiptHtml } from "@/lib/receipt-download";
import { monthGenitiveFromYmd } from "@/lib/week-dates";
import type { Delivery, DeliveryItem } from "@/types";
import { ReceiptViewerModal } from "@/components/account/ReceiptViewerModal";

function formatOrderDate(ymd: string) {
  const day = Number(ymd.slice(8, 10));
  const year = ymd.slice(0, 4);
  return `${day} ${monthGenitiveFromYmd(ymd)} ${year}`;
}

function formatOrderLine(item: DeliveryItem) {
  const dish = getDishById(item.dishId);
  if (item.kidsCustom) {
    const glaze = GLAZE_LABELS[item.kidsCustom.glaze] ?? "";
    const filling = FILLING_LABELS[item.kidsCustom.filling] ?? "";
    const extra = [glaze, filling].filter(Boolean).join(", ");
    return `${dish.name}${extra ? ` (${extra})` : ""} — ${item.quantity} шт`;
  }
  return `${dish.name} — ${item.quantity} шт`;
}

type HistoryOrder = {
  delivery: Delivery;
  paymentId: string | null;
  receiptCode: string | null;
};

function buildFallbackReceiptHtml(order: HistoryOrder) {
  const code =
    order.receiptCode ?? `PV-${order.delivery.date.replaceAll("-", "")}`;
  const lines = order.delivery.items
    .filter((i) => i.quantity > 0)
    .map((item) => `<p>${formatOrderLine(item)}</p>`)
    .join("");
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><style>
    body{font-family:Georgia,serif;color:#3D2B22;padding:20px;margin:0}
    .muted{color:#8B6B5A;font-size:13px}
  </style></head><body>
    <h1 style="font-size:22px;margin:0 0 8px">Просыпайся!</h1>
    <p class="muted">Электронный чек · демо</p>
    <p><strong>№ ${code}</strong></p>
    <p class="muted">${formatOrderDate(order.delivery.date)}</p>
    <hr style="border:none;border-top:1px dashed #D7C4B2;margin:16px 0"/>
    ${lines}
    <p class="muted" style="margin-top:16px">Демо-провайдер · без реальной ФНС</p>
  </body></html>`;
}

export function OrderHistorySection() {
  const {
    trackerDeliveries,
    isDeliveryPaid,
    getPaidPayment,
    activeTab,
  } = useApp();
  const { token, apiOnline } = useAuth();
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [receiptBusyId, setReceiptBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{
    html: string;
    title: string;
  } | null>(null);

  const loadPayments = useCallback(async () => {
    if (!token || !apiOnline) return;
    try {
      const data = await apiClient.getPayments(token);
      setPayments(data.payments.filter((p) => p.status === "paid"));
    } catch {
      setPayments([]);
    }
  }, [token, apiOnline]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    if (activeTab === "account") void loadPayments();
  }, [activeTab, loadPayments]);

  const orders = useMemo(() => {
    const paymentByDelivery = new Map(
      payments.map((p) => [p.deliveryId, p] as const)
    );

    return trackerDeliveries
      .filter(
        (d) =>
          d.status === "at_door" &&
          isDeliveryPaid(d.id) &&
          d.items.some((item) => item.quantity > 0)
      )
      .map((delivery) => {
        const local = getPaidPayment(delivery.id);
        const apiPayment = paymentByDelivery.get(delivery.id) ?? null;
        return {
          delivery,
          paymentId: local?.paymentId ?? apiPayment?.id ?? null,
          receiptCode:
            local?.receiptCode ?? apiPayment?.receiptCode ?? null,
        } satisfies HistoryOrder;
      })
      .sort((a, b) => b.delivery.date.localeCompare(a.delivery.date));
  }, [trackerDeliveries, payments, isDeliveryPaid, getPaidPayment]);

  const openReceipt = async (order: HistoryOrder) => {
    setError(null);
    const title = `Чек · ${formatOrderDate(order.delivery.date)}`;

    if (token && order.paymentId) {
      setReceiptBusyId(order.delivery.id);
      try {
        const html = await fetchReceiptHtml(token, order.paymentId);
        if (html.trim()) {
          setViewer({ html, title });
          return;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Не удалось открыть чек"
        );
      } finally {
        setReceiptBusyId(null);
      }
    }

    setViewer({
      html: buildFallbackReceiptHtml(order),
      title,
    });
  };

  return (
    <section className="mt-8">
      <h3 className="font-display text-2xl font-semibold text-[#3D2B22]">
        История заказов
      </h3>

      {orders.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-[#8B6B5A]">
          Пока нет выполненных заказов. Когда завтрак будет у двери — заказ появится здесь.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((order) => {
            const lines = order.delivery.items.filter((i) => i.quantity > 0);
            const busy = receiptBusyId === order.delivery.id;
            return (
              <li
                key={order.delivery.id}
                className="rounded-2xl border border-[#EBE4DA] bg-[#FFFDF9] px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-[#3D2B22]">
                    {formatOrderDate(order.delivery.date)}
                  </p>
                  <span className="rounded-md bg-[#E8F3E8] px-2.5 py-1 text-[11px] font-bold text-[#3D5A3D]">
                    Выполнен
                  </span>
                </div>

                <ul className="mt-3 space-y-1.5">
                  {lines.map((item) => (
                    <li
                      key={item.id}
                      className="text-sm font-semibold leading-snug text-[#5C4033]"
                    >
                      {formatOrderLine(item)}
                    </li>
                  ))}
                </ul>

                {order.receiptCode && (
                  <p className="mt-2 text-[11px] font-bold text-[#A67C68]">
                    Чек · {order.receiptCode}
                  </p>
                )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void openReceipt(order)}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#8B6B5A] underline decoration-[#D7C4B2] underline-offset-2 transition hover:text-[#5C4033] disabled:opacity-50"
                >
                  <FileText size={15} strokeWidth={2} />
                  {busy ? "Открываем…" : "Электронный чек"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p className="mt-2 text-sm font-bold text-[#8B4E4E]">{error}</p>
      )}

      {viewer && (
        <ReceiptViewerModal
          title={viewer.title}
          html={viewer.html}
          onClose={() => setViewer(null)}
        />
      )}
    </section>
  );
}
