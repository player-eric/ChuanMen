# ChuanMen (串门儿) — Community Web Platform

NYC-based Chinese-language social community platform. Features: event management (movie nights, potlucks, hiking, etc.), movie/book recommendations with voting, thank-you postcards, activity proposals, member profiles, and a full admin dashboard.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, React Router 7, MUI 7, TipTap (rich text), Tailwind CSS 3 |
| Build | Vite 6, TypeScript 5, SSR via `ssr-server.mjs` |
| Backend | Fastify 5, Prisma 6 (ORM), PostgreSQL 16, Zod (validation) |
| Email | Resend + MJML templates |
| Storage | AWS S3 (media uploads, MinIO locally) |
| Deploy | Render (Docker), `render.yaml` blueprint |

## Project Structure

```
/                        # Root: Vite + SSR frontend
├── src/
│   ├── pages/           # 26 user-facing pages
│   ├── pages/admin/     # 12 admin pages (AdminXxxPage.tsx)
│   ├── components/      # Shared: PostCard, ScenePhoto, FeedItems, Atoms, RichTextEditor, etc.
│   ├── lib/
│   │   ├── domainApi.ts # ALL frontend→backend API calls
│   │   ├── authApi.ts   # Auth API (login — currently hardcoded, not real backend auth)
│   │   └── mappings.ts  # Shared enum↔label mappings (single source of truth)
│   ├── auth/AuthContext.tsx  # React context for user state (localStorage-based)
│   ├── hooks/           # useColors (theme-aware), useMediaUpload
│   ├── mock/            # Mock data (data.ts) + mock API (api.ts)
│   ├── layouts/         # AppLayout (user), AdminLayout (admin)
│   ├── router.tsx       # All routes + loader functions (data fetching)
│   ├── types.ts         # Shared frontend TypeScript types
│   ├── theme.ts         # Custom design tokens (cDark/cLight), fonts, gradient lookups
│   └── muiTheme.ts      # MUI theme (warm palette, dark mode support)
├── server/              # Backend (separate package.json)
│   ├── src_v2/
│   │   ├── routes/      # Top-level: feed, media, email, agent, health, profile
│   │   ├── modules/     # Domain modules, each with route.ts + service.ts + schema.ts
│   │   │   └── events|movies|postcards|users|proposals|comments|likes|
│   │   │       recommendations|about|title-rules|task-presets
│   │   ├── config/env.ts   # Env var validation (Zod, exits on missing required vars)
│   │   ├── emails/      # Email templates (MJML)
│   │   └── workers/     # Cron jobs (agentTick.ts — runs every 10 min)
│   └── prisma/
│       ├── schema.prisma  # Database schema (source of truth for all types)
│       └── seed.ts
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
npm run db:local         # Switch .env symlink to local Docker Postgres
npm run db:dev           # Switch to dev Render DB
npm run db:prod          # Switch to prod Render DB (careful!)
npm run db:setup         # Docker up + db push + seed (one-shot local setup)
npx prisma migrate dev   # Create migration
npx prisma studio        # DB browser GUI
npx prisma db seed       # Run seed data
```

## Auth System

**Current state: frontend-only, no real backend auth.**

- User state stored in `localStorage` key `chuanmen.auth.user` (or `sessionStorage` if "remember me" is off)
- `AuthContext` provides `{ user, isRegistered, hydrated, setUser }`
- `hydrated` flag prevents UI flashing before auth resolves — wait for it before showing auth-dependent content
- On first load with no stored user, auto-signs-in as a hardcoded **walkthrough user** (`walkthrough-yuan-001`, role `admin`). The provider then resolves the real DB ID via `getUserByEmail()`.
- IDs starting with `walkthrough-` are treated as demo; real IDs are CUID-length (>20 chars)
- `loginUser()` in `authApi.ts` only accepts two hardcoded emails: `cm@gmail.com` and `yuan@chuanmen.app`
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
2. Loaders transform raw API responses → frontend types, with `try/catch` returning empty fallbacks
3. Pages read data via `useLoaderData()` — must handle null/empty gracefully
4. All UI built with MUI components + `sx` prop (no custom CSS classes)

### API Connection Status
| Area | Status |
|------|--------|
| User pages (events, movies, feed, cards, members, proposals) | Connected to real API |
| Admin pages (all 12) | **Mock data** from `src/mock/data.ts` |
| Book detail | **Mock API** (`src/mock/api.ts`) |

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
- `server/prisma/schema.prisma` is the **source of truth** for DB types
- Always `npx prisma validate` before migrating
- Local dev: Docker Postgres via `docker compose up -d` in server/

### Responsive Layout
- Mobile ↔ Desktop breakpoint: `md` (900px)
- AppLayout: bottom tab bar (mobile) / 240px sidebar (desktop), content `maxWidth: 1100px`
- AdminLayout: overlay drawer (mobile) / permanent sidebar (desktop), content `maxWidth: 1200px`

### Shared Components
- `Atoms.tsx` — `Ava` (avatar with emoji badge, hue from `name.charCodeAt(0)*37%360`) and `AvaStack` (overlapping row)
- `ScenePhoto` / `Poster` — render gradient backgrounds from `theme.ts` lookups
- `FeedItems.tsx` — all feed card variants (FeedActivity, FeedCard, FeedMovie, FeedMilestone, etc.)
- `PostCard.tsx` — thank-you card component (props: `message`, `isPrivate`)

## Environment Variables

### Frontend
| Variable | Default | Notes |
|----------|---------|-------|
| `VITE_API_BASE_URL` | `/api` (relative) | Override to point to different API server |

### Backend (server/.env)
| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `APP_ENV` | No | `local` | `local`/`dev`/`prod` — controls which .env file loads |
| `PORT` | No | `4000` | Fastify listen port |
| `FRONTEND_ORIGIN` | No | `http://localhost:3000` | CORS origin |
| `AWS_S3_*` | No | — | S3 config; gracefully degrades if absent |
| `RESEND_API_KEY` | No | — | Email; gracefully degrades if absent |
| `TMDB_API_KEY` | No | — | Movie search; gracefully degrades if absent |

## Testing

**No automated tests exist yet.** No Vitest/Jest/Playwright configured. `docs/test-guide.html` is a manual 15-section UI test checklist. Test account: `cm@gmail.com`.

## Known Gaps / TODOs

1. **No backend auth** — all API endpoints are unprotected. Login is hardcoded to two emails. Backend relies on `x-user-id` header trust.
2. **Admin pages use mock data** — need to wire all 12 admin pages to real API endpoints.
3. **Book detail uses mock API** — `fetchBookDetail` still comes from `src/mock/api.ts`.
4. **Member lookup by name** — `memberDetailLoader` fetches all members and filters client-side (no `/api/users/by-name/:name` endpoint).
5. **Settings page TODO** — title display controls not yet built (line 257 of SettingsPage.tsx).
6. **No automated tests** — no test framework configured.

## Deployment

- **Render** via `render.yaml` blueprint (Docker)
- Web service: combined SSR frontend + API on single container
- Cron job: `agentTick.ts` every 10 minutes
- Database: Render managed PostgreSQL 16
- Domain: `chuanmen.co`
