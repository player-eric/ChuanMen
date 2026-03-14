import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

// Re-export from shared utils for backward compatibility
export { getWeekKey, getWeekNumber } from '../../utils/weekKey.js';
import { getWeekKey, getWeekNumber } from '../../utils/weekKey.js';

/**
 * Draw a weekly host from the candidate pool.
 * Returns the created WeeklyLottery record, or null if no draw was needed/possible.
 */
export async function drawWeeklyHost(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
  excludeUserId?: string,
): Promise<any | null> {
  const now = new Date();
  const weekKey = getWeekKey(now);
  const weekNumber = getWeekNumber(now);

  // Check if a non-skipped draw already exists for this week
  const existing = await prisma.weeklyLottery.findFirst({
    where: { weekKey, status: { not: 'skipped' } },
  });
  if (existing) {
    log.info(`Lottery: draw already exists for ${weekKey}, skipping`);
    return null;
  }

  // Query candidate pool
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Find users who hosted in the last 2 weeks
  const recentHostEvents = await prisma.event.findMany({
    where: { createdAt: { gte: twoWeeksAgo } },
    select: { hostId: true },
  });
  const recentHostIds = new Set(recentHostEvents.map((e) => e.hostId));

  // Find users with pending lottery draws
  const pendingDraws = await prisma.weeklyLottery.findMany({
    where: { status: 'pending' },
    select: { drawnMemberId: true },
  });
  const pendingUserIds = new Set(pendingDraws.map((d) => d.drawnMemberId));

  // Get all candidates
  const candidates = await prisma.user.findMany({
    where: {
      hostCandidate: true,
      userStatus: 'approved',
    },
    select: { id: true, name: true },
  });

  // Filter out excluded users
  const eligible = candidates.filter((c) => {
    if (recentHostIds.has(c.id)) return false;
    if (pendingUserIds.has(c.id)) return false;
    if (excludeUserId && c.id === excludeUserId) return false;
    return true;
  });

  if (eligible.length === 0) {
    log.info(`Lottery: no eligible candidates for ${weekKey}`);
    return null;
  }

  // Random selection
  const winner = eligible[Math.floor(Math.random() * eligible.length)];

  const lottery = await prisma.weeklyLottery.create({
    data: {
      weekKey,
      weekNumber,
      drawnMemberId: winner.id,
      status: 'pending',
    },
    include: {
      drawnMember: { select: { id: true, name: true, avatar: true, email: true } },
    },
  });

  log.info(`Lottery: drew ${winner.name} for ${weekKey} (week ${weekNumber})`);
  return lottery;
}

/**
 * Get the current week's lottery draw (most recent non-skipped, or pending)
 */
export async function getCurrentLottery(prisma: PrismaClient) {
  const weekKey = getWeekKey();

  // First try to find the current week's active draw
  const current = await prisma.weeklyLottery.findFirst({
    where: { weekKey, status: { not: 'skipped' } },
    include: {
      drawnMember: { select: { id: true, name: true, avatar: true } },
      event: { select: { id: true, title: true, startsAt: true } },
    },
  });

  return current;
}

/**
 * Get lottery history (paginated)
 */
export async function getLotteryHistory(prisma: PrismaClient, take = 20, skip = 0) {
  return prisma.weeklyLottery.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    skip,
    include: {
      drawnMember: { select: { id: true, name: true, avatar: true } },
      event: { select: { id: true, title: true } },
    },
  });
}

/**
 * Accept a lottery draw
 */
export async function acceptLottery(prisma: PrismaClient, lotteryId: string, userId: string) {
  const lottery = await prisma.weeklyLottery.findUnique({ where: { id: lotteryId } });
  if (!lottery) throw Object.assign(new Error('抽签记录不存在'), { statusCode: 404 });
  if (lottery.drawnMemberId !== userId) throw Object.assign(new Error('你不是被抽中的人'), { statusCode: 403 });
  if (lottery.status !== 'pending') throw Object.assign(new Error('该抽签已处理'), { statusCode: 400 });

  return prisma.weeklyLottery.update({
    where: { id: lotteryId },
    data: { status: 'accepted' },
    include: {
      drawnMember: { select: { id: true, name: true, avatar: true } },
    },
  });
}

/**
 * Skip a lottery draw — triggers a re-draw for the same week
 */
export async function skipLottery(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
  lotteryId: string,
  userId: string,
) {
  const lottery = await prisma.weeklyLottery.findUnique({ where: { id: lotteryId } });
  if (!lottery) throw Object.assign(new Error('抽签记录不存在'), { statusCode: 404 });
  if (lottery.drawnMemberId !== userId) throw Object.assign(new Error('你不是被抽中的人'), { statusCode: 403 });
  if (lottery.status !== 'pending') throw Object.assign(new Error('该抽签已处理'), { statusCode: 400 });

  // Mark as skipped
  await prisma.weeklyLottery.update({
    where: { id: lotteryId },
    data: { status: 'skipped' },
  });

  // Re-draw, excluding the person who just skipped
  const newDraw = await drawWeeklyHost(prisma, log, userId);
  return newDraw;
}

/**
 * Complete a lottery draw by linking the created event
 */
export async function completeLottery(prisma: PrismaClient, lotteryId: string, eventId: string) {
  const lottery = await prisma.weeklyLottery.findUnique({ where: { id: lotteryId } });
  if (!lottery) throw Object.assign(new Error('抽签记录不存在'), { statusCode: 404 });
  if (lottery.status !== 'accepted' && lottery.status !== 'pending') {
    throw Object.assign(new Error('该抽签状态不允许完成'), { statusCode: 400 });
  }

  return prisma.weeklyLottery.update({
    where: { id: lotteryId },
    data: { status: 'completed', eventId },
    include: {
      drawnMember: { select: { id: true, name: true, avatar: true } },
      event: { select: { id: true, title: true } },
    },
  });
}
