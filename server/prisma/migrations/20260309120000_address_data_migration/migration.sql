-- Migrate existing location data into city field for users and events
-- that have location set but city is empty.
-- Does NOT drop the location column (backward compatibility).

UPDATE "User" SET "city" = "location" WHERE ("city" IS NULL OR "city" = '') AND "location" IS NOT NULL AND "location" != '';
UPDATE "Event" SET "city" = "location" WHERE ("city" IS NULL OR "city" = '') AND "location" IS NOT NULL AND "location" != '';

-- Backfill hostCandidate for users who have hosted at least one event.
-- Safe to re-run: only sets true where currently false, no-op if already true.
UPDATE "User" SET "hostCandidate" = true
WHERE "userStatus" = 'approved'
  AND "hostCandidate" = false
  AND "id" IN (SELECT DISTINCT "hostId" FROM "Event");
