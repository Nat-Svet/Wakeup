"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Bell, Sparkles, X, Send } from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  replyAsGuide,
  type GuideAction,
  type GuideCartAction,
  type GuideReply,
} from "@/lib/guide-engine";
import { APP_KNOWLEDGE, GUIDE_QUICK_PILLS } from "@/lib/app-knowledge";
import {
  AGGRESSION_WARNING,
  CHAT_LOCKED_BANNER,
  OPERATOR_FOLLOWUP,
  OPERATOR_GREETING,
  classifyUserMessage,
  playfulReply,
} from "@/lib/guide-moderation";

type ChatMessage = {
  id: string;
  role: "guide" | "user" | "operator";
  text: string;
  action?: GuideAction;
  suggestions?: string[];
  actionDone?: boolean;
};

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "guide",
  text: "Привет! Я «Твой гид» ✨ Выбери вопрос ниже или напиши свой — помогу с заказом, меню, доставкой и бонусами.",
};

const GROUPS: { key: (typeof APP_KNOWLEDGE)[number]["group"]; title: string }[] =
  [
    { key: "order", title: "Как заказать" },
    { key: "menu", title: "Меню и ЗОЖ" },
    { key: "delivery", title: "Доставка" },
    { key: "bonuses", title: "Бонусы" },
  ];

export function GuideChat({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { deliveries, addDishToDay, setActiveTab } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [usedPills, setUsedPills] = useState<Set<string>>(() => new Set());
  const [chatLocked, setChatLocked] = useState(false);
  const [operatorMode, setOperatorMode] = useState(false);
  const aggressionStreakRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing, open, chatLocked, operatorMode]);

  /** Закрыли чат — снова гид, чтобы все три режима были доступны. */
  useEffect(() => {
    if (open) return;
    setOperatorMode(false);
  }, [open]);

  const pushReply = (reply: GuideReply & { role?: "guide" | "operator" }) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `g-${Date.now()}`,
        role: reply.role ?? "guide",
        text: reply.text,
        action: reply.action,
        suggestions: reply.suggestions,
      },
    ]);
  };

  const ask = (text: string, pillId?: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing || chatLocked) return;
    if (pillId && usedPills.has(pillId)) return;

    if (pillId) {
      setUsedPills((prev) => new Set(prev).add(pillId));
    }

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text: trimmed },
    ]);
    setInput("");
    setTyping(true);

    window.setTimeout(() => {
      setTyping(false);

      // Режим 3: оскорбления — всегда до оператора и FAQ
      const tone = classifyUserMessage(trimmed);
      if (tone === "aggression") {
        if (aggressionStreakRef.current >= 1) {
          aggressionStreakRef.current = 2;
          setChatLocked(true);
          pushReply({ text: CHAT_LOCKED_BANNER });
          return;
        }
        aggressionStreakRef.current = 1;
        pushReply({ text: AGGRESSION_WARNING });
        return;
      }

      aggressionStreakRef.current = 0;

      // Режим 2: флирт / троллинг
      if (tone === "playful") {
        setOperatorMode(false);
        pushReply({
          text: playfulReply(),
          suggestions: [
            "Как это работает?",
            "Что в меню?",
            "Хочу круассан с лососем на субботу",
          ],
        });
        return;
      }

      // После «Позвать человека» — имитация Гали (не глушит режимы 2–3)
      if (operatorMode) {
        pushReply({
          role: "operator",
          text: OPERATOR_FOLLOWUP,
        });
        return;
      }

      // Режим 1: ответ из базы или «цифровых сил» + кнопка
      const reply = replyAsGuide(trimmed, deliveries);
      pushReply(reply);
    }, 280 + Math.random() * 220);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  const handleAction = (messageId: string, action: GuideAction) => {
    if (action.type === "call_human") {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, actionDone: true } : m))
      );
      setOperatorMode(true);
      setTyping(true);
      window.setTimeout(() => {
        setTyping(false);
        pushReply({
          role: "operator",
          text: OPERATOR_GREETING,
        });
      }, 700);
      return;
    }

    if (action.type === "add_to_cart") {
      const cart = action as GuideCartAction;
      addDishToDay(cart.deliveryId, cart.dishId, 1);
      setActiveTab("week");
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, actionDone: true } : m))
      );
      pushReply({
        text: `Готово — «${cart.dishName}» уже в заказе на ${cart.dayLabel.toLowerCase()}. Можешь открыть «Меню» или сразу оплатить заказ 🥐`,
      });
    }
  };

  if (!open) return null;

  const visibleIds = new Set(
    GUIDE_QUICK_PILLS.filter((p) => !usedPills.has(p.id)).map((p) => p.id)
  );
  const showTiles = visibleIds.size > 0 && !operatorMode && !chatLocked;

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#3D2B22]/40 backdrop-blur-[2px]"
        aria-label="Закрыть гида"
        onClick={onClose}
      />
      <div className="modal-above-nav relative z-10 flex h-[min(72dvh,calc(100dvh-6.5rem))] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] bg-[#FFFDF9] shadow-2xl sm:h-[min(78dvh,640px)] sm:rounded-[1.75rem]">
        <header className="flex items-center gap-3 border-b border-[#F0E8DC] px-4 py-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-2xl text-[#3D2B22] shadow-sm ${
              operatorMode
                ? "bg-gradient-to-br from-[#E8F3E8] to-[#C8E0C8]"
                : "bg-gradient-to-br from-[#F3C6C0] to-[#E8A9A0]"
            }`}
          >
            {operatorMode ? <Bell size={20} /> : <Sparkles size={20} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-[#3D2B22]">
              {operatorMode ? "Галя · пекарня" : "Твой гид"}
            </p>
            <p className="text-xs font-semibold text-[#A67C68]">
              {chatLocked
                ? "Чат ограничен"
                : operatorMode
                  ? "Живой оператор · онлайн"
                  : "Быстрые ответы · демо для защиты"}
            </p>
          </div>
          {operatorMode && !chatLocked && (
            <button
              type="button"
              onClick={() => setOperatorMode(false)}
              className="rounded-full bg-[#F7F0E6] px-2.5 py-1.5 text-[11px] font-extrabold text-[#5C4033]"
            >
              К гиду
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F0E6] text-[#5C4033]"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </header>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m) => (
            <div key={m.id}>
              <div
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[#5C4033] font-semibold text-[#FFFDF9]"
                      : m.role === "operator"
                        ? "bg-[#E8F3E8] font-medium text-[#3D5A3D]"
                        : "bg-[#F7F0E6] font-medium text-[#3D2B22]"
                  }`}
                >
                  <GuideFormattedText text={m.text} />
                  {m.action && !m.actionDone && !chatLocked && (
                    <button
                      type="button"
                      onClick={() => handleAction(m.id, m.action!)}
                      className={`mt-2.5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-extrabold transition ${
                        m.action.type === "call_human"
                          ? "bg-[#5C4033] text-[#FFFDF9] hover:bg-[#3D2B22]"
                          : "bg-[#E8A9A0] text-[#3D2B22] hover:bg-[#F3C6C0]"
                      }`}
                    >
                      {m.action.label}
                    </button>
                  )}
                  {m.actionDone && m.action?.type === "add_to_cart" && (
                    <p className="mt-2 text-xs font-bold text-[#3D5A3D]">
                      Уже в заказе ✓
                    </p>
                  )}
                  {m.actionDone && m.action?.type === "call_human" && (
                    <p className="mt-2 text-xs font-bold text-[#3D5A3D]">
                      Галя на связи ✓
                    </p>
                  )}
                  {m.suggestions && m.suggestions.length > 0 && !chatLocked && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => ask(s)}
                          className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#5C4033] ring-1 ring-[#E8D9C8]"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {m.id === "welcome" && showTiles && (
                <div className="mt-3 space-y-3">
                  {GROUPS.map((group) => {
                    const items = APP_KNOWLEDGE.filter(
                      (e) => e.group === group.key && visibleIds.has(e.id)
                    );
                    if (items.length === 0) return null;
                    return (
                      <div key={group.key}>
                        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#A67C68]">
                          {group.title}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {items.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              disabled={typing || chatLocked}
                              onClick={() => ask(item.pill, item.id)}
                              className="rounded-xl bg-[#FCEEEE] px-2.5 py-2.5 text-left text-[11px] font-extrabold leading-snug text-[#5C4033] ring-1 ring-[#F3C6C0]/70 transition hover:bg-[#F3C6C0] disabled:opacity-50"
                            >
                              {item.pill}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {typing && (
            <p className="text-xs font-bold text-[#A67C68]">
              {operatorMode ? "Галя печатает…" : "Гид печатает…"}
            </p>
          )}
        </div>

        {chatLocked ? (
          <div className="border-t border-[#F0E8DC] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="rounded-2xl bg-[#FCEEEE] px-4 py-3 text-center text-sm font-extrabold text-[#8B4E4E] ring-1 ring-[#E8A9A0]/60">
              {CHAT_LOCKED_BANNER}
            </div>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="flex gap-2 border-t border-[#F0E8DC] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                operatorMode ? "Напиши Гале…" : "Спроси гида…"
              }
              className="min-h-11 flex-1 rounded-2xl border border-[#EBE4DA] bg-white px-4 text-sm font-semibold text-[#3D2B22] outline-none focus:border-[#E8A9A0]"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#5C4033] text-[#FFFDF9] disabled:opacity-40"
              aria-label="Отправить"
            >
              <Send size={18} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Простой **жирный** для акцентов в ответах гида. */
function GuideFormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p>
      {parts.map((part, i) => {
        const bold = /^\*\*([^*]+)\*\*$/.exec(part);
        if (bold) {
          return (
            <strong
              key={i}
              className="font-extrabold text-[#8B4E4E] underline decoration-[#E8A9A0] underline-offset-2"
            >
              {bold[1]}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}
