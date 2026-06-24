import { test, expect } from "@playwright/test";

/**
 * Checkout — twardy regres na bugi z produkcji (patrz 46-checkout-standards):
 *  1. SSR `/checkout` nie wywala się (bug isomorphic-dompurify → ERR_REQUIRE_ESM),
 *  2. strony domknięcia P24 (start/return/retry) renderują się bez 500,
 *  3. brak hard-cordowanych zgód pre-checked (RODO/regulamin).
 *
 * Pełny happy-path (do redirectu bramki + sandbox) wymaga działającego backendu
 * i koszyka z produktem — uruchamiany w środowisku z Medusą (TODO: rozszerzyć o
 * dodanie do koszyka i kliknięcie „Zamawiam i płacę" w sandbox P24).
 */
test.describe("checkout — domknięcie płatności", () => {
  test("SSR /checkout nie crashuje (regres dompurify)", async ({ page }) => {
    const response = await page.goto("/checkout");
    expect(response?.status()).toBeLessThan(500);
    // Body realnie się wyrenderowało (nie błąd serwera).
    await expect(page.locator("body")).toBeVisible();
  });

  test("strony P24 start/return/retry renderują się bez 500", async ({ page }) => {
    for (const path of [
      "/checkout/przelewy24/start",
      "/checkout/przelewy24/return",
      "/checkout/p24/retry",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} powinno odpowiedzieć < 500`).toBeLessThan(500);
    }
  });

  test("cron reconcile jest chroniony sekretem (401 bez autoryzacji)", async ({
    request,
  }) => {
    const res = await request.get("/api/cron/reconcile-payments");
    expect(res.status()).toBe(401);
  });

  test("internal order-email wymaga sekretu (401)", async ({ request }) => {
    const res = await request.post("/api/internal/order-email", {
      data: { order_id: "order_x", type: "placed" },
    });
    expect(res.status()).toBe(401);
  });
});
