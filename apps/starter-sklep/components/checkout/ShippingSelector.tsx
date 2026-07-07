"use client";

import { useEffect, useState } from "react";
import { MapPin, Truck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import {
  normalizeShippingOptionsForDisplay,
  prefetchShippingOptions,
} from "@/lib/medusa/checkout";

interface ShippingOptionView {
  id: string;
  name: string;
  price: number;
  description?: string;
  isPickup: boolean;
}

interface ShippingSelectorProps {
  selectedOptionId: string;
  onSelect: (optionId: string, optionName?: string) => void;
}

function mapOptions(
  raw: Array<Record<string, unknown>> | null | undefined,
): ShippingOptionView[] {
  const mapped = normalizeShippingOptionsForDisplay(raw).map((o) => {
    const row = (raw ?? []).find((x) => String(x.id) === o.id);
    const description = (row?.data as { description?: string } | undefined)
      ?.description;
    return { ...o, description };
  });
  return [...mapped].sort((a, b) => {
    if (a.isPickup === b.isPickup) return 0;
    return a.isPickup ? 1 : -1;
  });
}

export function ShippingSelector({
  selectedOptionId,
  onSelect,
}: ShippingSelectorProps) {
  const { id: cartId } = useCart();
  const [options, setOptions] = useState<ShippingOptionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Korzystamy z `prefetchShippingOptions` — cached promise per cartId.
   * `CheckoutForm` odpala go już w Step 1, więc do czasu gdy użytkownik
   * wejdzie w Step 2 opcje zwykle są już gotowe i `await` kończy się
   * natychmiast. Bootstrap pustej listy (ensureModulyShippingBootstrap)
   * siedzi wewnątrz prefetcha.
   */
  useEffect(() => {
    if (!cartId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    prefetchShippingOptions(cartId)
      .then((raw) => {
        if (cancelled) return;
        setOptions(
          mapOptions(raw as unknown as Array<Record<string, unknown>>),
        );
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        console.error("[shipping] fetch", e);
        setError("Nie udało się pobrać opcji dostawy.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cartId]);

  // Auto-select pierwszej (i jedynej) opcji, jeśli nic nie zostało wybrane.
  useEffect(() => {
    const only = options.length === 1 ? options[0] : null;
    if (only && !selectedOptionId) {
      onSelect(only.id, only.name);
    }
  }, [options, selectedOptionId, onSelect]);

  if (loading) {
    return <p className="text-sm text-brand-500">Ładowanie opcji dostawy…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (options.length === 0) {
    return (
      <p className="text-sm text-brand-500">
        Brak aktywnych metod dostawy dla tego koszyka. Skonfiguruj je w Medusa
        Admin (Shipping profiles / Regions).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const isSelected = selectedOptionId === option.id;
        const Icon = option.isPickup ? MapPin : Truck;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id, option.name)}
            className={`w-full flex items-start gap-4 rounded-lg border-2 p-4 text-left transition-colors ${
              isSelected
                ? "border-brand-800 bg-accent/15 shadow-sm"
                : "border-brand-200 hover:border-brand-400 hover:bg-brand-50"
            }`}
          >
            <div
              className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                isSelected ? "border-brand-800" : "border-brand-300"
              }`}
            >
              {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-brand-800" />}
            </div>
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-900">{option.name}</span>
                <span className="text-sm font-semibold tabular-nums text-brand-800">
                  {option.price > 0 ? formatPrice(option.price) : "gratis"}
                </span>
              </div>
              {option.description && (
                <p className="text-xs text-brand-500 mt-0.5">{option.description}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
