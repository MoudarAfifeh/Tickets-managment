import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import { prisma } from "../db";

export const usersRouter = Router();

usersRouter.get("/", requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  res.json({ users });
});
