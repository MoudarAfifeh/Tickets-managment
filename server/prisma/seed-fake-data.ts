import { hashPassword } from "better-auth/crypto";
import {
  Role,
  TicketCategory,
  TicketStatus,
} from "../src/generated/prisma/enums";
import { prisma } from "../src/db";

/**
 * Dev-only convenience data: a handful of agent users and a batch of varied
 * tickets, so the ticket list / users page have something to look at
 * locally. Separate from `seed.ts` (which only bootstraps the real
 * admin/agent credentials from env) — not wired into `prisma db seed`, so a
 * `prisma migrate reset` won't regenerate it and the e2e test database never
 * runs it.
 *
 * Safe to re-run: agents are upserted by email, and fake tickets are
 * recognized by their `@customer.example` sender domain and replaced (not
 * duplicated) each time.
 *
 * Run with: `bun run db:seed:fake` (from server/)
 */

const FAKE_TICKET_DOMAIN = "customer.example";
const FAKE_AGENT_PASSWORD = "password123";

const FAKE_AGENTS = [
  { email: "priya@agents.example", name: "Priya Nair" },
  { email: "marcus@agents.example", name: "Marcus Chen" },
  { email: "jordan@agents.example", name: "Jordan Lee" },
];

const FAKE_TICKETS: Array<{
  subject: string;
  body: string;
  senderName: string | null;
  senderEmail: string;
  status: TicketStatus;
  category: TicketCategory;
  daysAgo: number;
  assign?: number; // index into FAKE_AGENTS; omit for unassigned
}> = [
  // General questions
  {
    subject: "How do I reset my password?",
    body: "I can't find the reset link anywhere, can you help?",
    senderName: "Alice Turner",
    senderEmail: `alice@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.general_question,
    daysAgo: 0,
  },
  {
    subject: "Where can I view my order history?",
    body: "Looking for past orders, don't see an option in my account.",
    senderName: "Ben Ortiz",
    senderEmail: `ben@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.resolved,
    category: TicketCategory.general_question,
    daysAgo: 4,
    assign: 0,
  },
  {
    subject: "What are your support hours?",
    body: "Just wondering when I can reach a human.",
    senderName: null,
    senderEmail: `carla@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.closed,
    category: TicketCategory.general_question,
    daysAgo: 9,
  },
  {
    subject: "How do I update my billing address?",
    body: "Moved recently and need to change the address on file.",
    senderName: "Derek Wu",
    senderEmail: `derek@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.general_question,
    daysAgo: 1,
    assign: 1,
  },
  {
    subject: "Can I change my account email?",
    body: "Want to switch to a new email address for login.",
    senderName: "Elena Petrova",
    senderEmail: `elena@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.general_question,
    daysAgo: 2,
  },

  // Technical questions
  {
    subject: "App crashes when uploading a file",
    body: "Every time I attach a PDF over 5MB the app just closes.",
    senderName: "Farah Haddad",
    senderEmail: `farah@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.technical_question,
    daysAgo: 0,
    assign: 1,
  },
  {
    subject: "API returns 500 on POST /orders",
    body: "Started happening this morning, worked fine yesterday.",
    senderName: "Grace Kim",
    senderEmail: `grace@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.technical_question,
    daysAgo: 0,
    assign: 2,
  },
  {
    subject: "Login page stuck on loading spinner",
    body: "Chrome and Firefox both hang after entering credentials.",
    senderName: "Hassan Ali",
    senderEmail: `hassan@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.resolved,
    category: TicketCategory.technical_question,
    daysAgo: 6,
    assign: 0,
  },
  {
    subject: "Export to CSV produces corrupted file",
    body: "Opening the exported file in Excel shows garbled characters.",
    senderName: "Ingrid Larsen",
    senderEmail: `ingrid@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.closed,
    category: TicketCategory.technical_question,
    daysAgo: 12,
    assign: 2,
  },
  {
    subject: "Two-factor codes never arrive",
    body: "SMS codes aren't coming through, tried three times.",
    senderName: "Jamal Brooks",
    senderEmail: `jamal@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.technical_question,
    daysAgo: 3,
  },

  // Refund requests
  {
    subject: "Requesting refund for duplicate charge",
    body: "I was billed twice for the same order, please refund one.",
    senderName: "Karen Silva",
    senderEmail: `karen@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.refund_request,
    daysAgo: 1,
    assign: 0,
  },
  {
    subject: "Product arrived damaged, want refund",
    body: "The box was crushed in shipping and the item inside is broken.",
    senderName: "Liam O'Connor",
    senderEmail: `liam@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.refund_request,
    daysAgo: 0,
  },
  {
    subject: "Charged twice for the same subscription",
    body: "My card shows two identical charges this month.",
    senderName: null,
    senderEmail: `mia@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.resolved,
    category: TicketCategory.refund_request,
    daysAgo: 7,
    assign: 1,
  },
  {
    subject: "Refund request for cancelled order",
    body: "Cancelled within the window but haven't seen the refund yet.",
    senderName: "Noah Fischer",
    senderEmail: `noah@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.closed,
    category: TicketCategory.refund_request,
    daysAgo: 10,
    assign: 2,
  },
  {
    subject: "Wrong item shipped, need refund or exchange",
    body: "Ordered a medium, received a small — would like a refund.",
    senderName: "Olivia Bennett",
    senderEmail: `olivia@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.refund_request,
    daysAgo: 2,
  },
];

async function seedFakeAgents(): Promise<string[]> {
  const hashedPassword = await hashPassword(FAKE_AGENT_PASSWORD);
  const ids: string[] = [];

  for (const agent of FAKE_AGENTS) {
    const user = await prisma.user.upsert({
      where: { email: agent.email },
      update: { role: Role.agent, name: agent.name },
      create: {
        email: agent.email,
        name: agent.name,
        role: Role.agent,
        emailVerified: true,
      },
    });

    const existingAccount = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });

    if (existingAccount) {
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: { password: hashedPassword },
      });
    } else {
      await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          providerId: "credential",
          accountId: user.id,
          userId: user.id,
          password: hashedPassword,
        },
      });
    }

    ids.push(user.id);
  }

  console.log(
    `Seeded ${FAKE_AGENTS.length} fake agent user(s), password: "${FAKE_AGENT_PASSWORD}"`,
  );
  return ids;
}

async function seedFakeTickets(agentIds: string[]) {
  // Re-runnable: drop previously seeded fake tickets (recognized by sender
  // domain) instead of piling up duplicates.
  await prisma.ticket.deleteMany({
    where: { senderEmail: { endsWith: `@${FAKE_TICKET_DOMAIN}` } },
  });

  const now = Date.now();

  for (const ticket of FAKE_TICKETS) {
    await prisma.ticket.create({
      data: {
        subject: ticket.subject,
        body: ticket.body,
        senderName: ticket.senderName,
        senderEmail: ticket.senderEmail,
        status: ticket.status,
        category: ticket.category,
        assignedToId:
          ticket.assign !== undefined ? agentIds[ticket.assign] : null,
        createdAt: new Date(now - ticket.daysAgo * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`Seeded ${FAKE_TICKETS.length} fake ticket(s).`);
}

async function main() {
  const agentIds = await seedFakeAgents();
  await seedFakeTickets(agentIds);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
