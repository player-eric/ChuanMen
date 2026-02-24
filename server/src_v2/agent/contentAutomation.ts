import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { getSystemAuthorId } from './helpers.js';

// ── Milestone detection ──────────────────────────────────────

interface MilestoneCheck {
  label: string;
  count: number;
  step: number;
}

/**
 * Detect community milestones and create announcements for them.
 * Returns an array of created milestone titles.
 */
export async function detectMilestones(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<string[]> {
  const [eventCount, memberCount, movieCount, totalParticipations] =
    await Promise.all([
      prisma.event.count({ where: { status: 'completed' } }),
      prisma.user.count({ where: { userStatus: 'approved' } }),
      prisma.movie.count({ where: { status: 'screened' } }),
      prisma.eventSignup.count({ where: { participated: true } }),
    ]);

  const checks: MilestoneCheck[] = [
    { label: '活动', count: eventCount, step: 10 },
    { label: '成员', count: memberCount, step: 10 },
    { label: '电影', count: movieCount, step: 50 },
    { label: '参与人次', count: totalParticipations, step: 100 },
  ];

  const authorId = await getSystemAuthorId(prisma);
  const created: string[] = [];

  for (const c of checks) {
    // Only the highest reached milestone (no back-fill)
    const milestone = Math.floor(c.count / c.step) * c.step;
    if (milestone === 0) continue;

    const title = `串门儿${c.label}突破 ${milestone}！`;
    const exists = await prisma.announcement.findFirst({
      where: { title, type: 'milestone' },
    });
    if (exists) continue;

    await prisma.announcement.create({
      data: {
        title,
        body: `串门儿社区${c.label}已达到 ${milestone}，感谢每一位成员的参与！`,
        type: 'milestone',
        published: true,
        authorId,
      },
    });
    created.push(title);
    log.info(`Milestone created: ${title}`);
  }

  return created;
}

// ── Host tribute (1st of month) ──────────────────────────────

function getUTCDate(): number {
  return new Date().getUTCDate();
}

export interface HostTributeResult {
  title: string;
  hostIds: string[];
}

/**
 * On the 1st of each month, create a host tribute announcement
 * for the previous month's hosts.
 */
export async function generateHostTribute(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<HostTributeResult | null> {
  if (getUTCDate() !== 1) return null;

  const now = new Date();
  // Previous month
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth(); // 1-12

  const title = `${year}-${String(month).padStart(2, '0')} Host 致敬`;

  const exists = await prisma.announcement.findFirst({
    where: { title, type: 'host_tribute' },
  });
  if (exists) return null;

  // Query previous month's completed events → distinct hosts
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  const events = await prisma.event.findMany({
    where: {
      status: 'completed',
      startsAt: { gte: monthStart, lt: monthEnd },
    },
    select: { hostId: true, host: { select: { name: true } } },
  });

  if (events.length === 0) {
    log.info('Host tribute: no completed events last month, skipping');
    return null;
  }

  const hostMap = new Map<string, string>(); // id → name
  for (const e of events) {
    hostMap.set(e.hostId, e.host.name);
  }

  const hostNames = [...hostMap.values()];
  const authorId = await getSystemAuthorId(prisma);

  await prisma.announcement.create({
    data: {
      title,
      body: `感谢 ${hostNames.join('、')} 在 ${year} 年 ${month} 月组织的精彩活动！`,
      type: 'host_tribute',
      published: true,
      authorId,
    },
  });

  log.info(`Host tribute created: ${title} (${hostNames.length} hosts)`);
  return { title, hostIds: [...hostMap.keys()] };
}
