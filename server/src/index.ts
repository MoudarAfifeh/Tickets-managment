import "./env";
import "./instrument";
import path from "node:path";
import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { attachSession } from "./middleware/session";
import { authLimiter } from "./middleware/authLimiter";
import { errorHandler } from "./middleware/errorHandler";
import { usersRouter } from "./routes/users";
import { ticketsRouter } from "./routes/tickets";
import { webhooksRouter } from "./routes/webhooks";
import { prisma } from "./db";
import { boss } from "./lib/boss";
import { startClassifyTicketWorker } from "./lib/classifyTicket";
import { startAutoResolveTicketWorker } from "./lib/autoResolveTicket";

const app = express();
const port = process.env.PORT ?? 3000;
const isProduction = process.env.NODE_ENV === "production";

// In production (Railway) every request arrives through one reverse-proxy
// hop. Trusting it makes req.ip the real client address — express-rate-limit
// keys on that (and errors on an untrusted X-Forwarded-For) — and makes
// req.protocol "https".
if (isProduction) {
  app.set("trust proxy", 1);
}

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
app.use("/api/tickets", ticketsRouter);
app.use("/api/webhooks", webhooksRouter);

// Unknown API routes get a JSON 404 rather than falling through to the
// client app below.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// In production the API also serves the built client (client/dist, from
// `bun run --cwd client build`), so the app and API share one origin — no
// CORS or cross-site cookies for Better Auth. Any non-API path gets
// index.html so client-side routes like /tickets/:id survive a reload. In
// dev, Vite serves the client and proxies /api here instead.
if (isProduction) {
  const clientDist = path.join(import.meta.dir, "../../client/dist");
  app.use(express.static(clientDist, { index: false }));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use(errorHandler);

await boss.start();
await startClassifyTicketWorker();
await startAutoResolveTicketWorker();

const server = app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});

// Railway sends SIGTERM before replacing a deployment. Stop taking requests,
// let pg-boss finish in-flight jobs, then release the database connections.
async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close();
  await boss.stop({ graceful: true, timeout: 20_000 });
  await prisma.$disconnect();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
