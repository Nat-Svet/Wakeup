"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiClient,
  ApiError,
  type AdminDeliveryDto,
} from "@/lib/api-client";
import { formatRub } from "@/data/db";
import { formatUserAddress } from "@/lib/serializers";

const STATUSES = ["mixing", "baking", "en_route", "at_door"] as const;
const STATUS_RU: Record<string, string> = {
  mixing: "Замешиваем",
  baking: "Выпекаем",
  en_route: "В пути",
  at_door: "У двери",
};

export function AdminOrders({ token }: { token: string }) {
  const [deliveries, setDeliveries] = useState<AdminDeliveryDto[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await apiClient.adminDeliveries(token, {
      from: "2026-08-15",
      to: "2026-08-20",
      status: statusFilter || undefined,
    });
    setDeliveries(data.deliveries);
  }, [token, statusFilter]);

  useEffect(() => {
    void load().catch((err) =>
      setError(err instanceof Error ? err.message : "Ошибка")
    );
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    setBusyId(id);
    setError(null);
    try {
      await apiClient.adminSetTracking(token, id, status);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось обновить");
    } finally {
      setBusyId(null);
    }
  };

  const advance = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await apiClient.adminAdvanceTracking(token, id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сдвинуть");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-[#3D2B22]">
          Заказы демо-недели
        </h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-2xl border border-[#EBE4DA] bg-white px-3 py-2 text-sm font-bold text-[#5C4033]"
        >
          <option value="">Все статусы</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_RU[s]}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="font-bold text-[#8B4E4E]">{error}</p>}

      <ul className="space-y-3">
        {deliveries.length === 0 ? (
          <li className="rounded-[1.25rem] bg-[#FFFDF9] px-4 py-5 text-sm text-[#8B6B5A]">
            Заказов нет
          </li>
        ) : (
          deliveries.map((d) => {
            const pieces = d.items.reduce((sum, i) => sum + i.quantity, 0);
            return (
              <li
                key={d.id}
                className="rounded-[1.5rem] bg-[#FFFDF9] p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-[#3D2B22]">
                      {d.date} · {d.timeSlot}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#8B6B5A]">
                      {d.user.name} · {formatUserAddress(d.user)}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[#A67C68]">
                      {pieces} шт ·{" "}
                      {d.payment?.status === "paid"
                        ? `оплачено ${formatRub(d.payment.amountPaid)}`
                        : "без оплаты / pending"}
                    </p>
                    <ul className="mt-2 space-y-0.5 text-xs text-[#5C4033]">
                      {d.items
                        .filter((i) => i.quantity > 0)
                        .map((i) => (
                          <li key={i.id}>
                            {i.dishName ?? i.dishId} ×{i.quantity}
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div className="flex flex-col items-stretch gap-2">
                    <span className="rounded-full bg-[#FCEEEE] px-3 py-1 text-center text-xs font-extrabold text-[#5C4033]">
                      {STATUS_RU[d.status] ?? d.status}
                    </span>
                    <select
                      disabled={busyId === d.id}
                      value={d.status}
                      onChange={(e) => void setStatus(d.id, e.target.value)}
                      className="rounded-xl border border-[#EBE4DA] px-2 py-1.5 text-xs font-bold"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_RU[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busyId === d.id || d.status === "at_door"}
                      onClick={() => void advance(d.id)}
                      className="rounded-xl bg-[#5C4033] px-3 py-1.5 text-xs font-extrabold text-[#FFFDF9] disabled:opacity-40"
                    >
                      След. статус
                    </button>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
