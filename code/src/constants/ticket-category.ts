/**
 * Ticket category. Mirrors the `TicketCategory` enum in
 * `server/prisma/schema.prisma` — keep the two in sync.
 */
export const ticketCategoryValues = [
  "general_question",
  "technical_question",
  "refund_request",
] as const;

export type TicketCategory = (typeof ticketCategoryValues)[number];
