/**
 * Shared Prisma select constants — single source of truth for user data includes.
 * All queries that return user data MUST use these constants.
 * Enforced by structural tests in tests/structural/module-structure.test.ts.
 */

/** Standard user fields for any user relation (host, author, voter, participant, etc.) */
export const USER_BRIEF_SELECT = {
  id: true,
  name: true,
  avatar: true,
} as const;
