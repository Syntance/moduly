"use client";

import { Suspense, useEffect, useRef, useState, type MutableRefObject } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, XCircle } from "lucide-react";
import { handoffP24PopupToOpener } from "@/lib/checkout/p24-popup";
import { reportCheckoutIncident } from "@/lib/checkout/telemetry";
import {
  completeCart,
  fetchP24ReturnStatus,
  buildP24RetryUrl,
  buildOrderEmailSnapshotFromCheckout,
  clearP24CartContext,
  isCartAlreadyCompletedError,
  markCheckoutCompleted,
  notifyOrderPlacedAwait,
  readP24CartContext,
  triggerPaymentFailedEmail,
  attachOrderNotes,
  redirectToOrderConfirmation,
  retryPrzelewy24Payment,
} from "@/lib/medusa/checkout";

const CHECKOUT_DRAFT_STORAGE_KEY = "moduly_checkout_draft_v1";

/** Krótkie okno na potwierdzenie z P24 zanim pokażemy „nieudana”. */
const FAILED_GRACE_MS = 2_000;

/** Tylko przy statusie 1 (verify) — płatność realnie w toku. */
function isPaymentInProgress(
  status: Awaited<ReturnType<typeof fetchP24ReturnStatus>>,
): boolean {
  return status?.status === "pending" && status.p24_status === 1;
}

function showFailedState(
  retryUrl: string,
  cartId: string,
  emailSentRef: MutableRefObject<boolean>,
) {
  if (!emailSentRef.current) {
    emailSentRef.current = true;
    void triggerPaymentFailedEmail(cartId, retryUrl);
  }
  return { kind: "failed" as const, retryUrl };
}

const POLL_DELAYS_MS = [800, 1200, 1800, 2500, 3000, 3000, 4000, 4000];

/**
 * Ile razy z rzędu obie odpowiedzi mogą być null (backend niedostępny)
 * zanim od razu pokażemy "pending" zamiast kręcić spinnerem przez 22 sek.
 */
const MAX_CONSECUTIVE_NULL_RESPONSES = 4;

type ReturnState =
  | { kind: "verifying" }
  | { kind: "pending" }
  | { kind: "failed"; retryUrl: string }
  | { kind: "error"; message: string };

function readCheckoutDraftOrderNotes(): string {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { formData?: { orderNotes?: string } };
    return typeof parsed.formData?.orderNotes === "string"
      ? parsed.formData.orderNotes.trim()
      : "";
  } catch {
    return "";
  }
}

function clearLocalCart() {
  try {
    localStorage.removeItem("moduly_cart_id");
    localStorage.removeItem("moduly_express");
    sessionStorage.removeItem("moduly_checkout_draft_v1");
    clearP24CartContext();
  } catch {
    /* prywatny tryb */
  }
}

function resolveReturnCartId(urlCartId: string | null): string | null {
  const fromUrl = urlCartId?.trim();
  if (fromUrl) return fromUrl;
  return readP24CartContext()?.cartId ?? null;
}

async function completeP24OrderSuccess(
  order: {
    id: string;
    display_id?: number;
  },
  cartId: string,
): Promise<void> {
  const orderNotes = readCheckoutDraftOrderNotes();
  if (orderNotes) {
    attachOrderNotes(order.id, orderNotes);
  }
  const snapshot = await buildOrderEmailSnapshotFromCheckout(order, cartId);
  await notifyOrderPlacedAwait(order.id, snapshot);
  markCheckoutCompleted(order.id, order.display_id ?? undefined);
  clearLocalCart();
  redirectToOrderConfirmation(order.id, order.display_id ?? undefined);
}

function FailedActions({
  cartId,
  retryUrl,
}: {
  cartId: string;
  retryUrl: string;
}) {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const handleRetry = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      const url = await retryPrzelewy24Payment(cartId);
      window.location.assign(url);
    } catch (e) {
      setRetryError(
        e instanceof Error
          ? e.message
          : "Nie udało się przygotować płatności. Spróbuj ponownie.",
      );
      setRetrying(false);
    }
  };

  return (
    <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-4 text-center">
      <button
        type="button"
        onClick={handleRetry}
        disabled={retrying}
        className="w-full rounded-md bg-accent px-8 py-3 text-sm font-semibold text-white hover:bg-accent-dark transition-colors disabled:opacity-60 sm:w-auto"
      >
        {retrying ? "Przekierowujemy…" : "Zapłać ponownie"}
      </button>
      <Link
        href="/checkout"
        className="w-full rounded-md border border-brand-300 px-8 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50 transition-colors sm:w-auto"
      >
        Wróć do checkoutu
      </Link>
      <Link
        href="/sklep"
        className="text-sm text-brand-600 underline hover:text-brand-800"
      >
        Wróć do sklepu
      </Link>
      {retryError ? (
        <p className="text-sm text-red-600">{retryError}</p>
      ) : null}
      <p className="text-xs text-brand-400">
        Możesz też użyć linku z e-maila:{" "}
        <a href={retryUrl} className="underline hover:text-brand-600">
          ponów płatność
        </a>
      </p>
    </div>
  );
}

function Przelewy24ReturnInner() {
  const params = useSearchParams();
  const urlCartId = params.get("cart_id");
  const cartId = resolveReturnCartId(urlCartId);
  const [state, setState] = useState<ReturnState>({ kind: "verifying" });
  const [popupHandoff, setPopupHandoff] = useState(false);
  const startedRef = useRef(false);
  const emailSentRef = useRef(false);

  useEffect(() => {
    if (handoffP24PopupToOpener()) {
      setPopupHandoff(true);
    }
  }, []);

  useEffect(() => {
    if (popupHandoff) return;
    if (startedRef.current) return;
    startedRef.current = true;

    if (!cartId) {
      setState({
        kind: "error",
        message:
          "Brak identyfikatora koszyka. Sprawdź skrzynkę e-mail lub skontaktuj się z nami.",
      });
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();
    let lastRetryUrl = buildP24RetryUrl(cartId);
    let consecutiveNullResponses = 0;

    (async () => {
      for (let i = 0; i <= POLL_DELAYS_MS.length; i++) {
        if (cancelled) return;

        const allowFailedOnZero = Date.now() - startedAt >= FAILED_GRACE_MS;

        const p24Status = await fetchP24ReturnStatus(cartId, {
          allowFailedOnZero,
        }).catch(() => null);

        // completeCart WYŁĄCZNIE po potwierdzeniu wpłaty w P24 (status "paid"
        // = środki są / koszyk już domknięty przez webhook). Wcześniejsze
        // strzelanie completeCart w każdej iteracji otwierało okno na
        // zamówienie bez płatności (incydent #10165) — backend i tak by je
        // teraz odrzucił (hook validate), ale nie generujemy zbędnych prób.
        if (p24Status?.status === "paid") {
          const completeResult = await completeCart(cartId, {
            retries: 0,
          }).catch((e) => {
            if (isCartAlreadyCompletedError(e)) return "completed" as const;
            return null;
          });

          if (completeResult === "completed") {
            clearLocalCart();
            if (typeof window !== "undefined") {
              window.location.replace("/checkout/potwierdzenie");
            }
            return;
          }

          if (
            completeResult &&
            typeof completeResult === "object" &&
            completeResult.type === "order"
          ) {
            await completeP24OrderSuccess(completeResult.order, cartId);
            return;
          }
          // Wpłata jest, ale complete się nie powiódł (np. chwilowy błąd) —
          // polling trwa dalej; ostatecznie pokażemy "pending" (cron domknie).
          reportCheckoutIncident("p24-paid-but-complete-failed", {
            cart_id: cartId,
            p24_status: p24Status.p24_status ?? "paid",
            attempt: i,
          });
        }

        if (p24Status?.retry_url) {
          lastRetryUrl = p24Status.retry_url;
        }

        if (allowFailedOnZero && p24Status?.status === "failed") {
          setState(showFailedState(lastRetryUrl, cartId, emailSentRef));
          return;
        }

        // Null = backend niedostępny (deploy/restart). Nie pokazujemy
        // "failed" — klient mógł zapłacić. Po kilku próbach przechodzimy do
        // "pending" i zostawiamy cron reconcile robotę.
        if (p24Status === null) {
          consecutiveNullResponses += 1;
          if (consecutiveNullResponses >= MAX_CONSECUTIVE_NULL_RESPONSES) {
            reportCheckoutIncident("p24-return-backend-unreachable", {
              cart_id: cartId,
              attempt: i,
            });
            setState({ kind: "pending" });
            return;
          }
        } else {
          consecutiveNullResponses = 0;
        }

        if (i < POLL_DELAYS_MS.length) {
          await new Promise((r) => setTimeout(r, POLL_DELAYS_MS[i]));
        }
      }

      if (!cancelled) {
        const finalStatus = await fetchP24ReturnStatus(cartId, {
          allowFailedOnZero: true,
        }).catch(() => null);
        if (finalStatus?.retry_url) lastRetryUrl = finalStatus.retry_url;
        else lastRetryUrl = buildP24RetryUrl(cartId);

        if (isPaymentInProgress(finalStatus)) {
          reportCheckoutIncident("p24-return-pending-fallback", {
            cart_id: cartId,
            p24_status: finalStatus?.p24_status ?? null,
          });
          setState({ kind: "pending" });
        } else if (finalStatus?.status === "paid") {
          try {
            const result = await completeCart(cartId, { retries: 0 });
            if (result.type === "order") {
              await completeP24OrderSuccess(result.order, cartId);
              return;
            }
          } catch {
            /* fallback pending poniżej */
          }
          reportCheckoutIncident("p24-paid-but-complete-failed", {
            cart_id: cartId,
            p24_status: finalStatus.p24_status ?? "paid",
            detail: "final-attempt",
          });
          setState({ kind: "pending" });
        } else if (finalStatus === null) {
          // Backend niedostępny (null = fetch się nie powiódł) — nie wiemy czy
          // płatność przeszła. Pokazujemy "pending" zamiast "failed", żeby klient
          // nie myślał, że musi płacić ponownie. Cron reconcile domknie zamówienie.
          reportCheckoutIncident("p24-return-backend-unreachable", {
            cart_id: cartId,
            detail: "final-attempt",
          });
          setState({ kind: "pending" });
        } else {
          reportCheckoutIncident("p24-return-failed", {
            cart_id: cartId,
            p24_status: finalStatus.p24_status ?? null,
          });
          setState(showFailedState(lastRetryUrl, cartId, emailSentRef));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cartId, popupHandoff]);

  if (popupHandoff) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
        <p className="mt-6 text-sm text-brand-600">Przenosimy wynik płatności…</p>
      </div>
    );
  }

  if (state.kind === "verifying") {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
        <h1 className="mt-6 font-display text-2xl font-semibold text-brand-800">
          Potwierdzamy płatność…
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-brand-600">
          Trwa weryfikacja transakcji w Przelewy24 — zwykle kilka sekund. Za
          chwilę przeniesiemy Cię do potwierdzenia zamówienia.
        </p>
      </div>
    );
  }

  if (state.kind === "failed") {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="mt-6 font-display text-2xl font-semibold text-brand-800">
          Płatność nie powiodła się
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-brand-600">
          Transakcja w Przelewy24 nie została zrealizowana. Twoje produkty
          nadal czekają w koszyku — możesz spróbować ponownie. Wysłaliśmy też
          e-mail z linkiem do płatności.
        </p>
        <FailedActions cartId={cartId!} retryUrl={state.retryUrl} />
      </div>
    );
  }

  if (state.kind === "pending") {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="mt-6 font-display text-2xl font-semibold text-brand-800">
          Płatność jest przetwarzana
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-brand-600">
          Czekamy na potwierdzenie z Przelewy24. Możesz bezpiecznie zamknąć tę
          stronę — gdy wpłata zostanie zaksięgowana, zamówienie utworzy się
          automatycznie, a potwierdzenie z numerem zamówienia trafi na Twój
          e-mail.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sklep"
            className="rounded-md border border-brand-300 px-8 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50 transition-colors"
          >
            Wróć do sklepu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
      <h1 className="mt-6 font-display text-2xl font-semibold text-brand-800">
        Coś poszło nie tak
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-brand-600">{state.message}</p>
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link
          href={cartId ? `/checkout/przelewy24/start?cart_id=${encodeURIComponent(cartId)}&retry=1` : "/checkout"}
          className="rounded-md bg-accent px-8 py-3 text-sm font-semibold text-white hover:bg-accent-dark transition-colors"
        >
          Spróbuj ponownie
        </Link>
        <Link
          href="/checkout"
          className="rounded-md border border-brand-300 px-8 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50 transition-colors"
        >
          Wróć do checkoutu
        </Link>
        <Link
          href="/koszyk"
          className="text-sm text-brand-600 underline hover:text-brand-800 sm:self-center"
        >
          Koszyk
        </Link>
      </div>
    </div>
  );
}

export default function Przelewy24ReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
        </div>
      }
    >
      <Przelewy24ReturnInner />
    </Suspense>
  );
}
