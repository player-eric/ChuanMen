import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { getSystemAuthorId } from './helpers.js';
import { UserService } from '../modules/users/user.service.js';

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

  // Load baseline from SiteConfig — prevents retroactive milestone creation
  // Baseline stores the last known milestone value per label, e.g. { "活动": 30, "成员": 40 }
  const baselineRow = await prisma.siteConfig.findUnique({ where: { key: 'milestoneBaseline' } });
  const baseline: Record<string, number> = (baselineRow?.value as Record<string, number>) ?? {};

  // If no baseline exists, initialize it with current values (skip all historical milestones)
  if (!baselineRow) {
    const init: Record<string, number> = {};
    for (const c of checks) {
      init[c.label] = Math.floor(c.count / c.step) * c.step;
    }
    await prisma.siteConfig.create({ data: { key: 'milestoneBaseline', value: init } });
    log.info({ baseline: init }, 'Milestone baseline initialized (skipping historical)');
    return [];
  }

  const authorId = await getSystemAuthorId(prisma);
  const created: string[] = [];
  const updatedBaseline = { ...baseline };

  for (const c of checks) {
    const milestone = Math.floor(c.count / c.step) * c.step;
    if (milestone === 0) continue;

    const prev = baseline[c.label] ?? 0;
    // Only trigger if we crossed a new threshold beyond the baseline
    if (milestone <= prev) continue;

    const title = `串门儿${c.label}突破 ${milestone}！`;
    const exists = await prisma.announcement.findFirst({
      where: { title, type: 'milestone' },
    });
    if (exists) {
      updatedBaseline[c.label] = milestone;
      continue;
    }

    await prisma.announcement.create({
      data: {
        title,
        body: `串门儿社区${c.label}已达到 ${milestone}，感谢每一位成员的参与！`,
        type: 'milestone',
        published: true,
        authorId,
      },
    });
    updatedBaseline[c.label] = milestone;
    created.push(title);
    log.info(`Milestone created: ${title}`);
  }

  // Persist updated baseline
  await prisma.siteConfig.update({
    where: { key: 'milestoneBaseline' },
    data: { value: updatedBaseline },
  });

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

// ── Auto-approve announced users whose introduction period has ended ──

/**
 * Find users with status 'announced' whose announcedEndAt has passed,
 * approve them automatically, and send welcome email.
 */
export async function processAnnouncedUsers(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const now = new Date();

  const expiredUsers = await prisma.user.findMany({
    where: {
      userStatus: 'announced',
      announcedEndAt: { lte: now },
    },
  });

  if (expiredUsers.length === 0) return 0;

  for (const user of expiredUsers) {
    await UserService.approveUser(prisma, user.id, log);
    log.info(`Auto-approved announced user: ${user.name} (${user.id})`);
  }

  return expiredUsers.length;
}
