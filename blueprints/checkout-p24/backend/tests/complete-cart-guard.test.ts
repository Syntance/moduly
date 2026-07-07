/**
 * Testy strażnika finalizacji koszyka (hook validate completeCartWorkflow).
 * Kontrakt (incydent #10165): zamówienie NIE MOŻE powstać bez potwierdzonej
 * płatności P24; przelew tradycyjny poza P24 wyłączony na produkcji.
 */
import { describe, expect, it, vi } from "vitest";
import {
  evaluateCartCompletionGuard,
  type GuardCartSnapshot,
} from "../src/lib/complete-cart-guard";

const P24 = "pp_przelewy24_przelewy24";
const SYSTEM = "pp_system_default";

const OPTS = { bankTransferAllowed: false };

function cart(overrides: Partial<GuardCartSnapshot> = {}): GuardCartSnapshot {
  return {
    completed_at: null,
    total: 42450,
    payment_sessions: [],
    ...overrides,
  };
}

const probeNever = vi.fn(async () => null);

describe("evaluateCartCompletionGuard", () => {
  it("blokuje sesję P24 pending, gdy P24 nie zna transakcji (klasa #10165)", async () => {
    const decision = await evaluateCartCompletionGuard(
      cart({
        payment_sessions: [
          {
            provider_id: P24,
            status: "pending",
            data: { p24_session_id: "p24_abc", status: "pending" },
          },
        ],
      }),
      async () => null, // 404 w P24
      OPTS,
    );
    expect(decision.allow).toBe(false);
    if (!decision.allow) expect(decision.reason).toBe("p24_payment_not_confirmed");
  });

  it("blokuje sesję P24 pending przy statusie 0 (zarejestrowana, nieopłacona)", async () => {
    const decision = await evaluateCartCompletionGuard(
      cart({
        payment_sessions: [
          {
            provider_id: P24,
            status: "pending",
            data: { p24_session_id: "p24_abc" },
          },
        ],
      }),
      async () => ({ status: 0 }),
      OPTS,
    );
    expect(decision.allow).toBe(false);
  });

  it("przepuszcza przy statusie P24 = 1 (wpłacone, czeka na verify)", async () => {
    const decision = await evaluateCartCompletionGuard(
      cart({
        payment_sessions: [
          {
            provider_id: P24,
            status: "pending",
            data: { p24_session_id: "p24_abc" },
          },
        ],
      }),
      async () => ({ status: 1 }),
      OPTS,
    );
    expect(decision.allow).toBe(true);
  });

  it("przepuszcza przy statusie P24 = 2 (rozliczone)", async () => {
    const decision = await evaluateCartCompletionGuard(
      cart({
        payment_sessions: [
          {
            provider_id: P24,
            status: "pending",
            data: { p24_session_id: "p24_abc" },
          },
        ],
      }),
      async () => ({ status: 2 }),
      OPTS,
    );
    expect(decision.allow).toBe(true);
  });

  it("przepuszcza sesję verified bez odpytywania P24 (webhook już potwierdził)", async () => {
    const probe = vi.fn(async () => null);
    const decision = await evaluateCartCompletionGuard(
      cart({
        payment_sessions: [
          {
            provider_id: P24,
            status: "pending",
            data: { p24_session_id: "p24_abc", status: "verified" },
          },
        ],
      }),
      probe,
      OPTS,
    );
    expect(decision.allow).toBe(true);
    expect(probe).not.toHaveBeenCalled();
  });

  it("przepuszcza sesję już authorized/captured (idempotentne powtórki)", async () => {
    for (const status of ["authorized", "captured"]) {
      const decision = await evaluateCartCompletionGuard(
        cart({
          payment_sessions: [{ provider_id: P24, status, data: {} }],
        }),
        probeNever,
        OPTS,
      );
      expect(decision.allow).toBe(true);
    }
  });

  it("blokuje przelew tradycyjny (pp_system_default) na produkcji", async () => {
    const decision = await evaluateCartCompletionGuard(
      cart({
        payment_sessions: [{ provider_id: SYSTEM, status: "pending", data: {} }],
      }),
      probeNever,
      OPTS,
    );
    expect(decision.allow).toBe(false);
    if (!decision.allow) expect(decision.reason).toBe("bank_transfer_disabled");
  });

  it("przepuszcza przelew tradycyjny gdy jawnie dozwolony (dev/test bez P24)", async () => {
    const decision = await evaluateCartCompletionGuard(
      cart({
        payment_sessions: [{ provider_id: SYSTEM, status: "pending", data: {} }],
      }),
      probeNever,
      { bankTransferAllowed: true },
    );
    expect(decision.allow).toBe(true);
  });

  it("dual-session (P24 + system): blokuje, bo system jest wyłączony", async () => {
    const decision = await evaluateCartCompletionGuard(
      cart({
        payment_sessions: [
          {
            provider_id: P24,
            status: "pending",
            data: { p24_session_id: "p24_abc" },
          },
          { provider_id: SYSTEM, status: "pending", data: {} },
        ],
      }),
      async () => null,
      OPTS,
    );
    expect(decision.allow).toBe(false);
  });

  it("blokuje nieznanego providera", async () => {
    const decision = await evaluateCartCompletionGuard(
      cart({
        payment_sessions: [
          { provider_id: "pp_stripe_stripe", status: "pending", data: {} },
        ],
      }),
      probeNever,
      OPTS,
    );
    expect(decision.allow).toBe(false);
    if (!decision.allow) expect(decision.reason).toBe("unknown_provider");
  });

  it("przepuszcza koszyk już domknięty (workflow zwróci istniejące zamówienie)", async () => {
    const decision = await evaluateCartCompletionGuard(
      cart({ completed_at: "2026-07-01T08:10:00Z" }),
      probeNever,
      OPTS,
    );
    expect(decision.allow).toBe(true);
  });

  it("przepuszcza koszyk darmowy (total ≤ 0 — Medusa pomija płatność)", async () => {
    const decision = await evaluateCartCompletionGuard(
      cart({ total: 0 }),
      probeNever,
      OPTS,
    );
    expect(decision.allow).toBe(true);
  });

  it("bez żadnych sesji — deleguje do walidacji Medusy", async () => {
    const decision = await evaluateCartCompletionGuard(cart(), probeNever, OPTS);
    expect(decision.allow).toBe(true);
    if (decision.allow) expect(decision.reason).toBe("no_sessions_defer_to_medusa");
  });

  it("ignoruje sesje w statusach nieprzetwarzalnych (canceled/error)", async () => {
    const decision = await evaluateCartCompletionGuard(
      cart({
        payment_sessions: [
          { provider_id: SYSTEM, status: "canceled", data: {} },
          { provider_id: P24, status: "error", data: {} },
        ],
      }),
      probeNever,
      OPTS,
    );
    // Żadna sesja nie jest przetwarzalna → Medusa sama rzuci INVALID_DATA.
    expect(decision.allow).toBe(true);
  });
});
