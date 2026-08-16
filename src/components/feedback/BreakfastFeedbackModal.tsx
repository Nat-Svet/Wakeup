"use client";

import { useMemo, useState } from "react";
import { Share2, Star, X } from "lucide-react";
import { useApp } from "@/context/AppContext";

const POSITIVE_TAGS = [
  "Приехало горячим",
  "Эстетичная подача",
  "Идеальный хруст",
] as const;

const NEGATIVE_TAGS = [
  "Остыло",
  "Смялась упаковка",
  "Мало начинки",
  "Опоздал курьер",
] as const;

type FeedbackStep = "form" | "success" | "apology";

interface BreakfastFeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export function BreakfastFeedbackModal({
  open,
  onClose,
}: BreakfastFeedbackModalProps) {
  const { addBonus } = useApp();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [step, setStep] = useState<FeedbackStep>("form");
  const [shareHint, setShareHint] = useState<string | null>(null);

  const tags = useMemo(() => {
    if (rating === 0) return [];
    return rating >= 4 ? [...POSITIVE_TAGS] : [...NEGATIVE_TAGS];
  }, [rating]);

  const canSubmit = rating > 0;

  const resetForm = () => {
    setRating(0);
    setHovered(0);
    setSelectedTags([]);
    setComment("");
    setStep("form");
    setShareHint(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleRating = (value: number) => {
    setRating(value);
    setSelectedTags([]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const submit = () => {
    if (!canSubmit) return;
    if (rating >= 4) {
      addBonus(15);
      setStep("success");
    } else {
      addBonus(50);
      setStep("apology");
    }
  };

  const shareWithNeighbors = async () => {
    const text =
      "Завтракаю с «Просыпайся!» — тёплая выпечка до двери за 10–15 минут. Присоединяйся в нашем ЖК!";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Просыпайся!", text });
        setShareHint("Спасибо, что делишься с соседями!");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setShareHint("Текст скопирован — отправь соседям в чат ЖК");
      } else {
        setShareHint("Поделись вручную: Просыпайся! — тёплый завтрак до двери");
      }
    } catch {
      setShareHint("Можно просто рассказать соседям о «Просыпайся!»");
    }
  };

  if (!open) return null;

  const activeStar = hovered || rating;

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-[#3D2B22]/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={handleClose} aria-hidden />
      <div className="modal-above-nav animate-fade-in-up relative z-10 max-h-[min(78dvh,calc(100dvh-6.5rem))] w-full max-w-md overflow-y-auto rounded-t-[1.75rem] bg-[#FFFDF9] shadow-2xl sm:max-h-[85dvh] sm:rounded-[1.75rem]">
        <div className="flex items-center justify-between px-5 pt-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E8A9A0]">
            Оценка завтрака
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F0E6] text-[#5C4033]"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {step === "form" && (
          <div className="px-5 pb-5 pt-3">
            <h3 className="font-display text-2xl font-semibold text-[#3D2B22]">
              Как вам сегодняшний завтрак?
            </h3>

            <div
              className="mt-5 flex items-center justify-center gap-2"
              onMouseLeave={() => setHovered(0)}
            >
              {[1, 2, 3, 4, 5].map((value) => {
                const filled = value <= activeStar;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} из 5`}
                    onMouseEnter={() => setHovered(value)}
                    onFocus={() => setHovered(value)}
                    onClick={() => handleRating(value)}
                    className="rounded-xl p-1 transition hover:scale-110 active:scale-95"
                  >
                    <Star
                      size={36}
                      className={
                        filled
                          ? "fill-[#E8A9A0] text-[#E8A9A0]"
                          : "text-[#D7C4B2]"
                      }
                    />
                  </button>
                );
              })}
            </div>

            {rating > 0 && (
              <div
                key={rating >= 4 ? "positive" : "negative"}
                className="mt-5 animate-fade-in-up"
              >
                <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#A67C68]">
                  Что отметить?
                </p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        style={{ animationDelay: `${index * 60}ms` }}
                        className={`animate-fade-in-up rounded-full px-3 py-2 text-sm font-bold transition ${
                          active
                            ? "bg-[#5C4033] text-[#FFFDF9]"
                            : "bg-[#F7F0E6] text-[#5C4033] hover:bg-[#FCEEEE]"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-[#A67C68]">
                Комментарий
              </span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Расскажите подробнее…"
                className="w-full resize-none rounded-2xl border-0 bg-[#F7F0E6] px-4 py-3 text-sm font-semibold text-[#3D2B22] outline-none placeholder:text-[#A67C68] focus:ring-2 focus:ring-[#E8A9A0]"
              />
            </label>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={submit}
              className="mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#E8A9A0] text-base font-extrabold text-[#3D2B22] transition enabled:hover:bg-[#F3C6C0] disabled:opacity-40"
            >
              Отправить отзыв
            </button>
          </div>
        )}

        {step === "success" && (
          <div className="animate-fade-in-up px-5 pb-6 pt-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FCEEEE] text-3xl">
              ★
            </div>
            <h3 className="font-display mt-4 text-2xl font-semibold text-[#3D2B22]">
              Спасибо! Вам начислено +15 бонусов
            </h3>
            <p className="mt-2 text-sm text-[#8B6B5A]">
              Рады, что завтрак удался — расскажи соседям о тёплом будильнике
            </p>
            <button
              type="button"
              onClick={shareWithNeighbors}
              className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#5C4033] text-base font-extrabold text-[#FFFDF9] transition hover:bg-[#3D2B22]"
            >
              <Share2 size={18} />
              Поделиться с соседями в ЖК
            </button>
            {shareHint && (
              <p className="mt-3 text-sm font-semibold text-[#3D5A3D]">
                {shareHint}
              </p>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="mt-3 min-h-12 w-full rounded-2xl bg-[#F7F0E6] text-sm font-extrabold text-[#5C4033]"
            >
              Закрыть
            </button>
          </div>
        )}

        {step === "apology" && (
          <div className="animate-fade-in-up px-5 pb-6 pt-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F7F0E6] text-3xl">
              ♡
            </div>
            <h3 className="font-display mt-4 text-2xl font-semibold text-[#3D2B22]">
              Передали шеф-повару. Нам очень жаль! Ловите компенсацию +50
              бонусов на завтра
            </h3>
            <p className="mt-2 text-sm text-[#8B6B5A]">
              Бонусы уже на балансе соседского шеринга
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-5 flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#E8A9A0] text-base font-extrabold text-[#3D2B22] transition hover:bg-[#F3C6C0]"
            >
              Понятно, спасибо
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
