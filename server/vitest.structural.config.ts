import { defineConfig } from 'vitest/config';

/** Structural tests — filesystem-only, no database needed */
export default defineConfig({
  test: {
    globals: true,
    include: ['tests/structural/**/*.test.ts'],
  },
});
