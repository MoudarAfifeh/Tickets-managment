import { PgBoss } from "pg-boss";

// Postgres-backed job queue — its tables live in this same database (schema
// `pgboss`, created automatically on `start()`), so no separate broker like
// Redis is needed.
export const boss = new PgBoss(process.env.DATABASE_URL!);

// PgBoss is an EventEmitter: an unhandled "error" event (e.g. a dropped
// connection) is a thrown exception in Node/Bun and crashes the whole
// process. Required, not optional — see pg-boss's own README.
boss.on("error", (err) => {
  console.error("pg-boss error:", err);
});
