-- AlterTable
-- `resolvedByAi` was never part of any committed migration or schema.prisma
-- — it's an out-of-band column a since-abandoned experiment left on the
-- local dev database only. `IF EXISTS` makes this a no-op everywhere else
-- (test DB, CI, a fresh clone) while still cleaning it up there.
ALTER TABLE "ticket" DROP COLUMN IF EXISTS "resolvedByAi",
ALTER COLUMN "status" SET DEFAULT 'new';
