import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { sendTemplatedEmail } from '../services/emailService.js';
import { filterByCooldown, filterByRefId, ELIGIBLE_USER_WHERE } from './helpers.js';
import type { HostTributeResult } from './contentAutomation.js';
import { renderDigestBlock, type DigestSection } from '../emails/template.js';

// ── Shared types ─────────────────────────────────────────────

interface UserRow {
  id: string;
  name: string;
  email: string;
}

// ── P3-F: Churn recall (inactive 45+ days) ──────────────────

export async function sendChurnRecall(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'P3-F' } });
  if (!rule?.enabled) return 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ((rule.config as any)?.inactiveDays ?? 45));

  const candidates: UserRow[] = await prisma.user.findMany({
    where: {
      userStatus: 'approved',
      OR: [
        { preferences: null },
        { preferences: { emailState: { not: 'unsubscribed' } } },
      ],
      AND: {
        OR: [
          { lastActiveAt: null },
          { lastActiveAt: { lt: cutoff } },
        ],
      },
    },
    select: { id: true, name: true, email: true },
  });

  const eligible = await filterByCooldown(
    prisma,
    candidates.map((u) => u.id),
    'P3-F',
    rule.cooldownDays,
  );

  let sent = 0;
  for (const user of candidates) {
    if (!eligible.has(user.id)) continue;
    try {
      const result = await sendTemplatedEmail(prisma, {
        to: user.email,
        ruleId: 'P3-F',
        variables: { userName: user.name },
      });
      await prisma.emailLog.create({
        data: { userId: user.id, ruleId: 'P3-F', messageId: result.MessageId },
      });
      sent++;
    } catch (err) {
      log.error({ err, userId: user.id }, 'P3-F send failed');
    }
  }

  log.info(`P3-F churn recall: ${sent}/${candidates.length} sent`);
  return sent;
}

// ── P3-E: Silent host recall (hosted before, no event in 60d) ──

export async function sendSilentHostRecall(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'P3-E' } });
  if (!rule?.enabled) return 0;

  const inactiveDays = (rule.config as any)?.inactiveDays ?? 60;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - inactiveDays);

  // Users who have hosted at least once but no event in the last 60 days
  const candidates: UserRow[] = await prisma.user.findMany({
    where: {
      userStatus: 'approved',
      OR: [
        { preferences: null },
        { preferences: { emailState: { not: 'unsubscribed' } } },
      ],
      hostCount: { gt: 0 },
      hostedEvents: {
        none: {
          startsAt: { gte: cutoff },
        },
      },
    },
    select: { id: true, name: true, email: true },
  });

  const eligible = await filterByCooldown(
    prisma,
    candidates.map((u) => u.id),
    'P3-E',
    rule.cooldownDays,
  );

  let sent = 0;
  for (const user of candidates) {
    if (!eligible.has(user.id)) continue;
    try {
      const result = await sendTemplatedEmail(prisma, {
        to: user.email,
        ruleId: 'P3-E',
        variables: { userName: user.name },
      });
      await prisma.emailLog.create({
        data: { userId: user.id, ruleId: 'P3-E', messageId: result.MessageId },
      });
      sent++;
    } catch (err) {
      log.error({ err, userId: user.id }, 'P3-E send failed');
    }
  }

  log.info(`P3-E silent host recall: ${sent}/${candidates.length} sent`);
  return sent;
}

// ── P3-D: Encourage hosting (participated 3+, never hosted) ──

export async function sendEncourageHosting(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'P3-D' } });
  if (!rule?.enabled) return 0;

  const candidates: UserRow[] = await prisma.user.findMany({
    where: {
      userStatus: 'approved',
      OR: [
        { preferences: null },
        { preferences: { emailState: { not: 'unsubscribed' } } },
      ],
      participationCount: { gt: 3 },
      hostCount: 0,
    },
    select: { id: true, name: true, email: true },
  });

  const eligible = await filterByCooldown(
    prisma,
    candidates.map((u) => u.id),
    'P3-D',
    rule.cooldownDays,
  );

  let sent = 0;
  for (const user of candidates) {
    if (!eligible.has(user.id)) continue;
    try {
      const result = await sendTemplatedEmail(prisma, {
        to: user.email,
        ruleId: 'P3-D',
        variables: { userName: user.name },
      });
      await prisma.emailLog.create({
        data: { userId: user.id, ruleId: 'P3-D', messageId: result.MessageId },
      });
      sent++;
    } catch (err) {
      log.error({ err, userId: user.id }, 'P3-D send failed');
    }
  }

  log.info(`P3-D encourage hosting: ${sent}/${candidates.length} sent`);
  return sent;
}

// ── P4-A: Milestone notification (all users) ────────────────

export async function sendMilestoneNotif(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
  milestones: string[],
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'P4-A' } });
  if (!rule?.enabled) return 0;

  const allUsers: UserRow[] = await prisma.user.findMany({
    where: {
      userStatus: 'approved',
      OR: [
        { preferences: null },
        { preferences: { emailState: { not: 'unsubscribed' } } },
      ],
    },
    select: { id: true, name: true, email: true },
  });

  let totalSent = 0;

  for (const milestoneTitle of milestones) {
    const eligible = await filterByRefId(
      prisma,
      allUsers.map((u) => u.id),
      'P4-A',
      milestoneTitle,
    );

    for (const user of allUsers) {
      if (!eligible.has(user.id)) continue;
      try {
        const result = await sendTemplatedEmail(prisma, {
          to: user.email,
          ruleId: 'P4-A',
          variables: { userName: user.name, milestoneTitle },
        });
        await prisma.emailLog.create({
          data: {
            userId: user.id,
            ruleId: 'P4-A',
            refId: milestoneTitle,
            messageId: result.MessageId,
          },
        });
        totalSent++;
      } catch (err) {
        log.error({ err, userId: user.id }, 'P4-A send failed');
      }
    }
  }

  log.info(`P4-A milestone notif: ${totalSent} sent for ${milestones.length} milestones`);
  return totalSent;
}

// ── DIGEST: Daily community digest ──────────────────────────

async function buildDigestSections(prisma: PrismaClient): Promise<DigestSection[] | null> {
  const cutoff = new Date();
  cutoff.setTime(cutoff.getTime() - 24 * 60 * 60 * 1000);

  const now = new Date();
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);

  const sections: DigestSection[] = [];

  // 1. New or updated events (created or updated in last 24h, not cancelled)
  const newEvents = await prisma.event.findMany({
    where: {
      phase: { not: 'cancelled' },
      OR: [
        { createdAt: { gte: cutoff } },
        { updatedAt: { gte: cutoff } },
      ],
    },
    select: { id: true, title: true, startsAt: true },
    orderBy: { startsAt: 'asc' },
  });
  if (newEvents.length > 0) {
    sections.push({
      icon: '🎬',
      title: '新活动',
      items: newEvents.map((e) => {
        const d = e.startsAt.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
        return { text: `${e.title}（${d}）`, url: `https://chuanmener.club/events/${e.id}` };
      }),
    });
  }

  // 2. Upcoming events in the next 7 days (open or invite phase)
  const upcoming = await prisma.event.findMany({
    where: {
      startsAt: { gte: now, lte: in7Days },
      phase: { in: ['open', 'invite'] },
      id: { notIn: newEvents.map((e) => e.id) },
    },
    select: { id: true, title: true, startsAt: true },
    orderBy: { startsAt: 'asc' },
  });
  if (upcoming.length > 0) {
    sections.push({
      icon: '📅',
      title: '即将开始',
      items: upcoming.map((e) => {
        const d = e.startsAt.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
        return { text: `${e.title}（${d}）`, url: `https://chuanmener.club/events/${e.id}` };
      }),
    });
  }

  // 3. New recommendations
  const newRecs = await prisma.recommendation.findMany({
    where: { createdAt: { gte: cutoff } },
    select: { title: true },
  });
  if (newRecs.length > 0) {
    sections.push({
      icon: '📖',
      title: '新推荐',
      items: newRecs.map((r) => ({ text: r.title })),
    });
  }

  // 4. New postcards (total count, not per-user)
  const postcardCount = await prisma.postcard.count({
    where: { createdAt: { gte: cutoff } },
  });
  if (postcardCount > 0) {
    sections.push({
      icon: '💌',
      title: '感谢卡',
      items: [{ text: `社区本周发出了 ${postcardCount} 张新感谢卡` }],
    });
  }

  // 5. New members
  const newMembers = await prisma.user.findMany({
    where: { createdAt: { gte: cutoff }, userStatus: 'approved' },
    select: { name: true },
  });
  if (newMembers.length > 0) {
    sections.push({
      icon: '👥',
      title: '新成员',
      items: newMembers.map((u) => ({ text: `${u.name} 加入了串门儿！` })),
    });
  }

  return sections.length > 0 ? sections : null;
}

export async function sendDailyDigest(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'DIGEST' } });
  if (!rule?.enabled) return 0;

  // Build content FIRST — skip if nothing happened
  const sections = await buildDigestSections(prisma);
  if (!sections) {
    log.info('DIGEST: no content, skipping');
    return 0;
  }

  const digestHtml = renderDigestBlock(sections);

  // Get eligible users (approved + not unsubscribed)
  const candidates: UserRow[] = await prisma.user.findMany({
    where: ELIGIBLE_USER_WHERE,
    select: { id: true, name: true, email: true },
  });

  // 1-day cooldown: one digest per user per day
  const eligible = await filterByCooldown(
    prisma,
    candidates.map((u) => u.id),
    'DIGEST',
    rule.cooldownDays,
  );

  const date = new Date().toISOString().split('T')[0];
  let sent = 0;

  for (const user of candidates) {
    if (!eligible.has(user.id)) continue;
    try {
      const result = await sendTemplatedEmail(prisma, {
        to: user.email,
        ruleId: 'DIGEST',
        variables: { date },
        htmlBlock: digestHtml,
        ctaLabel: '查看完整动态',
        ctaUrl: 'https://chuanmener.club',
      });
      await prisma.emailLog.create({
        data: { userId: user.id, ruleId: 'DIGEST', messageId: result.MessageId },
      });
      sent++;
    } catch (err) {
      log.error({ err, userId: user.id }, 'DIGEST send failed');
    }
  }

  log.info(`DIGEST: ${sent}/${candidates.length} sent`);
  return sent;
}

// ── P4-C: Host tribute notification (tribute hosts only) ────

export async function sendHostTributeNotif(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
  tribute: HostTributeResult,
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'P4-C' } });
  if (!rule?.enabled) return 0;

  const hosts: UserRow[] = await prisma.user.findMany({
    where: {
      id: { in: tribute.hostIds },
      userStatus: 'approved',
      OR: [
        { preferences: null },
        { preferences: { emailState: { not: 'unsubscribed' } } },
      ],
    },
    select: { id: true, name: true, email: true },
  });

  const eligible = await filterByRefId(
    prisma,
    hosts.map((u) => u.id),
    'P4-C',
    tribute.title,
  );

  let sent = 0;
  for (const user of hosts) {
    if (!eligible.has(user.id)) continue;
    try {
      const result = await sendTemplatedEmail(prisma, {
        to: user.email,
        ruleId: 'P4-C',
        variables: { userName: user.name },
      });
      await prisma.emailLog.create({
        data: {
          userId: user.id,
          ruleId: 'P4-C',
          refId: tribute.title,
          messageId: result.MessageId,
        },
      });
      sent++;
    } catch (err) {
      log.error({ err, userId: user.id }, 'P4-C send failed');
    }
  }

  log.info(`P4-C host tribute notif: ${sent}/${hosts.length} sent`);
  return sent;
}
