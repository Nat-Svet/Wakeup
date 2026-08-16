"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Phone, Send, X } from "lucide-react";
import { COURIER } from "@/data/tracker";

interface ChatMessage {
  id: string;
  from: "me" | "courier";
  text: string;
}

export function CourierCard({
  quote,
  statusLabel,
}: {
  quote: string;
  statusLabel: string;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      from: "courier",
      text: "Привет! Я Алексей, везу твой завтрак 🥐",
    },
  ]);
  const [callHint, setCallHint] = useState<string | null>(null);

  useEffect(() => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.from === "courier" && last.text === quote) return prev;
      return [
        ...prev,
        {
          id: `auto-${Date.now()}`,
          from: "courier",
          text: quote,
        },
      ];
    });
  }, [quote]);

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: `me-${Date.now()}`, from: "me", text },
    ]);
    setDraft("");
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `reply-${Date.now()}`,
          from: "courier",
          text: "Принял! Уже почти у дома — держу выпечку тёплой.",
        },
      ]);
    }, 900);
  };

  const callCourier = () => {
    setCallHint(`Звонок курьеру ${COURIER.phone} (демо без связи)`);
    window.setTimeout(() => setCallHint(null), 2500);
    // Soft attempt — works on real phones
    window.location.href = `tel:${COURIER.phone}`;
  };

  return (
    <>
      <div className="rounded-[1.75rem] bg-white p-4 shadow-[0_16px_40px_rgba(92,64,51,0.08)]">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F3C6C0] to-[#A67C68] text-xl font-extrabold text-white">
            {COURIER.initials}
          </div>
          <div>
            <p className="font-extrabold text-[#3D2B22]">
              {COURIER.name}, твой сосед из {COURIER.building}
            </p>
            <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-[#E8A9A0]">
              {statusLabel}
            </p>
            <p className="mt-1 text-sm italic text-[#8B6B5A]">«{quote}»</p>
          </div>
        </div>

        {callHint && (
          <p className="mt-3 rounded-xl bg-[#F7F0E6] px-3 py-2 text-xs font-semibold text-[#5C4033]">
            {callHint}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#FCEEEE] text-sm font-extrabold text-[#5C4033] transition hover:bg-[#F3C6C0]"
          >
            <MessageCircle size={18} />
            Написать
          </button>
          <button
            type="button"
            onClick={callCourier}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#5C4033] text-sm font-extrabold text-[#FFFDF9] transition hover:bg-[#3D2B22]"
          >
            <Phone size={18} />
            Позвонить
          </button>
        </div>
      </div>

      {chatOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#3D2B22]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div
            className="absolute inset-0"
            onClick={() => setChatOpen(false)}
            aria-hidden
          />
          <div className="modal-above-nav relative z-10 flex h-[min(65dvh,calc(100dvh-6.5rem))] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] bg-[#FFFDF9] shadow-2xl sm:h-[70dvh] sm:rounded-[1.75rem]">
            <div className="flex items-center justify-between border-b border-[#EBE4DA] px-5 py-4">
              <div>
                <p className="font-extrabold text-[#3D2B22]">Чат с {COURIER.name}</p>
                <p className="text-xs font-semibold text-[#A67C68]">
                  Локальное демо · без сервера
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F0E6] text-[#5C4033]"
                aria-label="Закрыть чат"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm font-semibold ${
                    message.from === "me"
                      ? "ml-auto bg-[#5C4033] text-[#FFFDF9]"
                      : "bg-[#F7F0E6] text-[#3D2B22]"
                  }`}
                >
                  {message.text}
                </div>
              ))}
            </div>

            <div className="flex gap-2 border-t border-[#EBE4DA] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder="Напиши курьеру…"
                className="min-h-12 flex-1 rounded-2xl border-0 bg-[#F7F0E6] px-4 text-sm font-semibold text-[#3D2B22] outline-none placeholder:text-[#A67C68]"
              />
              <button
                type="button"
                onClick={sendMessage}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8A9A0] text-[#3D2B22]"
                aria-label="Отправить"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
