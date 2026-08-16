"use client";

import { WeekHeader } from "./WeekHeader";
import { WeekCalendar } from "./WeekCalendar";
import { DishCard } from "./DishCard";
import { AlarmSlots } from "./AlarmSlots";
import { ConciergeOptions } from "./ConciergeOptions";
import { ReplaceModal } from "./ReplaceModal";
import { CheckoutModal } from "./CheckoutModal";
import { useApp } from "@/context/AppContext";

export function WeekPage() {
  const { checkoutOpen, setCheckoutOpen } = useApp();

  return (
    <div className="safe-bottom animate-fade-in-up">
      <WeekHeader />
      <WeekCalendar />
      <DishCard />
      <AlarmSlots />
      <ConciergeOptions />
      <ReplaceModal />
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
      />
    </div>
  );
}
