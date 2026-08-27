import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./credentials";

// These tests start unauthenticated (no storageState) and exercise the
// login form itself, so they don't use the admin/agent storageState
// fixtures from auth.setup.ts.

test.describe("Sign in", () => {
  test("valid admin credentials sign the user in and NavBar shows their name", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL("/");
    // Seeded admin user's name is "Admin" (server/prisma/seed.ts).
    await expect(page.getByText("Admin", { exact: true })).toBeVisible();
  });

  test("wrong password stays on /login, shows a server error, and creates no session", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL("/login");
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();

    // No session was created: visiting a protected route still bounces to
    // /login instead of loading it.
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("non-existent email stays on /login and shows a server error", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("no-such-user@example.com");
    await page.getByLabel("Password").fill("whatever-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL("/login");
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test("submitting an empty form shows inline validation errors and does not call the server", async ({
    page,
  }) => {
    await page.goto("/login");

    let signInRequestFired = false;
    page.on("request", (request) => {
      if (request.url().includes("/api/auth/sign-in")) {
        signInRequestFired = true;
      }
    });

    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
    await expect(page).toHaveURL("/login");
    expect(signInRequestFired).toBe(false);
  });

  test("malformed email shows an inline validation error", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("some-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("empty password shows an inline validation error", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText("Password is required")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Sign out", () => {
  test("clicking Sign out clears the session and redirects to /login", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL("/");

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/login");

    // Session is actually gone, not just a client-side navigation: a fresh
    // visit to a protected route bounces back to /login.
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Session persistence", () => {
  test("a logged-in session survives a reload and a fresh navigation", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL("/");

    await page.reload();
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Admin", { exact: true })).toBeVisible();

    await page.goto("/");
    await expect(page).toHaveURL("/");
  });
});
