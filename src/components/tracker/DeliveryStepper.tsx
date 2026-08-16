"use client";

import { Bike, Home, Flame, CookingPot } from "lucide-react";
import type { DeliveryStatus } from "@/types";

const STEPS: {
  id: DeliveryStatus;
  label: string;
  icon: typeof CookingPot;
}[] = [
  { id: "mixing", label: "Замешиваем", icon: CookingPot },
  { id: "baking", label: "Выпекаем", icon: Flame },
  { id: "en_route", label: "В пути", icon: Bike },
  { id: "at_door", label: "У двери", icon: Home },
];

const ORDER: DeliveryStatus[] = ["mixing", "baking", "en_route", "at_door"];

export function DeliveryStepper({
  current = "en_route",
}: {
  current?: DeliveryStatus;
}) {
  const currentIndex = ORDER.indexOf(current);

  return (
    <div className="rounded-[1.5rem] bg-[#F7F0E6] p-4">
      <ol className="grid grid-cols-4 gap-1">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          const Icon = step.icon;

          return (
            <li key={step.id} className="flex flex-col items-center text-center">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                  active
                    ? "animate-soft-pulse bg-[#E8A9A0] text-[#3D2B22] shadow-[0_8px_20px_rgba(232,169,160,0.45)]"
                    : done
                      ? "bg-[#5C4033] text-[#FFFDF9]"
                      : "bg-white text-[#A67C68]"
                }`}
              >
                <Icon size={18} />
              </span>
              <span
                className={`mt-2 text-[11px] font-extrabold leading-tight ${
                  active ? "text-[#5C4033]" : "text-[#A67C68]"
                }`}
              >
                {active ? `* ${step.label} *` : step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
