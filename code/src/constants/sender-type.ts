/**
 * Who sent a `Reply`. Mirrors the `SenderType` enum in
 * `server/prisma/schema.prisma` — keep the two in sync.
 */
export const senderTypeValues = ["agent", "customer"] as const;

export type SenderType = (typeof senderTypeValues)[number];
