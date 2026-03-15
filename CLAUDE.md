# ChuanMen (串门儿) — Community Web Platform

NYC-based Chinese-language social community platform. Features: event management (movie nights, potlucks, hiking, etc.), movie/book/recipe/place recommendations with voting, thank-you postcards with credit system, activity proposals, member profiles with mutual experience tracking, title/badge system, email notification engine, and a full admin dashboard.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, React Router 7, MUI 7, TipTap (rich text), Tailwind CSS 3 |
| Build | Vite 6, TypeScript 5, SSR via `ssr-server.mjs` |
| Backend | Fastify 5, Prisma 6 (ORM), PostgreSQL 16, Zod (validation) |
| Email | Resend + MJML templates |
| Storage | AWS S3 (media uploads, MinIO locally) |
| Deploy | Render (Docker), `render.yaml` blueprint |

## Features

### User-Facing
- **Feed (动态流)** — Aggregated timeline of events, postcards, movies, proposals, milestones, announcements, recommendations, birthday cards. Time-based grouping. SpeedDial-style quick action buttons (发起活动, 提创意, 寄感谢卡, 推荐电影). **Personal notifications** (7 types: mention, event_invite, task_assign, postcard_received, waitlist_offered, waitlist_approved, proposal_realized). **Weekly lottery** status and accept/skip actions. Birthday cards for friends with mutual postcards.
- **Events (活动)** — Three-tab layout (即将到来 / 创意孵化中 / 过往活动). Two-phase invite system (invite → open → closed → ended). Waitlist with 24h offer mechanism (auto-expire via cron). **Task claiming system** (host creates tasks from presets, members claim/volunteer after signup via `TaskClaimDialog`). Host can manage invites, signups, movie selection, task assignment, recommendation linking. Per-event photo gallery. Supports private events, home events with private location.
- **Discover (发现/推荐)** — Unified multi-category browser (movies, books, recipes, music, places, external events). Tabbed view with external search (TMDB). Replaces separate category pages. Book detail page for book recommendations.
- **Proposals (活动提案)** — Submit and vote on activity ideas. Status lifecycle: discussing → scheduled → completed → cancelled. "我来组织" converts a proposal into an event.
- **Postcards (感谢卡)** — Three-step send flow (选人 → 写话 → 预览寄出). Privacy modes (public/private). Credit-based system: 4 credits on registration, +2 per completed event for attendees, host gets +6 (+2 attend + 4 host bonus). Only awards if at least 1 participant besides host; cancelled/empty events don't count. Agent awards credits automatically via `creditsAwarded` flag on Event. Preset tag selection for quick messages.
- **Profile (我的页面)** — Participation stats, milestone timeline (成长足迹 via `MilestoneTimeline`), hosted events, movies, postcards sent/received.
- **Member Wall (成员墙)** — Gallery grid with cover photos, titles, host badges. Search by name/title. Member detail page with mutual experience tracking (共同活动, 共同品味, 互寄卡片).
- **About Page** — Hero section, community stats, 5 entry cards (成员, 串门原则, Host 手册, 串门来信, 关于我们), bottom beliefs, CTA for visitors.
- **Settings** — Profile editing, avatar/cover upload, host settings (house rules, address), notification preferences (email frequency, per-type toggles), privacy controls (hide email/activity/stats, birthday, title display control), card credit balance.
- **Apply** — Application form for new members with duplicate email/name checks. Google profile prefill (name/email/avatar) via router state. Newsletter subscription checkbox (default on). Submits `googleId` and `subscribeNewsletter` to backend.
- **Login** — Email verification code flow (send code → verify code) + Google One Tap sign-in. Walkthrough user for demo.
- **Weekly Lottery (小局抽签)** — Candidate pool opt-in (auto-nudge after 3 consecutive events). Monday auto-draw via cron. Drawn member sees accept/skip in feed. Accepted → creates event. History tracking per week.

### Admin Dashboard (12 pages, all connected to real API)
- **Dashboard** — Community stats overview
- **Members** — Three-tab layout (成员列表 / 待审核 / 介绍中). Application review with 3-day introduction period (内部公示期). Auto-approve via cron after announcement period. Full member table with filtering/search, operator role assignment, admin promotion
- **Events** — Event management with status filtering, bulk operations
- **Content** — Comment/postcard moderation
- **Cards** — Postcard management and admin deletion
- **Titles** — Title rule CRUD (emoji, stamp tag, threshold), grant/revoke per user
- **Task Presets** — Per-event-type task template management
- **Announcements** — Milestone/announcement/host-tribute publishing with pin control
- **Email** — Rule management, template editing with preview, send logs, queue management, bounce/suppression tracking, global config
- **Newsletters** — Draft/send/track newsletters
- **Community Info** — Rich text CMS for about page content (principles, host guide, letters, about)
- **Settings** — Site config key-value store, admin user management

### System Features
- **Host Milestone Badges** — Auto-computed from host count: 🏠 (1+), ⭐ (5+), 🔥 (10+), 👑 (20+). Displayed on member avatars.
- **Title System** — Admin-defined titles (emoji + stamp tag + threshold). Awarded based on postcard tag accumulation. Users can hide individual titles.
- **Email Engine** — Rule-based notification system with priority tiers, cooldown, templates, queue, bounce handling, suppression lists. Includes automated emails: unclaimed task reminders (44-52h before event), lottery draw notifications, consecutive events encouragement.
- **Agent/Cron** — `agentTick.ts` runs every 10 minutes for automated tasks: content automation, milestones, host tributes, waitlist offer expiry, announced user auto-approval, **weekly lottery draw (Mondays)**, **consecutive event tracking**.
- **Member Introduction Period (内部公示期)** — Admin moves applicant to "announced" status → 3-day introduction period → auto-approved by cron (or manual approve). Feed shows introducing/welcomed cards.
- **Waitlist System (等位机制)** — When event is full, new signups go to waitlist (FIFO). When a spot opens, next waitlisted user gets a 24h offer. Auto-expires via cron, promotes next in queue.
- **Event Task System** — Host creates tasks from presets (per event type). Members claim tasks after signup via `TaskClaimDialog`. Custom volunteer tasks supported. Unclaimed task email reminders 44-52h before event.
- **Weekly Lottery (小局抽签系统)** — Members opt into candidate pool (`hostCandidate`). Agent draws weekly on Mondays, sends notification email. Drawn member can accept (→ creates event) or skip (→ draw next). Tracks `consecutiveEvents` per user for nudging.
- **Activity Tracking** — `lastActiveAt` updated via `onRequest` hook (throttled to every 5 min per user). `consecutiveEvents` tracked when events end.
- **Media Upload** — Images routed through backend (`POST /api/media/upload`) to avoid S3 CORS issues. Supports avatar, cover, event photos.

## Project Structure

```
/                        # Root: Vite + SSR frontend
├── src/
│   ├── pages/           # 26+ user-facing pages (incl. DiscoverPage, BookDetailPage, AnnouncementPage)
│   ├── pages/admin/     # 12 admin pages (AdminXxxPage.tsx)
│   ├── components/      # Shared: PostCard, ScenePhoto, FeedItems, Atoms, RichTextEditor, EmptyState,
│   │                    #   FeedbackDialog, QuickActionDialog, TaskClaimDialog, MilestoneTimeline, etc.
│   ├── lib/
│   │   ├── domainApi.ts # ALL frontend→backend API calls (100+ functions)
│   │   ├── authApi.ts   # Auth API (walkthrough user bootstrap)
│   │   └── mappings.ts  # Shared enum↔label mappings (single source of truth)
│   ├── auth/AuthContext.tsx  # React context for user state (localStorage-based)
│   ├── hooks/           # useColors (theme-aware), useMediaUpload, useTaskPresets, useTitleDefs
│   ├── mock/            # Mock data (dead code — no longer imported by any page)
│   ├── layouts/         # AppLayout (user), AdminLayout (admin)
│   ├── router.tsx       # All routes + loader functions (data fetching + mapping)
│   ├── types.ts         # Shared frontend TypeScript types
│   ├── theme.ts         # Custom design tokens (cDark/cLight), fonts, gradient lookups
│   └── muiTheme.ts      # MUI theme (warm palette, dark mode support)
├── server/              # Backend (separate package.json)
│   ├── src_v2/
│   │   ├── routes/      # Top-level: feed, media, email, agent, health, profile, auth, admin
│   │   ├── modules/     # Domain modules, each with route.ts + service.ts + schema.ts
│   │   │   └── events|movies|postcards|users|proposals|comments|likes|
│   │   │       recommendations|about|title-rules|task-presets|newsletters|
│   │   │       site-config|lottery|event-tasks
│   │   ├── config/env.ts   # Env var validation (Zod, exits on missing required vars)
│   │   ├── emails/      # Email templates (MJML) + emailAutomation.ts
│   │   ├── agent/       # Content automation (milestones, host tributes, lottery draw)
│   │   └── workers/     # Cron jobs (agentTick.ts — runs every 10 min)
│   ├── tests/           # Vitest API tests (15 test files)
│   │   ├── setup.ts     # Test DB setup (chuanmen_test, prisma db push --force-reset)
│   │   ├── helpers.ts   # createTestApp, cleanDb, seed helpers
│   │   └── api/         # Test files: about, admin, auth, events, feed, health, etc.
│   ├── system-test/     # Docker Compose integration test env (MinIO for local S3)
│   └── prisma/
│       ├── schema.prisma  # Database schema (source of truth for all types, 45+ models)
│       ├── migrations/    # Production-tracked migrations (10+)
│       └── seed.ts        # Full seed script (Steps 0–12)
├── infra/               # AWS ECS Fargate deployment alternative (CloudFormation)
├── ssr-server.mjs       # SSR + API reverse proxy entry point
├── docs/                # Manual UI test guide (HTML + PDF)
└── render.yaml          # Render deployment blueprint
```

## Commands

### Frontend (from project root)
```bash
npm run dev              # SSR dev server (port 3000), proxies /api → localhost:4000
npm run dev:csr          # Client-side only Vite dev (no SSR)
npm run build            # Full production build (client + SSR + API)
npx tsc --noEmit         # Type-check frontend
```

### Backend (from server/)
```bash
cd server
npm run dev              # Fastify dev server (port 4000) with tsx watch
npm run check            # Type-check server (tsc --noEmit)
npm run test             # Run Vitest API tests (requires local Postgres)
npm run test:watch       # Run tests in watch mode
npm run db:local         # Switch .env symlink to local Docker Postgres
npm run db:dev           # Switch to dev Render DB
npm run db:prod          # Switch to prod Render DB (careful!)
npm run db:setup         # Docker up + db push + seed (one-shot local setup)
npm run system:test:up   # Start Docker Compose integration test env (MinIO + Postgres)
npm run system:test:down # Stop integration test env
npx prisma validate      # Validate schema before migrating
npx prisma migrate dev   # Create migration
npx prisma db push       # Push schema without migration (local dev)
npx prisma generate      # Regenerate Prisma Client after schema changes
npx prisma studio        # DB browser GUI
npx prisma db seed       # Run seed data
```

### Full Local Setup (first time)
```bash
# 1. Start local Postgres (Docker)
cd server && docker compose up -d

# 2. Switch to local DB
npm run db:local

# 3. Push schema + seed
npm run db:setup

# 4. Start backend
npm run dev

# 5. In another terminal, start frontend
cd .. && npm run dev
```

## API Architecture

All frontend API calls go through `src/lib/domainApi.ts` (100+ functions). No mock data is used — all pages connect to real backend endpoints.

### Backend Modules
| Module | Prefix | Key Endpoints |
|--------|--------|---------------|
| Users | `/api/users` | CRUD, apply, settings, admin list, approve/reject, announce (内部公示期), operator roles |
| Events | `/api/events` | CRUD, past/cancelled, photos, invite, signup, waitlist (approve/reject/offer/accept/decline), recommendation linking, check-in |
| Event Tasks | `/api/events/:eventId/tasks` | List, batch create, claim, unclaim, volunteer (custom task), update, delete |
| Movies | `/api/movies` | CRUD, vote, search, external search (TMDB) |
| Proposals | `/api/proposals` | CRUD, vote, search |
| Postcards | `/api/postcards` | CRUD, admin list/delete |
| Recommendations | `/api/recommendations` | List, search, create, edit, delete, vote (all categories) |
| Comments | `/api/comments` | CRUD, admin list (polymorphic: movie/event/proposal), @mentions (`mentionedUserIds`) |
| Likes | `/api/likes` | Toggle, list (polymorphic) |
| About | `/api/about` | Stats, content CRUD, announcements CRUD |
| Title Rules | `/api/title-rules` | CRUD, holders count, grant/revoke |
| Task Presets | `/api/task-presets` | CRUD per event type |
| Lottery | `/api/lottery` | Current draw, history, accept, skip, complete, update host candidate status |
| Newsletters | `/api/newsletters` | CRUD, send, stats |
| Site Config | `/api/config` | Key-value config store |

### Top-Level Routes
| Route | Purpose |
|-------|---------|
| `/api/feed` | Aggregated feed (events, postcards, movies, proposals, announcements, recommendations, birthdays, notifications, lottery) |
| `/api/profile` | Member profile with mutual computation |
| `/api/media` | Presign, confirm, upload, delete (S3) |
| `/api/email` | Rule engine, templates, logs, queue, bounces, suppressions |
| `/api/auth` | Send code, verify code, check email, Google OAuth login |
| `/api/agent` | Trigger agent tick |
| `/api/health` | Health check with DB ping |
| `/api/admin/stats` | Dashboard statistics |

## Auth System

- **Login (two methods)**:
  1. **Email verification code** — `POST /api/auth/send-code` → `POST /api/auth/verify-code`
  2. **Google One Tap** — `POST /api/auth/google` (verifies Google JWT, auto-binds `googleId`)
- Google login: if user exists (by `googleId` or `email`) and is `approved` → login. If not registered → returns `googleProfile` and frontend redirects to `/apply` with prefilled name/email/avatar.
- Google button only renders when `VITE_GOOGLE_CLIENT_ID` env var is set. Uses native GIS script (no npm dependency).
- User state stored in `localStorage` key `chuanmen.auth.user` (or `sessionStorage` if "remember me" is off)
- `AuthContext` provides `{ user, isRegistered, hydrated, setUser }`
- `hydrated` flag prevents UI flashing before auth resolves
- On first load with no stored user, auto-signs-in as a **walkthrough user** (`walkthrough-yuan-001`, role `admin`). The provider resolves the real DB ID via `getUserByEmail()`.
- IDs starting with `walkthrough-` are treated as demo; real IDs are CUID-length (>20 chars)
- **No JWT/session on backend** — API endpoints are unprotected. `PATCH /api/users/me/settings` uses a manual `x-user-id` header.
- Three roles: `admin`, `host`, `member` (string equality checks)
- `AdminLayout` hard-gates on `user.role === 'admin'`

## Theming (Two-Tier System)

### Tier 1: Custom Design Tokens (`src/theme.ts`)
- `cDark` / `cLight` — color token objects with keys: `bg`, `s1`, `s2`, `s3`, `line`, `text`, `text2`, `text3`, `warm`, `paper`, `ink`, `green`, `blue`, `red`, `stamp`, etc.
- `f` = system sans-serif (PingFang SC / Noto Sans SC), `hf` = serif (Georgia / Noto Serif SC)
- `posters` — gradient lookup for movie poster backgrounds
- `photos` — gradient lookup for event scene photo backgrounds
- **In components, use `useColors()` hook** (returns `cDark` or `cLight` based on current mode)
- `import { c } from '@/theme'` only for static/non-reactive contexts

### Tier 2: MUI Theme (`src/muiTheme.ts`)
- Primary: `#d4a574` (warm), Secondary: `#6f9d8f`
- Border radius: `12px`, buttons: `textTransform: 'none'`
- Dark mode is **default** on first load (persisted in `localStorage` key `chuanmen-color-mode`)
- Toggle via `useColorMode()` hook from `AppProviders.tsx`

## SSR Architecture

- **`ssr-server.mjs`**: Dev mode uses Vite middleware; prod mode forks Fastify as child process on port 4000
- **`entry-server.tsx`**: `renderToPipeableStream` with `onAllReady` (full render, not streaming), 10s abort timeout
- **`entry-client.tsx`**: Detects SSR (hydrates) vs CSR (creates root) automatically
- `domainApi.ts` detects `typeof window === 'undefined'` to use absolute `http://localhost:4000` for Node.js SSR fetches
- All `/api` requests are reverse-proxied to the backend in both dev and prod
- `<!--ssr-outlet-->` in `index.html` is replaced with rendered HTML

## Key Conventions

### IDs
All entity IDs are **strings** (CUID from Prisma). Mock data uses prefixed format: `evt-1`, `mov-1`, `prop-1`, `book-101`, `past-1`, etc.

### Path Alias
`@/` maps to `./src/` (in both `tsconfig.json` and `vite.config.ts`).

### Data Flow Pattern
1. `router.tsx` defines loaders that call `domainApi.ts` functions
2. Loaders transform raw API responses → frontend types via `mapApiMember()` etc., with `try/catch` returning empty fallbacks
3. Pages read data via `useLoaderData()` — must handle null/empty gracefully
4. All UI built with MUI components + `sx` prop (no custom CSS classes)

### Host Milestone Badges
Host count → badge emoji computed in `router.tsx` `hostMilestoneBadge()`:
- 1+ → 🏠, 5+ → ⭐, 10+ → 🔥, 20+ → 👑
- Displayed on avatars in member wall and member detail pages

### Mappings (`src/lib/mappings.ts`) — Single Source of Truth
Do NOT create local duplicates of these:
- `eventTagToScene` — DB EventTag → ScenePhoto component key
- `chineseTagToEventTag` — Chinese label → DB EventTag
- `eventTagToChinese` — DB EventTag → Chinese label
- `roleLabelMap` — DB role → Chinese display name

### Naming Conventions
- Card fields: `message` (not `msg`), `visibility: 'public' | 'private'` (not `priv`)
- UI text: **Chinese (Simplified)**. Code/comments: English or Chinese.

### Backend Module Pattern
Each domain in `server/src_v2/modules/<name>/`:
- `<name>.route.ts` — Fastify route handlers
- `<name>.service.ts` — Business logic (Prisma queries)
- `<name>.schema.ts` — Zod request/response schemas

### Prisma
- `server/prisma/schema.prisma` is the **source of truth** for DB types (45+ models)
- `server/prisma.config.ts` — Prisma 6 config file (`earlyAccess: true`)
- Always `npx prisma validate` before migrating
- After schema changes: `npx prisma generate` to regenerate client
- Local dev: Docker Postgres via `docker compose up -d` in server/
- Use `npx prisma db push` for quick local schema sync (no migration file)
- Use `npx prisma migrate dev --name <name>` for production-tracked migrations
- Production migrations are in `server/prisma/migrations/` (10+ tracked migrations)

### Responsive Layout
- Mobile ↔ Desktop breakpoint: `md` (900px)
- AppLayout: bottom tab bar (mobile) / 240px sidebar (desktop), content `maxWidth: 1100px`
- AdminLayout: overlay drawer (mobile) / permanent sidebar (desktop), content `maxWidth: 1200px`

### Shared Components
- `Atoms.tsx` — `Ava` (avatar with emoji badge, hue from `name.charCodeAt(0)*37%360`) and `AvaStack` (overlapping row)
- `ScenePhoto` / `Poster` — render gradient backgrounds from `theme.ts` lookups
- `FeedItems.tsx` — all feed card variants (FeedActivity, FeedCard, FeedMovie, FeedMilestone, FeedNewMember, FeedSmallGroup, FeedBirthday, FeedActionNotice, FeedCommentNotice, FeedRecommendation, etc.)
- `PostCard.tsx` — thank-you card component (props: `message`, `isPrivate`)
- `TaskClaimDialog.tsx` — post-signup dialog for claiming event tasks or volunteering custom ones
- `MilestoneTimeline.tsx` — "成长足迹" timeline on profile pages
- `ImageUpload.tsx` — reusable image upload with crop/preview
- `EmptyState.tsx` — consistent empty state placeholder across pages
- `FeedbackDialog.tsx` — user feedback/suggestion submission dialog
- `QuickActionDialog.tsx` — search dialog for quick actions (postcards, events, etc.)
- `ConfirmDialog.tsx` — confirmation modal
- `RichTextEditor.tsx` — TipTap-based rich text editor/viewer

## Environment Variables

### Frontend
| Variable | Default | Notes |
|----------|---------|-------|
| `VITE_API_BASE_URL` | `/api` (relative) | Override to point to different API server |
| `VITE_GOOGLE_CLIENT_ID` | — | Google OAuth client ID; Google button hidden if absent |

### Backend (server/.env)
| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `APP_ENV` | No | `local` | `local`/`dev`/`prod` — controls which .env file loads |
| `PORT` | No | `4000` | Fastify listen port |
| `FRONTEND_ORIGIN` | No | `http://localhost:3000` | CORS origin |
| `AWS_S3_BUCKET` | No | — | S3 bucket name; gracefully degrades if absent |
| `AWS_S3_REGION` | No | — | S3 region |
| `AWS_ACCESS_KEY_ID` | No | — | S3 credentials |
| `AWS_SECRET_ACCESS_KEY` | No | — | S3 credentials |
| `RESEND_API_KEY` | No | — | Email sending; gracefully degrades if absent |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth; returns 501 if absent |
| `TMDB_API_KEY` | No | — | External movie search; gracefully degrades if absent |

## Database Schema Overview

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

## Testing

### Automated Tests (Vitest)
- **Framework**: Vitest 3.2 configured in `server/vitest.config.ts`
- **Test DB**: Creates `chuanmen_test` Postgres DB, runs `prisma db push --force-reset` before tests
- **Infrastructure**: `server/tests/setup.ts` (DB setup), `server/tests/helpers.ts` (test app factory, seed helpers)
- **Seed helpers**: `seedTestUser()`, `seedTestAdmin()`, `seedTestEvent()`, `seedTestMovie()`, `seedTestProposal()`, `seedTestRecommendation()`, `seedTestPostcard()`
- **15 test files** in `server/tests/api/`: about, admin, auth, events, feed, health, likes-comments, movies, newsletters-config, postcards, proposals, recommendations, task-presets, title-rules, users
- **Run**: `cd server && npm test` (requires local Postgres running)
- **Config**: `pool: 'forks'`, `singleFork: true`, `testTimeout: 30_000`, `hookTimeout: 60_000`

### Integration Tests
- `server/system-test/` — Docker Compose environment with MinIO (local S3) for full integration testing
- Scripts: `npm run system:test:up`, `npm run system:test:down`, `npm run system:test:logs`

### Manual Tests
- `docs/test-guide.html` — 15-section UI test checklist. Test account: `cm@gmail.com`

## CRITICAL: Build & Type-Check Before Push

**NEVER push to remote without passing type checks and a successful local build first.** Before running `git push`, always run `npx tsc --noEmit` (frontend) and `cd server && npx tsc --noEmit` (backend) to catch type errors, then run `npm run build` from the project root and ensure it completes without errors. A broken build on `main` will break the production deployment on Render.

## CRITICAL: Email Safety

**NEVER trigger email sending to real users without explicit user approval.** When testing email-related features (agent tick, digest, notifications), only send to test accounts. Never call production email endpoints (e.g., `POST /api/agent/tick`) without confirming with the user first. Emails sent cannot be undone.

## CRITICAL: Backward Compatibility

**NEVER make changes that lose existing data.** All schema changes MUST use additive migrations (ADD COLUMN with defaults, never DROP COLUMN without explicit user approval). Capacity semantics change (from "max signups" to "total people including host") was handled by incrementing all existing events' capacity by 1 in migration SQL. Always think about existing data impact before making changes.

## Known Gaps / Future Work

1. **No backend auth middleware** — API endpoints are unprotected. Backend relies on `x-user-id` header trust. No JWT/session.
2. **Discussion/Topic feature** — `Discussion` Prisma model exists but no backend routes/services or frontend UI are implemented.
3. **Seed (种子) feature** — Prisma models exist (`Seed`, `SeedCollaborator`, `SeedUpdate`, `SeedUpdateMedia`) but no backend routes or frontend UI.
4. **Postcard purchase** — `PostcardPurchase` model exists but Stripe payment integration is not built.
5. **Google OAuth bind/unbind in settings** — Google login + auto-binding works, but explicit bind/unbind UI in settings page is stubbed ("即将开放").
6. **Quiet hours** — Email quiet hours setting noted as "即将上线" in settings page.
7. **Co-Host auto-pairing** — `ExperimentPairing` model exists but no routes/UI. P3-D email rule describes auto-pairing but not implemented.
8. **Mock data cleanup** — `src/mock/data.ts` and `src/mock/api.ts` are dead code (not imported anywhere). Can be safely removed.

## Git Remotes & Branches

This repo maintains two remotes for two versions of the project:

| Remote | URL | Branch | Purpose |
|--------|-----|--------|---------|
| `origin` | `https://github.com/player-eric/ChuanMen.git` | `main` | Original repo |
| `cyentist` | `https://github.com/CYentist/chuanmener.git` | `cyentist-main` → pushes as `main` | New repo (backend env differences) |

### Workflow
```bash
git checkout main            # Work on player-eric/ChuanMen
git push origin main

git checkout cyentist-main   # Work on CYentist/chuanmener
git push cyentist cyentist-main:main
```

Frontend code is shared; `cyentist-main` branch diverges only in backend env/config.

## Deployment

### Render (Primary)
- **Render** via `render.yaml` blueprint (Docker)
- Web service: combined SSR frontend + API on single container
- Cron job: `agentTick.ts` every 10 minutes
- Database: Render managed PostgreSQL 16
- Domain: `chuanmener.club`

### Deploy workflow
1. Push to `main` → Render auto-deploys
2. Database migrations: `npx prisma migrate deploy` runs as part of build
3. Manual migration for Render: create migration SQL file in `server/prisma/migrations/<timestamp>_<name>/migration.sql`

### AWS Alternative (infra/)
- `infra/` contains CloudFormation + ECS Fargate deployment config
- Architecture: Amplify (frontend) + ALB + ECS Fargate + RDS + S3 + SES + EventBridge
- Not currently active — kept as alternative deployment option
