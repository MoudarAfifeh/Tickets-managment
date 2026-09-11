/**
 * Ticket lifecycle status. Mirrors the `TicketStatus` enum in
 * `server/prisma/schema.prisma`. Same const-object + type shape as the
 * Prisma-generated `Role` enum.
 */
export const TicketStatus = {
  open: "open",
  resolved: "resolved",
  closed: "closed",
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];
