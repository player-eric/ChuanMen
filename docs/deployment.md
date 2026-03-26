# Deployment

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

## Render (Primary)
- **Render** via `render.yaml` blueprint (Docker)
- Web service: combined SSR frontend + API on single container
- Cron job: `agentTick.ts` every 10 minutes
- Database: Render managed PostgreSQL 16
- Domain: `chuanmener.club`

### Deploy workflow
1. Push to `main` → Render auto-deploys
2. Database migrations: `npx prisma migrate deploy` runs as part of build
3. Manual migration for Render: create migration SQL file in `server/prisma/migrations/<timestamp>_<name>/migration.sql`

## AWS Alternative (infra/)
- `infra/` contains CloudFormation + ECS Fargate deployment config
- Architecture: Amplify (frontend) + ALB + ECS Fargate + RDS + S3 + SES + EventBridge
- Not currently active — kept as alternative deployment option
