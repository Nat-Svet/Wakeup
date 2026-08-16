"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { GuideChat } from "./GuideChat";
import {
  GuideOnboarding,
  shouldShowGuideOnboarding,
} from "./GuideOnboarding";

/** Floating entry for «Твой гид» + first-run tour on Week. */
export function GuideHost() {
  const { showSplash, activeTab, authOpen } = useApp();
  const { token } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    if (showSplash || authOpen) return;
    // Тур не блокирует гостю кнопку входа
    if (!token) return;
    if (activeTab !== "week") return;
    if (!shouldShowGuideOnboarding()) return;
    const t = window.setTimeout(() => setTourOpen(true), 600);
    return () => window.clearTimeout(t);
  }, [showSplash, activeTab, authOpen, token]);

  useEffect(() => {
    if (authOpen) {
      setTourOpen(false);
      setChatOpen(false);
    }
  }, [authOpen]);

  if (activeTab !== "week") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setChatOpen(true)}
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] right-4 z-[70] flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-br from-[#F3C6C0] to-[#E8A9A0] py-2.5 pl-3 pr-4 text-[#3D2B22] shadow-[0_12px_28px_rgba(232,169,160,0.55)] transition hover:scale-[1.03]"
        aria-label="Открыть чат: Твой гид"
        title="Твой гид"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/55">
          <Sparkles size={16} />
        </span>
        <span className="text-sm font-extrabold">Твой гид</span>
      </button>

      <GuideChat open={chatOpen} onClose={() => setChatOpen(false)} />
      <GuideOnboarding
        active={tourOpen && !chatOpen && !authOpen}
        onDone={() => setTourOpen(false)}
      />
    </>
  );
}
