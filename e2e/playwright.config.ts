import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Two servers: the API (pointed at the separate test database via
  // NODE_ENV=test, see server/.env.test.example) and the Vite client,
  // which proxies /api to the API on port 3000.
  webServer: [
    {
      command: "bun run dev:test",
      cwd: "../server",
      url: "http://localhost:3000/api/health",
      // Never reuse an already-running dev server here — it would be
      // pointed at the dev database, not the test one.
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "bun run dev",
      cwd: "../client",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
