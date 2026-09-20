import { z } from "zod";
import { ticketCategoryValues } from "../constants/ticket-category";
import { ticketStatusValues } from "../constants/ticket-status";

/**
 * Inbound support email as handed to `POST /api/webhooks/inbound-email`.
 * Provider-neutral: whatever forwards mail to us flattens its format into this
 * shape (no mail provider is wired yet).
 */
export const inboundEmailSchema = z.object({
  from: z.email(),
  fromName: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  bodyHtml: z.string().optional(),
});

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>;

/**
 * Columns `GET /api/tickets` can sort by. `assignedTo` sorts on the related
 * user's name.
 */
export const ticketSortFields = [
  "subject",
  "senderEmail",
  "category",
  "status",
  "assignedTo",
  "createdAt",
] as const;

export type TicketSortField = (typeof ticketSortFields)[number];

export const ticketListQuerySchema = z.object({
  sortBy: z.enum(ticketSortFields).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(ticketStatusValues).optional(),
  category: z.enum(ticketCategoryValues).optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;

/** Body for `PATCH /api/tickets/:id/assign`. `null` unassigns the ticket. */
export const assignTicketSchema = z.object({
  assignedToId: z.string().min(1).nullable(),
});

export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
