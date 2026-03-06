-- Ensure all existing users have at least 4 postcard credits
UPDATE "User" SET "postcardCredits" = 4 WHERE "postcardCredits" < 4;
