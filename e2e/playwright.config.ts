import path from "node:path";
import dotenv from "dotenv";
import { defineConfig, devices } from "@playwright/test";

// The e2e workspace doesn't auto-load server/.env.test the way Bun does for
// the server itself, so pull in ADMIN_EMAIL/ADMIN_PASSWORD/AGENT_EMAIL/
// AGENT_PASSWORD explicitly for tests that log in via the real /login form.
dotenv.config({
  path: path.resolve(import.meta.dirname, "../server/.env.test"),
  quiet: true,
});

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

  projects: [
    // Logs in as the seeded admin and agent users once, saving each
    // session's storageState to disk so authenticated tests can start
    // from a signed-in state instead of re-driving the login form for
    // every test where auth is just a precondition.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],

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
