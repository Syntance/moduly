import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("axe baseline", () => {
  test("strona główna — brak krytycznych naruszeń WCAG", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "starter-strona", "Tylko starter-strona");
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toEqual([]);
  });

  test("sklep — brak krytycznych naruszeń WCAG", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "starter-sklep", "Tylko starter-sklep");
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toEqual([]);
  });
});
