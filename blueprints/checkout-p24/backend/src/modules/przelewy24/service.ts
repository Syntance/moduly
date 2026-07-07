import crypto from "node:crypto";
import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentActions,
} from "@medusajs/framework/utils";
import { captureMessage } from "../../lib/sentry";
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types";

interface Przelewy24Options {
  merchantId: string;
  posId: string;
  apiKey: string;
  crc: string;
  sandbox: boolean;
  /** Publiczny URL backendu — buduje urlStatus (webhook P24). */
  backendUrl: string;
  /** Publiczny URL storefrontu — buduje urlReturn (powrót klienta). */
  storefrontUrl: string;
  /**
   * Bitmask kanałów P24 (transaction/register `channel`).
   * Domyślnie 3 = karty (1) + przelewy online (2), BEZ przelewu tradycyjnego (4).
   * Przelew tradycyjny obsługujemy przez `pp_system_default` w checkoutcie Moduly.
   */
  channel?: number;
}

interface InjectedDependencies {
  logger: Logger;
  [key: string]: unknown;
}

/**
 * Surowe dane sesji P24 zapisywane w `PaymentSession.data`.
 * `p24_session_id` to nasz unikalny `sessionId` wysłany do P24 (≤ 100 znaków);
 * P24 zwraca go w notyfikacji do `urlStatus`, dzięki czemu Medusa dopasowuje
 * webhook do właściwej sesji.
 */
interface Przelewy24SessionData {
  p24_session_id: string;
  token?: string;
  redirect_url?: string;
  /** Kwota w groszach (integer) — P24 operuje wyłącznie na groszach. */
  amount_grosz: number;
  currency: string;
  /** Numeryczny identyfikator transakcji nadany przez P24 (z notyfikacji). */
  order_id?: number;
  /** Metoda płatności w panelu P24 (BLIK, bank, karta…). */
  p24_method_id?: number;
  p24_method_name?: string;
  status?: "pending" | "verified";
  [k: string]: unknown;
}

const P24_STATUS_PAID = 2;

/** Karty + przelewy online — bez „przelewu tradycyjnego” (bit 4) w panelu P24. */
const P24_CHANNEL_ONLINE_DEFAULT = 3;

/**
 * Przelewy24 Payment Provider (MedusaJS v2).
 *
 * Flow (redirect, async):
 *  1. `initiatePayment` → `transaction/register` → token + redirect_url (zapis w `data`).
 *  2. Storefront przekierowuje klienta na `redirect_url`.
 *  3. P24 wysyła notyfikację na `urlStatus` (webhook Medusy `/hooks/payment/...`).
 *  4. `getWebhookActionAndData` weryfikuje podpis + `transaction/verify` → SUCCESSFUL.
 *
 * Podpisy: SHA-384 z `json_encode` o ŚCIŚLE określonej kolejności pól
 * (zweryfikowane z dok. developers.przelewy24.pl). `JSON.stringify` w Node nie
 * escapuje slashy ani unicode → zgodne z `JSON_UNESCAPED_SLASHES|UNICODE`.
 */
export default class Przelewy24PaymentService extends AbstractPaymentProvider<Przelewy24Options> {
  static identifier = "przelewy24";

  protected readonly logger_: Logger;
  protected readonly options_: Przelewy24Options;
  private readonly apiBaseUrl: string;
  private readonly redirectBaseUrl: string;

  constructor(container: InjectedDependencies, options: Przelewy24Options) {
    super(container, options);
    this.logger_ = container.logger;
    // P24: posId domyślnie = merchantId (typowa konfiguracja jedno-sklepowa).
    this.options_ = {
      ...options,
      posId: options.posId || options.merchantId,
    };
    const host = options.sandbox
      ? "https://sandbox.przelewy24.pl"
      : "https://secure.przelewy24.pl";
    this.apiBaseUrl = `${host}/api/v1`;
    this.redirectBaseUrl = host;
  }

  static validateOptions(options: Record<string, unknown>): void {
    // posId pomijamy — domyślnie przyjmujemy merchantId (patrz konstruktor).
    for (const key of ["merchantId", "apiKey", "crc"]) {
      if (!options[key]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Przelewy24: brak wymaganej opcji "${key}".`,
        );
      }
    }
  }

  private sign(payload: Record<string, string | number>): string {
    // Kolejność kluczy w obiekcie = kolejność w JSON (load-bearing dla P24).
    return crypto
      .createHash("sha384")
      .update(JSON.stringify(payload))
      .digest("hex");
  }

  /**
   * Porównanie podpisów w czasie stałym (constant-time) — chroni przed atakiem
   * czasowym na weryfikację podpisu webhooka. `!==` zwracał wynik tym szybciej,
   * im wcześniej trafiał na różnicę, co teoretycznie pozwala odgadywać podpis
   * bajt po bajcie.
   */
  private signaturesEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  private async api<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const credentials = Buffer.from(
      `${this.options_.posId}:${this.options_.apiKey}`,
    ).toString("base64");

    const res = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Przelewy24 API ${method} ${endpoint} → ${res.status}: ${text}`,
      );
    }
    return (await res.json()) as T;
  }

  private toGrosz(amount: unknown): number {
    // Medusa v2 przekazuje kwoty w jednostce głównej waluty (dziesiętne PLN).
    return Math.round(Number(amount) * 100);
  }

  /**
   * PIENIĄDZE WESZŁY NA ZŁĄ KWOTĘ — verify celowo odmówione, wpłata wisi w
   * P24 „do wykorzystania" i NIC jej automatycznie nie domknie (koszyk zmienił
   * się po rejestracji transakcji). Wymaga ręcznej decyzji (zwrot / zaksięgowanie
   * w panelu P24), dlatego alarmujemy w Sentry, nie tylko w logu.
   */
  private alertAmountMismatch(
    sessionId: string,
    expectedGrosz: number,
    receivedGrosz: number,
    p24Status: number,
  ): void {
    this.logger_.error(
      `[przelewy24] confirmFromP24: niezgodna kwota dla sessionId=${sessionId}. ` +
      `Oczekiwano ${expectedGrosz} groszy, otrzymano ${receivedGrosz} groszy.`,
    );
    captureMessage("[przelewy24] wpłata na niezgodną kwotę — wymaga ręcznej obsługi", "error", {
      module: "przelewy24",
      event: "p24-amount-mismatch",
      session_id: sessionId,
      expected_grosz: expectedGrosz,
      received_grosz: receivedGrosz,
      p24_status: p24Status,
    });
  }

  async initiatePayment(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentOutput> {
    // SECURITY (CRITICAL): kwota płatności pochodzi WYŁĄCZNIE z `input.amount`,
    // które Medusa wylicza i weryfikuje z bazy (suma line items + dostawa) w
    // ramach payment_collection. NIGDY nie doliczamy tu kwot z metadata koszyka
    // ani z `input.data` — oba są kontrolowane przez klienta
    // (`POST /store/carts/:id`, `initiatePaymentSession(cart, { data })`), więc
    // doklejanie z nich opłaty pozwalałoby zapłacić mniej niż należność.
    //
    // Wcześniej dopłata „express" była czytana z `input.context.cart.metadata`,
    // ale Medusa nie przekazuje `context.cart` do providera (route store ignoruje
    // `context`), więc był to martwy, a zarazem niebezpieczny kod. Ewentualna
    // dopłata (np. realizacja ekspresowa) MUSI być częścią totalu koszyka
    // (osobny line item lub metoda dostawy), żeby Medusa ją zweryfikowała.
    const amountGrosz = this.toGrosz(input.amount);
    const currency = (input.currency_code ?? "pln").toUpperCase();

    const ctx = (input.data ?? {}) as Record<string, unknown>;
    const customerCtx = (input.context?.customer ?? {}) as {
      email?: string;
    };

    /**
     * KRYTYCZNE (audyt 06.07.2026, druga warstwa błędu webhooka): jako
     * `sessionId` wysyłany do P24 używamy WYŁĄCZNIE id sesji Medusy
     * (`payses_...`), które silnik wstrzykuje do `input.data.session_id`
     * PRZED wywołaniem `initiatePayment` (`PaymentModuleService.createPaymentSession`
     * → `data: { ...input.data, session_id: paymentSession.id }`).
     *
     * Wcześniej generowaliśmy tu WŁASNY UUID (`p24_${randomUUID()}`). P24
     * echo'uje `sessionId` w notyfikacji `urlStatus` bez zmian, więc
     * `getWebhookActionAndData` zwracał `data.session_id` = nasz UUID.
     * `processPaymentWorkflow` (wbudowany w Medusę) filtruje jednak
     * `payment_session` PO PRIMARY KEY `id = data.session_id` — z naszym
     * UUID zapytanie zawsze zwracało 0 wierszy. Webhook nigdy nie kończył
     * żadnego zamówienia (nawet po naprawie URL-a `pp_pp_`); całą pracę
     * wykonywały wyłącznie polling strony powrotu i cron reconcile.
     * Używając payses_xxx jako P24 sessionId, webhook koreluje się
     * poprawnie z payment_session od razu — bez dodatkowego mapowania.
     */
    const medusaSessionId =
      typeof ctx.session_id === "string" && ctx.session_id.trim()
        ? ctx.session_id.trim()
        : undefined;
    if (!medusaSessionId) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Przelewy24: brak session_id z Medusy — nie można zarejestrować transakcji.",
      );
    }
    const sessionId = medusaSessionId;
    const email =
      (ctx.email as string | undefined) ||
      customerCtx.email ||
      "";
    const cartId = (ctx.cart_id as string | undefined) ?? "";

    // Segment ścieżki BEZ prefiksu "pp_" — Medusa dokleja go sama
    // (`getWebhookActionAndData` robi `pp_${provider}`); z prefiksem w URL
    // resolver szukał "pp_pp_przelewy24_przelewy24" i KAŻDA notyfikacja P24
    // padała AwilixResolutionError (transakcje wisiały "do wykorzystania").
    const urlStatus = `${this.options_.backendUrl.replace(/\/$/, "")}/hooks/payment/przelewy24_przelewy24`;
    const urlReturn = `${this.options_.storefrontUrl.replace(/\/$/, "")}/checkout/przelewy24/return${
      cartId ? `?cart_id=${encodeURIComponent(cartId)}` : ""
    }`;

    const sign = this.sign({
      sessionId,
      merchantId: Number(this.options_.merchantId),
      amount: amountGrosz,
      currency,
      crc: this.options_.crc,
    });

    const channel =
      this.options_.channel ?? P24_CHANNEL_ONLINE_DEFAULT;

    let token: string | undefined;
    try {
      const result = await this.api<{ data: { token: string } }>(
        "/transaction/register",
        "POST",
        {
          merchantId: Number(this.options_.merchantId),
          posId: Number(this.options_.posId),
          sessionId,
          amount: amountGrosz,
          currency,
          description: cartId
            ? `Zamowienie Moduly ${cartId}`
            : "Zamowienie Moduly",
          email,
          country: "PL",
          language: "pl",
          urlReturn,
          urlStatus,
          channel,
          waitForResult: false,
          sign,
        },
      );
      token = result.data?.token;
    } catch (e) {
      this.logger_.error(
        `[przelewy24] register nieudany: ${(e as Error).message}`,
      );
      throw e;
    }

    if (!token) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Przelewy24: brak tokenu w odpowiedzi register.",
      );
    }

    const data: Przelewy24SessionData = {
      p24_session_id: sessionId,
      token,
      redirect_url: `${this.redirectBaseUrl}/trnRequest/${token}`,
      amount_grosz: amountGrosz,
      currency,
      status: "pending",
    };

    return { id: sessionId, data };
  }

  /**
   * Pull-based potwierdzenie płatności — NIE polega na webhooku P24.
   *
   * Odpytuje P24 o stan transakcji po `sessionId`. Gdy środki dotarły, a
   * transakcja nie jest jeszcze potwierdzona (status 1), wykonujemy
   * `transaction/verify` (wymagane, inaczej P24 nie rozliczy środków) i dopiero
   * po jego sukcesie uznajemy płatność za opłaconą. Dzięki temu finalizacja
   * koszyka (`completeCart` ze storefrontu) działa nawet gdy notyfikacja P24
   * (urlStatus) dotrze z opóźnieniem albo wcale.
   */
  private async confirmFromP24(
    data: Przelewy24SessionData,
  ): Promise<{ paid: boolean; data: Przelewy24SessionData }> {
    const sessionId = data.p24_session_id;
    if (!sessionId) return { paid: false, data };

    let info:
      | {
          status?: number;
          orderId?: number;
          amount?: number;
          currency?: string;
          methodId?: number;
        }
      | undefined;
    try {
      const result = await this.api<{
        data: {
          status: number;
          orderId: number;
          amount: number;
          currency: string;
          methodId?: number;
        };
      }>(`/transaction/by/sessionId/${encodeURIComponent(sessionId)}`, "GET");
      info = result.data;
    } catch (e) {
      this.logger_.warn(
        `[przelewy24] confirmFromP24 by sessionId nieudany: ${(e as Error).message}`,
      );
      return { paid: false, data };
    }
    if (!info) return { paid: false, data };

    const status = Number(info.status);
    const orderId = Number(info.orderId);
    const methodId = Number(info.methodId);
    const methodPatch =
      Number.isFinite(methodId) && methodId > 0
        ? { p24_method_id: methodId }
        : {};

    // 2 = transakcja potwierdzona (środki rozliczone) → gotowe.
    if (status === P24_STATUS_PAID) {
      const paidAmount = Number(info.amount);
      if (paidAmount !== data.amount_grosz) {
        this.alertAmountMismatch(sessionId, data.amount_grosz, paidAmount, status);
        return { paid: false, data };
      }
      return {
        paid: true,
        data: { ...data, ...methodPatch, status: "verified", order_id: orderId },
      };
    }

    // 1 = płatność dotarła, ale niepotwierdzona — wykonujemy verify i dopiero
    // po jego sukcesie uznajemy płatność za opłaconą.
    if (status === 1 && orderId) {
      const amount = Number(info.amount);
      if (amount !== data.amount_grosz) {
        this.alertAmountMismatch(sessionId, data.amount_grosz, amount, status);
        return { paid: false, data };
      }
      const currency = String(info.currency ?? data.currency);
      const verifySign = this.sign({
        sessionId,
        orderId,
        amount,
        currency,
        crc: this.options_.crc,
      });
      try {
        await this.api("/transaction/verify", "PUT", {
          merchantId: Number(this.options_.merchantId),
          posId: Number(this.options_.posId),
          sessionId,
          amount,
          currency,
          orderId,
          sign: verifySign,
        });
        return {
          paid: true,
          data: {
            ...data,
            ...methodPatch,
            status: "verified",
            order_id: orderId,
          },
        };
      } catch (e) {
        this.logger_.warn(
          `[przelewy24] confirmFromP24 verify nieudany dla sessionId=${sessionId}: ${(e as Error).message}`,
        );
        return { paid: false, data };
      }
    }

    return { paid: false, data };
  }

  async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    const data = (input.data ?? {}) as Przelewy24SessionData;
    // Szybka ścieżka: webhook już oznaczył płatność jako potwierdzoną.
    if (data.status === "verified") {
      return { status: "captured", data };
    }
    // W przeciwnym razie sami dopytujemy P24 (niezależnie od webhooka).
    const confirmed = await this.confirmFromP24(data);
    if (confirmed.paid) {
      return { status: "captured", data: confirmed.data };
    }
    return { status: "pending", data };
  }

  async capturePayment(
    input: CapturePaymentInput,
  ): Promise<CapturePaymentOutput> {
    // P24 rozlicza środki w momencie weryfikacji transakcji — capture to no-op.
    return { data: input.data ?? {} };
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    const data = (input.data ?? {}) as Przelewy24SessionData;
    if (data.status === "verified") {
      return { status: "captured", data };
    }
    // Pull-based potwierdzenie (z verify) — niezależne od webhooka.
    const confirmed = await this.confirmFromP24(data);
    if (confirmed.paid) {
      return { status: "captured", data: confirmed.data };
    }
    return { status: "pending", data };
  }

  async cancelPayment(
    input: CancelPaymentInput,
  ): Promise<CancelPaymentOutput> {
    // P24 nie udostępnia anulowania zarejestrowanej, nieopłaconej transakcji
    // — wygasa sama. Zwracamy bieżący stan.
    return { data: input.data ?? {} };
  }

  async deletePayment(
    input: DeletePaymentInput,
  ): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async refundPayment(
    input: RefundPaymentInput,
  ): Promise<RefundPaymentOutput> {
    const data = (input.data ?? {}) as Przelewy24SessionData;
    const orderId = data.order_id;
    if (!orderId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Przelewy24: brak orderId — nie można wykonać zwrotu (zrób zwrot w panelu P24).",
      );
    }
    const amountGrosz = this.toGrosz(input.amount);
    try {
      await this.api("/transaction/refund", "POST", {
        requestId: crypto.randomUUID(),
        refunds: [
          {
            orderId,
            sessionId: data.p24_session_id,
            amount: amountGrosz,
            description: "Zwrot Moduly",
          },
        ],
      });
    } catch (e) {
      this.logger_.error(
        `[przelewy24] refund nieudany: ${(e as Error).message}`,
      );
      throw e;
    }
    return { data };
  }

  async retrievePayment(
    input: RetrievePaymentInput,
  ): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async updatePayment(
    input: UpdatePaymentInput,
  ): Promise<UpdatePaymentOutput> {
    const data = (input.data ?? {}) as Przelewy24SessionData;
    const amountGrosz = this.toGrosz(input.amount);
    return { data: { ...data, amount_grosz: amountGrosz } };
  }

  /**
   * Webhook P24 (urlStatus). Medusa kieruje tu POST z `/hooks/payment/...`.
   * Weryfikujemy podpis notyfikacji, potem wołamy `transaction/verify`
   * (bez tego środki nie zostaną rozliczone) i zwracamy akcję SUCCESSFUL.
   */
  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"],
  ): Promise<WebhookActionResult> {
    const body = (payload.data ?? {}) as Record<string, unknown>;
    const merchantId = Number(body.merchantId);
    const posId = Number(body.posId);
    const sessionId = String(body.sessionId ?? "");
    const amount = Number(body.amount);
    const originAmount = Number(body.originAmount);
    const currency = String(body.currency ?? "");
    const orderId = Number(body.orderId);
    const methodId = Number(body.methodId);
    const statement = String(body.statement ?? "");
    const receivedSign = String(body.sign ?? "");

    if (!sessionId || !orderId) {
      return { action: PaymentActions.NOT_SUPPORTED };
    }

    const expectedSign = this.sign({
      merchantId,
      posId,
      sessionId,
      amount,
      originAmount,
      currency,
      orderId,
      methodId,
      statement,
      crc: this.options_.crc,
    });

    if (!this.signaturesEqual(expectedSign, receivedSign)) {
      this.logger_.error(
        `[przelewy24] webhook: niezgodny podpis dla sessionId=${sessionId}`,
      );
      // Alert: ktoś wysyła notyfikacje z błędnym podpisem (próba podszycia się
      // pod P24 albo zła konfiguracja CRC). Chcemy o tym wiedzieć natychmiast.
      captureMessage("[przelewy24] webhook signature fail", "error", {
        module: "przelewy24",
        event: "webhook-signature-fail",
        session_id: sessionId,
      });
      return { action: PaymentActions.FAILED };
    }

    // Defense-in-depth: notyfikacja MUSI dotyczyć naszego konta P24.
    // (Podpis liczony jest z merchantId/posId z body + naszym CRC, ale jawne
    // porównanie z konfiguracją chroni przed pomyłką/cross-account.)
    const configuredMerchantId = Number(this.options_.merchantId);
    const configuredPosId = Number(this.options_.posId);
    if (
      (Number.isFinite(configuredMerchantId) && merchantId !== configuredMerchantId) ||
      (Number.isFinite(configuredPosId) && posId !== configuredPosId)
    ) {
      this.logger_.error(
        `[przelewy24] webhook: merchantId/posId niezgodny z konfiguracją (sessionId=${sessionId})`,
      );
      return { action: PaymentActions.FAILED };
    }

    // Potwierdzenie transakcji — obowiązkowe, inaczej P24 nie rozliczy środków.
    const verifySign = this.sign({
      sessionId,
      orderId,
      amount,
      currency,
      crc: this.options_.crc,
    });
    try {
      await this.api("/transaction/verify", "PUT", {
        merchantId,
        posId,
        sessionId,
        amount,
        currency,
        orderId,
        sign: verifySign,
      });
    } catch (e) {
      this.logger_.error(
        `[przelewy24] webhook verify nieudany dla sessionId=${sessionId}: ${(e as Error).message}`,
      );
      return { action: PaymentActions.FAILED };
    }

    return {
      action: PaymentActions.SUCCESSFUL,
      data: {
        session_id: sessionId,
        // KRYTYCZNE (chaos-audyt 06.07.2026): P24 w notyfikacji podaje kwotę
        // w GROSZACH, a Medusa wszędzie operuje na jednostkach głównych (PLN).
        // `processPaymentWorkflow` przekazuje tę kwotę PROSTO do
        // `capturePaymentWorkflow`, który (a) waliduje ją względem kwoty
        // płatności ("cannot capture more...") i (b) zapisuje ją jako
        // transakcję zamówienia (paid_total). Grosze bez konwersji = capture
        // odrzucony albo transakcja zawyżona 100× (12 490 zł zamiast 124,90).
        // Błąd był niewidoczny, dopóki webhook nie korelował sesji (naprawy
        // pp_pp_ + session_id) — teraz ta ścieżka realnie działa.
        amount: amount / 100,
        ...(Number.isFinite(methodId) && methodId > 0
          ? { p24_method_id: methodId }
          : {}),
        ...(statement ? { p24_statement: statement } : {}),
      },
    };
  }
}
