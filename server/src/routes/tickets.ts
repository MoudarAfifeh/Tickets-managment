import { Router } from "express";
import { ticketListQuerySchema } from "code";
import { requireAuth } from "../middleware/requireAuth";
import { prisma } from "../db";
import { Prisma } from "../generated/prisma/client";

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

function ticketOrderBy(
  sortBy: string,
  sortOrder: "asc" | "desc",
): Prisma.TicketOrderByWithRelationInput {
  if (sortBy === "assignedTo") return { assignedTo: { name: sortOrder } };
  return { [sortBy]: sortOrder };
}

ticketsRouter.get("/", async (req, res) => {
  const parsed = ticketListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    });
    return;
  }
  const { sortBy, sortOrder } = parsed.data;

  const tickets = await prisma.ticket.findMany({
    select: ticketListSelect,
    orderBy: ticketOrderBy(sortBy, sortOrder),
  });

  res.json({ tickets });
});
