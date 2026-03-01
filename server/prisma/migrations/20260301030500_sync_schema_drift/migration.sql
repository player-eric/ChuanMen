-- sync_schema_drift
-- Captures all schema changes applied via `prisma db push` locally
-- but not yet tracked in migrations for production.

-- ============================================================
-- 1. Enum: Add 'external_event' to RecommendationCategory
-- ============================================================
ALTER TYPE "RecommendationCategory" ADD VALUE IF NOT EXISTS 'external_event';

-- ============================================================
-- 2. Enum: Add 'announced' to UserStatus
-- ============================================================
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'announced' BEFORE 'approved';

-- ============================================================
-- 3. Enum: Add 'user' and 'recommendation' to InteractionEntityType
-- ============================================================
ALTER TYPE "InteractionEntityType" ADD VALUE IF NOT EXISTS 'user';
ALTER TYPE "InteractionEntityType" ADD VALUE IF NOT EXISTS 'recommendation';

-- ============================================================
-- 4. User: Add missing columns
-- ============================================================
ALTER TABLE "User" ADD COLUMN "subscribeNewsletter" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "announcedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "announcedEndAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "approvedAt" TIMESTAMP(3);

-- ============================================================
-- 5. Event: Drop selectedMovieId column (replaced by MovieScreening)
-- ============================================================

-- Drop foreign key first
ALTER TABLE "Event" DROP CONSTRAINT IF EXISTS "Event_selectedMovieId_fkey";

-- Drop column
ALTER TABLE "Event" DROP COLUMN IF EXISTS "selectedMovieId";

-- ============================================================
-- 6. Create RecommendationVote table
-- ============================================================
CREATE TABLE "RecommendationVote" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationVote_recommendationId_userId_key" ON "RecommendationVote"("recommendationId", "userId");

-- AddForeignKey
ALTER TABLE "RecommendationVote" ADD CONSTRAINT "RecommendationVote_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationVote" ADD CONSTRAINT "RecommendationVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 7. Create EventRecommendation table
-- ============================================================
CREATE TABLE "EventRecommendation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventRecommendation_eventId_recommendationId_key" ON "EventRecommendation"("eventId", "recommendationId");

-- CreateIndex
CREATE INDEX "EventRecommendation_eventId_idx" ON "EventRecommendation"("eventId");

-- CreateIndex
CREATE INDEX "EventRecommendation_recommendationId_idx" ON "EventRecommendation"("recommendationId");

-- AddForeignKey
ALTER TABLE "EventRecommendation" ADD CONSTRAINT "EventRecommendation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRecommendation" ADD CONSTRAINT "EventRecommendation_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 8. Drop DoubanCache (recreated in 050758 migration, no longer in schema)
-- ============================================================
DROP TABLE IF EXISTS "DoubanCache";
