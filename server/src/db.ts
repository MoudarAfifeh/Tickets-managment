import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// Pool sizes are capped so this pool plus pg-boss's (see lib/boss.ts) stay
// under 10 connections total — the most `prisma dev`'s embedded Postgres
// handles. Both pools default to 10 each, and going over that wedges the dev
// database (every connection then fails with "Connection terminated
// unexpectedly" until it's restarted).
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  max: 5,
});

export const prisma = new PrismaClient({ adapter });
