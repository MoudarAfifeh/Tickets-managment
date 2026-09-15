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

  // General questions
  {
    subject: "How do I cancel my subscription?",
    body: "I don't want to be charged next month, how do I cancel?",
    senderName: "Paulo Reyes",
    senderEmail: `paulo@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.general_question,
    daysAgo: 1,
  },
  {
    subject: "Can I merge two accounts into one?",
    body: "Ended up with two accounts under different emails, can you combine them?",
    senderName: "Quinn Foster",
    senderEmail: `quinn@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.general_question,
    daysAgo: 5,
  },
  {
    subject: "Where do I download my invoice?",
    body: "Need last month's invoice for expense reporting.",
    senderName: "Rosa Delgado",
    senderEmail: `rosa@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.resolved,
    category: TicketCategory.general_question,
    daysAgo: 8,
    assign: 0,
  },
  {
    subject: "How do I add a second user to my account?",
    body: "Want to give my coworker access to the dashboard.",
    senderName: "Sam Okafor",
    senderEmail: `sam@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.general_question,
    daysAgo: 2,
  },
  {
    subject: "Is there a mobile app for this?",
    body: "Would love to check tickets from my phone.",
    senderName: "Tara Lindqvist",
    senderEmail: `tara@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.closed,
    category: TicketCategory.general_question,
    daysAgo: 15,
  },
  {
    subject: "How do I change my notification preferences?",
    body: "Getting too many emails, want to reduce them.",
    senderName: "Umar Bello",
    senderEmail: `umar@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.general_question,
    daysAgo: 3,
    assign: 1,
  },
  {
    subject: "Do you offer student discounts?",
    body: "I'm a student and the price feels steep, any discounts available?",
    senderName: "Vera Kowalski",
    senderEmail: `vera@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.general_question,
    daysAgo: 0,
  },
  {
    subject: "How do I update my payment method?",
    body: "My card expired and I can't find where to update it.",
    senderName: "Wyatt Sanders",
    senderEmail: `wyatt@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.resolved,
    category: TicketCategory.general_question,
    daysAgo: 6,
    assign: 2,
  },
  {
    subject: "Can I pause my subscription instead of cancelling?",
    body: "Going on leave for two months, would rather pause than cancel.",
    senderName: "Ximena Torres",
    senderEmail: `ximena@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.general_question,
    daysAgo: 4,
  },
  {
    subject: "Where do I find my API key?",
    body: "Trying to integrate but can't locate the API key page.",
    senderName: "Yusuf Demir",
    senderEmail: `yusuf@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.general_question,
    daysAgo: 1,
    assign: 0,
  },
  {
    subject: "How do I delete my account permanently?",
    body: "I no longer need the service and want everything removed.",
    senderName: "Zara Malik",
    senderEmail: `zara@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.closed,
    category: TicketCategory.general_question,
    daysAgo: 20,
  },
  {
    subject: "Do you have a referral program?",
    body: "Wanted to refer a few coworkers, is there a reward for that?",
    senderName: "Aaron Blake",
    senderEmail: `aaron@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.general_question,
    daysAgo: 2,
  },

  // Technical questions
  {
    subject: "Search results are empty for common terms",
    body: "Searching for 'invoice' returns nothing even though I have matches.",
    senderName: "Bianca Rossi",
    senderEmail: `bianca@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.technical_question,
    daysAgo: 0,
    assign: 1,
  },
  {
    subject: "Dark mode toggle doesn't persist after refresh",
    body: "Every time I reload the page it resets to light mode.",
    senderName: "Caleb Nguyen",
    senderEmail: `caleb@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.technical_question,
    daysAgo: 1,
  },
  {
    subject: "Webhook deliveries are failing intermittently",
    body: "About 1 in 10 webhook calls never arrive on our end.",
    senderName: "Diana Popescu",
    senderEmail: `diana@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.technical_question,
    daysAgo: 0,
    assign: 2,
  },
  {
    subject: "Can't upload profile picture, spinner never stops",
    body: "Tried three different images, upload just spins forever.",
    senderName: "Ethan Brar",
    senderEmail: `ethan@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.resolved,
    category: TicketCategory.technical_question,
    daysAgo: 9,
    assign: 0,
  },
  {
    subject: "Timezone shown is wrong on the dashboard",
    body: "Everything is displayed three hours off from my local time.",
    senderName: "Fiona Walsh",
    senderEmail: `fiona@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.technical_question,
    daysAgo: 3,
  },
  {
    subject: "Bulk import fails silently on large CSVs",
    body: "Files over 5,000 rows just don't import, no error shown.",
    senderName: "Gabriel Souza",
    senderEmail: `gabriel@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.technical_question,
    daysAgo: 2,
    assign: 1,
  },
  {
    subject: "Session logs me out every few minutes",
    body: "Have to keep signing back in, very disruptive.",
    senderName: "Hana Yoshida",
    senderEmail: `hana@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.closed,
    category: TicketCategory.technical_question,
    daysAgo: 18,
  },
  {
    subject: "Charts fail to render on Safari",
    body: "Dashboard charts are just blank on Safari but fine on Chrome.",
    senderName: "Ivan Petrov",
    senderEmail: `ivan@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.technical_question,
    daysAgo: 1,
  },
  {
    subject: "Pagination breaks past page 5",
    body: "Clicking next stops working after the fifth page of results.",
    senderName: "Julia Kowalczyk",
    senderEmail: `julia@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.resolved,
    category: TicketCategory.technical_question,
    daysAgo: 11,
    assign: 2,
  },
  {
    subject: "Email notifications arrive hours late",
    body: "Getting alerts for things that happened 6+ hours ago.",
    senderName: "Kenji Watanabe",
    senderEmail: `kenji@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.technical_question,
    daysAgo: 0,
  },
  {
    subject: "Keyboard shortcuts stopped working after update",
    body: "None of the shortcuts respond since the last release.",
    senderName: "Layla Haddad",
    senderEmail: `layla@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.technical_question,
    daysAgo: 4,
    assign: 0,
  },
  {
    subject: "Data export times out for large accounts",
    body: "Export just hangs and eventually fails for our biggest workspace.",
    senderName: "Milo Andersson",
    senderEmail: `milo@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.technical_question,
    daysAgo: 2,
  },

  // Refund requests
  {
    subject: "Never received the item, want a refund",
    body: "Tracking shows delivered but nothing arrived.",
    senderName: "Nora Fitzgerald",
    senderEmail: `nora@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.refund_request,
    daysAgo: 3,
    assign: 1,
  },
  {
    subject: "Refund for accidental duplicate purchase",
    body: "Bought the same plan twice by mistake.",
    senderName: "Oscar Lindberg",
    senderEmail: `oscar@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.resolved,
    category: TicketCategory.refund_request,
    daysAgo: 5,
    assign: 0,
  },
  {
    subject: "Downgraded plan but still charged full price",
    body: "Switched to the basic plan last week but got billed the premium amount.",
    senderName: "Petra Novakova",
    senderEmail: `petra@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.refund_request,
    daysAgo: 1,
  },
  {
    subject: "Refund request — service was down all week",
    body: "Couldn't use the product for six days straight, want a partial refund.",
    senderName: "Quentin Marsh",
    senderEmail: `quentin@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.refund_request,
    daysAgo: 0,
    assign: 2,
  },
  {
    subject: "Charged after cancelling my trial",
    body: "Cancelled before the trial ended but still got charged.",
    senderName: "Ruby Simmons",
    senderEmail: `ruby@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.refund_request,
    daysAgo: 2,
  },
  {
    subject: "Item doesn't match the description, refund please",
    body: "What arrived is completely different from what was listed.",
    senderName: "Salim Rahman",
    senderEmail: `salim@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.closed,
    category: TicketCategory.refund_request,
    daysAgo: 14,
  },
  {
    subject: "Refund for annual plan, switching providers",
    body: "Moving to a different tool, would like a prorated refund.",
    senderName: "Talia Weiss",
    senderEmail: `talia@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.refund_request,
    daysAgo: 6,
    assign: 1,
  },
  {
    subject: "Double refund needed — billed in two currencies",
    body: "Somehow got charged in both USD and EUR for the same order.",
    senderName: "Umberto Conti",
    senderEmail: `umberto@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.refund_request,
    daysAgo: 1,
  },
  {
    subject: "Requesting refund, missed the return window by a day",
    body: "I know it's a day late but hoping for an exception.",
    senderName: "Vivian Cho",
    senderEmail: `vivian@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.resolved,
    category: TicketCategory.refund_request,
    daysAgo: 8,
    assign: 2,
  },
  {
    subject: "Refund for a gift subscription never activated",
    body: "Bought this as a gift and the recipient says it was never activated.",
    senderName: "Walter Ade",
    senderEmail: `walter@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.refund_request,
    daysAgo: 3,
  },
  {
    subject: "Charged for a plan I never selected",
    body: "My account shows a plan I don't remember choosing.",
    senderName: "Xiomara Reyes",
    senderEmail: `xiomara@${FAKE_TICKET_DOMAIN}`,
    status: TicketStatus.open,
    category: TicketCategory.refund_request,
    daysAgo: 0,
    assign: 0,
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
