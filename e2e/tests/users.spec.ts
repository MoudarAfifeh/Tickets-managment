import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL } from "./credentials";
import { ADMIN_STORAGE_STATE } from "./storage-state";

// All user-management tests run as the seeded admin (the only role allowed
// on /users). Auth is just a precondition here, so reuse the storageState
// captured by auth.setup.ts instead of re-driving the login form.
test.use({ storageState: ADMIN_STORAGE_STATE });

// Every test that creates a user mints its own unique name/email so the
// specs stay independent and parallel-safe (fullyParallel is on) — no two
// tests ever touch the same row.
function uniqueUser() {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `E2E User ${token}`,
    email: `e2e-${token}@example.com`,
    password: "correct horse battery staple",
  };
}

function rowFor(page: Page, text: string) {
  return page.getByRole("row").filter({ hasText: text });
}

async function createUserViaDialog(
  page: Page,
  user: { name: string; email: string; password: string },
) {
  await page.getByRole("button", { name: "New User" }).click();

  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Create user" }),
  ).toBeVisible();
  await expect(
    dialog.getByText("New users are created with the agent role."),
  ).toBeVisible();

  await dialog.getByLabel("Name").fill(user.name);
  await dialog.getByLabel("Email").fill(user.email);
  await dialog.getByLabel("Password").fill(user.password);
  await dialog.getByRole("button", { name: "Create user" }).click();

  await expect(dialog).toBeHidden();
}

test.describe("User management (/users)", () => {
  test("lists seeded users with role/status columns; admin row is not deletable", async ({
    page,
  }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/users");

    // Page chrome.
    await expect(page.getByText("Users", { exact: true }).last()).toBeVisible();
    await expect(page.getByRole("button", { name: "New User" })).toBeVisible();

    // Column headers.
    for (const name of ["Name", "Email", "Role", "Status", "Joined"]) {
      await expect(
        page.getByRole("columnheader", { name, exact: true }),
      ).toBeVisible();
    }

    // The seeded admin is always present as an admin / Active row.
    const adminRow = rowFor(page, ADMIN_EMAIL);
    await expect(adminRow).toBeVisible();
    await expect(adminRow.getByText("Admin", { exact: true })).toBeVisible();
    await expect(adminRow.getByText("admin", { exact: true })).toBeVisible();
    await expect(adminRow.getByText("Active", { exact: true })).toBeVisible();
    // Six cells: Name, Email, Role, Status, Joined, actions.
    await expect(adminRow.getByRole("cell")).toHaveCount(6);

    // Admin rows can be edited but never deleted.
    await expect(
      adminRow.getByRole("button", { name: "Edit Admin" }),
    ).toBeVisible();
    await expect(
      adminRow.getByRole("button", { name: /^Delete / }),
    ).toHaveCount(0);
  });

  test("creates a new user from the New User dialog", async ({ page }) => {
    const user = uniqueUser();

    await page.goto("/users");
    await createUserViaDialog(page, user);

    // The new row shows up, always as an Active agent regardless of input.
    const row = rowFor(page, user.email);
    await expect(row).toBeVisible();
    await expect(row.getByText(user.name, { exact: true })).toBeVisible();
    await expect(row.getByText("agent", { exact: true })).toBeVisible();
    await expect(row.getByText("Active", { exact: true })).toBeVisible();
  });

  test("edits a user's name and email", async ({ page }) => {
    const user = uniqueUser();

    await page.goto("/users");
    await createUserViaDialog(page, user);

    await rowFor(page, user.email)
      .getByRole("button", { name: `Edit ${user.name}` })
      .click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Edit user" }),
    ).toBeVisible();
    await expect(
      dialog.getByText("Leave the password blank to keep it unchanged."),
    ).toBeVisible();

    // Name/Email prefilled, Password blank.
    await expect(dialog.getByLabel("Name")).toHaveValue(user.name);
    await expect(dialog.getByLabel("Email")).toHaveValue(user.email);
    await expect(dialog.getByLabel("Password")).toHaveValue("");

    const updatedName = `${user.name} (edited)`;
    const updatedEmail = user.email.replace("@", "+edited@");
    await dialog.getByLabel("Name").fill(updatedName);
    await dialog.getByLabel("Email").fill(updatedEmail);
    await dialog.getByRole("button", { name: "Save changes" }).click();

    await expect(dialog).toBeHidden();

    // Row reflects the new values; the old email is gone.
    const updatedRow = rowFor(page, updatedEmail);
    await expect(updatedRow).toBeVisible();
    await expect(
      updatedRow.getByText(updatedName, { exact: true }),
    ).toBeVisible();
    await expect(rowFor(page, user.email)).toHaveCount(0);
  });

  test("soft-deletes a non-admin user via the confirmation dialog", async ({
    page,
  }) => {
    const user = uniqueUser();

    await page.goto("/users");
    await createUserViaDialog(page, user);

    const row = rowFor(page, user.email);
    await row.getByRole("button", { name: `Delete ${user.name}` }).click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Delete user" }),
    ).toBeVisible();
    await expect(
      dialog.getByText(
        `${user.name} will be removed from the list and lose access immediately.`,
      ),
    ).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();

    await dialog.getByRole("button", { name: "Delete user" }).click();

    await expect(dialog).toBeHidden();
    await expect(rowFor(page, user.email)).toHaveCount(0);
  });

  test("end-to-end: create, then edit, then delete a user", async ({
    page,
  }) => {
    const user = uniqueUser();

    await page.goto("/users");

    // Create.
    await createUserViaDialog(page, user);
    await expect(rowFor(page, user.email)).toBeVisible();

    // Edit.
    await rowFor(page, user.email)
      .getByRole("button", { name: `Edit ${user.name}` })
      .click();
    const editDialog = page.getByRole("dialog");
    const renamedName = `${user.name} (renamed)`;
    await editDialog.getByLabel("Name").fill(renamedName);
    await editDialog.getByRole("button", { name: "Save changes" }).click();
    await expect(editDialog).toBeHidden();

    const row = rowFor(page, user.email);
    await expect(row.getByText(renamedName, { exact: true })).toBeVisible();

    // Delete.
    await row.getByRole("button", { name: `Delete ${renamedName}` }).click();
    const deleteDialog = page.getByRole("dialog");
    await deleteDialog.getByRole("button", { name: "Delete user" }).click();
    await expect(deleteDialog).toBeHidden();

    await expect(rowFor(page, user.email)).toHaveCount(0);
  });
});
