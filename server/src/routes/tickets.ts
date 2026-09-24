import { Router } from "express";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import {
  assignTicketSchema,
  createReplySchema,
  polishReplySchema,
  ticketListQuerySchema,
  updateTicketCategorySchema,
  updateTicketStatusSchema,
} from "code";
import { requireAuth } from "../middleware/requireAuth";
import { requireOpenAiKey } from "../middleware/requireOpenAiKey";
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

// Shared by GET /:id and the reply/assign/status/category mutations below,
// all of which respond with the full ticket detail (including its reply
// thread) so the client can replace its cached copy in one round-trip.
const ticketDetailInclude = {
  assignedTo: { select: { id: true, name: true } },
  replies: {
    select: {
      id: true,
      body: true,
      senderType: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  },
} as const;

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
    include: ticketDetailInclude,
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
    include: ticketDetailInclude,
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
    include: ticketDetailInclude,
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
    include: ticketDetailInclude,
  });

  res.json({ ticket: updated });
});

// Only signed-in agents post through here, so this always creates a
// senderType: "agent" reply — a "customer" reply has no client-facing
// producer yet (see server/src/routes/webhooks.ts).
ticketsRouter.post("/:id/replies", async (req, res) => {
  const data = parseBody(createReplySchema, req, res);
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

  await prisma.reply.create({
    data: {
      ticketId: id,
      senderType: "agent",
      authorId: req.user!.id,
      body: data.body,
    },
  });

  const updated = await prisma.ticket.findUniqueOrThrow({
    where: { id },
    include: ticketDetailInclude,
  });

  res.status(201).json({ ticket: updated });
});

// Appended after the model's output rather than left to the model to write,
// so the agent's name and link always come through exactly as-is.
const SIGNATURE_URL = "https://moudar-afifeh.netlify.app/";

// Tickets created without a fromName (e.g. via the inbound-email webhook)
// have a null senderName — fall back to the email's local part rather than a
// generic "Customer" so the greeting still reads as personal.
function greetingNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] || email;
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

// Ticket-id-scoped so the greeting can address the ticket's own customer by
// name. Only this route needs requireOpenAiKey, so it's applied here rather
// than via ticketsRouter.use.
ticketsRouter.post("/:id/polish-reply", requireOpenAiKey, async (req, res) => {
  const data = parseBody(polishReplySchema, req, res);
  if (data === null) return;
  const id = requireParam("id", req, res);
  if (id === null) return;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { senderName: true, senderEmail: true },
  });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const { text } = await generateText({
    model: openai("gpt-5-nano"),
    instructions:
      "You are an assistant that polishes support-agent replies to customers. " +
      "Improve grammar, clarity, and tone while keeping the meaning, facts, and " +
      "intent unchanged. Keep it concise and professional. Respond with only the " +
      "polished reply text — no preamble, explanation, or surrounding quotes. " +
      "Do not add a greeting or a signature/sign-off of your own — one is appended separately.",
    prompt: data.body,
  });

  const greetingName =
    ticket.senderName ?? greetingNameFromEmail(ticket.senderEmail);
  const signed = `Dear ${greetingName},\n\n${text}\n\n${req.user!.name}\nBest regards\n\n${SIGNATURE_URL}`;

  res.json({ body: signed });
});

// Summarizes the ticket's own message plus its full reply thread. No
// request body — the ticket id is all the input this needs. Not persisted:
// the client re-calls this whenever the thread changes (see TicketSummary.tsx).
ticketsRouter.post("/:id/summarize", requireOpenAiKey, async (req, res) => {
  const id = requireParam("id", req, res);
  if (id === null) return;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      replies: {
        select: {
          body: true,
          senderType: true,
          author: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const customerName =
    ticket.senderName ?? greetingNameFromEmail(ticket.senderEmail);
  const conversation = [
    `${customerName} (customer): ${ticket.body}`,
    ...ticket.replies.map((reply) =>
      reply.senderType === "agent"
        ? `${reply.author?.name ?? "Agent"} (agent): ${reply.body}`
        : `${customerName} (customer): ${reply.body}`,
    ),
  ].join("\n\n");

  const { text } = await generateText({
    model: openai("gpt-5-nano"),
    instructions:
      "You are an assistant that summarizes support ticket conversations for " +
      "agents. Write a concise summary (2-4 sentences) covering the customer's " +
      "issue and the current state of the conversation. Respond with only the " +
      "summary text — no preamble, headings, or bullet points.",
    prompt: conversation,
  });

  res.json({ summary: text });
});
