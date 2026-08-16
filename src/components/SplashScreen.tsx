"use client";

import { useEffect, useState } from "react";
import { Coffee, Croissant, Heart, Leaf, Smile } from "lucide-react";
import { useApp } from "@/context/AppContext";

type Phase = "spin" | "alarm" | "text" | "leaving";

export function SplashScreen() {
  const { showSplash, dismissSplash } = useApp();
  const [phase, setPhase] = useState<Phase>("spin");
  const [showTitle, setShowTitle] = useState(false);
  const [showSlogan, setShowSlogan] = useState(false);

  useEffect(() => {
    if (!showSplash) return;

    setPhase("spin");
    setShowTitle(false);
    setShowSlogan(false);

    const tAlarm = window.setTimeout(() => setPhase("alarm"), 1500);
    const tTitle = window.setTimeout(() => {
      setPhase("text");
      setShowTitle(true);
    }, 2000);
    const tSlogan = window.setTimeout(() => setShowSlogan(true), 2400);
    const tLeave = window.setTimeout(() => setPhase("leaving"), 3500);
    const tDone = window.setTimeout(() => dismissSplash(), 4100);

    return () => {
      window.clearTimeout(tAlarm);
      window.clearTimeout(tTitle);
      window.clearTimeout(tSlogan);
      window.clearTimeout(tLeave);
      window.clearTimeout(tDone);
    };
  }, [showSplash, dismissSplash]);

  if (!showSplash) return null;

  const showCroissant =
    phase === "alarm" || phase === "text" || phase === "leaving";
  const ringing = phase === "alarm" || phase === "text";

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(ellipse_at_top,#FFE8C8_0%,#FFF1DC_40%,#FFFDF9_75%,#FCEEEE_100%)] px-6 transition-opacity duration-700 ease-out ${
        phase === "leaving" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-label="Приветственный экран"
      role="presentation"
    >
      <style>{`
        @keyframes splash-hand-minute {
          0% { transform: rotate(0deg); }
          85% { transform: rotate(1080deg); }
          100% { transform: rotate(1080deg); }
        }
        @keyframes splash-hand-hour {
          0% { transform: rotate(40deg); }
          85% { transform: rotate(960deg); }
          100% { transform: rotate(960deg); }
        }
        @keyframes splash-ear-tilt {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-9deg); }
          40% { transform: rotate(8deg); }
          60% { transform: rotate(-6deg); }
          80% { transform: rotate(5deg); }
        }
        @keyframes splash-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .splash-hand-minute {
          animation: splash-hand-minute 1.5s ease-in-out forwards;
          transform-origin: bottom center;
        }
        .splash-hand-hour {
          animation: splash-hand-hour 1.5s ease-in-out forwards;
          transform-origin: bottom center;
        }
        .splash-ear-left.is-ringing {
          animation: splash-ear-tilt 0.85s ease-in-out 3;
          transform-origin: 70% 100%;
        }
        .splash-ear-right.is-ringing {
          animation: splash-ear-tilt 0.85s ease-in-out 3;
          transform-origin: 30% 100%;
          animation-delay: 0.06s;
        }
        .splash-title-in {
          animation: splash-rise 0.7s ease-out both;
        }
        .splash-slogan-in {
          animation: splash-rise 0.7s ease-out both;
        }
      `}</style>

      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center">
        <div className="relative h-56 w-56 sm:h-64 sm:w-64">
          <div
            className={`splash-ear-left absolute left-[18%] top-1 h-10 w-14 rounded-t-full border-[5px] border-[#5C4033] border-b-0 bg-[#F7F0E6] ${
              ringing ? "is-ringing" : ""
            }`}
          />
          <div
            className={`splash-ear-right absolute right-[18%] top-1 h-10 w-14 rounded-t-full border-[5px] border-[#5C4033] border-b-0 bg-[#F7F0E6] ${
              ringing ? "is-ringing" : ""
            }`}
          />

          <div className="absolute inset-x-0 bottom-0 top-8 flex items-center justify-center">
            <div className="relative aspect-square w-[88%] rounded-full border-[6px] border-[#5C4033] bg-[radial-gradient(circle_at_35%_30%,#FFFDF9_0%,#F7F0E6_55%,#F3E7D8_100%)] shadow-[0_18px_40px_rgba(92,64,51,0.14)]">
              <span className="absolute left-1/2 top-3.5 -translate-x-1/2 text-[#C4785C]">
                <Coffee size={18} strokeWidth={2.2} />
              </span>
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7BA36A]">
                <Leaf size={18} strokeWidth={2.2} />
              </span>
              <span className="absolute bottom-3.5 left-1/2 -translate-x-1/2 text-[#E8A9A0]">
                <Heart size={18} strokeWidth={2.2} />
              </span>
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D4A017]">
                <Smile size={18} strokeWidth={2.2} />
              </span>

              {!showCroissant && (
                <>
                  <div className="splash-hand-minute absolute bottom-1/2 left-1/2 h-[34%] w-[2.5px] -translate-x-1/2 rounded-full bg-[#3D2B22]" />
                  <div className="splash-hand-hour absolute bottom-1/2 left-1/2 h-[24%] w-[3px] -translate-x-1/2 rounded-full bg-[#5C4033]" />
                  <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3D2B22]" />
                </>
              )}

              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out ${
                  showCroissant
                    ? "scale-110 opacity-100"
                    : "pointer-events-none scale-75 opacity-0"
                }`}
              >
                <Croissant
                  size={72}
                  strokeWidth={1.6}
                  className="text-[#C87A3A] drop-shadow-[0_8px_16px_rgba(139,78,42,0.25)] sm:h-[84px] sm:w-[84px]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 min-h-[5.5rem] text-center">
          {showTitle && (
            <h1 className="splash-title-in font-display text-5xl font-bold tracking-tight text-[#3D2B22] sm:text-6xl">
              Просыпайся!
            </h1>
          )}
          {showSlogan && (
            <p className="splash-slogan-in mt-3 font-display text-xl font-medium italic text-[#A67C68]">
              Завтракай с нами!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
