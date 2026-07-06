"use client";

import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";

export function CartSummary() {
  const {
    productsPreDiscount,
    courierShippingGross,
    shippingEstimate,
    hasShippingMethodSelection,
    expressDelivery,
    expressSurcharge,
    expressFeeInTotal,
    discountTotal,
    shippingDiscount,
    grandTotal,
  } = useCart();

  // Dopłata express do wyświetlenia: client-side surcharge albo metoda-dopłata
  // już wliczona w total przez backend (prepare-checkout) — nigdy obie.
  const expressFeeDisplay = expressSurcharge > 0 ? expressSurcharge : expressFeeInTotal;

  /**
   * KONWENCJA (bug 06.07.2026): wiersze pokazują kwoty PRZED rabatami
   * (Produkty = items.subtotal, Dostawa = surowa cena kuriera), a rabaty
   * odejmuje jeden wiersz „Zniżka". „Razem" = grandTotal z providera
   * (autorytatywny cart.total, gdy metoda dostawy jest w koszyku).
   */
  const shippingDisplay = hasShippingMethodSelection
    ? courierShippingGross
    : shippingEstimate;

  /**
   * Darmowa dostawa z kodu: „Dostawa: ~~25,00~~ gratis" zamiast osobnego
   * wiersza zniżki; „Zniżka" zostaje dla produktowej części rabatu.
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
  const discountRowAmount = shippingIsFree ? productDiscount : discountTotal;

  const shippingLabel =
    shippingDisplay === null || shippingDisplay === undefined
      ? "Do ustalenia"
      : shippingDisplay === 0
        ? "gratis"
        : formatPrice(shippingDisplay);

  return (
    <div className="space-y-2.5 text-sm">
      <div className="flex justify-between">
        <span className="text-brand-500">Produkty</span>
        <span className="tabular-nums text-brand-700">
          {formatPrice(productsPreDiscount)}
        </span>
      </div>
      {expressDelivery && expressFeeDisplay > 0 && (
        <div className="flex justify-between">
          <span className="text-brand-500">Express (+50% produktów)</span>
          <span className="tabular-nums text-brand-700">
            {formatPrice(expressFeeDisplay)}
          </span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-brand-500">Dostawa</span>
        {shippingIsFree ? (
          <span className="tabular-nums text-brand-700">
            <s className="mr-1.5 text-brand-400">{shippingLabel}</s>
            <span className="text-emerald-700">gratis</span>
          </span>
        ) : (
          <span className="tabular-nums text-brand-700">{shippingLabel}</span>
        )}
      </div>
      {discountRowAmount > 0 && (
        <div className="flex justify-between">
          <span className="text-brand-500">Zniżka</span>
          <span className="tabular-nums text-emerald-700">−{formatPrice(discountRowAmount)}</span>
        </div>
      )}
      <div className="h-px bg-brand-100" />
      <div className="flex justify-between pt-0.5 text-base">
        <span className="font-medium text-brand-800">Razem</span>
        <span className="font-semibold tabular-nums text-brand-900">
          {formatPrice(grandTotal)}
        </span>
      </div>
    </div>
  );
}
