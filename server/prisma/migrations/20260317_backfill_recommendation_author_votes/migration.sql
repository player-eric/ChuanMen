-- Backfill: auto-vote by recommendation author for all existing recommendations
-- where the author hasn't already voted
INSERT INTO "RecommendationVote" (id, "recommendationId", "userId", "createdAt")
SELECT gen_random_uuid()::text, r.id, r."authorId", r."createdAt"
FROM "Recommendation" r
WHERE r."authorId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "RecommendationVote" rv
    WHERE rv."recommendationId" = r.id AND rv."userId" = r."authorId"
  );
