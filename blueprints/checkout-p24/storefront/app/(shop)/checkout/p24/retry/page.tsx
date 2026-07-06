"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { markP24PaymentStarted } from "@/lib/medusa/checkout";

function P24RetryInner() {
  const params = useSearchParams();
  const router = useRouter();
  const cartId = params.get("cart_id");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!cartId) return;

    markP24PaymentStarted(cartId);
    router.replace(
      `/checkout/przelewy24/start?cart_id=${encodeURIComponent(cartId)}&retry=1`,
    );
  }, [cartId, router]);

  if (!cartId) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="mt-6 font-display text-2xl font-semibold text-brand-800">
          Nie udało się rozpocząć płatności
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-brand-600">
          Brak identyfikatora koszyka. Wróć do koszyka i spróbuj ponownie.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/checkout"
            className="rounded-md bg-accent px-8 py-3 text-sm font-semibold text-white hover:bg-accent-dark transition-colors"
          >
            Wróć do checkoutu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
      <h1 className="mt-6 font-display text-2xl font-semibold text-brand-800">
        Przekierowujemy do płatności…
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-brand-600">
        Przygotowujemy bezpieczną sesję Przelewy24. Za chwilę przejdziesz do bramki
        płatności.
      </p>
    </div>
  );
}

export default function P24RetryPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
        </div>
      }
    >
      <P24RetryInner />
    </Suspense>
  );
}
