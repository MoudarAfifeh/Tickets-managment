import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import type { Job } from "pg-boss";
import { z } from "zod";
import { ticketCategoryValues } from "code";
import type { Ticket } from "../generated/prisma/client";
import { boss } from "./boss";
import { prisma } from "../db";

export const CLASSIFY_TICKET_QUEUE = "classify-ticket";

type ClassifyTicketJobData = Pick<Ticket, "id" | "subject" | "body">;

const categorySchema = z.object({
  category: z.enum(ticketCategoryValues),
});

/**
 * Enqueues a newly created ticket for background classification into a
 * `TicketCategory`, via pg-boss (a Postgres-backed job queue, so no separate
 * broker like Redis is needed). This returns as soon as the job is persisted
 * — the actual OpenAI call happens later, in the worker registered by
 * `startClassifyTicketWorker`. Fire-and-forget by design: callers don't await
 * this, so a slow enqueue (or a failing one) never blocks or fails the
 * caller's response; errors are caught and logged here instead of
 * propagating.
 */
export function enqueueTicketClassification(ticket: ClassifyTicketJobData): void {
  boss.send(CLASSIFY_TICKET_QUEUE, ticket).catch((err: unknown) => {
    console.error(`Failed to enqueue ticket classification for ${ticket.id}:`, err);
  });
}

/**
 * Registers the worker that processes `classify-ticket` jobs: classifies the
 * ticket via gpt-5-nano and updates it in place. `OPENAI_API_KEY` is a
 * non-fatal env var elsewhere in this app (see `requireOpenAiKey`), so the
 * job just completes as a no-op without it, rather than failing/retrying.
 * Only overwrites the category while it's still the `general_question`
 * default, so it can't clobber one an agent has since set by hand. A thrown
 * error here fails the job, which pg-boss retries per the queue's (default)
 * retry policy instead of losing it.
 */
export async function startClassifyTicketWorker(): Promise<void> {
  await boss.createQueue(CLASSIFY_TICKET_QUEUE);

  await boss.work<ClassifyTicketJobData>(CLASSIFY_TICKET_QUEUE, async ([job]: Job<ClassifyTicketJobData>[]) => {
    if (!job || !process.env.OPENAI_API_KEY) return;

    const { id, subject, body } = job.data;

    const { output } = await generateText({
      model: openai("gpt-5-nano"),
      instructions:
        "Classify a customer support ticket into exactly one category based on " +
        "its subject and body: `general_question` for anything that doesn't fit " +
        "the other two, `technical_question` for bugs, errors, or how-something-" +
        "works questions, and `refund_request` for anything about refunds, " +
        "charges, or cancellations.",
      prompt: `Subject: ${subject}\n\nBody: ${body}`,
      output: Output.object({ schema: categorySchema }),
    });

    await prisma.ticket.updateMany({
      where: { id, category: "general_question" },
      data: { category: output.category },
    });
  });
}
