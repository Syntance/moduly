"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "@/lib/shop-types";
import { ShippingSelector } from "./ShippingSelector";
import { PaymentSelector } from "./PaymentSelector";
import { OrderSummary } from "./OrderSummary";
import { PromoCodeField } from "./PromoCodeField";
import { CheckoutTrustBadges } from "./CheckoutTrustBadges";
import {
  isP24CircuitOpen,
  recordP24Failure,
} from "@/lib/checkout/p24-circuit-breaker";
import { cartToEcommercePayload } from "@/lib/analytics/medusa-items";
import {
  paymentMethodAnalyticsLabel,
  writeCheckoutAnalyticsContext,
} from "@/lib/analytics/checkout-analytics-context";
import { useAnalytics } from "@/lib/analytics/useAnalytics";
import { getConsent } from "@/lib/consent/consent";
import {
  getDistinctId as getPostHogDistinctId,
  getSessionId as getPostHogSessionId,
} from "@/lib/analytics/destinations/posthog";
import { getTrafficSourceMetadata } from "@/lib/analytics/traffic-source";
import { useCart } from "@/hooks/useCart";
import {
  completeCart,
  describeMedusaError,
  initPaymentSession,
  isCartAlreadyCompletedError,
  markCheckoutCompleted,
  markP24PaymentStarted,
  readP24CartContext,
  notifyBankTransferPending,
  notifyOrderPlacedAwait,
  attachOrderNotes,
  prefetchPaymentReadiness,
  prefetchShippingOptions,
  prepareCheckout,
  PRZELEWY24_PROVIDER_ID,
  readCheckoutCompleted,
  clearCheckoutCompleted,
  redirectToOrderConfirmation,
  assertCartReadyForCheckout,
  saveContactDetails,
  selectShippingOption,
  SYSTEM_PAYMENT_PROVIDER_ID,
} from "@/lib/medusa/checkout";
import { getPolishRegionId } from "@/lib/medusa/region";
import { sanitizeOrderNotes } from "@/lib/checkout/sanitize-order-notes";
import {
  isTurnstileEnabled,
  verifyTurnstileToken,
} from "@/lib/checkout/turnstile";
import { TurnstileWidget } from "@/components/checkout/TurnstileWidget";

const POSTAL_CODE_REGEX = /^\d{2}-\d{3}$/;
const NIP_REGEX = /^\d{10}$/;

/** Formatuje numer PL na bieżąco: +48 XXX XXX XXX */
function formatPolishPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 0) {
    return input.includes("+") ? "+48" : "";
  }

  const national = digits.startsWith("48")
    ? digits.slice(2, 11)
    : digits.slice(0, 9);
  if (national.length === 0) return "+48";

  let formatted = "+48";
  if (national.length > 0) formatted += ` ${national.slice(0, 3)}`;
  if (national.length > 3) formatted += ` ${national.slice(3, 6)}`;
  if (national.length > 6) formatted += ` ${national.slice(6, 9)}`;
  return formatted;
}

function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  const national = digits.startsWith("48") ? digits.slice(2) : digits;
  return national.length === 9 && /^\d{9}$/.test(national);
}

function validatePostalCode(code: string): boolean {
  return POSTAL_CODE_REGEX.test(code);
}

function getNipValidationError(nip: string): string | null {
  const cleaned = nip.replace(/[\s-]/g, "");
  if (!cleaned) return null;
  if (!NIP_REGEX.test(cleaned)) {
    return "NIP musi zawierać 10 cyfr";
  }
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = cleaned
    .slice(0, 9)
    .split("")
    .reduce(
      (acc, digit, i) => acc + parseInt(digit, 10) * (weights[i] || 0),
      0,
    );
  const checksum = sum % 11;
  if (checksum === 10 || checksum !== parseInt(cleaned[9] || "0", 10)) {
    return "NIP jest nieprawidłowy — sprawdź numer";
  }
  return null;
}

function validateNip(nip: string): boolean {
  const cleaned = nip.replace(/[\s-]/g, "");
  if (!cleaned) return false;
  return getNipValidationError(nip) === null;
}

type ValidatedField =
  | "email"
  | "phone"
  | "postalCode"
  | "firstName"
  | "lastName"
  | "address"
  | "city";

function getFieldValidationError(
  field: ValidatedField,
  value: string,
): string | null {
  switch (field) {
    case "email":
      if (!value.trim()) return "Email jest wymagany";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        return "Podaj poprawny adres email";
      }
      return null;
    case "phone":
      if (!value.trim()) return "Telefon jest wymagany";
      if (!validatePhone(value))
        return "Podaj numer w formacie +48 XXX XXX XXX";
      return null;
    case "postalCode":
      if (!value.trim()) return "Kod pocztowy jest wymagany";
      if (!validatePostalCode(value)) return "Kod pocztowy: format XX-XXX";
      return null;
    case "firstName":
      return value.trim() === "" ? "Imię jest wymagane" : null;
    case "lastName":
      return value.trim() === "" ? "Nazwisko jest wymagane" : null;
    case "address":
      return value.trim() === "" ? "Adres jest wymagany" : null;
    case "city":
      return value.trim() === "" ? "Miasto jest wymagane" : null;
    default:
      return null;
  }
}

type CheckoutStep = 1 | 2 | 3;

const CHECKOUT_DRAFT_STORAGE_KEY = "moduly_checkout_draft_v1";

type CheckoutFormData = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  shippingOptionId: string;
  shippingOptionName: string;
  paymentProviderId: string;
  newsletter: boolean;
  wantInvoice: boolean;
  companyName: string;
  nip: string;
  acceptTerms: boolean;
  acceptRodo: boolean;
  orderNotes: string;
};

type CheckoutDraftPayload = {
  v: 1;
  cartId: string;
  step: CheckoutStep;
  formData: CheckoutFormData;
};

function getDefaultCheckoutFormData(): CheckoutFormData {
  return {
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    shippingOptionId: "",
    shippingOptionName: "",
    paymentProviderId: "",
    newsletter: false,
    wantInvoice: false,
    companyName: "",
    nip: "",
    acceptTerms: false,
    acceptRodo: false,
    orderNotes: "",
  };
}

function clearCheckoutDraft(): void {
  try {
    sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
  } catch {
    /* prywatny tryb */
  }
}

const STEPS = [
  { number: 1, label: "Dane" },
  { number: 2, label: "Dostawa" },
  { number: 3, label: "Płatność" },
] as const;

const INPUT_CLASS =
  "w-full rounded-md border border-brand-200 px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors";
const LABEL_CLASS = "block text-sm font-medium text-brand-700 mb-1";

/**
 * Gdy Medusa oznajmia, że koszyk jest już completed, zużyty cart_id nadal
 * siedzi w localStorage — bez twardego resetu każdy kolejny klik dostaje
 * ten sam błąd. Czyścimy lokalny stan i przeładowujemy stronę.
 */
function resetStaleCartAndReload() {
  clearCheckoutDraft();
  try {
    localStorage.removeItem("moduly_cart_id");
    localStorage.removeItem("moduly_express");
  } catch {
    /* prywatny tryb */
  }
  if (typeof window !== "undefined") {
    window.location.assign("/koszyk");
  }
}

export function CheckoutForm() {
  const {
    id: cartId,
    items,
    total,
    grandTotal,
    refreshCart,
    isInitialized,
    appliedPromoCodes,
    shippingOptionId: cartShippingOptionId,
  } = useCart();
  const { track, identifyLead } = useAnalytics();
  const [step, setStep] = useState<CheckoutStep>(1);
  const [formStarted, setFormStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  /** true od startu twardej nawigacji do bramki — finally nie zdejmuje guardu. */
  const redirectingRef = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /**
   * Po ~3s od kliknięcia „Zamawiam i płacę" pokazujemy dodatkowy komunikat
   * „Przetwarzamy zamówienie…". Typowy `completeCart` kończy się w <1s, ale
   * cold start Railway potrafi wydłużyć to do 5–8s i bez tego user widzi
   * goły spinner, co pogarsza konwersję.
   */
  const [submitSlow, setSubmitSlow] = useState(false);
  const submitSlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnstileEnabled = isTurnstileEnabled();
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileTokenRef = useRef("");
  turnstileTokenRef.current = turnstileToken;
  const staleResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beginCheckoutFiredRef = useRef(false);
  const checkoutStartTimeRef = useRef<number | null>(null);

  /**
   * Po udanym zamówieniu — nie wracaj na checkout (przycisk Wstecz). Aktywny
   * koszyk = nowe zamówienie. KLUCZOWE: czekamy aż koszyk się zbootstrapuje
   * (`isInitialized`), bo na pierwszym renderze `cartId` jest null i `items`
   * puste — bez tej bramki stara flaga „completed" cofała usera na potwierdzenie
   * mimo że dodał nowy produkt.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isInitialized) return;
    if (cartId && items.length > 0) {
      clearCheckoutCompleted();
      return;
    }
    const completed = readCheckoutCompleted();
    if (completed) {
      redirectToOrderConfirmation(completed.orderId, completed.displayId);
    }
  }, [cartId, items.length, isInitialized]);

  /** Pusty koszyk nie może iść do płatności — wróć do koszyka (po bootstrapie). */
  useEffect(() => {
    if (!isInitialized) return;
    if (!cartId || items.length > 0) return;
    if (typeof window === "undefined") return;
    if (readCheckoutCompleted()) return;
    window.location.replace("/koszyk");
  }, [cartId, items.length, isInitialized]);

  useEffect(() => {
    return () => {
      if (staleResetTimerRef.current) {
        clearTimeout(staleResetTimerRef.current);
        staleResetTimerRef.current = null;
      }
    };
  }, []);

  /**
   * Prefetch opcji dostawy + „gotowości płatności" w tle — Step 2 i Step 3
   * mają dane natychmiast, zamiast czekać na kolejne round-tripy po
   * kliknięciu odpowiednich CTA. Cache jest moduł-level (checkout.ts),
   * więc wielokrotne mountowania komponentu nie dublują żądań.
   *
   * Ogólnie oszczędzamy przy Step 1→2 ~3,4 s (shipping-options) i przy
   * Step 2→3 ~1,5 s (region + payment-providers). Wszystko dzieje się
   * równolegle z wypełnianiem formularza kontaktowego.
   */
  useEffect(() => {
    if (!cartId) return;
    void prefetchShippingOptions(cartId).catch(() => {
      /* błąd dopiero w Step 2 — tam jest UI do pokazania */
    });
    void prefetchPaymentReadiness(getPolishRegionId)
      .then((r) => setAvailableProviderIds(r.providerIds))
      .catch(() => {
        /* błąd dopiero w Step 3 — tam jest UI do pokazania */
      });
  }, [cartId]);

  /**
   * Meta Pixel / PostHog: odpalamy `begin_checkout` raz, zaraz po tym jak
   * pojawią się itemy w koszyku. Wysyłamy to tu (a nie w `AddToCartButton`),
   * bo ludzie wchodzą na /checkout również z poziomu mini-koszyka.
   */
  useEffect(() => {
    if (beginCheckoutFiredRef.current) return;
    if (!cartId || items.length === 0) return;
    beginCheckoutFiredRef.current = true;
    checkoutStartTimeRef.current = Date.now();
    writeCheckoutAnalyticsContext({ startedAt: checkoutStartTimeRef.current });
    track(
      "begin_checkout",
      cartToEcommercePayload({
        items: items.map((i) => ({
          id: i.id,
          variant_id: i.variant_id,
          title: i.title,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        total,
        currency: "PLN",
      }),
    );
  }, [cartId, items, total]);

  // Notion: `checkout_abandon` — refy zadeklarujemy tu (potrzebne wyżej w kodzie),
  // a właściwy nasłuch beforeunload montujemy poniżej, gdy `formData` już istnieje.
  const lastStepRef = useRef<CheckoutStep>(1);
  const abandonSnapshotRef = useRef<{ cartValue: number; hasEmail: boolean }>({
    cartValue: 0,
    hasEmail: false,
  });
  useEffect(() => {
    lastStepRef.current = step;
  }, [step]);

  const scheduleStaleReset = useCallback(() => {
    if (staleResetTimerRef.current) {
      clearTimeout(staleResetTimerRef.current);
    }
    staleResetTimerRef.current = setTimeout(resetStaleCartAndReload, 800);
  }, []);
  const [preparingDelivery, setPreparingDelivery] = useState(false);
  const [contactSaveError, setContactSaveError] = useState<string | null>(null);
  const [preparingPayment, setPreparingPayment] = useState(false);
  const [shippingSaveError, setShippingSaveError] = useState<string | null>(
    null,
  );
  const [availableProviderIds, setAvailableProviderIds] = useState<string[]>(
    [],
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ValidatedField, string>>
  >({});
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<ValidatedField, boolean>>
  >({});
  const [p24CircuitOpen, setP24CircuitOpen] = useState(false);
  const [formData, setFormData] = useState<CheckoutFormData>(() =>
    getDefaultCheckoutFormData(),
  );
  /** Aktualny formularz w submit — unika stale closure (np. P24 mimo wyboru przelewu). */
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // Snapshot do `checkout_abandon` (Notion) — nie chcemy rejestrować nowego
  // listenera na każdy keystroke, więc trzymamy w refie.
  useEffect(() => {
    abandonSnapshotRef.current = {
      cartValue: total,
      hasEmail: formData.email.includes("@"),
    };
  }, [total, formData.email]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onUnload = () => {
      if (readCheckoutCompleted()) return;
      if (!cartId || items.length === 0) return;
      track("checkout_abandon", {
        last_step: lastStepRef.current,
        value: abandonSnapshotRef.current.cartValue,
        currency: "PLN",
        has_email: abandonSnapshotRef.current.hasEmail,
      });
    };
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
    };
  }, [cartId, items.length]);

  /** Blokuje jeden zapis do sessionStorage tuż po wczytaniu szkicu (unikamy nadpisania pustym stanem). */
  const skipPersistDraftRef = useRef(false);

  /**
   * Po odświeżeniu / powrocie na /checkout — przywróć pola z szkicu
   * powiązanego z aktualnym `cart_id`, ale zawsze od kroku 1 (Dane).
   * Inny koszyk = czyścimy stary szkic.
   */
  useEffect(() => {
    if (!cartId) return;
    skipPersistDraftRef.current = true;
    try {
      const raw = sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
      if (!raw) {
        queueMicrotask(() => {
          skipPersistDraftRef.current = false;
        });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<CheckoutDraftPayload>;
      if (
        parsed.v !== 1 ||
        !parsed.formData ||
        typeof parsed.formData !== "object"
      ) {
        queueMicrotask(() => {
          skipPersistDraftRef.current = false;
        });
        return;
      }
      if (parsed.cartId !== cartId) {
        try {
          sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
        } catch {
          /* */
        }
        setStep(1);
        setFormData(getDefaultCheckoutFormData());
        queueMicrotask(() => {
          skipPersistDraftRef.current = false;
        });
        return;
      }
      setStep(1);
      setFormData({
        ...getDefaultCheckoutFormData(),
        ...parsed.formData,
        phone: formatPolishPhone(parsed.formData.phone ?? ""),
      });
      setSubmitError(null);
    } catch {
      /* uszkodzony JSON */
    }
    queueMicrotask(() => {
      skipPersistDraftRef.current = false;
    });
  }, [cartId]);

  useEffect(() => {
    if (!cartId || skipPersistDraftRef.current) return;
    try {
      const payload: CheckoutDraftPayload = {
        v: 1,
        cartId,
        step,
        formData,
      };
      sessionStorage.setItem(
        CHECKOUT_DRAFT_STORAGE_KEY,
        JSON.stringify(payload),
      );
    } catch {
      /* prywatny tryb / quota */
    }
  }, [cartId, step, formData]);

  const updateField = useCallback(
    <K extends keyof CheckoutFormData>(
      field: K,
      value: CheckoutFormData[K],
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    setP24CircuitOpen(isP24CircuitOpen());
  }, [step]);

  // Circuit breaker P24 pokazuje tylko ostrzeżenie (baner w PaymentSelector).
  // NIE przełączamy na przelew tradycyjny — jedyną płatnością jest P24
  // (przelew poza bramką wyłączony po incydencie #10165: zamówienie bez
  // płatności). Klient może ponowić próbę — P24 zwykle wraca po chwili.

  const handleFieldBlur = useCallback(
    (field: ValidatedField, overrideValue?: string) => {
      setTouchedFields((prev) => ({ ...prev, [field]: true }));
      const value = overrideValue ?? formData[field];
      const error = getFieldValidationError(field, value);
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (error) next[field] = error;
        else delete next[field];
        return next;
      });
      if (error) {
        track("form_error", {
          form_name: "checkout_contact",
          field_name: field,
          error_type: error,
          step: 1,
        });
      }
      if (field === "email" && formData.email.includes("@")) {
        identifyLead({ email: formData.email, source: "checkout" });
      }
    },
    [formData],
  );

  const showFieldError = (field: ValidatedField) =>
    touchedFields[field] && fieldErrors[field];

  const handleFocus = useCallback(() => {
    if (!formStarted) {
      setFormStarted(true);
      track("form_start", { form_name: "checkout_contact" });
    }
  }, [formStarted]);

  const handleShippingSelect = useCallback(
    async (optionId: string, optionName?: string) => {
      updateField("shippingOptionId", optionId);
      if (optionName) updateField("shippingOptionName", optionName);
      if (!cartId) return;
      const hasVisiblePromo = appliedPromoCodes.some(
        (code) => !code.startsWith("__moduly_fs_"),
      );
      if (!hasVisiblePromo) return;
      try {
        await selectShippingOption(cartId, optionId);
        await refreshCart();
      } catch (error) {
        console.warn("[checkout] sync shipping after promo", error);
      }
    },
    [appliedPromoCodes, cartId, refreshCart, updateField],
  );

  useEffect(() => {
    if (!cartShippingOptionId || formData.shippingOptionId) return;
    updateField("shippingOptionId", cartShippingOptionId);
  }, [cartShippingOptionId, formData.shippingOptionId, updateField]);

  const nipValidationError = getNipValidationError(formData.nip);
  const isNipValid = validateNip(formData.nip);
  const vatValid =
    !formData.wantInvoice || (formData.companyName.trim() !== "" && isNipValid);

  const canGoToStep2 =
    formData.email.includes("@") &&
    formData.firstName.trim() !== "" &&
    formData.lastName.trim() !== "" &&
    validatePhone(formData.phone) &&
    formData.address.trim() !== "" &&
    formData.city.trim() !== "" &&
    validatePostalCode(formData.postalCode) &&
    vatValid;

  const canGoToStep3 = formData.shippingOptionId !== "";

  const canSubmit =
    formData.paymentProviderId !== "" &&
    formData.acceptTerms &&
    formData.acceptRodo &&
    !!cartId &&
    items.length > 0 &&
    formData.shippingOptionId !== "" &&
    (!turnstileEnabled || turnstileToken !== "") &&
    !submitting &&
    !submittingRef.current;

  const handleSubmit = useCallback(async () => {
    if (!cartId) return;
    if (items.length === 0) {
      setSubmitError("Koszyk jest pusty — dodaj produkty i spróbuj ponownie.");
      return;
    }
    if (!formDataRef.current.shippingOptionId) {
      setSubmitError("Wybierz sposób dostawy przed płatnością.");
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitError(null);
    setSubmitting(true);
    setSubmitSlow(false);
    submitSlowTimerRef.current = setTimeout(() => setSubmitSlow(true), 3000);
    track("form_step", { form_name: "checkout_payment", step_number: 3 });

    const payment = formDataRef.current;

    try {
      await assertCartReadyForCheckout(cartId);

      if (isTurnstileEnabled()) {
        const ok = await verifyTurnstileToken(turnstileTokenRef.current);
        if (!ok) {
          throw new Error(
            "Weryfikacja zabezpieczająca nie powiodła się. Odśwież stronę i spróbuj ponownie.",
          );
        }
      }

      // Snapshot zgód + PostHog ids → cart.metadata (prepare-checkout).
      // completeCart przeniesie je do order.metadata; subscriber bramkuje
      // server-side CAPI (marketing) i PostHog (analytics) + odtwarza distinct_id.
      const consentSnapshot = getConsent();
      const analyticsSnapshot = {
        consentAnalytics: consentSnapshot?.analytics ?? false,
        consentMarketing: consentSnapshot?.marketing ?? false,
        phDistinctId: getPostHogDistinctId(),
        phSessionId: getPostHogSessionId(),
        trafficSource: getTrafficSourceMetadata(),
      };

      // Sanityzuj orderNotes przed wysłaniem (XSS protection) — text-only.
      const sanitizedNotes = sanitizeOrderNotes(payment.orderNotes);

      // Koszyk darmowy (100% rabat + darmowa dostawa) — brak płatności do
      // pobrania: nie wysyłamy klienta do bramki na 0 zł (P24 odrzuca
      // rejestrację zerowej kwoty), tylko od razu domykamy koszyk niżej.
      const isFreeCart = grandTotal <= 0;

      // Przelewy24 = płatność z przekierowaniem. Inicjujemy sesję P24,
      // a finalizację koszyka (utworzenie zamówienia) robi strona powrotu
      // /checkout/przelewy24/return po potwierdzeniu płatności przez webhook.
      if (payment.paymentProviderId === PRZELEWY24_PROVIDER_ID && !isFreeCart) {
        await prepareCheckout(
          cartId,
          payment.shippingOptionId,
          payment.paymentProviderId,
          sanitizedNotes,
          analyticsSnapshot,
          {
            companyName: payment.companyName,
            nip: payment.nip,
          },
        );
        track("add_payment_info", {
          ...cartToEcommercePayload({
            items: items.map((i) => ({
              id: i.id,
              variant_id: i.variant_id,
              title: i.title,
              quantity: i.quantity,
              unit_price: i.unit_price,
            })),
            total,
            currency: "PLN",
          }),
          payment_method: paymentMethodAnalyticsLabel(
            payment.paymentProviderId,
          ),
        });
        writeCheckoutAnalyticsContext({
          paymentMethod: paymentMethodAnalyticsLabel(payment.paymentProviderId),
        });
        if (typeof window !== "undefined") {
          // Czy klient BYŁ JUŻ kierowany do bramki dla tego koszyka? Znacznik
          // P24_CART_CONTEXT czyścimy wyłącznie po sukcesie płatności, więc
          // jego obecność = wcześniejsze podejście (klient wszedł na bramkę
          // i wrócił/anulował). Stary `redirect_url` jest wtedy ZUŻYTY —
          // reużycie go zrzuca klienta od razu na /return ze statusem 0
          // („przetwarzana" → „nieudana"), a bramka odpala się dopiero po
          // ręcznym „Ponów". Wymuszamy retry=1: /start przerejestruje
          // transakcję (świeży link), a p24-retry-payment ma guard wpłaty
          // w drodze (409 „nie płać ponownie"), więc nie osieroci środków.
          const alreadyStarted = readP24CartContext()?.cartId === cartId;
          markP24PaymentStarted(cartId);
          // Guard zostaje ZABLOKOWANY na czas twardej nawigacji — `finally`
          // odblokowywał go natychmiast, więc szybki drugi klik w oknie przed
          // unloadem strony odpalał DRUGI submit (chaos-e2e: double-click →
          // 2× prepare-checkout). Serwer jest idempotentny, ale okna nie
          // zostawiamy. Fallback: gdy nawigacja się nie uda (rzadkie),
          // timer odblokowuje przycisk po 8 s.
          redirectingRef.current = true;
          window.setTimeout(() => {
            redirectingRef.current = false;
            submittingRef.current = false;
            setSubmitting(false);
          }, 8_000);
          const startUrl = `/checkout/przelewy24/start?cart_id=${encodeURIComponent(cartId)}${
            alreadyStarted ? "&retry=1" : ""
          }`;
          window.location.assign(startUrl);
          return;
        }
      }

      // Przelew tradycyjny — ponownie prepare (dostawa + sesja wybranego providera),
      // bo w kroku 2 sesja mogła powstać dla innego providera (np. P24).
      await prepareCheckout(
        cartId,
        payment.shippingOptionId,
        payment.paymentProviderId,
        sanitizedNotes,
        analyticsSnapshot,
        {
          companyName: payment.companyName,
          nip: payment.nip,
        },
      );
      // Darmowy koszyk nie potrzebuje sesji płatności — Medusa pomija
      // płatność przy completeCart (canSkipPayment), a rejestracja 0 zł
      // u providera i tak by padła.
      if (!isFreeCart) {
        await initPaymentSession(cartId, payment.paymentProviderId);
      }

      const paymentLabel = paymentMethodAnalyticsLabel(
        payment.paymentProviderId,
      );
      writeCheckoutAnalyticsContext({ paymentMethod: paymentLabel });
      track("add_payment_info", {
        ...cartToEcommercePayload({
          items: items.map((i) => ({
            id: i.id,
            variant_id: i.variant_id,
            title: i.title,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
          total,
          currency: "PLN",
        }),
        payment_method: paymentLabel,
      });

      const result = await completeCart(cartId);

      if (result.type !== "order") {
        const err = (
          result as {
            error?: { message?: string; code?: string; type?: string };
          }
        ).error;
        console.error(
          "[checkout] complete zwrócił cart zamiast order",
          err,
          result,
        );
        const msg = describeMedusaError(
          err,
          "Nie udało się utworzyć zamówienia (koszyk nie przeszedł w zamówienie).",
        );
        throw new Error(msg);
      }

      if (payment.newsletter && payment.email.includes("@")) {
        track("email_signup", {
          source: "checkout",
          email_domain: payment.email.split("@")[1],
        });
      }

      const isBankTransfer =
        payment.paymentProviderId === SYSTEM_PAYMENT_PROVIDER_ID;

      if (sanitizedNotes) {
        attachOrderNotes(result.order.id, sanitizedNotes);
      }

      if (isBankTransfer) {
        await notifyBankTransferPending({
          orderId: result.order.id,
          email: payment.email,
          displayId: result.order.display_id ?? undefined,
          totalMinor: total,
          itemTotalMinor: items.reduce(
            (sum, i) => sum + i.unit_price * i.quantity,
            0,
          ),
          customerName: [payment.firstName, payment.lastName]
            .filter(Boolean)
            .join(" ")
            .trim(),
          items: items.map((i) => ({
            title: i.title,
            quantity: i.quantity,
            totalMinor: i.unit_price * i.quantity,
            thumbnail: i.thumbnail ?? null,
          })),
          paymentProviderId: payment.paymentProviderId,
        });
      } else {
        await notifyOrderPlacedAwait(result.order.id);
      }

      markCheckoutCompleted(
        result.order.id,
        result.order.display_id ?? undefined,
      );

      try {
        localStorage.removeItem("moduly_cart_id");
        localStorage.removeItem("moduly_express");
      } catch {
        /* prywatny tryb */
      }
      clearCheckoutDraft();
      await refreshCart().catch(() => undefined);

      if (typeof window !== "undefined") {
        redirectToOrderConfirmation(
          result.order.id,
          result.order.display_id ?? undefined,
          isBankTransfer ? { payment: "bank_transfer" } : undefined,
        );
        return;
      }
    } catch (e) {
      console.error("[checkout] błąd składania zamówienia", e);
      // Circuit breaker liczy tylko REALNE awarie bramki/backendu. Nasze
      // celowe 4xx (wpłata w drodze / koszyk domknięty / pusty) to stany
      // klienta, nie awarie P24 — nie mogą otwierać bezpiecznika.
      const guardType = (e as { type?: string }).type;
      const isClientStateGuard =
        guardType === "payment_in_progress" ||
        guardType === "cart_completed" ||
        guardType === "cart_empty";
      if (
        payment.paymentProviderId === PRZELEWY24_PROVIDER_ID &&
        !isClientStateGuard
      ) {
        recordP24Failure();
        setP24CircuitOpen(isP24CircuitOpen());
      }
      if (isCartAlreadyCompletedError(e)) {
        setSubmitError(
          "Koszyk został już sfinalizowany wcześniej. Zaraz zaczniesz od nowa…",
        );
        scheduleStaleReset();
        return;
      }
      const message = describeMedusaError(
        e,
        "Nie udało się złożyć zamówienia. Spróbuj ponownie.",
      );
      setSubmitError(message);
    } finally {
      setSubmitSlow(false);
      if (submitSlowTimerRef.current) {
        clearTimeout(submitSlowTimerRef.current);
        submitSlowTimerRef.current = null;
      }
      // Po starcie twardej nawigacji do bramki guard trzyma blokadę (patrz
      // wyżej — fallback timer 8 s). W pozostałych ścieżkach odblokowujemy
      // od razu, żeby przycisk nie został zablokowany na zawsze.
      if (!redirectingRef.current) {
        setSubmitting(false);
        submittingRef.current = false;
      }
    }
  }, [cartId, items, total, grandTotal, refreshCart]);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-8">
        {/* Step indicator */}
        <nav aria-label="Postęp zamówienia" className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center">
              {i > 0 && (
                <div
                  className={`mx-2 h-px w-8 sm:w-12 transition-colors ${
                    step >= s.number ? "bg-brand-800" : "bg-brand-200"
                  }`}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  if (s.number < step) setStep(s.number as CheckoutStep);
                }}
                disabled={s.number > step}
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  step === s.number
                    ? "bg-brand-800 text-white shadow-sm"
                    : step > s.number
                      ? "bg-accent/20 text-brand-800 cursor-pointer hover:bg-accent/30"
                      : "bg-brand-100 text-brand-400"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                    step === s.number
                      ? "bg-white/20 text-white"
                      : step > s.number
                        ? "bg-brand-800 text-white"
                        : "bg-white text-brand-500"
                  }`}
                >
                  {step > s.number ? "✓" : s.number}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </div>
          ))}
        </nav>

        {/* Step 1 — Contact info */}
        {step === 1 && (
          <section className="space-y-6">
            <h2 className="font-display text-xl font-semibold text-brand-800">
              Dane kontaktowe
            </h2>

            {/* Email first */}
            <div>
              <label htmlFor="email" className={LABEL_CLASS}>
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                autoFocus
                value={formData.email}
                onFocus={handleFocus}
                onBlur={() => handleFieldBlur("email")}
                onChange={(e) => updateField("email", e.target.value)}
                className={`${INPUT_CLASS} ${showFieldError("email") ? "border-red-300" : ""}`}
                placeholder="twoj@email.pl"
                aria-invalid={showFieldError("email") ? true : undefined}
                aria-describedby={
                  showFieldError("email") ? "email-error" : undefined
                }
              />
              {showFieldError("email") && (
                <p
                  id="email-error"
                  className="mt-1 text-xs text-red-500"
                  role="alert"
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className={LABEL_CLASS}>
                  Imię <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={formData.firstName}
                  onBlur={() => handleFieldBlur("firstName")}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className={`${INPUT_CLASS} ${showFieldError("firstName") ? "border-red-300" : ""}`}
                  aria-invalid={showFieldError("firstName") ? true : undefined}
                />
                {showFieldError("firstName") && (
                  <p className="mt-1 text-xs text-red-500" role="alert">
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className={LABEL_CLASS}>
                  Nazwisko <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={formData.lastName}
                  onBlur={() => handleFieldBlur("lastName")}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className={`${INPUT_CLASS} ${showFieldError("lastName") ? "border-red-300" : ""}`}
                  aria-invalid={showFieldError("lastName") ? true : undefined}
                />
                {showFieldError("lastName") && (
                  <p className="mt-1 text-xs text-red-500" role="alert">
                    {fieldErrors.lastName}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="phone" className={LABEL_CLASS}>
                  Telefon <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  required
                  value={formData.phone}
                  onBlur={() => {
                    const formatted = formatPolishPhone(formData.phone);
                    if (formatted !== formData.phone) {
                      updateField("phone", formatted);
                    }
                    handleFieldBlur("phone", formatted);
                  }}
                  onChange={(e) =>
                    updateField("phone", formatPolishPhone(e.target.value))
                  }
                  className={`${INPUT_CLASS} ${showFieldError("phone") ? "border-red-300" : ""}`}
                  placeholder="+48 000 000 000"
                  aria-invalid={showFieldError("phone") ? true : undefined}
                  aria-describedby={
                    showFieldError("phone") ? "phone-error" : undefined
                  }
                />
                {showFieldError("phone") && (
                  <p
                    id="phone-error"
                    className="mt-1 text-xs text-red-500"
                    role="alert"
                  >
                    {fieldErrors.phone}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="postalCode" className={LABEL_CLASS}>
                  Kod pocztowy <span className="text-red-500">*</span>
                </label>
                <input
                  id="postalCode"
                  type="text"
                  autoComplete="postal-code"
                  inputMode="numeric"
                  pattern="\d{2}-\d{3}"
                  required
                  value={formData.postalCode}
                  onBlur={() => handleFieldBlur("postalCode")}
                  onChange={(e) => updateField("postalCode", e.target.value)}
                  className={`${INPUT_CLASS} ${showFieldError("postalCode") ? "border-red-300" : ""}`}
                  placeholder="00-000"
                  aria-invalid={showFieldError("postalCode") ? true : undefined}
                  aria-describedby={
                    showFieldError("postalCode")
                      ? "postalCode-error"
                      : undefined
                  }
                />
                {showFieldError("postalCode") && (
                  <p
                    id="postalCode-error"
                    className="mt-1 text-xs text-red-500"
                    role="alert"
                  >
                    {fieldErrors.postalCode}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="city" className={LABEL_CLASS}>
                  Miasto <span className="text-red-500">*</span>
                </label>
                <input
                  id="city"
                  type="text"
                  autoComplete="address-level2"
                  required
                  value={formData.city}
                  onBlur={() => handleFieldBlur("city")}
                  onChange={(e) => updateField("city", e.target.value)}
                  className={`${INPUT_CLASS} ${showFieldError("city") ? "border-red-300" : ""}`}
                  aria-invalid={showFieldError("city") ? true : undefined}
                />
                {showFieldError("city") && (
                  <p className="mt-1 text-xs text-red-500" role="alert">
                    {fieldErrors.city}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="address" className={LABEL_CLASS}>
                  Adres <span className="text-red-500">*</span>
                </label>
                <input
                  id="address"
                  type="text"
                  autoComplete="street-address"
                  required
                  value={formData.address}
                  onBlur={() => handleFieldBlur("address")}
                  onChange={(e) => updateField("address", e.target.value)}
                  className={`${INPUT_CLASS} ${showFieldError("address") ? "border-red-300" : ""}`}
                  placeholder="ul. Przykładowa 1/2"
                  aria-invalid={showFieldError("address") ? true : undefined}
                />
                {showFieldError("address") && (
                  <p className="mt-1 text-xs text-red-500" role="alert">
                    {fieldErrors.address}
                  </p>
                )}
              </div>
            </div>

            {/* VAT Invoice */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.wantInvoice}
                  onChange={(e) => updateField("wantInvoice", e.target.checked)}
                  className="h-4 w-4 rounded border-brand-300 text-accent focus:ring-accent"
                />
                <span className="text-sm text-brand-700">Chcę fakturę VAT</span>
              </label>

              {formData.wantInvoice && (
                <div className="grid gap-4 sm:grid-cols-2 pl-6">
                  <div>
                    <label htmlFor="companyName" className={LABEL_CLASS}>
                      Nazwa firmy <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="companyName"
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) =>
                        updateField("companyName", e.target.value)
                      }
                      className={`${INPUT_CLASS} ${formData.companyName.trim() === "" && formData.wantInvoice ? "border-red-300" : ""}`}
                    />
                    {formData.companyName.trim() === "" && (
                      <p className="mt-1 text-xs text-red-500">Pole wymagane</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="nip" className={LABEL_CLASS}>
                      NIP <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="nip"
                      type="text"
                      required
                      value={formData.nip}
                      onChange={(e) => updateField("nip", e.target.value)}
                      className={`${INPUT_CLASS} ${formData.nip.length > 0 && !isNipValid ? "border-red-300" : ""}`}
                      placeholder="0000000000"
                      maxLength={13}
                    />
                    {nipValidationError ? (
                      <p className="mt-1 text-xs text-red-500">
                        {nipValidationError}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* Newsletter opt-in */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.newsletter}
                onChange={(e) => updateField("newsletter", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-brand-300 text-accent focus:ring-accent"
              />
              <span className="text-sm text-brand-600">
                Wyrażam zgodę na otrzymywanie informacji handlowych drogą
                elektroniczną (newsletter) zgodnie z ustawą o świadczeniu usług
                drogą elektroniczną
              </span>
            </label>

            {contactSaveError && (
              <p className="text-sm text-red-600" role="alert">
                {contactSaveError}
              </p>
            )}

            <button
              type="button"
              onClick={async () => {
                if (!cartId) {
                  setContactSaveError(
                    "Brak koszyka — odśwież stronę i spróbuj ponownie.",
                  );
                  return;
                }
                setContactSaveError(null);
                setPreparingDelivery(true);
                try {
                  const address: Address = {
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    phone: formData.phone,
                    address_1: formData.address,
                    city: formData.city,
                    postal_code: formData.postalCode,
                    country_code: "pl",
                    ...(formData.wantInvoice && formData.companyName
                      ? { company: formData.companyName }
                      : {}),
                  };
                  track("form_step", {
                    form_name: "checkout_contact",
                    step_number: 1,
                  });
                  if (formData.email.includes("@")) {
                    identifyLead({
                      email: formData.email,
                      name: `${formData.firstName} ${formData.lastName}`.trim(),
                      source: "checkout",
                    });
                  }
                  await saveContactDetails(cartId, formData.email, address);
                  setStep(2);
                } catch (e) {
                  console.error("[checkout] zapis przed dostawą", e);
                  if (isCartAlreadyCompletedError(e)) {
                    setContactSaveError(
                      "Ten koszyk został już sfinalizowany. Za chwilę zaczniesz od nowa…",
                    );
                    scheduleStaleReset();
                    return;
                  }
                  const message = describeMedusaError(
                    e,
                    "Nie udało się zapisać danych. Sprawdź połączenie i spróbuj ponownie.",
                  );
                  setContactSaveError(message);
                } finally {
                  setPreparingDelivery(false);
                }
              }}
              disabled={!canGoToStep2 || !cartId || preparingDelivery}
              className="w-full rounded-md bg-brand-800 py-3 text-sm font-semibold text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-brand-200 disabled:text-brand-500 transition-colors"
            >
              {preparingDelivery ? "Zapisywanie…" : "Przejdź do dostawy"}
            </button>
          </section>
        )}

        {/* Step 2 — Shipping */}
        {step === 2 && (
          <section className="space-y-6">
            <h2 className="font-display text-xl font-semibold text-brand-800">
              Sposób dostawy
            </h2>
            <ShippingSelector
              selectedOptionId={formData.shippingOptionId}
              onSelect={(id: string, name?: string) => {
                void handleShippingSelect(id, name);
              }}
            />
            <PromoCodeField />
            {shippingSaveError && (
              <p className="text-sm text-red-600" role="alert">
                {shippingSaveError}
              </p>
            )}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-lg border border-brand-300 py-3 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
              >
                ← Wróć
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!cartId) return;
                  setShippingSaveError(null);
                  setPreparingPayment(true);
                  try {
                    track("form_step", {
                      form_name: "checkout_shipping",
                      step_number: 2,
                    });
                    const shippingMethod =
                      formData.shippingOptionName || formData.shippingOptionId;
                    writeCheckoutAnalyticsContext({ shippingMethod });
                    track("add_shipping_info", {
                      ...cartToEcommercePayload({
                        items: items.map((i) => ({
                          id: i.id,
                          variant_id: i.variant_id,
                          title: i.title,
                          quantity: i.quantity,
                          unit_price: i.unit_price,
                        })),
                        total,
                        currency: "PLN",
                      }),
                      shipping_method: shippingMethod,
                    });
                    // Najpierw czekamy na providerId (prefetched, zwykle < 50 ms),
                    // żeby w 1 request dolecieć shipping + payment-session.
                    // Wcześniej były to 2 sekwencyjne round-tripy (600 + 200 ms)
                    // — teraz jeden ~600-800 ms w jednym HTTP do `/store/custom/prepare-checkout`.
                    const { providerId } =
                      await prefetchPaymentReadiness(getPolishRegionId);
                    await prepareCheckout(
                      cartId,
                      formData.shippingOptionId,
                      providerId,
                      undefined,
                      undefined,
                      {
                        companyName: formData.companyName,
                        nip: formData.nip,
                      },
                    );
                    await refreshCart().catch(() => undefined);
                    updateField("paymentProviderId", providerId);
                    setStep(3);
                  } catch (e) {
                    console.error("[checkout] zapis dostawy/płatności", e);
                    if (isCartAlreadyCompletedError(e)) {
                      setShippingSaveError(
                        "Ten koszyk został już sfinalizowany. Za chwilę zaczniesz od nowa…",
                      );
                      scheduleStaleReset();
                      return;
                    }
                    const message = describeMedusaError(
                      e,
                      "Nie udało się przygotować płatności. Spróbuj ponownie.",
                    );
                    setShippingSaveError(message);
                  } finally {
                    setPreparingPayment(false);
                  }
                }}
                disabled={!canGoToStep3 || !cartId || preparingPayment}
                className="flex-1 rounded-lg bg-brand-800 py-3 text-sm font-semibold text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-brand-200 disabled:text-brand-500 transition-colors"
              >
                {preparingPayment
                  ? "Przygotowuję płatność…"
                  : "Przejdź do płatności →"}
              </button>
            </div>
          </section>
        )}

        {/* Step 3 — Payment */}
        {step === 3 && (
          <section className="space-y-6">
            <h2 className="font-display text-xl font-semibold text-brand-800">
              Płatność
            </h2>
            <PaymentSelector
              selectedProviderId={formData.paymentProviderId}
              onSelect={(id: string) => updateField("paymentProviderId", id)}
              availableProviderIds={availableProviderIds}
              p24CircuitOpen={p24CircuitOpen}
            />

            <CheckoutTrustBadges />

            {/* Order Notes */}
            <div>
              <label
                htmlFor="orderNotes"
                className="block text-sm font-medium text-brand-700 mb-2"
              >
                Uwagi do zamówienia{" "}
                <span className="text-brand-400">(opcjonalne)</span>
              </label>
              <textarea
                id="orderNotes"
                rows={3}
                value={formData.orderNotes}
                onChange={(e) => updateField("orderNotes", e.target.value)}
                placeholder="Np. dodatkowe instrukcje dostawy..."
                className="w-full rounded-lg border border-brand-200 px-4 py-3 text-sm focus:border-brand-800 focus:outline-none focus:ring-1 focus:ring-brand-800"
                maxLength={500}
              />
              <p className="mt-1 text-xs text-brand-500">
                {formData.orderNotes.length}/500 znaków
              </p>
            </div>

            <div className="space-y-3 border-t border-brand-100 pt-4">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.acceptTerms}
                  onChange={(e) => updateField("acceptTerms", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-brand-300 text-accent focus:ring-accent"
                />
                <span className="text-xs text-brand-600">
                  Akceptuję{" "}
                  <a
                    href="/regulamin"
                    className="underline hover:text-brand-900"
                  >
                    regulamin sklepu
                  </a>{" "}
                  i{" "}
                  <a
                    href="/polityka-prywatnosci"
                    className="underline hover:text-brand-900"
                  >
                    politykę prywatności
                  </a>{" "}
                  <span className="text-red-500">*</span>
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.acceptRodo}
                  onChange={(e) => updateField("acceptRodo", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-brand-300 text-accent focus:ring-accent"
                />
                <span className="text-xs text-brand-600">
                  Wyrażam zgodę na przetwarzanie danych osobowych w celu
                  realizacji zamówienia (RODO)
                  <span className="text-red-500"> *</span>
                </span>
              </label>
            </div>

            {turnstileEnabled && (
              <TurnstileWidget
                onToken={setTurnstileToken}
                className="flex justify-center"
              />
            )}

            {submitError && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {submitError}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-lg border border-brand-300 py-3 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
              >
                ← Wróć
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex-1 rounded-lg bg-brand-800 py-3 text-sm font-semibold text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-brand-200 disabled:text-brand-500 transition-colors"
              >
                {submitting
                  ? formData.paymentProviderId === PRZELEWY24_PROVIDER_ID
                    ? "Przekierowuję do Przelewy24…"
                    : "Składanie zamówienia…"
                  : formData.paymentProviderId === SYSTEM_PAYMENT_PROVIDER_ID
                    ? "Zamawiam — opłać przelewem"
                    : "Zamawiam i płacę"}
              </button>
            </div>
            {submitSlow && submitting && (
              <p
                className="text-center text-xs text-brand-600"
                role="status"
                aria-live="polite"
              >
                Przetwarzamy zamówienie, nie zamykaj tego okna…
              </p>
            )}
            {formData.paymentProviderId === PRZELEWY24_PROVIDER_ID ? (
              <p className="text-center text-[11px] text-brand-400">
                Po kliknięciu przejdziesz do bezpiecznego panelu Przelewy24,
                gdzie dokończysz płatność (BLIK, szybki przelew online, karta).
              </p>
            ) : null}
            {formData.paymentProviderId === SYSTEM_PAYMENT_PROVIDER_ID ? (
              <p className="text-center text-[11px] text-brand-500">
                Po kliknięciu „Zamawiam” zobaczysz dane do przelewu na stronie
                potwierdzenia i w e-mailu. Realizacja zacznie się po
                zaksięgowaniu wpłaty (zwykle 1–2 dni robocze).
              </p>
            ) : null}
          </section>
        )}
      </div>

      <div className="lg:col-span-1">
        <div className="sticky top-24">
          <OrderSummary selectedShippingOptionId={formData.shippingOptionId} />
        </div>
      </div>
    </div>
  );
}
