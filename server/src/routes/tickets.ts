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
  const { sortBy, sortOrder, status, category, search, page, pageSize } =
    parsed.data;

  const where: Prisma.TicketWhereInput = {
    ...(status && { status }),
    ...(category && { category }),
    ...(search && {
      OR: [
        { subject: { contains: search, mode: "insensitive" } },
        { senderName: { contains: search, mode: "insensitive" } },
        { senderEmail: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      select: ticketListSelect,
      where,
      orderBy: ticketOrderBy(sortBy, sortOrder),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({ tickets, total, page, pageSize });
});
