import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/api/**/*.test.ts'],
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    // Structural tests run separately without DB setup
    // via: npx vitest run tests/structural/ --config vitest.structural.config.ts
  },
});
