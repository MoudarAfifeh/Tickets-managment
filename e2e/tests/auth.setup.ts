import { expect, test as setup, type Page } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  AGENT_EMAIL,
  AGENT_PASSWORD,
} from "./credentials";
import { ADMIN_STORAGE_STATE, AGENT_STORAGE_STATE } from "./storage-state";

async function signInThroughForm(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL("/");
}

setup("authenticate as admin", async ({ page }) => {
  await signInThroughForm(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});

setup("authenticate as agent", async ({ page }) => {
  await signInThroughForm(page, AGENT_EMAIL, AGENT_PASSWORD);
  await page.context().storageState({ path: AGENT_STORAGE_STATE });
});
