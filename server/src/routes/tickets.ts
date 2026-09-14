import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { prisma } from "../db";

export const ticketsRouter = Router();

// Any signed-in user (admin or agent) can read tickets.
ticketsRouter.use(requireAuth);

const ticketListSelect = {
  id: true,
  subject: true,
  status: true,
  category: true,
  senderName: true,
  senderEmail: true,
  createdAt: true,
  assignedTo: { select: { id: true, name: true } },
} as const;

ticketsRouter.get("/", async (_req, res) => {
  const tickets = await prisma.ticket.findMany({
    select: ticketListSelect,
    orderBy: { createdAt: "desc" },
  });

  res.json({ tickets });
});
