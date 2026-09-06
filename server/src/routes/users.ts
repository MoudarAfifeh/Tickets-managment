import { Router } from "express";
import { hashPassword } from "better-auth/crypto";
import { createUserSchema, editUserSchema } from "code";
import { requireAdmin } from "../middleware/requireAdmin";
import { requireAuth } from "../middleware/requireAuth";
import { parseBody } from "../lib/validateBody";
import { prisma } from "../db";
import { Role } from "../generated/prisma/enums";

export const usersRouter = Router();

// Every route under /api/users is admin-only.
usersRouter.use(requireAuth, requireAdmin);

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

usersRouter.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: userSelect,
    orderBy: { createdAt: "asc" },
  });

  res.json({ users });
});

usersRouter.post("/", async (req, res) => {
  const data = parseBody(createUserSchema, req, res);
  if (data === null) return;

  const { name, email, password } = data;

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

usersRouter.patch("/:id", async (req, res) => {
  const data = parseBody(editUserSchema, req, res);
  if (data === null) return;

  const { name, email, password } = data;
  const { id } = req.params;

  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const hashedPassword = password ? await hashPassword(password) : null;

  // A nonexistent id rejects with Prisma P2025 (404) and a colliding email
  // with P2002 (409); both are mapped to responses by errorHandler.
  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { name, email },
      select: userSelect,
    }),
    ...(hashedPassword
      ? [
          prisma.account.updateMany({
            where: { userId: id, providerId: "credential" },
            data: { password: hashedPassword },
          }),
        ]
      : []),
  ]);

  res.json({ user });
});
