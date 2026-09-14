/**
 * Ticket category. Mirrors the `TicketCategory` enum in
 * `server/prisma/schema.prisma` — keep the two in sync.
 */
export type TicketCategory =
  | "general_question"
  | "technical_question"
  | "refund_request";
