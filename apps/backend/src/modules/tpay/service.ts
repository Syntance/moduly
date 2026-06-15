import crypto from "node:crypto";
import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentActions,
} from "@medusajs/framework/utils";
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

interface TpayOptions {
  merchantId: string;
  apiPassword: string;
  securityCode: string;
  sandbox: boolean;
  backendUrl: string;
  storefrontUrl: string;
}

interface InjectedDependencies {
  logger: Logger;
  [key: string]: unknown;
}

interface TpaySessionData {
  tpay_crc: string;
  title?: string;
  redirect_url?: string;
  transaction_id?: string;
  amount_grosz: number;
  currency: string;
  status?: "pending" | "paid";
  [k: string]: unknown;
}

const TPAY_STATUS_PAID = "TRUE";

/**
 * tpay Payment Provider (MedusaJS v2) — redirect + webhook z md5sum.
 *
 * Flow:
 *  1. `initiatePayment` → POST transaction/create → redirect URL.
 *  2. Klient płaci na bramce tpay.
 *  3. Webhook (result_url) z md5sum → weryfikacja security code → SUCCESSFUL.
 *  4. `authorizePayment` / pull status jako fallback (jak P24).
 */
export default class TpayPaymentService extends AbstractPaymentProvider<TpayOptions> {
  static identifier = "tpay";

  protected readonly logger_: Logger;
  protected readonly options_: TpayOptions;
  private readonly apiBaseUrl: string;

  constructor(container: InjectedDependencies, options: TpayOptions) {
    super(container, options);
    this.logger_ = container.logger;
    this.options_ = options;
    this.apiBaseUrl = options.sandbox
      ? "https://secure.sandbox.tpay.com"
      : "https://secure.tpay.com";
  }

  static validateOptions(options: Record<string, unknown>): void {
    for (const key of ["merchantId", "apiPassword", "securityCode"]) {
      if (!options[key]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `tpay: brak wymaganej opcji "${key}".`,
        );
      }
    }
  }

  private md5(parts: Array<string | number>): string {
    return crypto.createHash("md5").update(parts.join("")).digest("hex");
  }

  private toGrosz(amount: unknown): number {
    return Math.round(Number(amount) * 100);
  }

  private toTpayAmount(amountGrosz: number): string {
    return (amountGrosz / 100).toFixed(2);
  }

  private authHeader(): string {
    return `Basic ${Buffer.from(
      `${this.options_.merchantId}:${this.options_.apiPassword}`,
    ).toString("base64")}`;
  }

  private async api<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(`${this.apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader(),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `tpay API POST ${path} → ${res.status}: ${text}`,
      );
    }

    return (await res.json()) as T;
  }

  async initiatePayment(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentOutput> {
    const amountGrosz = this.toGrosz(input.amount);
    const currency = (input.currency_code ?? "pln").toUpperCase();
    const ctx = (input.data ?? {});
    const customerCtx = (input.context?.customer ?? {}) as { email?: string };
    const email =
      (ctx.email as string | undefined) || customerCtx.email || "";
    const cartId = (ctx.cart_id as string | undefined) ?? "";
    const crc = `tpay_${crypto.randomUUID()}`;

    const notificationUrl = `${this.options_.backendUrl.replace(/\/$/, "")}/hooks/payment/pp_tpay_tpay`;
    const returnUrl = `${this.options_.storefrontUrl.replace(/\/$/, "")}/checkout/tpay/return${
      cartId ? `?cart_id=${encodeURIComponent(cartId)}` : ""
    }`;

    const amountStr = this.toTpayAmount(amountGrosz);
    const md5sum = this.md5([
      this.options_.merchantId,
      amountStr,
      crc,
      this.options_.securityCode,
    ]);

    let title: string | undefined;
    try {
      const result = await this.api<{ result?: number; title?: string }>(
        `/api/gw/${encodeURIComponent(this.options_.merchantId)}/transaction/create`,
        {
          amount: Number(amountStr),
          description: cartId
            ? `Zamowienie Moduly ${cartId}`
            : "Zamowienie Moduly",
          crc,
          group: 150,
          result_url: notificationUrl,
          return_url: returnUrl,
          email,
          md5sum,
          language: "pl",
        },
      );

      if (result.result !== 1 || !result.title) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "tpay: brak URL przekierowania w odpowiedzi create.",
        );
      }
      title = result.title;
    } catch (e) {
      this.logger_.error(
        `[tpay] create nieudany: ${(e as Error).message}`,
      );
      throw e;
    }

    const data: TpaySessionData = {
      tpay_crc: crc,
      title,
      redirect_url: title,
      amount_grosz: amountGrosz,
      currency,
      status: "pending",
    };

    return { id: crc, data };
  }

  private async confirmFromTpay(
    data: TpaySessionData,
  ): Promise<{ paid: boolean; data: TpaySessionData }> {
    const crc = data.tpay_crc;
    if (!crc) return { paid: false, data };

    try {
      const result = await this.api<{
        result?: number;
        status?: string;
        transactionId?: string;
      }>(
        `/api/gw/${encodeURIComponent(this.options_.merchantId)}/transaction/get`,
        { crc },
      );

      if (result.result !== 1) return { paid: false, data };

      const paid =
        String(result.status ?? "").toUpperCase() === TPAY_STATUS_PAID;
      if (!paid) return { paid: false, data };

      return {
        paid: true,
        data: {
          ...data,
          status: "paid",
          transaction_id: result.transactionId,
        },
      };
    } catch (e) {
      this.logger_.warn(
        `[tpay] confirmFromTpay nieudany: ${(e as Error).message}`,
      );
      return { paid: false, data };
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    const data = (input.data ?? {}) as TpaySessionData;
    if (data.status === "paid") {
      return { status: "captured", data };
    }
    const confirmed = await this.confirmFromTpay(data);
    if (confirmed.paid) {
      return { status: "captured", data: confirmed.data };
    }
    return { status: "pending", data };
  }

  async capturePayment(
    input: CapturePaymentInput,
  ): Promise<CapturePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    const data = (input.data ?? {}) as TpaySessionData;
    if (data.status === "paid") {
      return { status: "captured", data };
    }
    const confirmed = await this.confirmFromTpay(data);
    if (confirmed.paid) {
      return { status: "captured", data: confirmed.data };
    }
    return { status: "pending", data };
  }

  async cancelPayment(
    input: CancelPaymentInput,
  ): Promise<CancelPaymentOutput> {
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
    const data = (input.data ?? {}) as TpaySessionData;
    const transactionId = data.transaction_id;
    if (!transactionId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "tpay: brak transaction_id — wykonaj zwrot w panelu tpay.",
      );
    }
    const amountStr = this.toTpayAmount(this.toGrosz(input.amount));
    const md5sum = this.md5([
      this.options_.merchantId,
      transactionId,
      amountStr,
      this.options_.securityCode,
    ]);

    try {
      await this.api(
        `/api/gw/${encodeURIComponent(this.options_.merchantId)}/chargeback/any`,
        {
          title: transactionId,
          chargeback_amount: Number(amountStr),
          md5sum,
        },
      );
    } catch (e) {
      this.logger_.error(`[tpay] refund nieudany: ${(e as Error).message}`);
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
    const data = (input.data ?? {}) as TpaySessionData;
    const amountGrosz = this.toGrosz(input.amount);
    return { data: { ...data, amount_grosz: amountGrosz } };
  }

  /**
   * Webhook tpay (result_url). Weryfikacja md5sum z kodem bezpieczeństwa.
   */
  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"],
  ): Promise<WebhookActionResult> {
    const body = (payload.data ?? {});
    const trId = String(body.tr_id ?? "");
    const trAmount = String(body.tr_amount ?? body.tr_paid ?? "");
    const trCrc = String(body.tr_crc ?? "");
    const md5sum = String(body.md5sum ?? "");
    const trStatus = String(body.tr_status ?? body.tr_paid ?? "");

    if (!trId || !trCrc) {
      return { action: PaymentActions.NOT_SUPPORTED };
    }

    const expectedMd5 = this.md5([
      this.options_.merchantId,
      trId,
      trAmount,
      trCrc,
      this.options_.securityCode,
    ]);

    if (expectedMd5 !== md5sum) {
      this.logger_.error(
        `[tpay] webhook: niezgodny md5sum dla tr_crc=${trCrc}`,
      );
      return { action: PaymentActions.FAILED };
    }

    const paid =
      trStatus.toUpperCase() === TPAY_STATUS_PAID ||
      String(body.tr_paid ?? "").toUpperCase() === TPAY_STATUS_PAID;

    if (!paid) {
      return { action: PaymentActions.FAILED };
    }

    return {
      action: PaymentActions.SUCCESSFUL,
      data: {
        session_id: trCrc,
        amount: Math.round(Number(trAmount) * 100),
      },
    };
  }
}
