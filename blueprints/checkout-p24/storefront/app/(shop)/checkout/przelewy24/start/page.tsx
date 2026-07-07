"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Loader2,
  XCircle,
} from "lucide-react";
import { openP24PaymentPopup } from "@/lib/checkout/p24-popup";
import {
  initPrzelewy24Redirect,
  markP24PaymentStarted,
  retryPrzelewy24Payment,
} from "@/lib/medusa/checkout";

type StartState =
  | { kind: "redirecting" }
  | { kind: "popup_open"; paymentUrl: string }
  | { kind: "aborted" }
  | { kind: "error"; message: string };

function isBackForwardNavigation(): boolean {
  if (typeof window === "undefined") return false;
  const nav = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  return nav?.type === "back_forward";
}

function P24StartInner() {
  const router = useRouter();
  const params = useSearchParams();
  const cartId = params.get("cart_id")?.trim() ?? "";
  const isRetry = params.get("retry") === "1";
  const [state, setState] = useState<StartState>({ kind: "redirecting" });
  const [retrying, setRetrying] = useState(false);
  const autoStartedRef = useRef(false);
  const popupRef = useRef<Window | null>(null);

  const closePopup = useCallback(() => {
    try {
      popupRef.current?.close();
    } catch {
      /* ignore */
    }
    popupRef.current = null;
  }, []);

  const goToCheckout = useCallback(() => {
    closePopup();
    router.push("/checkout");
  }, [closePopup, router]);

  const goToP24 = useCallback(
    async (opts?: { forceRetry?: boolean }) => {
      if (!cartId) {
        setState({
          kind: "error",
          message:
            "Brak identyfikatora koszyka. Wróć do checkoutu i spróbuj ponownie.",
        });
        return;
      }

      setState({ kind: "redirecting" });
      markP24PaymentStarted(cartId);

      try {
        // forceRetry: klient kliknął „Spróbuj ponownie" po nieudanym/przerwanym
        // podejściu — stary redirect_url bywa ZUŻYTY (był już na bramce), więc
        // przerejestrowujemy transakcję zamiast reużywać martwy link. Guard
        // wpłaty w p24-retry-payment chroni przed osieroceniem środków (409).
        const url =
          isRetry || opts?.forceRetry
            ? await retryPrzelewy24Payment(cartId)
            : await initPrzelewy24Redirect(cartId);

        closePopup();
        const paymentWindow = openP24PaymentPopup(url);
        if (paymentWindow) {
          popupRef.current = paymentWindow;
          setState({ kind: "popup_open", paymentUrl: url });
          return;
        }

        window.location.assign(url);
      } catch (e) {
        setState({
          kind: "error",
          message:
            e instanceof Error
              ? e.message
              : "Nie udało się przygotować płatności. Spróbuj ponownie.",
        });
      }
    },
    [cartId, closePopup, isRetry],
  );

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      closePopup();
      setState({ kind: "aborted" });
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [closePopup]);

  useEffect(() => {
    if (state.kind !== "popup_open") return;
    const timer = window.setInterval(() => {
      if (!popupRef.current?.closed) return;
      popupRef.current = null;
      setState({ kind: "aborted" });
    }, 400);
    return () => window.clearInterval(timer);
  }, [state.kind]);

  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;

    if (isBackForwardNavigation()) {
      setState({ kind: "aborted" });
      return;
    }

    void goToP24();
  }, [goToP24]);

  useEffect(() => () => closePopup(), [closePopup]);

  const handleRetry = async () => {
    setRetrying(true);
    // Klient jest tu po nieudanym/przerwanym podejściu — wymuszamy świeżą
    // rejestrację transakcji (stary link bywa zużyty), nie reużycie.
    await goToP24({ forceRetry: true });
    setRetrying(false);
  };

  if (state.kind === "popup_open") {
    return (
      <div className="min-h-[70vh]">
        <div className="sticky top-0 z-50 border-b border-brand-200 bg-white/95 backdrop-blur-sm">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm font-medium text-brand-800">
              Płatność Przelewy24 — okno płatności jest otwarte
            </p>
            <button
              type="button"
              onClick={goToCheckout}
              className="inline-flex items-center gap-2 rounded-md border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/30"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Anuluj płatność i wróć do checkoutu
            </button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-16 text-center">
          <ExternalLink className="mx-auto size-12 text-accent" aria-hidden />
          <h1 className="mt-6 font-display text-2xl font-semibold text-brand-800">
            Dokończ płatność w oknie Przelewy24
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-brand-600">
            Płatność działa w osobnym oknie / karcie Przelewy24. Jeśli pojawi
            się błąd (np. „Wewnętrzny błąd”), użyj przycisku powyżej albo wróć
            na tę kartę — checkout zostaje otwarty. Po anulowaniu P24 też
            przekieruje Cię z powrotem do sklepu.
          </p>
          <div className="mx-auto mt-8 flex max-w-md flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                closePopup();
                const popup = openP24PaymentPopup(state.paymentUrl);
                if (popup) popupRef.current = popup;
              }}
              className="rounded-md bg-accent px-8 py-3 text-sm font-semibold text-white hover:bg-accent-dark transition-colors"
            >
              Otwórz okno płatności ponownie
            </button>
            <button
              type="button"
              onClick={goToCheckout}
              className="rounded-md border border-brand-300 px-8 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50 transition-colors"
            >
              Wróć do checkoutu
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "redirecting") {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
        <h1 className="mt-6 font-display text-2xl font-semibold text-brand-800">
          Przekierowujemy do Przelewy24…
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-brand-600">
          Za chwilę przejdziesz do bezpiecznej bramki płatności.
        </p>
        <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-3">
          <Link
            href="/checkout"
            className="text-sm font-medium text-brand-700 underline hover:text-brand-900"
          >
            Anuluj i wróć do checkoutu
          </Link>
        </div>
      </div>
    );
  }

  if (state.kind === "aborted") {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="mt-6 font-display text-2xl font-semibold text-brand-800">
          Płatność nie została dokończona
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-brand-600">
          Opuszczono bramkę Przelewy24 lub wystąpił błąd po stronie operatora.
          Twoje produkty nadal są w koszyku.
        </p>
        <div className="mx-auto mt-8 flex max-w-md flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="rounded-md bg-accent px-8 py-3 text-sm font-semibold text-white hover:bg-accent-dark transition-colors disabled:opacity-60"
          >
            {retrying ? "Przekierowujemy…" : "Spróbuj ponownie"}
          </button>
          <Link
            href="/checkout"
            className="rounded-md border border-brand-300 px-8 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50 transition-colors"
          >
            Wróć do checkoutu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
      <h1 className="mt-6 font-display text-2xl font-semibold text-brand-800">
        Nie udało się rozpocząć płatności
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-brand-600">
        {state.message}
      </p>
      <div className="mx-auto mt-8 flex max-w-md flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="rounded-md bg-accent px-8 py-3 text-sm font-semibold text-white hover:bg-accent-dark transition-colors disabled:opacity-60"
        >
          {retrying ? "Przekierowujemy…" : "Spróbuj ponownie"}
        </button>
        <Link
          href="/checkout"
          className="rounded-md border border-brand-300 px-8 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50 transition-colors"
        >
          Wróć do checkoutu
        </Link>
      </div>
    </div>
  );
}

export default function P24StartPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
        </div>
      }
    >
      <P24StartInner />
    </Suspense>
  );
}
