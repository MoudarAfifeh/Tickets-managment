/**
 * Ticket lifecycle status. Mirrors the `TicketStatus` enum in
 * `server/prisma/schema.prisma` — keep the two in sync.
 */
export type TicketStatus = "open" | "resolved" | "closed";
