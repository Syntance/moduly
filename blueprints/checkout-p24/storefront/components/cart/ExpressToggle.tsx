"use client";

import { Zap } from "lucide-react";
import { useCart } from "@/hooks/useCart";

interface ExpressToggleProps {
  compact?: boolean;
}

export function ExpressToggle({ compact = false }: ExpressToggleProps) {
  const { expressDelivery, setExpressDelivery } = useCart();

  const toggle = (checked: boolean) => void setExpressDelivery(checked);

  if (compact) {
    return (
      <label className="flex cursor-pointer items-center gap-2 rounded-none border border-brand-200 bg-brand-50/60 px-3 py-2.5">
        <input
          type="checkbox"
          checked={expressDelivery}
          onChange={(e) => toggle(e.target.checked)}
          className="h-3.5 w-3.5 shrink-0 rounded-none border-brand-300 accent-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35"
        />
        <Zap
          className="h-3 w-3 shrink-0 text-brand-800"
          strokeWidth={2}
          aria-hidden
        />
        <span className="text-[11px] font-gilroy font-medium leading-snug text-brand-800">
          Express · +50% ·{" "}
          <span className="font-normal text-brand-500">3 dni robocze</span>
        </span>
      </label>
    );
  }

  return (
    <div className="rounded-none border border-brand-200 bg-brand-50/60 p-3">
      <div className="flex items-start gap-2 text-brand-900">
        <Zap
          className="mt-px h-3.5 w-3.5 shrink-0 text-brand-800"
          strokeWidth={2}
          aria-hidden
        />
        <p className="min-w-0 text-xs leading-snug text-brand-800">
          <span className="font-gilroy font-bold uppercase tracking-[0.1em] text-brand-900">
            Realizacja express
          </span>
          {" "}
          — <strong className="font-semibold">3 dni</strong> robocze zamiast 10.
        </p>
      </div>

      <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-none border border-brand-300 bg-brand-800 px-3 py-2 font-gilroy transition-colors hover:bg-brand-900 focus-within:outline-none focus-within:ring-2 focus-within:ring-white/30">
        <input
          type="checkbox"
          checked={expressDelivery}
          onChange={(e) => toggle(e.target.checked)}
          className="h-3.5 w-3.5 shrink-0 rounded-none border border-white/50 bg-brand-800 accent-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        />
        <span className="text-xs font-semibold tracking-wide text-white">
          Chcę express · +50% wartości zamówienia
        </span>
      </label>
    </div>
  );
}
