"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/hooks/useCart";
import { ExpressToggle } from "@/components/cart/ExpressToggle";
import { CartConfiguratorDetails } from "@/components/cart/CartConfiguratorDetails";
import { PromoCodeField } from "@/components/checkout/PromoCodeField";
import { formatPrice } from "@/lib/utils";
import {
  normalizeShippingOptionsForDisplay,
  prefetchShippingOptions,
} from "@/lib/medusa/checkout";
import { resolveEffectiveShippingCost } from "@/lib/promotions/free-shipping";

type OrderSummaryProps = {
  /**
   * Wybrana opcja dostawy w checkout (Step 2+) — zanim trafi do koszyka Medusy,
   * podsumowanie musi pokazywać jej cenę (np. odbiór osobisty = gratis).
   */
  selectedShippingOptionId?: string;
};

function resolveShippingGross(
  selectedShippingPrice: number | undefined,
  hasShippingMethodSelection: boolean,
  shipping_total: number,
  shippingEstimate: number | null,
  hasFreeShippingPromo: boolean,
): number | null {
  return resolveEffectiveShippingCost({
    hasFreeShippingPromo,
    hasShippingMethodSelection,
    courierShippingTotal: shipping_total,
    selectedShippingPrice,
    shippingEstimate,
  });
}

export function OrderSummary({ selectedShippingOptionId }: OrderSummaryProps) {
  const {
    id: cartId,
    items,
    productsPreDiscount,
    courierShippingGross,
    shippingEstimate,
    hasShippingMethodSelection,
    tax_total,
    total,
    expressDelivery,
    expressSurcharge,
    expressFeeInTotal,
    discountTotal,
    shippingDiscount,
  } = useCart();

  /**
   * Dopłata express do WYŚWIETLENIA: client-side surcharge (zanim backend
   * wliczy ją w total) albo kwota metody-dopłaty już siedzącej w koszyku.
   * Nigdy obie naraz (provider zeruje surcharge, gdy fee jest w totalu).
   */
  const expressFeeDisplay = expressSurcharge > 0 ? expressSurcharge : expressFeeInTotal;

  /** id → cena z prefetchu; lookup synchroniczny przy zmianie wyboru w Step 2. */
  const [shippingOptionPrices, setShippingOptionPrices] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    if (!cartId) {
      setShippingOptionPrices({});
      return;
    }
    let cancelled = false;
    void prefetchShippingOptions(cartId)
      .then((raw) => {
        if (cancelled) return;
        const opts = normalizeShippingOptionsForDisplay(
          raw as unknown as Array<Record<string, unknown>>,
        );
        setShippingOptionPrices(
          Object.fromEntries(opts.map((o) => [o.id, o.price])),
        );
      })
      .catch(() => {
        if (!cancelled) setShippingOptionPrices({});
      });
    return () => {
      cancelled = true;
    };
  }, [cartId]);

  const selectedShippingPrice =
    selectedShippingOptionId &&
    selectedShippingOptionId in shippingOptionPrices
      ? shippingOptionPrices[selectedShippingOptionId]
      : undefined;

  /**
   * KONWENCJA WIERSZY (bug 06.07.2026 wieczór): wszystkie wiersze pokazują
   * kwoty PRZED rabatami (Produkty = items.subtotal, Dostawa = surowa cena
   * kuriera), a rabaty odejmuje JEDEN wiersz „Zniżka" (−discountTotal).
   * Wcześniej „Produkty" doliczały rabat DOSTAWOWY do produktów (5 zł
   * produktu pokazywane jako 30 zł), a suma liczona ręcznie przy promocji
   * fs gubiła zniżkę całkowicie.
   */
  const shippingGross = resolveShippingGross(
    selectedShippingPrice,
    hasShippingMethodSelection,
    courierShippingGross,
    shippingEstimate,
    false,
  );

  const shippingDisplay = shippingGross;

  /**
   * Darmowa dostawa z kodu: zamiast „Dostawa 25,00 + Zniżka −25,00"
   * pokazujemy „Dostawa: ~~25,00~~ gratis", a wiersz „Zniżka" zostaje
   * wyłącznie dla produktowej części rabatu (kody łączone rabat+dostawa).
   */
  const shippingIsFree =
    hasShippingMethodSelection &&
    shippingDiscount > 0 &&
    shippingDisplay !== null &&
    shippingDisplay !== undefined &&
    shippingDiscount >= shippingDisplay - 0.005;
  const productDiscount = Math.max(
    0,
    Math.round((discountTotal - shippingDiscount) * 100) / 100,
  );

  const shippingLabel =
    shippingDisplay === null || shippingDisplay === undefined
      ? "—"
      : shippingDisplay === 0
        ? "gratis"
        : formatPrice(shippingDisplay);

  /** Klient wskazał w kroku 2 inną opcję niż ta przypięta w koszyku. */
  const optimisticShippingPick =
    selectedShippingPrice !== undefined &&
    (!hasShippingMethodSelection ||
      Math.abs(selectedShippingPrice - courierShippingGross) > 0.005);

  const displayGrandTotal = useMemo(() => {
    /**
     * AUTORYTET KWOTY: gdy metoda dostawy JEST w koszyku i klient nie
     * wskazał optymistycznie innej, `cart.total` zawiera już wszystko
     * (pozycje po rabatach, kuriera, dopłatę express, adjustmenty promocji).
     */
    if (hasShippingMethodSelection && !optimisticShippingPick) {
      return Math.round((total + expressSurcharge) * 100) / 100;
    }

    // Szacunek przed przypięciem metody / przy optymistycznym wyborze:
    // wiersze przed rabatem minus jedna Zniżka.
    const shipping =
      selectedShippingPrice ??
      (hasShippingMethodSelection ? courierShippingGross : (shippingEstimate ?? 0));
    const sum =
      productsPreDiscount +
      expressFeeDisplay +
      shipping +
      tax_total -
      discountTotal;
    return Math.round(Math.max(0, sum) * 100) / 100;
  }, [
    optimisticShippingPick,
    selectedShippingPrice,
    hasShippingMethodSelection,
    shippingEstimate,
    courierShippingGross,
    total,
    expressSurcharge,
    expressFeeDisplay,
    productsPreDiscount,
    discountTotal,
    tax_total,
  ]);

  return (
    <div className="rounded-none border border-brand-200 bg-brand-50/50 p-6">
      <h3 className="font-display text-lg font-semibold text-brand-800 mb-4">
        Podsumowanie
      </h3>

      <div className="space-y-3 mb-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="h-12 w-9 shrink-0 overflow-hidden rounded-none bg-white">
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-brand-100" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-brand-900 truncate">
                {item.title}
              </p>
              <CartConfiguratorDetails metadata={item.metadata} density="compact" />
              <p className="text-xs text-brand-500">
                Ilość: {item.quantity}
              </p>
            </div>
            <span className="text-xs font-medium tabular-nums text-brand-800">
              {formatPrice(item.total)}
            </span>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <ExpressToggle compact />
      </div>

      <div className="mb-4">
        <PromoCodeField compact />
      </div>

      <div className="border-t border-brand-200 pt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-brand-600">Produkty</span>
          <span className="font-medium tabular-nums text-brand-800">
            {formatPrice(productsPreDiscount)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-brand-600">Realizacja</span>
          <span className="font-medium text-brand-800">
            {expressDelivery
              ? "Express: 3 dni robocze"
              : "ok. 10 dni roboczych"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-brand-600">Dostawa</span>
          {shippingIsFree ? (
            <span className="font-medium tabular-nums text-brand-800">
              <s className="mr-1.5 text-brand-400">{shippingLabel}</s>
              <span className="text-emerald-700">gratis</span>
            </span>
          ) : (
            <span className="font-medium tabular-nums text-brand-800">
              {shippingLabel}
            </span>
          )}
        </div>
        {expressDelivery && expressFeeDisplay > 0 && (
          <div className="flex justify-between">
            <span className="text-brand-600">Express (+50% produktów)</span>
            <span className="font-medium tabular-nums text-brand-800">
              {formatPrice(expressFeeDisplay)}
            </span>
          </div>
        )}
        {(shippingIsFree ? productDiscount : discountTotal) > 0 && (
          <div className="flex justify-between">
            <span className="text-brand-600">Zniżka</span>
            <span className="font-medium tabular-nums text-emerald-700">
              −{formatPrice(shippingIsFree ? productDiscount : discountTotal)}
            </span>
          </div>
        )}
        {tax_total > 0 && (
          <div className="flex justify-between">
            <span className="text-brand-600">VAT</span>
            <span className="font-medium tabular-nums text-brand-800">
              {formatPrice(tax_total)}
            </span>
          </div>
        )}
        <div className="flex justify-between border-t border-brand-200 pt-2 text-base font-semibold text-brand-800">
          <span>Do zapłaty</span>
          <span className="tabular-nums">{formatPrice(displayGrandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
