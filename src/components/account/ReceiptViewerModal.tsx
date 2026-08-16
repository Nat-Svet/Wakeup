"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** Просмотр электронного чека внутри приложения (без скачивания на диск). */
export function ReceiptViewerModal({
  title = "Электронный чек",
  html,
  onClose,
}: {
  title?: string;
  html: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#3D2B22]/45 backdrop-blur-[2px]"
        aria-label="Закрыть чек"
        onClick={onClose}
      />
      <div className="modal-above-nav relative z-10 flex max-h-[min(78dvh,calc(100dvh-6.5rem))] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] bg-[#FFFDF9] shadow-2xl sm:max-h-[min(88dvh,720px)] sm:rounded-[1.75rem]">
        <div className="flex shrink-0 items-start justify-between border-b border-[#EBE4DA] px-5 py-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#A67C68]">
              Фискальный чек · демо
            </p>
            <h4 className="mt-1 text-lg font-extrabold text-[#3D2B22]">
              {title}
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F0E6] text-[#5C4033]"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#FFFDF9]">
          {html.trim() ? (
            <iframe
              title={title}
              srcDoc={html}
              className="block h-[min(62dvh,520px)] w-full border-0 bg-white"
            />
          ) : (
            <p className="p-5 text-sm font-semibold text-[#8B6B5A]">
              Чек недоступен
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-[#EBE4DA] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#5C4033] text-sm font-extrabold text-[#FFFDF9]"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
