-- Fix event timestamps: they were stored as Eastern Time values in UTC columns.
-- For timestamp (without timezone) columns, AT TIME ZONE 'America/New_York' interprets
-- the value as Eastern Time, then AT TIME ZONE 'UTC' extracts the UTC equivalent.
-- Example: stored 18:00 (actually 6PM ET) → becomes 22:00 (EDT) or 23:00 (EST)

UPDATE "Event"
SET "startsAt" = ("startsAt" AT TIME ZONE 'America/New_York') AT TIME ZONE 'UTC'
WHERE "startsAt" IS NOT NULL;

UPDATE "Event"
SET "endsAt" = ("endsAt" AT TIME ZONE 'America/New_York') AT TIME ZONE 'UTC'
WHERE "endsAt" IS NOT NULL;

UPDATE "Event"
SET "inviteDeadline" = ("inviteDeadline" AT TIME ZONE 'America/New_York') AT TIME ZONE 'UTC'
WHERE "inviteDeadline" IS NOT NULL;

UPDATE "Event"
SET "publishAt" = ("publishAt" AT TIME ZONE 'America/New_York') AT TIME ZONE 'UTC'
WHERE "publishAt" IS NOT NULL;
