"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiClient,
  ApiError,
  type AdminUserDto,
} from "@/lib/api-client";
import { formatRub } from "@/data/db";
import { formatUserAddress } from "@/lib/serializers";

export function AdminUsers({ token }: { token: string }) {
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await apiClient.adminUsers(token);
    setUsers(data.users);
  }, [token]);

  useEffect(() => {
    void load().catch((err) =>
      setError(err instanceof Error ? err.message : "Ошибка")
    );
  }, [load]);

  const adjust = async (userId: string) => {
    const raw = amounts[userId]?.trim();
    const amount = Number(raw);
    if (!raw || Number.isNaN(amount) || amount === 0) {
      setError("Укажи ненулевое целое число бонусов");
      return;
    }
    setBusyId(userId);
    setError(null);
    try {
      await apiClient.adminAdjustBonus(token, userId, {
        amount,
        note: "admin panel",
      });
      setAmounts((prev) => ({ ...prev, [userId]: "" }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось начислить");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-[#3D2B22]">
        Пользователи и бонусы
      </h2>
      {error && <p className="font-bold text-[#8B4E4E]">{error}</p>}

      <ul className="space-y-3">
        {users.map((user) => (
          <li
            key={user.id}
            className="rounded-[1.5rem] bg-[#FFFDF9] p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-extrabold text-[#3D2B22]">
                  {user.name}{" "}
                  <span className="text-xs font-bold uppercase text-[#E8A9A0]">
                    {user.role}
                  </span>
                </p>
                <p className="text-sm text-[#8B6B5A]">{user.email}</p>
                <p className="mt-1 text-xs font-bold text-[#A67C68]">
                  {formatUserAddress(user)} · баланс{" "}
                  {formatRub(user.bonusBalance)}
                </p>
                <p className="mt-1 text-xs text-[#A67C68]">
                  Доставок: {user.deliveriesCount ?? 0} · оплат:{" "}
                  {user.paymentsCount ?? 0}
                  {user.subscription?.paused ? " · на паузе" : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  placeholder="+50 / -20"
                  value={amounts[user.id] ?? ""}
                  onChange={(e) =>
                    setAmounts((prev) => ({
                      ...prev,
                      [user.id]: e.target.value,
                    }))
                  }
                  className="w-28 rounded-xl border border-[#EBE4DA] px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={busyId === user.id}
                  onClick={() => void adjust(user.id)}
                  className="rounded-xl bg-[#5C4033] px-3 py-2 text-xs font-extrabold text-[#FFFDF9] disabled:opacity-50"
                >
                  Применить
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
