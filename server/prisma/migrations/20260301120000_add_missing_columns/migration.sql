-- add_missing_columns
-- Adds columns that were applied locally via `prisma db push`
-- but never tracked in a migration for production.

-- ============================================================
-- 1. User: birthday + hideBirthday
-- ============================================================
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "birthday" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hideBirthday" BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 2. Event: recSelectionMode, recCategories, isPrivate
-- ============================================================
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "recSelectionMode" TEXT NOT NULL DEFAULT 'nominate';
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "recCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 3. EventRecommendation: linkedById, isSelected, isNomination
-- ============================================================
ALTER TABLE "EventRecommendation" ADD COLUMN IF NOT EXISTS "linkedById" TEXT;
ALTER TABLE "EventRecommendation" ADD COLUMN IF NOT EXISTS "isSelected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EventRecommendation" ADD COLUMN IF NOT EXISTS "isNomination" BOOLEAN NOT NULL DEFAULT false;

-- Foreign key for linkedById → User
ALTER TABLE "EventRecommendation" DROP CONSTRAINT IF EXISTS "EventRecommendation_linkedById_fkey";
ALTER TABLE "EventRecommendation" ADD CONSTRAINT "EventRecommendation_linkedById_fkey"
  FOREIGN KEY ("linkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
