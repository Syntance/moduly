import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Przelewy24PaymentService from "../src/modules/przelewy24/service";

type FetchMock = ReturnType<typeof vi.fn>;

const BASE_OPTIONS = {
  merchantId: "111111",
  posId: "",
  apiKey: "api-key",
  crc: "crc-secret",
  sandbox: true,
  backendUrl: "https://api.example.com",
  storefrontUrl: "https://shop.example.com",
};

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as never;

function makeService(options: Partial<typeof BASE_OPTIONS> & { channel?: number } = {}) {
  return new Przelewy24PaymentService(
    { logger } as never,
    { ...BASE_OPTIONS, ...options } as never,
  );
}

function mockFetchJsonOnce(fetchMock: FetchMock, body: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => body,
  } as Response);
}

function sha384(payload: Record<string, string | number>): string {
  return crypto.createHash("sha384").update(JSON.stringify(payload)).digest("hex");
}

let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("initiatePayment — rejestracja transakcji", () => {
  it("wysyła channel=3 (karty + przelewy online, BEZ przelewu tradycyjnego)", async () => {
    mockFetchJsonOnce(fetchMock, { data: { token: "tok_abc" } });

    const service = makeService();
    await service.initiatePayment({
      amount: 179.9,
      currency_code: "pln",
      data: {
        cart_id: "cart_1",
        email: "client@example.com",
        session_id: "payses_01ABCDEF",
      },
      context: {},
    } as never);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://sandbox.przelewy24.pl/api/v1/transaction/register");
    const body = JSON.parse(String(init.body));
    expect(body.channel).toBe(3);
    expect(body.amount).toBe(17990); // grosze, integer
    expect(body.currency).toBe("PLN");
    expect(body.urlReturn).toBe(
      "https://shop.example.com/checkout/przelewy24/return?cart_id=cart_1",
    );
    // Bez prefiksu "pp_" — Medusa dokleja go przy resolucji providera; z nim
    // każda notyfikacja padała na "pp_pp_przelewy24_przelewy24" (incydent 06.07.2026).
    expect(body.urlStatus).toBe(
      "https://api.example.com/hooks/payment/przelewy24_przelewy24",
    );
    expect(body.waitForResult).toBe(false);
    // KRYTYCZNE (audyt 06.07.2026, druga warstwa błędu webhooka): sessionId
    // wysyłany do P24 MUSI być id sesji Medusy (payses_...), nie własnym UUID —
    // inaczej processPaymentWorkflow nigdy nie znajdzie payment_session po
    // webhooku (filtruje po primary key `id`).
    expect(body.sessionId).toBe("payses_01ABCDEF");
  });

  it("rzuca gdy Medusa nie wstrzyknie session_id (webhook nie miałby czego dopasować)", async () => {
    const service = makeService();
    await expect(
      service.initiatePayment({
        amount: 100,
        currency_code: "pln",
        data: { cart_id: "cart_no_session" },
        context: {},
      } as never),
    ).rejects.toThrow(/brak session_id/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("NIE dolicza opłaty z metadata koszyka — kwota = zweryfikowane input.amount (bezpieczeństwo)", async () => {
    mockFetchJsonOnce(fetchMock, { data: { token: "tok_express" } });

    const service = makeService();
    await service.initiatePayment({
      amount: 100, // produkty + dostawa = 100 PLN (zweryfikowane przez Medusę)
      currency_code: "pln",
      data: { cart_id: "cart_express", session_id: "payses_express" },
      context: {
        cart: {
          metadata: {
            express_delivery: "true",
            express_fee_minor: "50", // próba doliczenia 50 PLN z metadata klienta
          },
        },
      },
    } as never);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    // SECURITY: metadata klienta NIE może wpływać na kwotę — wyłącznie input.amount.
    expect(body.amount).toBe(10000);
  });

  it("ignoruje Express gdy express_delivery=false w metadata", async () => {
    mockFetchJsonOnce(fetchMock, { data: { token: "tok_no_express" } });

    const service = makeService();
    await service.initiatePayment({
      amount: 100,
      currency_code: "pln",
      data: { cart_id: "cart_no_express", session_id: "payses_no_express" },
      context: {
        cart: {
          metadata: {
            express_delivery: "false",
            express_fee_minor: "50",
          },
        },
      },
    } as never);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.amount).toBe(10000); // tylko 100 PLN, bez expressu
  });

  it("pozwala nadpisać channel opcją modułu", async () => {
    mockFetchJsonOnce(fetchMock, { data: { token: "tok_abc" } });

    const service = makeService({ channel: 8192 }); // BLIK only
    await service.initiatePayment({
      amount: 10,
      currency_code: "pln",
      data: { cart_id: "cart_2", session_id: "payses_2" },
      context: {},
    } as never);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).channel).toBe(8192);
  });

  it("zwraca redirect_url panelu P24 i sesję pending", async () => {
    mockFetchJsonOnce(fetchMock, { data: { token: "tok_xyz" } });

    const service = makeService();
    const result = await service.initiatePayment({
      amount: 25.5,
      currency_code: "pln",
      data: { cart_id: "cart_3", session_id: "payses_3" },
      context: {},
    } as never);

    const data = result.data as Record<string, unknown>;
    expect(data.redirect_url).toBe(
      "https://sandbox.przelewy24.pl/trnRequest/tok_xyz",
    );
    expect(data.status).toBe("pending");
    expect(data.amount_grosz).toBe(2550);
  });

  it("rzuca gdy P24 nie zwróci tokenu", async () => {
    mockFetchJsonOnce(fetchMock, { data: {} });
    const service = makeService();
    await expect(
      service.initiatePayment({
        amount: 10,
        currency_code: "pln",
        data: { session_id: "payses_no_token" },
        context: {},
      } as never),
    ).rejects.toThrow(/brak tokenu/i);
  });
});

describe("authorizePayment — pull-based potwierdzenie (filar rekoncyliacji)", () => {
  it("zwraca captured bez odpytywania P24, gdy webhook już zweryfikował", async () => {
    const service = makeService();
    const result = await service.authorizePayment({
      data: { p24_session_id: "p24_s1", status: "verified", amount_grosz: 100, currency: "PLN" },
    } as never);

    expect(result.status).toBe("captured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("status=2 w P24 → captured (środki rozliczone)", async () => {
    mockFetchJsonOnce(fetchMock, {
      data: { status: 2, orderId: 987, amount: 100, currency: "PLN" },
    });

    const service = makeService();
    const result = await service.authorizePayment({
      data: { p24_session_id: "p24_s2", status: "pending", amount_grosz: 100, currency: "PLN" },
    } as never);

    expect(result.status).toBe("captured");
    expect((result.data as Record<string, unknown>).order_id).toBe(987);
  });

  it("status=2, ale NIEZGODNA kwota → pending (blokada capture)", async () => {
    mockFetchJsonOnce(fetchMock, {
      data: { status: 2, orderId: 987, amount: 200, currency: "PLN" },
    });

    const service = makeService();
    const result = await service.authorizePayment({
      data: { p24_session_id: "p24_tamper", status: "pending", amount_grosz: 100, currency: "PLN" },
    } as never);

    expect(result.status).toBe("pending");
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("niezgodna kwota"),
    );
  });

  it("status=1 w P24 → wykonuje transaction/verify i dopiero wtedy captured", async () => {
    mockFetchJsonOnce(fetchMock, {
      data: { status: 1, orderId: 555, amount: 100, currency: "PLN" },
    });
    mockFetchJsonOnce(fetchMock, { data: { status: "success" } });

    const service = makeService();
    const result = await service.authorizePayment({
      data: { p24_session_id: "p24_s3", status: "pending", amount_grosz: 100, currency: "PLN" },
    } as never);

    expect(result.status).toBe("captured");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [verifyUrl, verifyInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(verifyUrl).toContain("/transaction/verify");
    expect(JSON.parse(String(verifyInit.body)).orderId).toBe(555);
  });

  it("status=1, ale NIEZGODNA kwota → pending bez verify", async () => {
    mockFetchJsonOnce(fetchMock, {
      data: { status: 1, orderId: 555, amount: 150, currency: "PLN" },
    });

    const service = makeService();
    const result = await service.authorizePayment({
      data: { p24_session_id: "p24_tamper2", status: "pending", amount_grosz: 100, currency: "PLN" },
    } as never);

    expect(result.status).toBe("pending");
    expect(fetchMock).toHaveBeenCalledTimes(1); // tylko GET, bez verify PUT
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("niezgodna kwota"),
    );
  });

  it("nieopłacona transakcja → pending (zamówienie NIE powstanie)", async () => {
    mockFetchJsonOnce(fetchMock, {
      data: { status: 0, orderId: 0, amount: 100, currency: "PLN" },
    });

    const service = makeService();
    const result = await service.authorizePayment({
      data: { p24_session_id: "p24_s4", status: "pending", amount_grosz: 100, currency: "PLN" },
    } as never);

    expect(result.status).toBe("pending");
  });

  it("błąd sieci przy odpytaniu P24 → pending (bez crasha, retry następnym razem)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ETIMEDOUT"));

    const service = makeService();
    const result = await service.authorizePayment({
      data: { p24_session_id: "p24_s5", status: "pending", amount_grosz: 100, currency: "PLN" },
    } as never);

    expect(result.status).toBe("pending");
  });
});

describe("getWebhookActionAndData — webhook P24 (urlStatus)", () => {
  const notification = {
    merchantId: 111111,
    posId: 111111,
    sessionId: "p24_hook_1",
    amount: 17990,
    originAmount: 17990,
    currency: "PLN",
    orderId: 31337,
    methodId: 154,
    statement: "P24-XXX-YYY",
  };

  function signedPayload() {
    return {
      ...notification,
      sign: sha384({ ...notification, crc: BASE_OPTIONS.crc }),
    };
  }

  it("poprawny podpis → verify w P24 → SUCCESSFUL", async () => {
    mockFetchJsonOnce(fetchMock, { data: { status: "success" } });

    const service = makeService();
    const result = await service.getWebhookActionAndData({
      data: signedPayload(),
    } as never);

    expect(result.action).toBe("captured");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0] as [string])[0]).toContain("/transaction/verify");
    const data = (result as { data?: Record<string, unknown> }).data;
    expect(data?.p24_method_id).toBe(154);
    // KRYTYCZNE: P24 podaje grosze, Medusa oczekuje jednostek głównych.
    // Bez konwersji capturePaymentWorkflow zapisywał transakcję zamówienia
    // zawyżoną 100× (17 990 zł zamiast 179,90) albo odrzucał capture.
    expect(data?.amount).toBe(179.9);
    // session_id z notyfikacji — Medusa filtruje payment_session po primary
    // key, więc musi to być payses_... echo'owane przez P24 bez zmian.
    expect(data?.session_id).toBe("p24_hook_1");
  });

  it("zły podpis → FAILED, bez wywołania verify", async () => {
    const service = makeService();
    const result = await service.getWebhookActionAndData({
      data: { ...notification, sign: "0".repeat(96) },
    } as never);

    expect(result.action).toBe("failed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("brak sessionId/orderId → NOT_SUPPORTED", async () => {
    const service = makeService();
    const result = await service.getWebhookActionAndData({
      data: { foo: "bar" },
    } as never);

    expect(result.action).toBe("not_supported");
  });

  it("verify nieudany → FAILED (środki nie zostaną rozliczone bez verify)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "err",
    } as Response);

    const service = makeService();
    const result = await service.getWebhookActionAndData({
      data: signedPayload(),
    } as never);

    expect(result.action).toBe("failed");
  });
});
