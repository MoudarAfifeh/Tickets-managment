import { expect, test, type APIRequestContext } from "@playwright/test";
import { WEBHOOK_SECRET } from "./credentials";
import { ADMIN_STORAGE_STATE } from "./storage-state";

// startAutoResolveTicketWorker (server/src/lib/autoResolveTicket.ts): after
// POST /api/webhooks/inbound-email creates a ticket at status "new", a
// pg-boss job attempts to resolve it against the knowledge base and lands it
// on either "resolved" (with an "ai" reply posted) or "open".
//
// OPENAI_API_KEY is intentionally unset in server/.env.test (same
// convention as ticket-classification.spec.ts / reply-polish.spec.ts /
// ticket-summary.spec.ts), so the worker's very first check —
// `if (!process.env.OPENAI_API_KEY)` — always short-circuits here: it moves
// the ticket straight from "new" to "open" via a guarded `updateMany`,
// *skipping "processing" entirely* (that intermediate state only exists on
// the real-OpenAI-call path). No `ai` reply is ever created on this path
// either. That's the one deterministic thing there is to assert here.
//
// The real, successful auto-resolve (a GPT call actually answering a ticket
// from the knowledge base, landing it on "resolved" with an "ai" reply) was
// instead verified manually against the live OpenAI API during development
// and isn't covered here — mocking it would mean not exercising the
// worker's real code at all, and a real call would be non-deterministic
// and costly in CI.
//
// Also deliberately not covered here: `GET /api/tickets` excluding
// `status: "processing"` from the default (no-status-filter) list. That
// filter only ever matters for a ticket actually sitting in "processing",
// and this env's worker never leaves a ticket there (see above) — there's
// no HTTP-driven way to produce that state here. Exercising it would need a
// new convention for this workspace (writing a ticket directly into the
// test database via a raw client, bypassing the API/webhook entirely,
// since nothing else here does that) just to seed one row. That's more
// test infrastructure than the pure query-filter logic
// (`status ? { status } : { status: { not: "processing" } }` in
// server/src/routes/tickets.ts) seems to warrant on its own — it was
// manually verified against the real dev DB with a real OpenAI key instead
// (ticket sat in "processing", was absent from the default list, present
// under `?status=processing`, then resolved moments later).
const WEBHOOK_ENDPOINT = "/api/webhooks/inbound-email";

function unique() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createTicketViaWebhook(request: APIRequestContext) {
  const token = unique();
  const res = await request.post(WEBHOOK_ENDPOINT, {
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    data: {
      from: `e2e-auto-resolve-${token}@example.com`,
      subject: `E2E auto-resolve ticket ${token}`,
      body: `Some question the knowledge base may or may not cover. ${token}`,
    },
  });
  expect(res.status()).toBe(201);
  const json = await res.json();
  expect(json.ticket.status).toBe("new");
  return json.ticket.id as string;
}

test.describe("Background ticket auto-resolve (OPENAI_API_KEY unset in test env)", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("a freshly created ticket settles on status open, with no reply added, never getting stuck at new or processing", async ({
    request,
  }) => {
    const ticketId = await createTicketViaWebhook(request);

    // The fire-and-forget job's own status check is synchronous (no
    // OpenAI call on this path), but pg-boss still fetches it off its own
    // queue on its own schedule — poll for the end state rather than
    // assume a fixed delay (same reasoning as the "Assigned to" select's
    // toPass retry in tickets.spec.ts).
    await expect(async () => {
      const res = await request.get(`/api/tickets/${ticketId}`);
      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.ticket.status).toBe("open");
    }).toPass({ timeout: 15_000 });

    const res = await request.get(`/api/tickets/${ticketId}`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.ticket.status).toBe("open");
    expect(json.ticket.replies).toEqual([]);
  });
});
