import type { SenderType, TicketCategory, TicketStatus } from "code";

export type Reply = {
  id: string;
  body: string;
  senderType: SenderType;
  createdAt: string;
  // Only set for senderType "agent" — a "customer" reply's sender is the
  // ticket's own senderName/senderEmail.
  author: { id: string; name: string } | null;
};

// Shape of `GET /api/tickets/:id`, which the assign/status/category PATCH
// endpoints and `POST /api/tickets/:id/replies` also return in full. Every
// ticket-detail component (TicketDetails, Replies, ReplyForm, UpdateTicket)
// takes this whole object as its `ticket` prop.
export type TicketDetail = {
  id: string;
  subject: string;
  body: string;
  status: TicketStatus;
  category: TicketCategory;
  senderName: string | null;
  senderEmail: string;
  assignedTo: { id: string; name: string } | null;
  replies: Reply[];
  createdAt: string;
  updatedAt: string;
};
