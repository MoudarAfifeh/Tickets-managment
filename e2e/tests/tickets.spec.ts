import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { WEBHOOK_SECRET } from "./credentials";
import { ADMIN_STORAGE_STATE, AGENT_STORAGE_STATE } from "./storage-state";

// GET /api/tickets and the / ticket-list page. Tickets can only be created
// via the inbound-email webhook (no create-ticket UI yet), so every test
// that needs a ticket seeds one itself through that endpoint, mirroring the
// conventions in inbound-email-webhook.spec.ts: a fresh unique sender email
// + subject per seeded ticket avoids threading into another test's ticket
// and keeps tests independent/parallel-safe (fullyParallel is on).
//
// The tickets table is shared across the whole test database (no per-test
// cleanup), so assertions target the specific seeded rows by their unique
// subject text rather than exact row counts or "the first row".
const WEBHOOK_ENDPOINT = "/api/webhooks/inbound-email";

function unique() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function seedTicket(
  request: APIRequestContext,
  overrides: { fromName?: string; subject?: string; body?: string } = {},
) {
  const token = unique();
  const senderEmail = `e2e-tickets-${token}@example.com`;
  const subject = overrides.subject ?? `E2E ticket subject ${token}`;
  const body = overrides.body ?? `E2E ticket body ${token}`;

  const res = await request.post(WEBHOOK_ENDPOINT, {
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    data: {
      from: senderEmail,
      fromName: overrides.fromName,
      subject,
      body,
    },
  });

  expect(res.status()).toBe(201);
  const json = await res.json();
  return {
    id: json.ticket.id as string,
    senderEmail,
    fromName: overrides.fromName,
    subject,
    body,
  };
}

function rowFor(page: Page, text: string) {
  return page.getByRole("row").filter({ hasText: text });
}

test.describe("GET /api/tickets (API)", () => {
  test("without auth returns 401", async ({ request }) => {
    const res = await request.get("/api/tickets");
    expect(res.status()).toBe(401);
  });
});

test.describe("Ticket list (/)", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("shows seeded tickets newest-first", async ({ page, request }) => {
    const older = await seedTicket(request);
    // Guarantee a distinct, later createdAt for the second ticket.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const newer = await seedTicket(request);

    await page.goto("/");
    await expect(page).toHaveURL("/");

    const olderRow = rowFor(page, older.subject);
    const newerRow = rowFor(page, newer.subject);
    await expect(olderRow).toBeVisible();
    await expect(newerRow).toBeVisible();

    // Newest-first ordering should be visible in actual DOM order: the
    // newer row's bounding box sits above the older row's.
    const rows = page.getByRole("row");
    const allRowTexts = await rows.allTextContents();
    const newerIndex = allRowTexts.findIndex((text) =>
      text.includes(newer.subject),
    );
    const olderIndex = allRowTexts.findIndex((text) =>
      text.includes(older.subject),
    );
    expect(newerIndex).toBeGreaterThanOrEqual(0);
    expect(olderIndex).toBeGreaterThanOrEqual(0);
    expect(newerIndex).toBeLessThan(olderIndex);
  });

  test("a seeded row shows sender, category, status, and Unassigned", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request, {
      fromName: `E2E Sender ${unique()}`,
    });

    await page.goto("/");

    const row = rowFor(page, ticket.subject);
    await expect(row).toBeVisible();

    // From: the provided sender name (not the email).
    await expect(row.getByText(ticket.fromName!, { exact: true })).toBeVisible();

    // Category: default category, humanized, rendered as a badge.
    await expect(
      row.getByText("General question", { exact: true }),
    ).toBeVisible();

    // Status: default status, rendered as a lowercase-text badge.
    await expect(row.getByText("open", { exact: true })).toBeVisible();

    // Assigned to: the webhook never assigns a ticket.
    await expect(
      row.getByText("Unassigned", { exact: true }),
    ).toBeVisible();
  });

  test("falls back to sender email when no fromName is provided", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);

    await page.goto("/");

    const row = rowFor(page, ticket.subject);
    await expect(row).toBeVisible();
    await expect(
      row.getByText(ticket.senderEmail, { exact: true }),
    ).toBeVisible();
  });
});

test.describe("Ticket list as a non-admin agent", () => {
  test.use({ storageState: AGENT_STORAGE_STATE });

  test("renders the ticket list successfully (not admin-gated)", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);

    await page.goto("/");
    await expect(page).toHaveURL("/");

    // "Tickets" appears both as the NavBar link and the page heading;
    // target the second (non-link) occurrence, same convention as the
    // admin /users route-guard spec.
    await expect(page.getByText("Tickets", { exact: true }).last()).toBeVisible();
    // Column headers confirm the table (not an error state) rendered.
    for (const name of [
      "Subject",
      "From",
      "Category",
      "Status",
      "Assigned to",
      "Created",
    ]) {
      await expect(
        page.getByRole("columnheader", { name, exact: true }),
      ).toBeVisible();
    }

    await expect(rowFor(page, ticket.subject)).toBeVisible();
  });
});
