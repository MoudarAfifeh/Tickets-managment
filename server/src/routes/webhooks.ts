import { Router } from "express";
import { inboundEmailSchema, TicketCategory, TicketStatus } from "code";
import { requireWebhookSecret } from "../middleware/requireWebhookSecret";
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
 * subject (ignoring `Re:`/`Fwd:` and case) folds into the existing open
 * ticket instead of opening a new one.
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
        status: TicketStatus.open,
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
        status: TicketStatus.open,
        category: TicketCategory.general_question,
      },
    });

    res.status(201).json({ ticket, threaded: false });
  },
);
