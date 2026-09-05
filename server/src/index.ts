import "./env";
import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { attachSession } from "./middleware/session";
import { authLimiter } from "./middleware/authLimiter";
import { errorHandler } from "./middleware/errorHandler";
import { usersRouter } from "./routes/users";
import { prisma } from "./db";

const app = express();
const port = process.env.PORT ?? 3000;

app.use(
  cors({
    origin: process.env.TRUSTED_ORIGINS,
    credentials: true,
  }),
);
app.all("/api/auth/*splat", authLimiter, toNodeHandler(auth));
app.use(express.json());
app.use(attachSession);

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "ok", db: "unreachable" });
  }
});

app.use("/api/users", usersRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
