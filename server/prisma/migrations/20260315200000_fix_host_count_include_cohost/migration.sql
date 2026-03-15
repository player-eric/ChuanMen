-- Recalculate hostCount to include co-hosted events (previously only counted primary host)
UPDATE "User" u
SET "hostCount" = sub.total
FROM (
  SELECT u2.id,
    (SELECT COUNT(*) FROM "Event" e WHERE e."hostId" = u2.id)
    + (SELECT COUNT(*) FROM "EventCoHost" ec WHERE ec."userId" = u2.id) AS total
  FROM "User" u2
) sub
WHERE u.id = sub.id AND u."hostCount" != sub.total;
