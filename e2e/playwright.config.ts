import { defineConfig, devices } from "@playwright/test";

const STRONA_PORT = Number(process.env.STRONA_PORT ?? 3100);
const SKLEP_PORT = Number(process.env.SKLEP_PORT ?? 3101);

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  projects: [
    {
      name: "starter-strona",
      testMatch: ["**/smoke-strona.spec.ts", "**/a11y-baseline.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://localhost:${STRONA_PORT}`,
        locale: "pl-PL",
      },
    },
    {
      name: "starter-sklep",
      testMatch: [
        "**/smoke-sklep.spec.ts",
        "**/checkout.spec.ts",
        "**/a11y-baseline.spec.ts",
      ],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://localhost:${SKLEP_PORT}`,
        locale: "pl-PL",
      },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @moduly/starter-strona start --port 3100",
      url: `http://localhost:${STRONA_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @moduly/starter-sklep start --port 3101",
      url: `http://localhost:${SKLEP_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
