import { test, expect } from "@playwright/test";

test.describe("starter-strona smoke", () => {
  test("strona główna renderuje hero", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /kontakt/i })).toBeVisible();
  });

  test("/kontakt ładuje formularz", async ({ page }) => {
    const response = await page.goto("/kontakt");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("/magazyn/login pokazuje logowanie", async ({ page }) => {
    const response = await page.goto("/magazyn/login");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByLabel(/e-mail|email/i)).toBeVisible();
  });
});
