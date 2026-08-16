"use client";

import { useEffect, useState } from "react";
import { apiClient, type AdminStatsDto } from "@/lib/api-client";

const STATUS_RU: Record<string, string> = {
  mixing: "Замешиваем",
  baking: "Выпекаем",
  en_route: "В пути",
  at_door: "У двери",
};

export function AdminOverview({ token }: { token: string }) {
  const [stats, setStats] = useState<AdminStatsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiClient.adminStats(token);
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ошибка загрузки");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return <p className="font-bold text-[#8B4E4E]">{error}</p>;
  }
  if (!stats) {
    return <p className="text-[#8B6B5A]">Загрузка статистики…</p>;
  }

  const cards = [
    { label: "Пользователи", value: stats.usersCount },
    { label: "Блюда активные", value: `${stats.dishesActive} / ${stats.dishesTotal}` },
    { label: "Доставки сегодня", value: stats.deliveriesToday },
    { label: "Оплаты paid", value: stats.paidPayments },
    { label: "Оплаты pending", value: stats.pendingPayments },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-[1.5rem] bg-[#FFFDF9] px-5 py-4 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-[#A67C68]">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-extrabold text-[#3D2B22]">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-[1.5rem] bg-[#FFFDF9] p-5 shadow-sm">
        <h2 className="font-display text-xl font-semibold text-[#3D2B22]">
          Демо-неделя по статусам
        </h2>
        <ul className="mt-4 space-y-2">
          {stats.weekByStatus.length === 0 ? (
            <li className="text-sm text-[#8B6B5A]">Пока нет доставок</li>
          ) : (
            stats.weekByStatus.map((row) => (
              <li
                key={row.status}
                className="flex items-center justify-between rounded-2xl bg-[#F7F0E6] px-4 py-3 text-sm font-bold text-[#5C4033]"
              >
                <span>{STATUS_RU[row.status] ?? row.status}</span>
                <span>{row.count}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
