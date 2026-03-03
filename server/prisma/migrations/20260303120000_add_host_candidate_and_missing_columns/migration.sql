-- add_host_candidate_and_missing_columns
-- Adds columns applied locally via `prisma db push` but not tracked in migrations.

-- ============================================================
-- 1. User: hostCandidate, consecutiveEvents, lastEventAt
-- ============================================================
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hostCandidate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "consecutiveEvents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastEventAt" TIMESTAMP(3);

-- ============================================================
-- 2. Comment: mentionedUserIds
-- ============================================================
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "mentionedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
