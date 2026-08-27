import { expect, test } from "@playwright/test";
import { ADMIN_STORAGE_STATE, AGENT_STORAGE_STATE } from "./storage-state";

test.describe("Unauthenticated route guards", () => {
  // Default (no storageState) — these run signed out.

  test("visiting / redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("visiting /users redirects to /login", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/login");
  });

  test("visiting an unknown route redirects to /login", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Authenticated admin route guards", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("visiting /login redirects to /", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/");
  });

  test("visiting /users succeeds and NavBar shows the Users link", async ({
    page,
  }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/users");

    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
    // The page body itself rendered (not just the nav) — "Users" appears
    // both as the nav link and as the page heading, so target the second
    // (non-link) occurrence.
    await expect(page.getByText("Users", { exact: true }).last()).toBeVisible();
  });

  test("visiting an unknown route redirects to /", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page).toHaveURL("/");
  });
});

test.describe("Authenticated agent (non-admin) route guards", () => {
  test.use({ storageState: AGENT_STORAGE_STATE });

  test("visiting /users redirects to / (not /login)", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/");
  });

  test("NavBar does not show the Users link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
  });
});
