import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['../server/*', '../../server/*', '../../../server/*'],
            message: 'Frontend cannot import from server/. Use domainApi.ts for API calls.',
          },
          {
            group: ['@prisma/client'],
            message: 'Frontend cannot import Prisma types. Define frontend types in src/types.ts.',
          },
        ],
      }],
    },
  },
];
