import { expect, test } from "@playwright/test";
import { WEBHOOK_SECRET } from "./credentials";

// POST /api/webhooks/inbound-email is a machine-to-machine webhook (no
// session/cookie auth), so these tests drive it directly via Playwright's
// `request` fixture instead of the browser UI. `request` inherits the
// project's `baseURL` (http://localhost:5173), which proxies /api to the API
// server the same way the client app does.
//
// Every test mints its own unique sender email / subject token so specs
// stay independent and parallel-safe (fullyParallel is on) — no two tests'
// tickets can collide on the (senderEmail, subject) pair the endpoint uses
// for threading.
const ENDPOINT = "/api/webhooks/inbound-email";

function unique() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test.describe("POST /api/webhooks/inbound-email", () => {
  test("missing secret returns 401", async ({ request }) => {
    const token = unique();
    const res = await request.post(ENDPOINT, {
      data: {
        from: `e2e-${token}@example.com`,
        subject: `E2E webhook ${token}`,
        body: "Hello, this is a test email.",
      },
    });

    expect(res.status()).toBe(401);
  });

  test("wrong secret returns 401", async ({ request }) => {
    const token = unique();
    const res = await request.post(ENDPOINT, {
      headers: { "x-webhook-secret": "definitely-not-the-right-secret" },
      data: {
        from: `e2e-${token}@example.com`,
        subject: `E2E webhook ${token}`,
        body: "Hello, this is a test email.",
      },
    });

    expect(res.status()).toBe(401);
  });

  test("missing required field returns 400", async ({ request }) => {
    const token = unique();
    const res = await request.post(ENDPOINT, {
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
      data: {
        // `from` omitted.
        subject: `E2E webhook ${token}`,
        body: "Hello, this is a test email.",
      },
    });

    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(typeof json.error).toBe("string");
    expect(json.error.length).toBeGreaterThan(0);
  });

  test("creates a ticket, threads a same-sender reply, and opens a separate ticket for a different sender", async ({
    request,
  }) => {
    const token = unique();
    const senderEmail = `e2e-webhook-${token}@example.com`;
    const senderName = `E2E Sender ${token}`;
    const subject = `E2E webhook subject ${token}`;
    const body = `Original message body ${token}`;
    const bodyHtml = `<p>Original message body ${token}</p>`;

    // Step 4: a fresh (sender, subject) pair creates a new ticket.
    const createRes = await request.post(ENDPOINT, {
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
      data: { from: senderEmail, fromName: senderName, subject, body, bodyHtml },
    });

    expect(createRes.status()).toBe(201);
    const createJson = await createRes.json();
    expect(createJson.threaded).toBe(false);
    expect(createJson.ticket).toMatchObject({
      subject,
      body,
      bodyHtml,
      senderEmail,
      senderName,
      status: "open",
      category: "general_question",
    });
    const ticketId = createJson.ticket.id;
    expect(typeof ticketId).toBe("string");

    // Step 5: a reply from the same sender, with a "Re:" prefix on the same
    // subject, folds into the existing open ticket instead of creating a new
    // one. Use the query-param secret here to cover that auth path too.
    const replyRes = await request.post(
      `${ENDPOINT}?secret=${encodeURIComponent(WEBHOOK_SECRET)}`,
      {
        data: {
          from: senderEmail,
          fromName: senderName,
          subject: `Re: ${subject}`,
          body: `Reply message body ${token}`,
        },
      },
    );

    expect(replyRes.status()).toBe(200);
    const replyJson = await replyRes.json();
    expect(replyJson.threaded).toBe(true);
    expect(replyJson.ticket.id).toBe(ticketId);
    // Folding into the existing ticket doesn't mutate it — same original
    // subject/body as when it was created.
    expect(replyJson.ticket.subject).toBe(subject);
    expect(replyJson.ticket.body).toBe(body);

    // Step 6: same subject, but a different sender — a separate new ticket.
    const otherSenderEmail = `e2e-webhook-other-${token}@example.com`;
    const otherRes = await request.post(ENDPOINT, {
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
      data: { from: otherSenderEmail, subject, body: "Different sender, same subject." },
    });

    expect(otherRes.status()).toBe(201);
    const otherJson = await otherRes.json();
    expect(otherJson.threaded).toBe(false);
    expect(otherJson.ticket.id).not.toBe(ticketId);
  });
});
