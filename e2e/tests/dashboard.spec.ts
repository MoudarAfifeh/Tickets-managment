import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { WEBHOOK_SECRET } from "./credentials";
import { ADMIN_STORAGE_STATE, AGENT_STORAGE_STATE } from "./storage-state";

// /dashboard (client/src/pages/Dashboard.tsx) and its backing
// GET /api/tickets/stats (server/src/routes/tickets.ts). Any signed-in user
// can view it (RequireAuth, not admin-gated).
//
// The tickets table is shared across the whole test database and every spec
// file that touches tickets runs concurrently (fullyParallel is on), so the
// aggregate counts GET /api/tickets/stats returns are a globally-mutating,
// non-isolated value — unlike most of this suite's assertions, which scope
// to a uniquely-tokened ticket. The "reflects live data" tests below are
// deliberately designed around properties that hold regardless of what
// other specs are doing concurrently:
//   - totalTickets only ever increases (nothing ever deletes a ticket), so
//     asserting it's at least baseline+1 after creating one ticket is
//     race-free.
//   - openTickets is cross-checked against a live, independently-computed
//     count from GET /api/tickets?status=open, read moments apart, rather
//     than diffed against a historical baseline.
//   - averageResolutionMs going non-null is a one-way, permanent transition
//     (once any ticket anywhere has a resolvedAt, the average can never go
//     back to null), so asserting the empty "—" state is gone after
//     resolving our own ticket is race-free too.
const WEBHOOK_ENDPOINT = "/api/webhooks/inbound-email";

const COUNT_TEXT = /^[\d,]+$/;
const PERCENT_TEXT = /^\d+\.\d%$/;
const DURATION_TEXT = /^(\d+m|\d+h \d+m|\d+d \d+h)$/;
const DURATION_OR_DASH_TEXT = /^(—|\d+m|\d+h \d+m|\d+d \d+h)$/;

function unique() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function seedOpenTicket(request: APIRequestContext) {
  const token = unique();
  const res = await request.post(WEBHOOK_ENDPOINT, {
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    data: {
      from: `e2e-dashboard-${token}@example.com`,
      subject: `E2E dashboard ticket ${token}`,
      body: `E2E dashboard ticket body ${token}`,
    },
  });
  expect(res.status()).toBe(201);
  const json = await res.json();
  const id = json.ticket.id as string;

  // A freshly created ticket starts at status "new" and only reaches "open"
  // once the fire-and-forget auto-resolve worker's pg-boss job runs (see
  // ticket-auto-resolve.spec.ts) — OPENAI_API_KEY is unset in this env, so
  // it always settles on "open", but not necessarily by the time this
  // function returns. Wait for it here (same convention as
  // tickets.spec.ts's seedTicket helper).
  await expect(async () => {
    const ticketRes = await request.get(`/api/tickets/${id}`);
    expect(ticketRes.status()).toBe(200);
    const ticketJson = await ticketRes.json();
    expect(ticketJson.ticket.status).toBe("open");
  }).toPass({ timeout: 15_000 });

  return { id };
}

async function getStats(request: APIRequestContext) {
  const res = await request.get("/api/tickets/stats");
  expect(res.status()).toBe(200);
  return (await res.json()) as {
    totalTickets: number;
    openTickets: number;
    aiResolvedCount: number;
    aiResolvedPercentage: number;
    averageResolutionMs: number | null;
  };
}

async function liveOpenTicketCount(request: APIRequestContext) {
  const res = await request.get("/api/tickets?status=open&pageSize=1");
  expect(res.status()).toBe(200);
  const { total } = await res.json();
  return total as number;
}

// Each StatCard (client/src/components/StatCard.tsx) renders inside a
// `[data-slot="card"]`, with the label in the header and the value (or a
// loading Skeleton) in `[data-slot="card-content"]`. Scope to the specific
// card by its label so `toHaveText` can target just that card's value.
function statValue(page: Page, label: string) {
  return page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('[data-slot="card-content"]');
}

function parseCount(text: string | null) {
  return Number((text ?? "").replace(/,/g, ""));
}

test.describe("Dashboard (/dashboard)", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("navigating via the NavBar link renders all 5 stat cards with well-formatted, non-skeleton values", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL("/dashboard");

    // "Dashboard" also appears as the NavBar link, so target the second
    // (non-link) occurrence — same convention as the /users and / route
    // guard specs.
    await expect(
      page.getByText("Dashboard", { exact: true }).last(),
    ).toBeVisible();

    // `toHaveText` auto-retries, so this also covers "not stuck on a
    // loading skeleton": a Skeleton has no text content and never matches
    // these regexes.
    await expect(statValue(page, "Total tickets")).toHaveText(COUNT_TEXT);
    await expect(statValue(page, "Open tickets")).toHaveText(COUNT_TEXT);
    await expect(statValue(page, "Resolved by AI")).toHaveText(COUNT_TEXT);
    await expect(statValue(page, "% resolved by AI")).toHaveText(
      PERCENT_TEXT,
    );
    await expect(statValue(page, "Avg. resolution time")).toHaveText(
      DURATION_OR_DASH_TEXT,
    );

    // Belt-and-suspenders: none of the 5 cards are still showing their
    // loading skeleton.
    await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
  });

  test("direct navigation to /dashboard renders the same cards", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/dashboard");

    await expect(statValue(page, "Total tickets")).toHaveText(COUNT_TEXT);
    await expect(statValue(page, "Open tickets")).toHaveText(COUNT_TEXT);
    await expect(statValue(page, "Resolved by AI")).toHaveText(COUNT_TEXT);
    await expect(statValue(page, "% resolved by AI")).toHaveText(
      PERCENT_TEXT,
    );
    await expect(statValue(page, "Avg. resolution time")).toHaveText(
      DURATION_OR_DASH_TEXT,
    );
  });
});

test.describe("Dashboard as a non-admin agent", () => {
  test.use({ storageState: AGENT_STORAGE_STATE });

  test("NavBar shows the Dashboard link, and /dashboard renders successfully (not admin-gated)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();

    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL("/dashboard");

    await expect(statValue(page, "Total tickets")).toHaveText(COUNT_TEXT);
    await expect(statValue(page, "% resolved by AI")).toHaveText(
      PERCENT_TEXT,
    );
  });
});

test.describe("GET /api/tickets/stats (API)", () => {
  test("without auth returns 401", async ({ request }) => {
    const res = await request.get("/api/tickets/stats");
    expect(res.status()).toBe(401);
  });
});

test.describe("Dashboard reflects live ticket data", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("creating a ticket is reflected in Total tickets, Open tickets matches a live count, and resolving the ticket via the UI updates Avg. resolution time after a reload", async ({
    page,
    request,
  }) => {
    const before = await getStats(request);
    const ticket = await seedOpenTicket(request);

    // Total tickets: race-free, since the total only ever grows.
    await page.goto("/dashboard");
    await expect(async () => {
      const text = await statValue(page, "Total tickets").textContent();
      expect(parseCount(text)).toBeGreaterThanOrEqual(before.totalTickets + 1);
    }).toPass({ timeout: 15_000 });

    // Open tickets: cross-check the dashboard's aggregate against a live,
    // independently-computed count rather than a historical delta.
    await expect(async () => {
      const stats = await getStats(request);
      const liveOpen = await liveOpenTicketCount(request);
      expect(stats.openTickets).toBe(liveOpen);
    }).toPass({ timeout: 15_000 });

    // Resolve our own ticket via the Status select on its detail page (same
    // convention as the "Ticket status & category" describe block in
    // tickets.spec.ts).
    await page.goto(`/tickets/${ticket.id}`);
    const statusCombobox = page.getByRole("combobox", { name: "Status" });
    await statusCombobox.click();
    await page.getByRole("option", { name: "resolved", exact: true }).click();
    await expect(statusCombobox).toContainText("resolved");

    // resolvedAt is now set — confirmed directly via the API (ticket-
    // scoped and deterministic; doesn't depend on the shared aggregate).
    const ticketRes = await request.get(`/api/tickets/${ticket.id}`);
    expect(ticketRes.status()).toBe(200);
    const ticketJson = await ticketRes.json();
    expect(ticketJson.ticket.status).toBe("resolved");
    expect(ticketJson.ticket.resolvedAt).not.toBeNull();

    // Reload the dashboard: Avg. resolution time has left its "—" empty
    // state for good, since our ticket's resolvedAt now permanently
    // contributes to the average.
    await page.goto("/dashboard");
    const avgResolution = statValue(page, "Avg. resolution time");
    await expect(avgResolution).not.toHaveText("—");
    await expect(avgResolution).toHaveText(DURATION_TEXT);

    // Open tickets still matches a live count after the mutation.
    await expect(async () => {
      const stats = await getStats(request);
      const liveOpen = await liveOpenTicketCount(request);
      expect(stats.openTickets).toBe(liveOpen);
    }).toPass({ timeout: 15_000 });
  });
});
