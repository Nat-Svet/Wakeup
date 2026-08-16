"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Ban } from "lucide-react";
import {
  apiClient,
  ApiError,
  type AdminDishDto,
} from "@/lib/api-client";
import { formatRub } from "@/data/db";

const emptyForm = {
  slug: "",
  name: "",
  description: "",
  imageUrl: "/dishes/almond-croissant.jpg",
  price: 200,
  calories: 300,
  protein: 5,
  fat: 10,
  carbs: 30,
  isKids: false,
  isHealthy: false,
  isActive: true,
};

export function AdminDishes({ token }: { token: string }) {
  const [dishes, setDishes] = useState<AdminDishDto[]>([]);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await apiClient.adminDishes(token);
    setDishes(data);
  }, [token]);

  useEffect(() => {
    void load().catch((err) =>
      setError(err instanceof Error ? err.message : "Ошибка")
    );
  }, [load]);

  const startCreate = () => {
    setEditingId("new");
    setForm(emptyForm);
    setError(null);
  };

  const startEdit = (dish: AdminDishDto) => {
    setEditingId(dish.id);
    setForm({
      slug: dish.slug,
      name: dish.name,
      description: dish.description,
      imageUrl: dish.imageUrl,
      price: dish.price,
      calories: dish.calories,
      protein: dish.protein,
      fat: dish.fat,
      carbs: dish.carbs,
      isKids: dish.isKids,
      isHealthy: dish.isHealthy,
      isActive: dish.isActive,
    });
    setError(null);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (editingId === "new") {
        await apiClient.adminCreateDish(token, form);
      } else if (editingId) {
        await apiClient.adminUpdateDish(token, editingId, form);
      }
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await apiClient.adminDeactivateDish(token, id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось скрыть");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-[#3D2B22]">
          Каталог блюд
        </h2>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#5C4033] px-4 py-2.5 text-sm font-extrabold text-[#FFFDF9]"
        >
          <Plus size={16} />
          Добавить
        </button>
      </div>

      {error && <p className="font-bold text-[#8B4E4E]">{error}</p>}

      {editingId && (
        <div className="rounded-[1.5rem] bg-[#FFFDF9] p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-[#5C4033]">
            {editingId === "new" ? "Новое блюдо" : "Редактирование"}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["slug", "Slug"],
                ["name", "Название"],
                ["description", "Описание"],
                ["imageUrl", "URL картинки"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-xs font-bold text-[#A67C68]">
                {label}
                <input
                  value={String(form[key])}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-[#EBE4DA] px-3 py-2 text-sm text-[#3D2B22]"
                />
              </label>
            ))}
            {(
              [
                ["price", "Цена"],
                ["calories", "Ккал"],
                ["protein", "Белки"],
                ["fat", "Жиры"],
                ["carbs", "Углеводы"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-xs font-bold text-[#A67C68]">
                {label}
                <input
                  type="number"
                  value={form[key]}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      [key]: Number(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-[#EBE4DA] px-3 py-2 text-sm text-[#3D2B22]"
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm font-bold text-[#5C4033]">
            {(
              [
                ["isKids", "Детское"],
                ["isHealthy", "ПП"],
                ["isActive", "Активно"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                />
                {label}
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#5C4033] px-4 py-2.5 text-sm font-extrabold text-[#FFFDF9] disabled:opacity-50"
            >
              <Save size={16} />
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-2xl bg-[#F7F0E6] px-4 py-2.5 text-sm font-extrabold text-[#5C4033]"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {dishes.map((dish) => (
          <li
            key={dish.id}
            className="flex flex-wrap items-center gap-3 rounded-[1.25rem] bg-[#FFFDF9] px-4 py-3 shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dish.imageUrl}
              alt=""
              className="h-14 w-14 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-extrabold text-[#3D2B22]">
                {dish.name}
              </p>
              <p className="text-xs font-semibold text-[#A67C68]">
                {dish.slug} · {formatRub(dish.price)}
                {!dish.isActive ? " · скрыто" : ""}
                {dish.isKids ? " · kids" : ""}
                {dish.isHealthy ? " · ПП" : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => startEdit(dish)}
              className="rounded-xl bg-[#FCEEEE] px-3 py-2 text-xs font-extrabold text-[#5C4033]"
            >
              Изменить
            </button>
            {dish.isActive && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void deactivate(dish.id)}
                className="inline-flex items-center gap-1 rounded-xl bg-[#F7F0E6] px-3 py-2 text-xs font-extrabold text-[#8B4E4E]"
              >
                <Ban size={14} />
                Скрыть
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
