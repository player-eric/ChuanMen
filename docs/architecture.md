# Architecture

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
├── docs/                # Documentation + UI test guide
└── render.yaml          # Render deployment blueprint
```

## Backend Module Pattern

Each domain in `server/src_v2/modules/<name>/`:
- `<name>.route.ts` — Fastify route handlers
- `<name>.service.ts` — Business logic (Prisma queries)
- `<name>.schema.ts` — Zod request/response schemas

### Dependency Direction (Enforced by ESLint + Structural Tests)

```
route.ts → service.ts → repository.ts
```

- Routes can import services and repositories
- Services can import repositories
- **Repositories CANNOT import routes or services**
- **Services CANNOT import routes**
- **Modules CANNOT import from other modules** — use shared services in `src_v2/services/` instead

### Shared Services (`server/src_v2/services/`)
- `agentService.ts` — Content automation (milestones, host tributes, lottery, waitlist expiry)
- `emailService.ts` — Email sending wrapper
- `imageCompression.ts` — Sharp-based image compression
- `s3Service.ts` — AWS S3 + MinIO integration

## Data Flow

### Frontend
1. `router.tsx` defines loaders that call `domainApi.ts` functions
2. Loaders transform raw API responses → frontend types via `mapApiMember()` etc., with `try/catch` returning empty fallbacks
3. Pages read data via `useLoaderData()` — must handle null/empty gracefully
4. All UI built with MUI components + `sx` prop (no custom CSS classes)

### Backend
1. Request hits Fastify route handler (`*.route.ts`)
2. Route calls service layer (`*.service.ts`) for business logic
3. Service calls Prisma for data access
4. Response serialized and returned

### SSR Architecture
- **`ssr-server.mjs`**: Dev mode uses Vite middleware; prod mode forks Fastify as child process on port 4000
- **`entry-server.tsx`**: `renderToPipeableStream` with `onAllReady` (full render, not streaming), 10s abort timeout
- **`entry-client.tsx`**: Detects SSR (hydrates) vs CSR (creates root) automatically
- `domainApi.ts` detects `typeof window === 'undefined'` to use absolute `http://localhost:4000` for Node.js SSR fetches
- All `/api` requests are reverse-proxied to the backend in both dev and prod
- `<!--ssr-outlet-->` in `index.html` is replaced with rendered HTML

## Agent/Cron System

`agentTick.ts` runs every 10 minutes for automated tasks:
- Content automation (milestones, host tributes)
- Waitlist offer expiry
- Announced user auto-approval
- **Weekly lottery draw (Mondays)**
- **Consecutive event tracking**

## System Features

- **Host Milestone Badges** — Auto-computed from host count: 🏠 (1+), ⭐ (5+), 🔥 (10+), 👑 (20+). Displayed on member avatars.
- **Title System** — Admin-defined titles (emoji + stamp tag + threshold). Awarded based on postcard tag accumulation. Users can hide individual titles.
- **Email Engine** — Rule-based notification system with priority tiers, cooldown, templates, queue, bounce handling, suppression lists. Includes automated emails: unclaimed task reminders (44-52h before event), lottery draw notifications, consecutive events encouragement.
- **Member Introduction Period (内部公示期)** — Admin moves applicant to "announced" status → 3-day introduction period → auto-approved by cron (or manual approve). Feed shows introducing/welcomed cards.
- **Waitlist System (等位机制)** — When event is full, new signups go to waitlist (FIFO). When a spot opens, next waitlisted user gets a 24h offer. Auto-expires via cron, promotes next in queue.
- **Event Task System** — Host creates tasks from presets (per event type). Members claim tasks after signup via `TaskClaimDialog`. Custom volunteer tasks supported. Unclaimed task email reminders 44-52h before event.
- **Weekly Lottery (小局抽签系统)** — Members opt into candidate pool (`hostCandidate`). Agent draws weekly on Mondays, sends notification email. Drawn member can accept (→ creates event) or skip (→ draw next). Tracks `consecutiveEvents` per user for nudging.
- **Activity Tracking** — `lastActiveAt` updated via `onRequest` hook (throttled to every 5 min per user). `consecutiveEvents` tracked when events end.
- **Media Upload** — Images routed through backend (`POST /api/media/upload`) to avoid S3 CORS issues. Supports avatar, cover, event photos.
