import { Router } from "express";
import { hashPassword } from "better-auth/crypto";
import { createUserSchema } from "code";
import { requireAdmin } from "../middleware/requireAdmin";
import { prisma } from "../db";
import { Role } from "../generated/prisma/enums";

export const usersRouter = Router();

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

usersRouter.get("/", requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: userSelect,
    orderBy: { createdAt: "asc" },
  });

  res.json({ users });
});

usersRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    });
    return;
  }

  const { name, email, password } = parsed.data;

  const hashedPassword = await hashPassword(password);
  const userId = crypto.randomUUID();

  // A duplicate email rejects with Prisma P2002; Express 5 forwards it to
  // errorHandler, which turns it into a 409.
  const [user] = await prisma.$transaction([
    prisma.user.create({
      data: { id: userId, email, name, role: Role.agent, emailVerified: true },
      select: userSelect,
    }),
    prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        providerId: "credential",
        accountId: userId,
        userId,
        password: hashedPassword,
      },
    }),
  ]);

  res.status(201).json({ user });
});
