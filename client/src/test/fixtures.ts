import type { TicketDetail } from "@/types/ticket";

// A ticket as returned by `GET /api/tickets/:id`, for the ticket-detail
// component and page tests. Pass overrides for the fields a test cares about.
export function makeTicket(overrides: Partial<TicketDetail> = {}): TicketDetail {
  return {
    id: "ticket-1",
    subject: "How do I reset my password?",
    body: "I can't find the reset link anywhere, can you help?",
    status: "open",
    category: "general_question",
    senderName: "Alice Turner",
    senderEmail: "alice@customer.example",
    assignedTo: null,
    replies: [],
    createdAt: "2026-09-15T07:15:13.668Z",
    updatedAt: "2026-09-15T07:15:13.668Z",
    ...overrides,
  };
}
