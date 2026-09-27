import { Router } from "express";
import { inboundEmailSchema } from "code";
import { requireWebhookSecret } from "../middleware/requireWebhookSecret";
import { enqueueTicketClassification } from "../lib/classifyTicket";
import { enqueueTicketAutoResolve } from "../lib/autoResolveTicket";
import { parseBody } from "../lib/validateBody";
import { prisma } from "../db";

/**
 * Inbound webhooks from external services. "Webhook" here just means an HTTP
 * endpoint called by another system rather than a signed-in user — so these
 * routes carry no session auth and are gated by the shared `WEBHOOK_SECRET`
 * instead (see `requireWebhookSecret`).
 */
export const webhooksRouter = Router();

/** Strip any run of leading `Re:` / `Fwd:` / `Fw:` prefixes from a subject. */
function stripReplyPrefix(subject: string): string {
  const stripped = subject.replace(/^(\s*(re|fwd|fw)\s*:\s*)+/i, "").trim();
  return stripped || subject.trim();
}

/**
 * Inbound support email -> ticket. No mail provider is wired yet; whatever
 * forwards mail to us flattens it into `inboundEmailSchema`'s shape.
 *
 * Basic threading: a follow-up email from the same address with the same
 * subject (ignoring `Re:`/`Fwd:` and case) folds into the existing ticket
 * instead of opening a new one, as long as that ticket hasn't been resolved
 * or closed yet.
 *
 * A newly created ticket starts at `status: "new"` and immediately gets
 * queued for both classification and AI auto-resolve (see
 * `classifyTicket.ts` / `autoResolveTicket.ts`) — the latter is what moves it
 * through `processing` to either `resolved` or `open`. The threading match
 * below has to include `new`/`processing`, not just `open`: a fast
 * back-to-back follow-up email can easily arrive before that pg-boss job has
 * even run, and without this it would silently open a duplicate ticket
 * instead of folding in.
 */
webhooksRouter.post(
  "/inbound-email",
  requireWebhookSecret,
  async (req, res) => {
    const data = parseBody(inboundEmailSchema, req, res);
    if (data === null) return;

    const subject = stripReplyPrefix(data.subject);

    const existing = await prisma.ticket.findFirst({
      where: {
        status: { in: ["new", "processing", "open"] },
        senderEmail: data.from,
        subject: { equals: subject, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      res.status(200).json({ ticket: existing, threaded: true });
      return;
    }

    const ticket = await prisma.ticket.create({
      data: {
        subject,
        body: data.body,
        bodyHtml: data.bodyHtml ?? null,
        senderEmail: data.from,
        senderName: data.fromName ?? null,
        status: "new",
        category: "general_question",
      },
    });

    // Not awaited: both of these only enqueue a job (a fast insert), and the
    // actual work runs later in their pg-boss workers, so a slow or failing
    // OpenAI call never delays this response.
    enqueueTicketClassification(ticket);
    enqueueTicketAutoResolve(ticket);

    res.status(201).json({ ticket, threaded: false });
  },
);
