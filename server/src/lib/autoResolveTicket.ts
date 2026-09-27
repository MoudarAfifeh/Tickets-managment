import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import type { Job } from "pg-boss";
import { z } from "zod";
import type { Ticket } from "../generated/prisma/client";
import { boss } from "./boss";
import { prisma } from "../db";

export const AUTO_RESOLVE_TICKET_QUEUE = "auto-resolve-ticket";

type AutoResolveTicketJobData = Pick<
  Ticket,
  "id" | "subject" | "body" | "senderName" | "senderEmail"
>;

// `reply` is nullable rather than optional: OpenAI's structured-output mode
// requires every property to appear in the schema's `required` array, which
// rules out `.optional()` for a field that isn't always present.
const resolutionSchema = z.object({
  canResolve: z.boolean(),
  reply: z.string().nullable(),
});

// Read once at module load — this file changes only with a deploy, not per
// request.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_BASE = readFileSync(
  path.join(__dirname, "../../knowledge-base.md"),
  "utf-8",
);

const SIGN_OFF = "Moudar Afifeh Support";

/** The customer's first name, for a personal greeting — never the full name. */
function firstNameFromSender(
  senderName: string | null,
  senderEmail: string,
): string {
  const first = senderName?.trim().split(/\s+/)[0];
  if (first) return first;

  const localPart = senderEmail.split("@")[0] || senderEmail;
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

/**
 * Enqueues a newly created ticket for AI auto-resolution against the
 * knowledge base, via pg-boss (the same Postgres-backed job queue used for
 * classification — see `classifyTicket.ts`). This returns as soon as the job
 * is persisted; the actual attempt happens later, in the worker registered
 * by `startAutoResolveTicketWorker`. Fire-and-forget by design: callers
 * don't await this, so a slow enqueue (or a failing one) never blocks or
 * fails the caller's response; errors are caught and logged here instead of
 * propagating.
 */
export function enqueueTicketAutoResolve(ticket: AutoResolveTicketJobData): void {
  boss.send(AUTO_RESOLVE_TICKET_QUEUE, ticket).catch((err: unknown) => {
    console.error(`Failed to enqueue ticket auto-resolve for ${ticket.id}:`, err);
  });
}

/**
 * Registers the worker that processes `auto-resolve-ticket` jobs: moves the
 * ticket `new` -> `processing`, asks gpt-5-nano whether the knowledge base
 * alone resolves it, and lands it on either `resolved` (with an `ai` reply
 * posted to the customer) or `open` (falls back to a human agent, unchanged
 * from before this feature existed).
 *
 * `OPENAI_API_KEY` is a non-fatal env var elsewhere in this app (see
 * `requireOpenAiKey`) — without it, this can't attempt resolution at all, so
 * it moves the ticket straight to `open` rather than leaving it stuck at
 * `new` forever.
 *
 * Every path is wrapped so the ticket can never get stuck in `processing`:
 * unlike classification (where a failure just leaves a default value in
 * place), a ticket stuck in `processing` would be permanently hidden from
 * the ticket list (see `GET /api/tickets`), so any failure here falls back
 * to `open` instead of leaving the job to pg-boss's retry policy.
 */
export async function startAutoResolveTicketWorker(): Promise<void> {
  await boss.createQueue(AUTO_RESOLVE_TICKET_QUEUE);

  // Defaults (batchSize 1, pollingIntervalSeconds 2) drain a burst of
  // arriving tickets at roughly one every 2s — several concurrent workers
  // polling faster keeps a burst from queueing up behind a single slow poll
  // loop. batchSize stays at its default of 1, so the handler below still
  // gets exactly one job per call.
  await boss.work<AutoResolveTicketJobData>(
    AUTO_RESOLVE_TICKET_QUEUE,
    { localConcurrency: 5, pollingIntervalSeconds: 0.5 },
    async ([job]: Job<AutoResolveTicketJobData>[]) => {
      if (!job) return;
      const { id, subject, body, senderName, senderEmail } = job.data;

      if (!process.env.OPENAI_API_KEY) {
        await prisma.ticket.updateMany({
          where: { id, status: "new" },
          data: { status: "open" },
        });
        return;
      }

      const claimed = await prisma.ticket.updateMany({
        where: { id, status: "new" },
        data: { status: "processing" },
      });
      // Something else already moved it on (e.g. a human got to it first) —
      // leave it alone rather than reopening a decision that's not ours.
      if (claimed.count === 0) return;

      try {
        const { output } = await generateText({
          model: openai("gpt-5-nano"),
          instructions:
            "You are a support assistant deciding whether a customer ticket " +
            "can be fully resolved using ONLY the knowledge base below — no " +
            "outside knowledge, no guessing. Follow the knowledge base's own " +
            "escalation rules exactly: when it says to escalate to a human, " +
            "set canResolve to false, no matter how confident you are. " +
            "Otherwise, set canResolve to true only if the knowledge base " +
            "directly and completely answers the ticket, and write `reply` as " +
            "the body of a professional, warm, customer-friendly support " +
            "response, using only information from the knowledge base. " +
            "Format it properly: short paragraphs, and a bullet or numbered " +
            "list when listing multiple reasons or steps (matching the " +
            "knowledge base's own style). Do not include a greeting (e.g. " +
            "\"Hi\" or \"Dear ...\") or a sign-off/signature — both are added " +
            "separately, so `reply` is just the message body itself, no " +
            "preamble like \"here's a draft\". If the knowledge base doesn't " +
            "cover it, you're not fully confident, or an escalation rule " +
            "applies, set canResolve to false and reply to null.\n\n" +
            `Knowledge base:\n${KNOWLEDGE_BASE}`,
          prompt: `Subject: ${subject}\n\nBody: ${body}`,
          output: Output.object({ schema: resolutionSchema }),
        });

        await prisma.$transaction(async (tx) => {
          const current = await tx.ticket.findUniqueOrThrow({
            where: { id },
            select: { status: true },
          });
          // A human could have intervened while the model call was in
          // flight — don't clobber whatever they set.
          if (current.status !== "processing") return;

          if (output.canResolve && output.reply) {
            const firstName = firstNameFromSender(senderName, senderEmail);
            const signed = `Hi ${firstName},\n\n${output.reply}\n\nBest regards,\n${SIGN_OFF}`;
            await tx.reply.create({
              data: { ticketId: id, senderType: "ai", body: signed },
            });
            await tx.ticket.update({
              where: { id },
              data: { status: "resolved" },
            });
          } else {
            await tx.ticket.update({ where: { id }, data: { status: "open" } });
          }
        });
      } catch (err: unknown) {
        console.error(`Ticket auto-resolve failed for ${id}:`, err);
        await prisma.ticket.updateMany({
          where: { id, status: "processing" },
          data: { status: "open" },
        });
      }
    },
  );
}
