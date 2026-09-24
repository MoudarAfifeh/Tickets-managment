import { expect, test, type APIRequestContext } from "@playwright/test";
import { WEBHOOK_SECRET } from "./credentials";
import { ADMIN_STORAGE_STATE } from "./storage-state";

// classifyTicketInBackground (server/src/lib/classifyTicket.ts): after
// POST /api/webhooks/inbound-email creates a ticket, it fires off an
// unawaited GPT call that may reclassify the ticket's category away from
// its "general_question" default.
//
// OPENAI_API_KEY is intentionally unset in server/.env.test (same
// convention as reply-polish.spec.ts / ticket-summary.spec.ts), so
// classifyTicketInBackground's very first line —
// `if (!process.env.OPENAI_API_KEY) return;` — always short-circuits here:
// no OpenAI call is ever made. Unlike /polish-reply and /summarize, there's
// no client-visible network request for this call to mock via page.route
// either (it's a pure server-to-OpenAI background call kicked off after the
// webhook already responded), so the "unconfigured" path can't be exercised
// the same deterministic way those specs cover their routes' 500 response.
// The real, successful classification (a GPT call actually reclassifying a
// ticket) was instead verified manually against the live OpenAI API during
// development and isn't covered here — mocking it would mean not exercising
// classifyTicketInBackground's real code at all, and a real call would be
// non-deterministic and costly in CI.
//
// What this test does cover deterministically: the ticket a webhook call
// creates keeps its default category and stays normally readable well
// after the background call would have run, i.e. the no-op path when the
// key is absent doesn't regress into a stray category mutation or an
// unhandled rejection that takes down later requests.
const WEBHOOK_ENDPOINT = "/api/webhooks/inbound-email";

function unique() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createTicketViaWebhook(request: APIRequestContext) {
  const token = unique();
  const res = await request.post(WEBHOOK_ENDPOINT, {
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    data: {
      from: `e2e-classify-${token}@example.com`,
      subject: `E2E classify ticket ${token}`,
      // Deliberately refund-shaped content: if classification ever did run
      // in this env, this is exactly the kind of body that would flip the
      // category away from the default, making a regression here visible.
      body: `I was charged twice and want a refund for the duplicate charge. ${token}`,
    },
  });
  expect(res.status()).toBe(201);
  const json = await res.json();
  return json.ticket.id as string;
}

test.describe("Background ticket classification (OPENAI_API_KEY unset in test env)", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("ticket category stays at the general_question default and the ticket remains readable after the background call would have run", async ({
    request,
  }) => {
    const ticketId = await createTicketViaWebhook(request);

    // Give the fire-and-forget call a moment it would need to run (it
    // actually no-ops almost immediately in this env since the key check
    // is synchronous, but this also guards against a slower regression).
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const res = await request.get(`/api/tickets/${ticketId}`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.ticket.category).toBe("general_question");
  });
});
