import type { PrismaClient } from '@prisma/client';

/**
 * Return the subset of `userIds` that have NOT received an email
 * for `ruleId` within the last `cooldownDays`.
 */
export async function filterByCooldown(
  prisma: PrismaClient,
  userIds: string[],
  ruleId: string,
  cooldownDays: number,
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - cooldownDays);

  const recent = await prisma.emailLog.findMany({
    where: {
      userId: { in: userIds },
      ruleId,
      sentAt: { gte: cutoff },
    },
    select: { userId: true },
  });

  const recentSet = new Set(recent.map((r) => r.userId));
  return new Set(userIds.filter((id) => !recentSet.has(id)));
}

/**
 * Return the subset of `userIds` that do NOT have an EmailLog entry
 * for the given `ruleId` with a matching `refId`.
 */
export async function filterByRefId(
  prisma: PrismaClient,
  userIds: string[],
  ruleId: string,
  refId: string,
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();

  const existing = await prisma.emailLog.findMany({
    where: {
      userId: { in: userIds },
      ruleId,
      refId,
    },
    select: { userId: true },
  });

  const existingSet = new Set(existing.map((r) => r.userId));
  return new Set(userIds.filter((id) => !existingSet.has(id)));
}

// Module-level cache
let _systemAuthorId: string | null = null;

/**
 * Return the first admin user id (Yuan), cached after first call.
 */
export async function getSystemAuthorId(prisma: PrismaClient): Promise<string> {
  if (_systemAuthorId) return _systemAuthorId;

  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (!admin) throw new Error('No admin user found for system author');
  _systemAuthorId = admin.id;
  return _systemAuthorId;
}

/** Prisma where-clause fragment for email-eligible users. */
export const ELIGIBLE_USER_WHERE = {
  userStatus: 'approved' as const,
  OR: [
    { preferences: null },
    { preferences: { emailState: { not: 'unsubscribed' as const } } },
  ],
};
