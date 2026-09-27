-- AlterEnum
-- This migration adds more than one value to an enum. Postgres can't use a
-- newly added enum value within the same transaction it was added in, so the
-- default-value change that uses 'new' lives in the next migration instead.
ALTER TYPE "TicketStatus" ADD VALUE 'new';
ALTER TYPE "TicketStatus" ADD VALUE 'processing';
