"use client";

import type { ReactNode } from "react";

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,#F3E7D9_0%,#E8D5C4_45%,#DCC4AF_100%)]">
      <div className="mx-auto min-h-dvh w-full max-w-md bg-[#FFFDF9] shadow-[0_0_80px_rgba(61,43,34,0.12)]">
        {children}
      </div>
    </div>
  );
}
