-- Capacity semantics change: from "max signups" to "max total people (including host)".
-- Increment all existing events' capacity by 1 so effective behavior stays the same.
UPDATE "Event" SET capacity = capacity + 1;
