import { execSync } from 'node:child_process';

// Set test environment before anything else
process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'local';
process.env.DATABASE_URL = 'postgresql://chuanmen:chuanmen@localhost:5432/chuanmen_test';
process.env.RESEND_API_KEY = '';
process.env.GOOGLE_CLIENT_ID = '';
process.env.TMDB_API_KEY = '';

// Create test database if it doesn't exist, then push schema
try {
  execSync(
    `psql "postgresql://chuanmen:chuanmen@localhost:5432/postgres" -c "CREATE DATABASE chuanmen_test;" 2>/dev/null || true`,
    { stdio: 'pipe' },
  );
} catch {
  // Database may already exist — that's fine
}

execSync('npx prisma db push --force-reset --skip-generate', {
  cwd: new URL('..', import.meta.url).pathname,
  stdio: 'pipe',
  env: {
    ...process.env,
    DATABASE_URL: 'postgresql://chuanmen:chuanmen@localhost:5432/chuanmen_test',
    PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'continue',
  },
});
