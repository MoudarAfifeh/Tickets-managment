import { Router } from "express";
import {
  assignTicketSchema,
  ticketListQuerySchema,
  updateTicketCategorySchema,
  updateTicketStatusSchema,
} from "code";
import { requireAuth } from "../middleware/requireAuth";
import { parseBody } from "../lib/validateBody";
import { requireParam } from "../lib/requireParam";
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

// Any signed-in user can assign tickets, so this can't reuse the admin-only
// GET /api/users — it's a minimal id/name listing scoped to what the assign
// dropdown needs. Registered before GET /:id so "assignees" isn't swallowed
// by the :id param.
ticketsRouter.get("/assignees", async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  res.json({ users });
});

ticketsRouter.get("/:id", async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  res.json({ ticket });
});

ticketsRouter.patch("/:id/assign", async (req, res) => {
  const data = parseBody(assignTicketSchema, req, res);
  if (data === null) return;
  const id = requireParam("id", req, res);
  if (id === null) return;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  if (data.assignedToId !== null) {
    const assignee = await prisma.user.findUnique({
      where: { id: data.assignedToId },
      select: { deletedAt: true },
    });
    if (!assignee || assignee.deletedAt) {
      res.status(400).json({ error: "Assignee not found" });
      return;
    }
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: { assignedToId: data.assignedToId },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  res.json({ ticket: updated });
});

ticketsRouter.patch("/:id/status", async (req, res) => {
  const data = parseBody(updateTicketStatusSchema, req, res);
  if (data === null) return;
  const id = requireParam("id", req, res);
  if (id === null) return;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: { status: data.status },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  res.json({ ticket: updated });
});

ticketsRouter.patch("/:id/category", async (req, res) => {
  const data = parseBody(updateTicketCategorySchema, req, res);
  if (data === null) return;
  const id = requireParam("id", req, res);
  if (id === null) return;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: { category: data.category },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  res.json({ ticket: updated });
});
