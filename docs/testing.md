# Testing

## Automated Tests (Vitest)
- **Framework**: Vitest 3.2 configured in `server/vitest.config.ts`
- **Test DB**: Creates `chuanmen_test` Postgres DB, runs `prisma db push --force-reset` before tests
- **Infrastructure**: `server/tests/setup.ts` (DB setup), `server/tests/helpers.ts` (test app factory, seed helpers)
- **Seed helpers**: `seedTestUser()`, `seedTestAdmin()`, `seedTestEvent()`, `seedTestMovie()`, `seedTestProposal()`, `seedTestRecommendation()`, `seedTestPostcard()`
- **15 test files** in `server/tests/api/`: about, admin, auth, events, feed, health, likes-comments, movies, newsletters-config, postcards, proposals, recommendations, task-presets, title-rules, users
- **Run**: `cd server && npm test` (requires local Postgres running)
- **Config**: `pool: 'forks'`, `singleFork: true`, `testTimeout: 30_000`, `hookTimeout: 60_000`

## Integration Tests
- `server/system-test/` — Docker Compose environment with MinIO (local S3) for full integration testing
- Scripts: `npm run system:test:up`, `npm run system:test:down`, `npm run system:test:logs`

## Manual Tests
- `docs/test-guide.html` — 15-section UI test checklist. Test account: `cm@gmail.com`

## Structural Tests
- `server/tests/structural/module-structure.test.ts` — validates module structure, dependency direction, cross-module isolation
- Run: `cd server && npx vitest run tests/structural/`
- These tests use `fs` + regex to parse imports, no database needed
