import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { sendEmail, sendTemplatedEmail } from '../services/emailService.js';
import { filterByCooldown, filterByRefId, ELIGIBLE_USER_WHERE } from './helpers.js';
import type { HostTributeResult } from './contentAutomation.js';
import { renderDigestBlock, type DigestSection } from '../emails/template.js';
import { EventRepository } from '../modules/events/event.repository.js';

// ── Shared types ─────────────────────────────────────────────

interface UserRow {
  id: string;
  name: string;
  email: string;
}

// ── P1: Post-event recap email (2-6h after event ends) ──────

export async function sendPostEventRecap(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'P1' } });
  if (!rule?.enabled) return 0;

  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

  // Find events that ended 2-6 hours ago (use startsAt + 4h as default end estimate)
  const recentlyEnded = await prisma.event.findMany({
    where: {
      phase: 'ended',
      startsAt: { gte: new Date(sixHoursAgo.getTime() - 4 * 60 * 60 * 1000), lte: new Date(twoHoursAgo.getTime() - 4 * 60 * 60 * 1000) },
    },
    include: {
      host: { select: { name: true } },
      signups: {
        where: { status: 'accepted', participated: true },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      recommendations: {
        where: { isSelected: true },
        include: { recommendation: { select: { title: true, category: true } } },
      },
    },
  });

  let sent = 0;
  for (const event of recentlyEnded) {
    const participants = event.signups
      .map((s) => s.user)
      .filter((u): u is UserRow => !!u?.email);

    // Filter by refId to avoid duplicate sends per event per user
    const eligible = await filterByRefId(
      prisma,
      participants.map((u) => u.id),
      'P1',
      event.id,
    );

    // Build recommendation mention
    const selectedRec = event.recommendations?.[0]?.recommendation;
    const recMention = selectedRec ? `今天我们一起体验了「${selectedRec.title}」` : '';

    for (const user of participants) {
      if (!eligible.has(user.id)) continue;
      try {
        const result = await sendTemplatedEmail(prisma, {
          to: user.email,
          ruleId: 'P1',
          variables: {
            userName: user.name,
            eventTitle: event.title,
            hostName: event.host?.name ?? '',
            recMention,
          },
          ctaLabel: '回顾活动',
          ctaUrl: `https://chuanmener.club/events/${event.id}`,
        });
        await prisma.emailLog.create({
          data: { userId: user.id, ruleId: 'P1', refId: event.id, messageId: result.MessageId },
        });
        sent++;
      } catch (err) {
        log.error({ err, userId: user.id, eventId: event.id }, 'P1 send failed');
      }
    }
  }

  log.info(`P1 post-event recap: ${sent} sent for ${recentlyEnded.length} events`);
  return sent;
}

// ── P0-B: Event reminder (20-28h before event) ─────────────

export async function sendEventReminder(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'P0-B' } });
  if (!rule?.enabled) return 0;

  const now = new Date();
  const in20h = new Date(now.getTime() + 20 * 60 * 60 * 1000);
  const in28h = new Date(now.getTime() + 28 * 60 * 60 * 1000);

  // Find events starting in 20-28 hours
  const upcomingEvents = await prisma.event.findMany({
    where: {
      startsAt: { gte: in20h, lte: in28h },
      phase: { in: ['open', 'closed', 'invite'] },
    },
    include: {
      host: { select: { name: true } },
      signups: {
        where: { status: 'accepted' },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  let sent = 0;
  for (const event of upcomingEvents) {
    const participants = event.signups
      .map((s) => s.user)
      .filter((u): u is UserRow => !!u?.email);

    // Use refId to avoid duplicate reminders per event
    const eligible = await filterByRefId(
      prisma,
      participants.map((u) => u.id),
      'P0-B',
      event.id,
    );

    const eventDate = event.startsAt.toLocaleDateString('zh-CN', {
      month: 'long', day: 'numeric', weekday: 'short',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const acceptedCount = event.signups.length;

    for (const user of participants) {
      if (!eligible.has(user.id)) continue;
      try {
        const result = await sendTemplatedEmail(prisma, {
          to: user.email,
          ruleId: 'P0-B',
          variables: {
            userName: user.name,
            eventTitle: event.title,
            eventDate,
            eventLocation: event.location ?? '',
            hostName: event.host?.name ?? '',
            attendeeCount: String(acceptedCount),
          },
          ctaLabel: '查看活动详情',
          ctaUrl: `https://chuanmener.club/events/${event.id}`,
        });
        await prisma.emailLog.create({
          data: { userId: user.id, ruleId: 'P0-B', refId: event.id, messageId: result.MessageId },
        });
        // Update lastReminderSentAt
        const signup = event.signups.find((s) => s.user?.id === user.id);
        if (signup) {
          await prisma.eventSignup.update({
            where: { id: signup.id },
            data: { lastReminderSentAt: new Date() },
          });
        }
        sent++;
      } catch (err) {
        log.error({ err, userId: user.id, eventId: event.id }, 'P0-B send failed');
      }
    }
  }

  log.info(`P0-B event reminder: ${sent} sent for ${upcomingEvents.length} events`);
  return sent;
}

// ── P3-F: Churn recall (inactive 14+ days, personalized) ────

export async function sendChurnRecall(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'P3-F' } });
  if (!rule?.enabled) return 0;

  const inactiveDays = (rule.config as any)?.inactiveDays ?? 14;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - inactiveDays);

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

  // Gather personalized stats for the recall period
  const [newEventCount, newMemberCount, newRecCount] = await Promise.all([
    prisma.event.count({ where: { createdAt: { gte: cutoff }, phase: { not: 'cancelled' } } }),
    prisma.user.count({ where: { approvedAt: { gte: cutoff }, userStatus: 'approved' } }),
    prisma.recommendation.count({ where: { createdAt: { gte: cutoff } } }),
  ]);

  let sent = 0;
  for (const user of candidates) {
    if (!eligible.has(user.id)) continue;
    try {
      const result = await sendTemplatedEmail(prisma, {
        to: user.email,
        ruleId: 'P3-F',
        variables: {
          userName: user.name,
          newEventCount: String(newEventCount),
          newMemberCount: String(newMemberCount),
          newRecCount: String(newRecCount),
        },
        ctaLabel: '回来看看',
        ctaUrl: 'https://chuanmener.club',
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

// ── P3-G: Second churn recall (30+ days, stronger tone) ─────

export async function sendSecondRecall(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'P3-G' } });
  if (!rule?.enabled) return 0;

  const inactiveDays = (rule.config as any)?.inactiveDays ?? 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - inactiveDays);

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

  // Only send to users who already received P3-F (first recall)
  const p3fSent = await prisma.emailLog.findMany({
    where: {
      userId: { in: candidates.map((u) => u.id) },
      ruleId: 'P3-F',
    },
    select: { userId: true },
  });
  const p3fSentSet = new Set(p3fSent.map((r) => r.userId));
  const eligible2 = candidates.filter((u) => p3fSentSet.has(u.id));

  const eligible = await filterByCooldown(
    prisma,
    eligible2.map((u) => u.id),
    'P3-G',
    rule.cooldownDays,
  );

  // Find upcoming events to recommend
  const upcomingEvents = await prisma.event.findMany({
    where: { phase: { in: ['open', 'invite'] }, startsAt: { gte: new Date() } },
    select: { title: true },
    orderBy: { startsAt: 'asc' },
    take: 3,
  });
  const eventList = upcomingEvents.map((e) => e.title).join('、') || '';

  let sent = 0;
  for (const user of eligible2) {
    if (!eligible.has(user.id)) continue;
    try {
      const result = await sendTemplatedEmail(prisma, {
        to: user.email,
        ruleId: 'P3-G',
        variables: { userName: user.name, upcomingEvents: eventList },
        ctaLabel: '查看最新活动',
        ctaUrl: 'https://chuanmener.club/events',
      });
      await prisma.emailLog.create({
        data: { userId: user.id, ruleId: 'P3-G', messageId: result.MessageId },
      });
      sent++;
    } catch (err) {
      log.error({ err, userId: user.id }, 'P3-G send failed');
    }
  }

  log.info(`P3-G second recall: ${sent}/${eligible2.length} sent`);
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

async function buildDigestSections(prisma: PrismaClient, userId?: string): Promise<DigestSection[] | null> {
  const cutoff = new Date();
  cutoff.setTime(cutoff.getTime() - 24 * 60 * 60 * 1000);

  const now = new Date();
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);

  const sections: DigestSection[] = [];

  // ── Personal interaction feedback (if userId provided) ──
  if (userId) {
    const interactionItems: { text: string; url?: string }[] = [];

    // Get user's hosted event IDs (for filtering likes/comments)
    const userEvents = await prisma.event.findMany({
      where: { hostId: userId },
      select: { id: true, title: true },
    });
    const userEventIds = userEvents.map((e) => e.id);
    const eventTitleMap = new Map(userEvents.map((e) => [e.id, e.title]));

    const [eventLikes, recVotes, eventComments] = await Promise.all([
      // Likes on events the user hosted
      userEventIds.length > 0
        ? prisma.like.count({
            where: {
              entityType: 'event',
              entityId: { in: userEventIds },
              createdAt: { gte: cutoff },
              userId: { not: userId },
            },
          })
        : 0,

      // Votes on user's recommendations
      prisma.recommendationVote.findMany({
        where: {
          createdAt: { gte: cutoff },
          recommendation: { authorId: userId },
        },
        include: {
          recommendation: { select: { title: true } },
        },
      }),

      // Comments on user's hosted events
      userEventIds.length > 0
        ? prisma.comment.findMany({
            where: {
              entityType: 'event',
              entityId: { in: userEventIds },
              createdAt: { gte: cutoff },
              authorId: { not: userId },
            },
            select: { entityId: true },
          })
        : [],
    ]);

    // Summarize rec votes
    const recVoteMap = new Map<string, number>();
    for (const v of recVotes) {
      const title = (v as any).recommendation?.title ?? '推荐';
      recVoteMap.set(title, (recVoteMap.get(title) ?? 0) + 1);
    }
    for (const [title, count] of recVoteMap) {
      interactionItems.push({ text: `你的推荐「${title}」收到了 ${count} 个新投票` });
    }

    // Summarize comments on user's events
    if (eventComments.length > 0) {
      const firstEventId = eventComments[0].entityId;
      const eventTitle = eventTitleMap.get(firstEventId) ?? '活动';
      interactionItems.push({
        text: `有 ${eventComments.length} 条新评论在你的活动「${eventTitle}」`,
        url: `https://chuanmener.club/events/${firstEventId}`,
      });
    }

    // Summarize likes on user's events
    if (eventLikes > 0) {
      interactionItems.push({ text: `你的活动收到了 ${eventLikes} 个新赞` });
    }

    if (interactionItems.length > 0) {
      sections.push({
        icon: '💬',
        title: '你的动态',
        items: interactionItems,
      });
    }
  }

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

  // Check if there's any global content first (skip per-user queries if nothing happened)
  const globalSections = await buildDigestSections(prisma);
  if (!globalSections) {
    log.info('DIGEST: no content, skipping');
    return 0;
  }

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
      // Build per-user digest with personal interaction feedback
      const personalSections = await buildDigestSections(prisma, user.id);
      const digestHtml = renderDigestBlock(personalSections ?? globalSections);

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

// ── Waitlist offer expiry (24h auto-expire) ─────────────────

export async function processWaitlistExpiry(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<{ expired: number; promoted: number }> {
  const cutoff = new Date();
  cutoff.setTime(cutoff.getTime() - 24 * 60 * 60 * 1000);

  // Find all offered signups that have not been responded to and offeredAt > 24h ago
  const expiredOffers = await prisma.eventSignup.findMany({
    where: {
      status: 'offered',
      offeredAt: { lt: cutoff },
      respondedAt: null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      event: { select: { id: true, title: true } },
    },
  });

  if (expiredOffers.length === 0) {
    return { expired: 0, promoted: 0 };
  }

  const repo = new EventRepository(prisma);
  let expired = 0;
  let promoted = 0;

  for (const offer of expiredOffers) {
    try {
      // Mark as declined (expired)
      await prisma.eventSignup.update({
        where: { id: offer.id },
        data: { status: 'declined', respondedAt: new Date() },
      });
      expired++;

      // Send expiry notification
      if (offer.user?.email) {
        try {
          await sendEmail({
            to: offer.user.email,
            subject: `${offer.event.title} 的等位机会已过期`,
            text: `Hi ${offer.user.name}，\n\n${offer.event.title} 的等位名额已超过24小时未确认，机会已过期。希望下次活动能见到你！\n\n— 串门儿`,
          });
        } catch { /* best effort */ }
      }

      // Promote next waitlisted person
      const promotedSignup = await repo.promoteNextWaitlisted(offer.eventId);
      if (promotedSignup) {
        promoted++;
        // Notify the newly promoted person
        if ((promotedSignup as any).user?.email) {
          try {
            await sendEmail({
              to: (promotedSignup as any).user.email,
              subject: `好消息！${offer.event.title} 有名额了`,
              text: `Hi ${(promotedSignup as any).user.name}，\n\n${offer.event.title} 有一个名额空出了！请在24小时内确认是否参加。\n\n前往活动页面确认：https://chuanmener.club/events/${offer.eventId}\n\n— 串门儿`,
            });
          } catch { /* best effort */ }
        }
      }
    } catch (err) {
      log.error({ err, signupId: offer.id }, 'Waitlist expiry processing failed');
    }
  }

  log.info(`Waitlist expiry: ${expired} expired, ${promoted} promoted`);
  return { expired, promoted };
}
