import { hashPassword } from "better-auth/crypto";
import { Role } from "../src/generated/prisma/enums";
import { prisma } from "../src/db";

async function seedCredentialUser({
  email,
  password,
  name,
  role,
}: {
  email: string;
  password: string;
  name: string;
  role: Role;
}) {
  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role },
    create: {
      email,
      name,
      role,
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

  console.log(`Seeded ${role} user: ${email}`);
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set in server/.env to seed the admin user",
    );
  }

  await seedCredentialUser({
    email,
    password,
    name: "Admin",
    role: Role.admin,
  });

  // Non-admin user, used by e2e tests to cover agent-role behavior (e.g.
  // RequireAdmin redirects, NavBar hiding the Users link). Optional so
  // regular dev seeding doesn't require it — only server/.env.test sets
  // these.
  const agentEmail = process.env.AGENT_EMAIL;
  const agentPassword = process.env.AGENT_PASSWORD;

  if (agentEmail && agentPassword) {
    await seedCredentialUser({
      email: agentEmail,
      password: agentPassword,
      name: "Agent",
      role: Role.agent,
    });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
