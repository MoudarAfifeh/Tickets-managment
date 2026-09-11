/**
 * Ticket category. Mirrors the `TicketCategory` enum in
 * `server/prisma/schema.prisma`. Same const-object + type shape as the
 * Prisma-generated `Role` enum.
 */
export const TicketCategory = {
  general_question: "general_question",
  technical_question: "technical_question",
  refund_request: "refund_request",
} as const;

export type TicketCategory =
  (typeof TicketCategory)[keyof typeof TicketCategory];
