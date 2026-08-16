"use client";

import { Bike, CalendarDays, Baby, UserRound } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { TabId } from "@/types";

const TABS: {
  id: TabId;
  label: string;
  icon: typeof CalendarDays;
}[] = [
  { id: "week", label: "Неделя", icon: CalendarDays },
  { id: "kids", label: "Детская", icon: Baby },
  { id: "tracker", label: "Трекер", icon: Bike },
  { id: "account", label: "Профиль", icon: UserRound },
];

export function BottomNav() {
  const { activeTab, setActiveTab, showSplash } = useApp();

  if (showSplash) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md border-t border-[#EBE4DA]/80 bg-[#FFFDF9]/92 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
      <ul className="grid grid-cols-4 gap-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl transition-all ${
                  active
                    ? "bg-[#FCEEEE] text-[#5C4033]"
                    : "text-[#A67C68] hover:bg-[#F7F0E6]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.4 : 2}
                  className={active ? "text-[#E8A9A0]" : undefined}
                />
                <span className="text-[10px] font-bold tracking-wide">
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
