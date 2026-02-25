-- 0002_email_system
-- Email system, UserPreference restructure, Event tag→tags, EventPhase live→closed

-- ============================================================
-- 1. Create EmailState enum (replaces PushFrequency)
-- ============================================================
CREATE TYPE "EmailState" AS ENUM ('active', 'weekly', 'stopped', 'unsubscribed');

-- ============================================================
-- 2. Alter UserPreference: drop old columns, add new ones
-- ============================================================

-- Add new columns with defaults (safe for existing rows)
ALTER TABLE "UserPreference" ADD COLUMN "emailState" "EmailState" NOT NULL DEFAULT 'active';
ALTER TABLE "UserPreference" ADD COLUMN "unopenedStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserPreference" ADD COLUMN "lastDailySentAt" TIMESTAMP(3);
ALTER TABLE "UserPreference" ADD COLUMN "notifyEvents" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserPreference" ADD COLUMN "notifyCards" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserPreference" ADD COLUMN "notifyOps" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserPreference" ADD COLUMN "notifyAnnounce" BOOLEAN NOT NULL DEFAULT true;

-- Drop old columns
ALTER TABLE "UserPreference" DROP COLUMN "pushEmail";
ALTER TABLE "UserPreference" DROP COLUMN "pushFrequency";

-- Drop old enum (no longer referenced)
DROP TYPE "PushFrequency";

-- ============================================================
-- 3. EventPhase: rename 'live' → 'closed'
--    PostgreSQL cannot rename enum values directly before v10,
--    so we recreate the enum type.
-- ============================================================

-- Create new enum
CREATE TYPE "EventPhase_new" AS ENUM ('invite', 'open', 'closed', 'ended', 'cancelled');

-- Drop the default before changing type
ALTER TABLE "Event"
  ALTER COLUMN "phase" DROP DEFAULT;

-- Migrate existing data: any 'live' rows become 'closed'
ALTER TABLE "Event"
  ALTER COLUMN "phase" TYPE TEXT;

UPDATE "Event" SET "phase" = 'closed' WHERE "phase" = 'live';

ALTER TABLE "Event"
  ALTER COLUMN "phase" TYPE "EventPhase_new" USING "phase"::"EventPhase_new";

ALTER TABLE "Event"
  ALTER COLUMN "phase" SET DEFAULT 'invite'::"EventPhase_new";

-- Drop old enum, rename new one
DROP TYPE "EventPhase";
ALTER TYPE "EventPhase_new" RENAME TO "EventPhase";

-- ============================================================
-- 4. Event: convert single 'tag' column to 'tags' array
-- ============================================================

-- Add new array column
ALTER TABLE "Event" ADD COLUMN "tags" "EventTag"[] DEFAULT ARRAY['other']::"EventTag"[];

-- Migrate existing data: copy single tag into array
UPDATE "Event" SET "tags" = ARRAY["tag"];

-- Drop old single column
ALTER TABLE "Event" DROP COLUMN "tag";

-- ============================================================
-- 5. EventSignup: add lastReminderSentAt + new index
-- ============================================================

ALTER TABLE "EventSignup" ADD COLUMN "lastReminderSentAt" TIMESTAMP(3);

CREATE INDEX "EventSignup_userId_invitedAt_idx" ON "EventSignup"("userId", "invitedAt");

-- ============================================================
-- 6. Create EmailRule table
-- ============================================================

CREATE TABLE "EmailRule" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "cooldownDays" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailRule_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- 7. Create EmailTemplate table
-- ============================================================

CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL DEFAULT 'default',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailTemplate_ruleId_variantKey_key" ON "EmailTemplate"("ruleId", "variantKey");

-- ============================================================
-- 8. Create EmailLog table
-- ============================================================

CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "refId" TEXT,
    "messageId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "EmailLog_userId_ruleId_sentAt_idx" ON "EmailLog"("userId", "ruleId", "sentAt" DESC);
CREATE INDEX "EmailLog_userId_sentAt_idx" ON "EmailLog"("userId", "sentAt" DESC);
