-- add_event_tasks
-- 1. New EventTask table for persistent task/role claiming
-- 2. Migrate TaskPreset.roles from TEXT[] to JSONB

-- ============================================================
-- 1. Create EventTask table
-- ============================================================
CREATE TABLE "EventTask" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "claimedById" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTask_pkey" PRIMARY KEY ("id")
);

-- Index for fast lookup by event
CREATE INDEX "EventTask_eventId_idx" ON "EventTask"("eventId");

-- Foreign keys
ALTER TABLE "EventTask" ADD CONSTRAINT "EventTask_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventTask" ADD CONSTRAINT "EventTask_claimedById_fkey"
  FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 2. Migrate TaskPreset.roles from TEXT[] to JSONB
-- ============================================================

-- Add a new JSONB column
ALTER TABLE "TaskPreset" ADD COLUMN "roles_new" JSONB NOT NULL DEFAULT '[]';

-- Migrate existing data: convert TEXT[] like {"选片","带零食"} to JSON [{"role":"选片","description":""},...]
UPDATE "TaskPreset"
SET "roles_new" = (
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('role', elem, 'description', '')),
    '[]'::jsonb
  )
  FROM unnest("roles") AS elem
);

-- Drop old column and rename new one
ALTER TABLE "TaskPreset" DROP COLUMN "roles";
ALTER TABLE "TaskPreset" RENAME COLUMN "roles_new" TO "roles";
