"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import {
  GUIDE_ONBOARDING_STEPS,
  GUIDE_STORAGE_KEY,
} from "@/lib/guide-engine";

export function GuideOnboarding({
  active,
  onDone,
}: {
  active: boolean;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  const current = GUIDE_ONBOARDING_STEPS[step];

  useEffect(() => {
    if (!active || !current) return;

    const update = () => {
      const el = document.getElementById(current.targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => {
          setAnchor(el.getBoundingClientRect());
        }, 280);
      } else {
        setAnchor(null);
      }
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [active, current, step]);

  if (!active || !current) return null;

  const finish = () => {
    try {
      localStorage.setItem(GUIDE_STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    onDone();
  };

  const next = () => {
    if (step >= GUIDE_ONBOARDING_STEPS.length - 1) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  };

  const tipTop = anchor
    ? Math.min(
        window.innerHeight - 180,
        Math.max(16, anchor.bottom + 12)
      )
    : 120;

  return (
    <div className="fixed inset-0 z-[92]">
      {anchor ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-[#E8A9A0]"
          style={{
            top: anchor.top - 6,
            left: anchor.left - 6,
            width: anchor.width + 12,
            height: anchor.height + 12,
            boxShadow: "0 0 0 9999px rgba(61,43,34,0.48)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#3D2B22]/48" />
      )}

      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Следующий шаг"
        onClick={next}
      />

      <div
        className="absolute left-1/2 z-10 w-[min(92vw,22rem)] -translate-x-1/2 rounded-[1.5rem] bg-[#FFFDF9] p-4 shadow-2xl"
        style={{ top: tipTop }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F3C6C0] to-[#E8A9A0] text-[#3D2B22]">
            <Sparkles size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#E8A9A0]">
              Твой гид · {step + 1}/{GUIDE_ONBOARDING_STEPS.length}
            </p>
            <h3 className="font-display mt-1 text-lg font-semibold text-[#3D2B22]">
              {current.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-[#8B6B5A]">
              {current.body}
            </p>
          </div>
          <button
            type="button"
            onClick={finish}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#A67C68]"
            aria-label="Пропустить тур"
          >
            <X size={16} />
          </button>
        </div>
        <button
          type="button"
          onClick={next}
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#5C4033] text-sm font-extrabold text-[#FFFDF9]"
        >
          {step >= GUIDE_ONBOARDING_STEPS.length - 1
            ? "Понятно, спасибо"
            : "Дальше"}
        </button>
      </div>
    </div>
  );
}

export function shouldShowGuideOnboarding() {
  try {
    return localStorage.getItem(GUIDE_STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}
