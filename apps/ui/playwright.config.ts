// apps/ui/playwright.config.ts
// Responsive + light/dark checks per docs/FAS_ERP_CODING_STANDARDS.md's
// "Responsive standard" section. Kept as a separate `test:e2e` script (like
// apps/api's vitest.config.e2e.ts) rather than folded into the `test`
// pipeline turbo runs by default, since it needs a running Next server and
// installed browser binaries (`pnpm --filter ui exec playwright install
// chromium`) that CI/local machines opt into deliberately.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
