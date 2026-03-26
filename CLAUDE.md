# ChuanMen (串门儿) — Community Web Platform

NYC-based Chinese-language social community platform. Features: event management, recommendations with voting, thank-you postcards with credit system, activity proposals, member profiles, title/badge system, email notification engine, and a full admin dashboard.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, React Router 7, MUI 7, TipTap, Tailwind CSS 3 |
| Build | Vite 6, TypeScript 5, SSR via `ssr-server.mjs` |
| Backend | Fastify 5, Prisma 6 (ORM), PostgreSQL 16, Zod |
| Email | Resend + MJML templates |
| Storage | AWS S3 (media uploads, MinIO locally) |
| Deploy | Vercel (frontend + serverless API), Render (Docker alternative) |

## Essential Commands

```bash
# Frontend (project root)
npm run dev              # SSR dev server (port 3000)
npm run build            # Production build
npx tsc --noEmit         # Type-check

# Backend (server/)
cd server && npm run dev # Fastify dev (port 4000)
npm run test             # API tests (needs local Postgres)
npm run db:setup         # Docker up + schema push + seed

# Prisma
npx prisma validate      # Validate before migrating
npx prisma migrate dev   # Create migration
npx prisma generate      # Regenerate client after schema changes
npx prisma db push       # Quick local schema sync
```

## Architecture Constraints (Enforced by ESLint + Structural Tests)

- **Dependency direction**: `route.ts → service.ts → repository.ts` (never reverse)
- **Module isolation**: `modules/<A>/` cannot import from `modules/<B>/` — use `src_v2/services/` shared services
- **Frontend/backend boundary**: `src/` cannot import from `server/` or `@prisma/client`
- **Mappings**: `src/lib/mappings.ts` is the single source of truth — no local duplicates

## CRITICAL: Build & Type-Check Before Push

**NEVER push without passing type checks + build.** Run `npx tsc --noEmit` (frontend) and `cd server && npx tsc --noEmit` (backend), then `npm run build`. Broken build on `main` breaks production.

## CRITICAL: Email Safety

**NEVER trigger email sending to real users without explicit user approval.** Only send to test accounts when testing email features. Emails sent cannot be undone.

## CRITICAL: Backward Compatibility

**NEVER make changes that lose existing data.** Schema changes MUST be additive (ADD COLUMN with defaults, never DROP COLUMN without approval). Always think about existing data impact.

## Documentation Index

| File | Contents |
|------|----------|
| [`docs/architecture.md`](docs/architecture.md) | Project structure, module pattern, dependency rules, SSR, data flow, system features |
| [`docs/api-reference.md`](docs/api-reference.md) | All API endpoints, auth system, feature descriptions |
| [`docs/conventions.md`](docs/conventions.md) | IDs, naming, theming, responsive layout, shared components, mappings |
| [`docs/database.md`](docs/database.md) | Schema overview (45+ models), Prisma workflow, migration rules |
| [`docs/deployment.md`](docs/deployment.md) | All commands, env vars, git remotes, Vercel/Render setup |
| [`docs/testing.md`](docs/testing.md) | Vitest config, seed helpers, structural tests, integration tests |
| [`docs/known-gaps.md`](docs/known-gaps.md) | Unimplemented features, future work |
