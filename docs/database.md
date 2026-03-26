# Database

## Prisma Workflow

- `server/prisma/schema.prisma` is the **source of truth** for DB types (45+ models)
- `server/prisma.config.ts` — Prisma 6 config file (`earlyAccess: true`)
- Always `npx prisma validate` before migrating
- After schema changes: `npx prisma generate` to regenerate client
- Local dev: Docker Postgres via `docker compose up -d` in server/
- Use `npx prisma db push` for quick local schema sync (no migration file)
- Use `npx prisma migrate dev --name <name>` for production-tracked migrations
- Production migrations are in `server/prisma/migrations/` (10+ tracked migrations)

## CRITICAL: Backward Compatibility

**NEVER make changes that lose existing data.** All schema changes MUST use additive migrations (ADD COLUMN with defaults, never DROP COLUMN without explicit user approval). Capacity semantics change (from "max signups" to "total people including host") was handled by incrementing all existing events' capacity by 1 in migration SQL. Always think about existing data impact before making changes.

## Schema Overview

Key models (45+ total in `schema.prisma`):

| Model | Purpose |
|-------|---------|
| `User` | Member with profile, counters, privacy flags (`hideEmail`, `hideActivity`, `hideStats`, `hideBirthday`, `hiddenTitleIds`), `googleId` (OAuth), `subscribeNewsletter`, `announcedAt`/`announcedEndAt` (introduction period), `hostCandidate` (lottery pool), `consecutiveEvents`, `lastEventAt`, `birthday`, `membershipStatus`, `lastActiveAt` |
| `UserPreference` | Email state, notification toggles, `mutedGoals` |
| `UserSocialTitle` | Earned titles per user |
| `UserOperatorRole` | Admin-assigned operator roles |
| `UserMutedGoal` | Muted goal tracking per user |
| `Event` | Activity with phases (invite/open/closed/live/ended/cancelled), tags, capacity, `isWeeklyLotteryEvent`, `inviteDeadline`, `recSelectionMode`, `recCategories`, `isHomeEvent`, `locationPrivate`, `isPrivate` |
| `EventSignup` | Signup status lifecycle (invited/accepted/waitlist/offered/rejected/declined/cancelled). 24h offer auto-expiry via cron. `checkedInAt`, `lastReminderSentAt` |
| `EventTask` | Per-event task with role, description, claimable by members, `isCustom` for volunteer tasks |
| `EventCoHost` | Co-host assignment |
| `EventVisibilityExclusion` | Host "invisible list" for events |
| `Movie` | Movie pool entry (candidate/screened) |
| `MovieVote` / `MovieScreening` | Votes and screening linkage to events |
| `Proposal` / `ProposalVote` | Activity proposals with voting |
| `Postcard` / `PostcardTag` | Thank-you cards with tags and event context |
| `PostcardPurchase` | Stripe purchase record (schema-only, not yet implemented) |
| `Recommendation` / `RecommendationTag` | Multi-category recommendations (movies, books, recipes, places, music, external_event) |
| `RecommendationVote` | Voting on recommendations (unique per user+recommendation) |
| `EventRecommendation` | Join model linking recommendations to events |
| `Comment` | Polymorphic comments (movie/event/proposal/discussion/user), `mentionedUserIds` for @mentions |
| `Like` | Polymorphic likes (movie/event/proposal/user) |
| `Announcement` | Milestones, host tributes, community announcements |
| `WeeklyLottery` | Weekly host draw: `weekKey` (unique), `weekNumber`, `drawnMemberId`, `status` (pending/accepted/completed/skipped), `eventId` |
| `TitleRule` | Title definitions with emoji, stamp, threshold |
| `TaskPreset` | Per-event-type task templates |
| `EmailRule` / `EmailTemplate` / `EmailLog` / `EmailQueue` | Email notification engine |
| `Newsletter` | Newsletter drafts and sent items |
| `SiteConfig` | Key-value configuration store |
| `MediaAsset` | S3 media tracking |
| `LoginCode` | Email verification codes |
| `Seed` / `SeedCollaborator` / `SeedUpdate` / `SeedUpdateMedia` | "种子" project tracking (schema-only, no routes yet) |
| `ExperimentPairing` | Co-pairing experiment (schema-only, no routes yet) |
