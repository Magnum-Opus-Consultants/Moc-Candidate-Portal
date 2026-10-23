import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests, run against the dev servers already up.
 *
 * No webServer block: this project runs the Django API on 8002 and Next on
 * 3001 side by side, and Playwright can only start one of them. Starting
 * Next without the API would give a suite that fails for the wrong reason,
 * so the tests assume both are running and say so when they are not.
 */
export default defineConfig({
  testDir: "./e2e",
  // These tests move one posting through several states, so they must not
  // race each other over it.
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  /*
   * Generous, because these run against the dev server: Turbopack compiles
   * each route on first visit and hydration follows that, so a first click
   * on a page can legitimately be tens of seconds away. Against a
   * production build they finish in a fraction of this.
   */
  timeout: 180_000,
  expect: { timeout: 20_000 },
  use: {
    /*
     * localhost, not 127.0.0.1, and port 3001.
     *
     * They are the same machine but not the same origin, and the browser
     * calls the API cross-origin at http://localhost:8002 (see
     * frontend/.env.local). Django's CORS allowlist names localhost:3001,
     * so loading the app on 127.0.0.1 — or on any other port — gets every
     * write blocked before it leaves the browser, with no response to show
     * for it. That failure looks exactly like a dead button.
     */
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
