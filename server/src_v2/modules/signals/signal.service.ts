import type { PrismaClient } from '@prisma/client';
import { USER_BRIEF_SELECT } from '../../utils/prisma-selects.js';
import type { SaveSignalsInput } from './signal.schema.js';

/**
 * Replace all signals for a user within the given weekKeys scope.
 */
export async function saveSignals(
  prisma: PrismaClient,
  userId: string,
  input: SaveSignalsInput,
) {
  const { signals, weekKeys } = input;

  await prisma.$transaction([
    // Delete old signals within scope
    prisma.activitySignal.deleteMany({
      where: { userId, weekKey: { in: weekKeys } },
    }),
    // Create new signals
    ...(signals.length > 0
      ? [prisma.activitySignal.createMany({
          data: signals.map((s) => ({
            userId,
            tag: s.tag,
            weekKey: s.weekKey,
          })),
          skipDuplicates: true,
        })]
      : []),
  ]);
}

/**
 * Get the current user's future signals.
 */
export async function getMySignals(prisma: PrismaClient, userId: string, weekKeys: string[]) {
  return prisma.activitySignal.findMany({
    where: { userId, weekKey: { in: weekKeys } },
    select: { tag: true, weekKey: true },
  });
}

/**
 * Aggregate signal summary for the given weekKeys.
 * Returns per-week, per-tag counts + user avatars, sorted by count desc.
 */
export async function getSignalSummary(prisma: PrismaClient, weekKeys: string[]) {
  const signals = await prisma.activitySignal.findMany({
    where: { weekKey: { in: weekKeys } },
    select: {
      tag: true,
      weekKey: true,
      user: { select: USER_BRIEF_SELECT },
    },
  });

  // Group: weekKey → tag → users[]
  const grouped = new Map<string, Map<string, { id: string; name: string; avatar: string | null }[]>>();
  for (const s of signals) {
    let weekMap = grouped.get(s.weekKey);
    if (!weekMap) { weekMap = new Map(); grouped.set(s.weekKey, weekMap); }
    let users = weekMap.get(s.tag);
    if (!users) { users = []; weekMap.set(s.tag, users); }
    users.push({ id: s.user.id, name: s.user.name, avatar: s.user.avatar || null });
  }

  // Convert to sorted structure
  const result: Record<string, { key: string; count: number; users: { id: string; name: string; avatar: string | null }[] }[]> = {};
  for (const [weekKey, tagMap] of grouped) {
    const tags = [...tagMap.entries()]
      .map(([key, users]) => ({ key, count: users.length, users }))
      .sort((a, b) => b.count - a.count);
    result[weekKey] = tags;
  }

  return result;
}

/**
 * Delete signals older than N weeks ago.
 */
export async function cleanOldSignals(prisma: PrismaClient, cutoffWeekKey: string) {
  return prisma.activitySignal.deleteMany({
    where: { weekKey: { lt: cutoffWeekKey } },
  });
}
