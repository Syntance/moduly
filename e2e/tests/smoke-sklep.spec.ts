import { test, expect } from "@playwright/test";

test.describe("starter-sklep smoke", () => {
  test("strona główna i sklep", async ({ page }) => {
    const home = await page.goto("/");
    expect(home?.status()).toBeLessThan(500);
    await expect(page.getByRole("link", { name: /przeglądaj sklep/i })).toBeVisible();

    const shop = await page.goto("/sklep");
    expect(shop?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("/koszyk i /checkout bez 500", async ({ page }) => {
    for (const path of ["/koszyk", "/checkout"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(500);
    }
  });

  test("/konto — panel klienta OTP", async ({ page }) => {
    const response = await page.goto("/konto");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByLabel(/e-mail|email/i)).toBeVisible();
  });
});
