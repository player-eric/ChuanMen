-- Sync hostCount from actual Event table data (was never being incremented)
UPDATE "User" u
SET "hostCount" = sub.cnt
FROM (
  SELECT "hostId", COUNT(*)::int AS cnt
  FROM "Event"
  GROUP BY "hostId"
) sub
WHERE u.id = sub."hostId"
  AND u."hostCount" != sub.cnt;
