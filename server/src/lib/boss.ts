import * as Sentry from "@sentry/bun";
import { PgBoss } from "pg-boss";

// Postgres-backed job queue — its tables live in this same database (schema
// `pgboss`, created automatically on `start()`), so no separate broker like
// Redis is needed.
// Pool capped at 3 so it plus Prisma's pool (db.ts) stay under the 10
// connections `prisma dev` handles — see the comment in db.ts.
export const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL!,
  max: 3,
});

// PgBoss is an EventEmitter: an unhandled "error" event (e.g. a dropped
// connection) is a thrown exception in Node/Bun and crashes the whole
// process. Required, not optional — see pg-boss's own README.
boss.on("error", (err) => {
  Sentry.captureException(err);
  console.error("pg-boss error:", err);
});
