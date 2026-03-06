-- Add creditsAwarded flag to Event to prevent double credit processing
ALTER TABLE "Event" ADD COLUMN "creditsAwarded" BOOLEAN NOT NULL DEFAULT false;

-- Update initial postcard credits from 2 to 4
ALTER TABLE "User" ALTER COLUMN "postcardCredits" SET DEFAULT 4;

-- Give existing users the extra 2 credits they missed
UPDATE "User" SET "postcardCredits" = "postcardCredits" + 2;
