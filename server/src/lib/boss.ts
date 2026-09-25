import { PgBoss } from "pg-boss";

// Postgres-backed job queue — its tables live in this same database (schema
// `pgboss`, created automatically on `start()`), so no separate broker like
// Redis is needed.
export const boss = new PgBoss(process.env.DATABASE_URL!);
