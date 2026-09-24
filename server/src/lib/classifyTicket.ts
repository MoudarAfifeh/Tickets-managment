import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { ticketCategoryValues } from "code";
import type { Ticket } from "../generated/prisma/client";
import { prisma } from "../db";

const categorySchema = z.object({
  category: z.enum(ticketCategoryValues),
});

/**
 * Classifies a newly created ticket into a `TicketCategory` via gpt-5-nano
 * and updates it in place. Fire-and-forget by design — callers don't await
 * this, so a slow or failing OpenAI call never blocks or fails the
 * ticket-creation response; errors are caught and logged here instead of
 * propagating. `OPENAI_API_KEY` is a non-fatal env var elsewhere in this app
 * (see `requireOpenAiKey`), so this silently no-ops without it rather than
 * erroring. Only overwrites the category while it's still the
 * `general_question` default, so it can't clobber one an agent has since set
 * by hand.
 */
export function classifyTicketInBackground(
  ticket: Pick<Ticket, "id" | "subject" | "body">,
): void {
  if (!process.env.OPENAI_API_KEY) return;

  generateObject({
    model: openai("gpt-5-nano"),
    schema: categorySchema,
    instructions:
      "Classify a customer support ticket into exactly one category based on " +
      "its subject and body: `general_question` for anything that doesn't fit " +
      "the other two, `technical_question` for bugs, errors, or how-something-" +
      "works questions, and `refund_request` for anything about refunds, " +
      "charges, or cancellations.",
    prompt: `Subject: ${ticket.subject}\n\nBody: ${ticket.body}`,
  })
    .then(({ object }) =>
      prisma.ticket.updateMany({
        where: { id: ticket.id, category: "general_question" },
        data: { category: object.category },
      }),
    )
    .catch((err: unknown) => {
      console.error(`Ticket classification failed for ${ticket.id}:`, err);
    });
}
