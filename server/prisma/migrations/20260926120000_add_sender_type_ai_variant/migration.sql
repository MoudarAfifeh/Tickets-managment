-- AlterEnum
-- Reconciles migration history with the dev database, where this value was
-- added out-of-band (via `db push`, not a migration) while building the
-- auto-resolve-ticket feature. schema.prisma has declared SenderType.ai
-- since that feature landed; this migration just records it properly.
ALTER TYPE "SenderType" ADD VALUE 'ai';
