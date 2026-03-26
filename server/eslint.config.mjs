import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  // Base config for all backend files
  {
    files: ['src_v2/**/*.ts'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {},
  },

  // Repository files: cannot import route or service (dependency direction)
  {
    files: ['src_v2/modules/**/*.repository.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['./*.route', './*.route.js'],
            message: 'Repository cannot import route. Dependency direction: route → service → repository. Move this logic to the service layer.',
          },
          {
            group: ['./*.service', './*.service.js'],
            message: 'Repository cannot import service. Dependency direction: route → service → repository. Move this logic to the service layer.',
          },
        ],
      }],
    },
  },

  // Service files: cannot import route
  {
    files: ['src_v2/modules/**/*.service.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['./*.route', './*.route.js'],
            message: 'Service cannot import route. Dependency direction: route → service → repository. Keep route logic in route.ts.',
          },
        ],
      }],
    },
  },

  // Module isolation: modules cannot import from other modules
  {
    files: ['src_v2/modules/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['../*/*.route', '../*/*.route.js', '../*/*.service', '../*/*.service.js', '../*/*.repository', '../*/*.repository.js'],
            message: 'Cross-module import forbidden. Use shared services in src_v2/services/ instead.',
          },
        ],
      }],
    },
  },
];
