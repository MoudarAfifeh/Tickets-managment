import { expect, test, type APIRequestContext } from "@playwright/test";
import { WEBHOOK_SECRET } from "./credentials";
import { ADMIN_STORAGE_STATE } from "./storage-state";

// The "Summary" section in TicketDetails.tsx (TicketSummary.tsx): a
// "Summarize" button that calls POST /api/tickets/:id/summarize (guarded by
// requireOpenAiKey, same gating as /polish-reply) and displays the returned
// text, plus auto-regeneration on new replies once a summary already exists.
//
// OPENAI_API_KEY is intentionally unset in server/.env.test (see
// reply-polish.spec.ts), so the real endpoint always 500s with "AI features
// are not configured" in this env — that unconfigured path is covered below
// the same deterministic way reply-polish.spec.ts covers /polish-reply.
// Covering the *successful* summarize flow (a summary rendering, and
// auto-regeneration after a reply) needs an actual AI response though, and a
// real OpenAI call would be non-deterministic and costly here — so those
// tests intercept the browser's request to /api/tickets/:id/summarize via
// page.route and fulfill it with a canned response, bypassing the real route
// (and OpenAI) entirely while still exercising the real frontend code path.
const WEBHOOK_ENDPOINT = "/api/webhooks/inbound-email";

function unique() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function seedTicket(request: APIRequestContext) {
  const token = unique();
  const senderEmail = `e2e-ticket-summary-${token}@example.com`;
  const subject = `E2E ticket-summary ticket ${token}`;

  const res = await request.post(WEBHOOK_ENDPOINT, {
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    data: {
      from: senderEmail,
      subject,
      body: `E2E ticket-summary ticket body ${token}`,
    },
  });

  expect(res.status()).toBe(201);
  const json = await res.json();
  return { id: json.ticket.id as string, subject };
}

test.describe("Ticket summary (/tickets/:id) — mocked summarize response", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("clicking Summarize shows a pending state, then displays the returned summary", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);
    const summaryText = `E2E summary ${unique()}`;

    await page.route(`**/api/tickets/${ticket.id}/summarize`, async (route) => {
      // Small artificial delay so the pending (disabled button) state is
      // observable rather than resolving before Playwright can check it.
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({ json: { summary: summaryText } });
    });

    await page.goto(`/tickets/${ticket.id}`);
    await expect(
      page.getByText(ticket.subject, { exact: true }),
    ).toBeVisible();

    // No summary shown before the button is ever clicked.
    await expect(page.getByText(summaryText)).toHaveCount(0);

    const summarizeButton = page.getByRole("button", { name: "Summarize" });
    await summarizeButton.click();
    await expect(summarizeButton).toBeDisabled();

    await expect(page.getByText(summaryText, { exact: true })).toBeVisible();
    await expect(summarizeButton).toBeEnabled();
  });

  test("sending a new reply after a summary exists automatically regenerates it, with no extra click", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);
    const firstSummary = `E2E first summary ${unique()}`;
    const updatedSummary = `E2E updated summary ${unique()}`;
    let callCount = 0;

    await page.route(`**/api/tickets/${ticket.id}/summarize`, async (route) => {
      callCount++;
      await route.fulfill({
        json: { summary: callCount === 1 ? firstSummary : updatedSummary },
      });
    });

    await page.goto(`/tickets/${ticket.id}`);
    await expect(
      page.getByText(ticket.subject, { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Summarize" }).click();
    await expect(page.getByText(firstSummary, { exact: true })).toBeVisible();
    expect(callCount).toBe(1);

    const replyBody = `E2E reply triggering resummary ${unique()}`;
    await page.getByLabel("Reply").fill(replyBody);
    await page.getByRole("button", { name: "Send reply" }).click();

    // The reply lands in the thread...
    await expect(page.getByText(replyBody, { exact: true })).toBeVisible();
    // ...and the summary regenerates automatically — no "Summarize" click —
    // replacing the stale first summary with the new one.
    await expect(page.getByText(updatedSummary, { exact: true })).toBeVisible();
    await expect(page.getByText(firstSummary)).toHaveCount(0);
    expect(callCount).toBe(2);
  });

  test("does not auto-summarize on first load, even for a ticket that already has replies", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);

    // Give the ticket a reply before ever loading the page, so the
    // "isFirstRender" guard (not just an empty replies array) is what's
    // under test.
    const replyRes = await request.post(`/api/tickets/${ticket.id}/replies`, {
      data: { body: `E2E pre-existing reply ${unique()}` },
    });
    expect(replyRes.status()).toBe(201);

    let callCount = 0;
    await page.route(`**/api/tickets/${ticket.id}/summarize`, async (route) => {
      callCount++;
      await route.fulfill({ json: { summary: "should never be shown" } });
    });

    await page.goto(`/tickets/${ticket.id}`);
    await expect(
      page.getByText(ticket.subject, { exact: true }),
    ).toBeVisible();

    // Give a mistaken auto-call a moment to happen before asserting it didn't.
    await page.waitForTimeout(500);
    expect(callCount).toBe(0);
    await expect(
      page.getByRole("button", { name: "Summarize" }),
    ).toBeEnabled();
  });
});

test.describe("Ticket summary (/tickets/:id) — unconfigured OPENAI_API_KEY (real endpoint)", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("clicking Summarize surfaces the AI-not-configured error", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);

    await page.goto(`/tickets/${ticket.id}`);
    await expect(
      page.getByText(ticket.subject, { exact: true }),
    ).toBeVisible();

    const summarizeButton = page.getByRole("button", { name: "Summarize" });
    await summarizeButton.click();

    // OPENAI_API_KEY is unset in the test env, so the real endpoint 500s
    // with this message (see server/src/middleware/requireOpenAiKey.ts),
    // surfaced inline via ErrorMessage — same as the "Polish" button.
    await expect(
      page.getByText("AI features are not configured", { exact: true }),
    ).toBeVisible();
    await expect(summarizeButton).toBeEnabled();
  });
});

test.describe("POST /api/tickets/:id/summarize (API)", () => {
  test("without auth returns 401", async ({ request }) => {
    // Auth is checked before requireOpenAiKey/the ticket lookup, so a
    // placeholder id segment is enough to hit the route.
    const res = await request.post("/api/tickets/some-id/summarize");
    expect(res.status()).toBe(401);
  });

  test.describe("authenticated", () => {
    test.use({ storageState: ADMIN_STORAGE_STATE });

    test("returns 500 with 'AI features are not configured' since OPENAI_API_KEY is unset in the test env", async ({
      request,
    }) => {
      // requireOpenAiKey runs before the route handler looks up the ticket,
      // so a real ticket isn't strictly required — but seed one via the
      // existing helper anyway for realism and robustness in case that
      // ordering ever changes.
      const ticket = await seedTicket(request);
      const res = await request.post(`/api/tickets/${ticket.id}/summarize`);
      expect(res.status()).toBe(500);
      expect((await res.json()).error).toBe("AI features are not configured");
    });
  });
});
