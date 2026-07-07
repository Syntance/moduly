import { Lock, ShieldCheck } from "lucide-react";

/**
 * Trust badges w kroku płatności — zwiększają pewność przed „Zamawiam i płacę”.
 */
export function CheckoutTrustBadges() {
  return (
    <div
      className="grid grid-cols-1 gap-3 rounded-none border border-brand-100 bg-brand-50/50 p-4 sm:grid-cols-3"
      role="list"
      aria-label="Bezpieczeństwo płatności"
    >
      <div role="listitem" className="flex items-start gap-2.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        <div>
          <p className="text-xs font-semibold text-brand-800">Przelewy24</p>
          <p className="text-[11px] leading-snug text-brand-600">
            Certyfikowany operator płatności
          </p>
        </div>
      </div>
      <div role="listitem" className="flex items-start gap-2.5">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        <div>
          <p className="text-xs font-semibold text-brand-800">Szyfrowane połączenie</p>
          <p className="text-[11px] leading-snug text-brand-600">
            SSL — dane chronione w tranzycie
          </p>
        </div>
      </div>
      <div role="listitem" className="flex items-start gap-2.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        <div>
          <p className="text-xs font-semibold text-brand-800">Bezpieczna płatność</p>
          <p className="text-[11px] leading-snug text-brand-600">
            BLIK, przelew online, karta
          </p>
        </div>
      </div>
    </div>
  );
}
