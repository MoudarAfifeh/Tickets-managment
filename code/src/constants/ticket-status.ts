/**
 * Ticket lifecycle status. Mirrors the `TicketStatus` enum in
 * `server/prisma/schema.prisma` — keep the two in sync.
 */
export const ticketStatusValues = ["open", "resolved", "closed"] as const;

export type TicketStatus = (typeof ticketStatusValues)[number];
