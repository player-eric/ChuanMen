-- Fix postcard credits: the creditsAwarded column was added with default false,
-- causing the agent to re-award credits for all historical events.
-- This migration recalculates credits from scratch for every user.

-- Step 1: Mark all started non-cancelled events as creditsAwarded
UPDATE "Event"
SET "creditsAwarded" = true
WHERE "startsAt" <= NOW()
  AND "phase" != 'cancelled';

-- Step 2: Recalculate postcardCredits for every user
-- Only count events from March 2026 onwards (when credit system launched)
-- Formula: 4 (base) + 2 per attended event + 4 extra per hosted event - postcards sent
WITH attend_credits AS (
  -- +2 for each event attended (accepted signup, event started, not cancelled, at least 2 participants)
  SELECT es."userId", COUNT(DISTINCT es."eventId") * 2 AS credits
  FROM "EventSignup" es
  JOIN "Event" e ON e."id" = es."eventId"
  WHERE es."status" = 'accepted'
    AND e."startsAt" >= '2026-03-01'
    AND e."startsAt" <= NOW()
    AND e."phase" != 'cancelled'
    AND (
      SELECT COUNT(*) FROM "EventSignup" es2
      WHERE es2."eventId" = e."id" AND es2."status" = 'accepted'
    ) >= 2
  GROUP BY es."userId"
),
host_credits AS (
  -- +4 extra for each event hosted (event started, not cancelled, at least 1 participant besides host)
  SELECT e."hostId" AS "userId", COUNT(*) * 4 AS credits
  FROM "Event" e
  WHERE e."startsAt" >= '2026-03-01'
    AND e."startsAt" <= NOW()
    AND e."phase" != 'cancelled'
    AND (
      SELECT COUNT(*) FROM "EventSignup" es
      WHERE es."eventId" = e."id" AND es."status" = 'accepted' AND es."userId" != e."hostId"
    ) >= 1
  GROUP BY e."hostId"
),
cards_sent AS (
  SELECT "fromId" AS "userId", COUNT(*) AS cnt
  FROM "Postcard"
  GROUP BY "fromId"
)
UPDATE "User" u
SET "postcardCredits" = 4
  + COALESCE((SELECT credits FROM attend_credits ac WHERE ac."userId" = u."id"), 0)
  + COALESCE((SELECT credits FROM host_credits hc WHERE hc."userId" = u."id"), 0)
  - COALESCE((SELECT cnt FROM cards_sent cs WHERE cs."userId" = u."id"), 0);

-- Ensure no negative credits
UPDATE "User" SET "postcardCredits" = 0 WHERE "postcardCredits" < 0;
