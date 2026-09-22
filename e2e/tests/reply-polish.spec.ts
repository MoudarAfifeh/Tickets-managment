import { expect, test, type APIRequestContext } from "@playwright/test";
import { WEBHOOK_SECRET } from "./credentials";
import { ADMIN_STORAGE_STATE } from "./storage-state";

// The "Polish" button in ReplyForm.tsx (POST /api/tickets/:id/polish-reply, guarded
// by requireOpenAiKey). OPENAI_API_KEY is intentionally unset in
// server/.env.test — these tests cover the real, deterministic behavior of
// that unconfigured state (disabled-button gating, and the "AI features are
// not configured" 500 surfacing as an inline error) rather than mocking a
// real OpenAI response, which would be non-deterministic and costly.
const WEBHOOK_ENDPOINT = "/api/webhooks/inbound-email";

function unique() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function seedTicket(request: APIRequestContext) {
  const token = unique();
  const senderEmail = `e2e-reply-polish-${token}@example.com`;
  const subject = `E2E reply-polish ticket ${token}`;

  const res = await request.post(WEBHOOK_ENDPOINT, {
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    data: {
      from: senderEmail,
      subject,
      body: `E2E reply-polish ticket body ${token}`,
    },
  });

  expect(res.status()).toBe(201);
  const json = await res.json();
  return { id: json.ticket.id as string, subject };
}

test.describe("Reply polish button (/tickets/:id)", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("is disabled while the reply field is empty or whitespace-only, and enables once text is entered", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);

    await page.goto(`/tickets/${ticket.id}`);
    await expect(
      page.getByText(ticket.subject, { exact: true }),
    ).toBeVisible();

    const polishButton = page.getByRole("button", { name: "Polish" });
    const sendButton = page.getByRole("button", { name: "Send reply" });
    const replyField = page.getByLabel("Reply");

    // Empty.
    await expect(polishButton).toBeDisabled();
    await expect(sendButton).toBeDisabled();

    // Whitespace-only.
    await replyField.fill("   ");
    await expect(polishButton).toBeDisabled();
    await expect(sendButton).toBeDisabled();

    // Real text.
    await replyField.fill("Thanks for reaching out, here is an update.");
    await expect(polishButton).toBeEnabled();
    await expect(sendButton).toBeEnabled();

    // Clearing it again disables it.
    await replyField.fill("");
    await expect(polishButton).toBeDisabled();
    await expect(sendButton).toBeDisabled();
  });

  test("clicking Polish with text present surfaces the AI-not-configured error and leaves the typed text untouched", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);
    const draft = `E2E draft reply ${unique()}`;

    await page.goto(`/tickets/${ticket.id}`);
    await expect(
      page.getByText(ticket.subject, { exact: true }),
    ).toBeVisible();

    const replyField = page.getByLabel("Reply");
    await replyField.fill(draft);

    const polishButton = page.getByRole("button", { name: "Polish" });
    await polishButton.click();

    // OPENAI_API_KEY is unset in the test env, so the real endpoint 500s
    // with this message (see server/src/middleware/requireOpenAiKey.ts),
    // surfaced inline via ErrorMessage.
    await expect(
      page.getByText("AI features are not configured", { exact: true }),
    ).toBeVisible();

    // The textarea keeps the agent's draft rather than being cleared/
    // overwritten by a failed polish.
    await expect(replyField).toHaveValue(draft);

    // The button recovers to enabled (not stuck in its pending state) so
    // the agent can retry or send the original text as-is.
    await expect(polishButton).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Send reply" }),
    ).toBeEnabled();
  });
});

test.describe("POST /api/tickets/:id/polish-reply (API)", () => {
  test("without auth returns 401", async ({ request }) => {
    // Auth is checked before the ticket lookup, so no real ticket is needed
    // here — a placeholder id segment is enough to hit the route.
    const res = await request.post("/api/tickets/some-id/polish-reply", {
      data: { body: "test" },
    });
    expect(res.status()).toBe(401);
  });

  test.describe("authenticated", () => {
    test.use({ storageState: ADMIN_STORAGE_STATE });

    test("returns 500 with 'AI features are not configured' since OPENAI_API_KEY is unset in the test env", async ({
      request,
    }) => {
      // requireOpenAiKey runs before the route handler looks up the ticket,
      // so a real ticket isn't strictly required for this 500 — but seed one
      // via the existing helper anyway for realism and robustness in case
      // that ordering ever changes.
      const ticket = await seedTicket(request);
      const res = await request.post(`/api/tickets/${ticket.id}/polish-reply`, {
        data: { body: "Please polish this reply." },
      });
      expect(res.status()).toBe(500);
      expect((await res.json()).error).toBe("AI features are not configured");
    });
  });
});
