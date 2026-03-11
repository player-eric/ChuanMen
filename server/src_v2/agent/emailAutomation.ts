import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { sendTemplatedEmail } from '../services/emailService.js';
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
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Find events that ended (phase changed) within the last 24 hours
  // Use updatedAt as proxy for when phase changed to 'ended'
  const recentlyEnded = await prisma.event.findMany({
    where: {
      phase: 'ended',
      updatedAt: { gte: twentyFourHoursAgo },
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
      tasks: {
        include: { claimedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
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
        // Build task info for this user
        const myTask = (event as any).tasks?.find((t: any) => t.claimedBy?.id === user.id);
        const unclaimedTasks = ((event as any).tasks ?? []).filter((t: any) => !t.claimedById);
        let taskInfo = '';
        if (myTask) {
          taskInfo = `你的分工：${myTask.role}${myTask.description ? ` — ${myTask.description}` : ''}`;
        } else if (unclaimedTasks.length > 0) {
          const t = unclaimedTasks[0];
          taskInfo = `「${t.role}」还没有人认领${t.description ? `（${t.description}）` : ''}，你要来吗？`;
        }
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
            taskInfo,
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

// ── Unclaimed task reminder (44-52h before event) ────────────

export async function sendUnclaimedTaskReminder(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const now = new Date();
  const in44h = new Date(now.getTime() + 44 * 60 * 60 * 1000);
  const in52h = new Date(now.getTime() + 52 * 60 * 60 * 1000);

  // Find events starting in 44-52h that have unclaimed tasks
  const events = await prisma.event.findMany({
    where: {
      startsAt: { gte: in44h, lte: in52h },
      phase: { in: ['open', 'closed', 'invite'] },
      tasks: { some: { claimedById: null } },
    },
    include: {
      host: { select: { name: true } },
      tasks: {
        where: { claimedById: null },
        orderBy: { createdAt: 'asc' },
      },
      signups: {
        where: { status: 'accepted' },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  let sent = 0;
  for (const event of events) {
    const unclaimedTasks = event.tasks;
    if (unclaimedTasks.length === 0) continue;

    // Find users who are signed up but haven't claimed any task
    const claimedUserIds = new Set(
      (await prisma.eventTask.findMany({
        where: { eventId: event.id, claimedById: { not: null } },
        select: { claimedById: true },
      })).map((t) => t.claimedById!),
    );

    const candidates = event.signups
      .map((s) => s.user)
      .filter((u): u is UserRow => !!u?.email && !claimedUserIds.has(u.id));

    // Deduplicate using refId = eventId + "-task-reminder"
    const refId = `${event.id}-task-reminder`;
    const eligible = await filterByRefId(
      prisma,
      candidates.map((u) => u.id),
      'P0-C',
      refId,
    );

    const firstTask = unclaimedTasks[0];
    const taskDesc = firstTask.description ? `（${firstTask.description}）` : '';

    for (const user of candidates) {
      if (!eligible.has(user.id)) continue;
      try {
        const taskList = unclaimedTasks.map((t) => `- ${t.role}${t.description ? `：${t.description}` : ''}`).join('\n');
        const result = await sendTemplatedEmail(prisma, {
          to: user.email,
          ruleId: 'P0-C',
          variables: { userName: user.name, eventTitle: event.title, taskRole: firstTask.role, taskList },
          ctaLabel: '查看活动',
          ctaUrl: `https://chuanmener.club/events/${event.id}`,
        });
        await prisma.emailLog.create({
          data: { userId: user.id, ruleId: 'P0-C', refId, messageId: result.MessageId },
        });
        sent++;
      } catch (err) {
        log.error({ err, userId: user.id, eventId: event.id }, 'Task reminder send failed');
      }
    }
  }

  log.info(`Unclaimed task reminder: ${sent} sent for ${events.length} events`);
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
        ctaLabel: '发起活动',
        ctaUrl: 'https://chuanmener.club/events/new',
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
        ctaLabel: '发起活动',
        ctaUrl: 'https://chuanmener.club/events/new',
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
          ctaLabel: '查看我的主页',
          ctaUrl: 'https://chuanmener.club/me',
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

  // 6. Community announcements (milestones, tributes) from last 24h
  const announcements = await prisma.announcement.findMany({
    where: { createdAt: { gte: cutoff } },
    select: { title: true, body: true },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });
  if (announcements.length > 0) {
    sections.push({
      icon: '🎉',
      title: '社群动态',
      items: announcements.map((a) => ({ text: a.title })),
    });
  }

  // 7. Personal engagement nudge (P3 rules, pick first matching, max 1)
  if (userId) {
    const nudge = await buildPersonalNudge(prisma, userId);
    if (nudge) {
      sections.push(nudge);
    }
  }

  return sections.length > 0 ? sections : null;
}

/**
 * Build a personal nudge section for the daily digest.
 * Checks P3-C/D/E/F conditions in priority order, returns first match.
 */
async function buildPersonalNudge(
  prisma: PrismaClient,
  userId: string,
): Promise<DigestSection | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      participationCount: true,
      hostCount: true,
      approvedAt: true,
      lastActiveAt: true,
    },
  });
  if (!user) return null;

  // Helper: check cooldown for a rule
  const hasCooldown = async (ruleId: string, days: number) => {
    const recent = await prisma.emailLog.findFirst({
      where: { userId, ruleId, sentAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } },
    });
    return !!recent;
  };

  // P3-C: New member hasn't attended (joined within 14 days, 0 events)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  if (user.approvedAt && user.approvedAt >= fourteenDaysAgo && user.participationCount === 0) {
    if (!(await hasCooldown('P3-C', 3))) {
      const upcoming = await prisma.event.findMany({
        where: { phase: { in: ['open', 'invite'] }, startsAt: { gte: new Date() } },
        select: { title: true, id: true, startsAt: true },
        orderBy: { startsAt: 'asc' },
        take: 3,
      });
      if (upcoming.length > 0) {
        return {
          icon: '💡',
          title: '去串串门？',
          items: upcoming.map((e) => {
            const d = e.startsAt.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
            return { text: `${e.title}（${d}）`, url: `https://chuanmener.club/events/${e.id}` };
          }),
        };
      }
    }
  }

  // P3-D: Encourage hosting (participated 3+, never hosted)
  if (user.participationCount >= 3 && user.hostCount === 0) {
    if (!(await hasCooldown('P3-D', 30))) {
      return {
        icon: '💡',
        title: '试试做 Host？',
        items: [{ text: `你已经来了 ${user.participationCount} 次了，要不要试试自己办一次？`, url: 'https://chuanmener.club/events/create' }],
      };
    }
  }

  // P3-E: Silent host recall (hosted before, no event in 60 days)
  if (user.hostCount > 0) {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const recentHost = await prisma.event.findFirst({
      where: { hostId: userId, startsAt: { gte: sixtyDaysAgo } },
    });
    if (!recentHost && !(await hasCooldown('P3-E', 30))) {
      return {
        icon: '💡',
        title: '好久没见你开门了',
        items: [{ text: '最近忙？什么时候再来一场？', url: 'https://chuanmener.club/events/create' }],
      };
    }
  }

  // P3-F: Churn recall (inactive 14+ days)
  if (user.lastActiveAt && user.lastActiveAt < fourteenDaysAgo) {
    if (!(await hasCooldown('P3-F', 21))) {
      return {
        icon: '💡',
        title: '好久没见',
        items: [{ text: '最近有新活动和推荐，回来看看？', url: 'https://chuanmener.club' }],
      };
    }
  }

  return null;
}

export async function sendDailyDigest(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'DIGEST' } });
  if (!rule?.enabled) {
    log.info(`DIGEST: rule ${rule ? 'disabled' : 'missing'}, skipping`);
    return 0;
  }

  // Check if there's any global content first (skip per-user queries if nothing happened)
  const globalSections = await buildDigestSections(prisma);
  if (!globalSections) {
    log.info('DIGEST: no content in last 24h, skipping');
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

  log.info(`DIGEST: ${candidates.length} candidates, ${eligible.size} eligible after cooldown`);

  const date = new Date().toISOString().split('T')[0];
  let sent = 0;

  for (const user of candidates) {
    if (!eligible.has(user.id)) continue;
    try {
      // Build per-user digest with personal interaction feedback + nudge
      const personalSections = await buildDigestSections(prisma, user.id);
      const digestHtml = renderDigestBlock(personalSections ?? globalSections);

      const result = await sendTemplatedEmail(prisma, {
        to: user.email,
        ruleId: 'DIGEST',
        variables: { date, digestContent: '' },
        htmlBlock: digestHtml,
        ctaLabel: '查看完整动态',
        ctaUrl: 'https://chuanmener.club',
      });
      await prisma.emailLog.create({
        data: { userId: user.id, ruleId: 'DIGEST', messageId: result.MessageId },
      });

      // Log the nudge rule ID for cooldown tracking
      const nudgeSection = (personalSections ?? []).find((s) => s.icon === '💡');
      if (nudgeSection) {
        const nudgeRuleMap: Record<string, string> = {
          '去串串门？': 'P3-C',
          '试试做 Host？': 'P3-D',
          '好久没见你开门了': 'P3-E',
          '好久没见': 'P3-F',
        };
        const nudgeRuleId = nudgeRuleMap[nudgeSection.title];
        if (nudgeRuleId) {
          await prisma.emailLog.create({
            data: { userId: user.id, ruleId: nudgeRuleId },
          });
        }
      }

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
        ctaLabel: '查看我的主页',
        ctaUrl: 'https://chuanmener.club/me',
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
          await sendTemplatedEmail(prisma, {
            to: offer.user.email,
            ruleId: 'TXN-17',
            variables: { userName: offer.user.name, eventTitle: offer.event.title },
            ctaLabel: '浏览其他活动',
            ctaUrl: 'https://chuanmener.club/events',
          });
        } catch { /* best effort */ }
      }

      // Promote next waitlisted person
      const promotedSignup = await repo.promoteNextWaitlisted(offer.eventId);
      if (promotedSignup) {
        promoted++;
        // Send TXN-6 offer notification to the newly promoted person
        if ((promotedSignup as any).user?.email) {
          try {
            const u = (promotedSignup as any).user;
            const result = await sendTemplatedEmail(prisma, {
              to: u.email,
              ruleId: 'TXN-6',
              variables: { userName: u.name, eventTitle: offer.event.title },
              ctaLabel: '确认参加',
              ctaUrl: `https://chuanmener.club/events/${offer.eventId}`,
            });
            await prisma.emailLog.create({
              data: { userId: u.id, ruleId: 'TXN-6', refId: offer.eventId, messageId: result.MessageId },
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

// ── Lottery: draw notification (sent when someone is drawn) ──

export async function sendLotteryDrawNotif(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
  drawnUser: { id: string; name: string; email: string },
  weekNumber: number,
): Promise<void> {
  const siteUrl = 'https://chuanmener.club';
  try {
    await sendTemplatedEmail(prisma, {
      to: drawnUser.email,
      ruleId: 'LOTTERY-DRAW',
      variables: { userName: drawnUser.name },
      ctaLabel: '前往发起小聚',
      ctaUrl: siteUrl,
    });
    await prisma.emailLog.create({
      data: { userId: drawnUser.id, ruleId: 'LOTTERY-DRAW', refId: `week-${weekNumber}` },
    });
    log.info(`Lottery draw notification sent to ${drawnUser.name}`);
  } catch (err) {
    log.error({ err, userId: drawnUser.id }, 'Lottery draw notification failed');
  }
}

// ── Lottery: 3-consecutive-events reminder ───────────────────

export async function sendConsecutiveEventsReminder(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const siteUrl = 'https://chuanmener.club';

  // Find users with 3+ consecutive events who are NOT in the candidate pool
  const candidates: UserRow[] = await prisma.user.findMany({
    where: {
      userStatus: 'approved',
      consecutiveEvents: { gte: 3 },
      hostCandidate: false,
      OR: [
        { preferences: null },
        { preferences: { emailState: { not: 'unsubscribed' } } },
      ],
    },
    select: { id: true, name: true, email: true },
  });

  // Filter by cooldown (30 days between reminders)
  const eligible = await filterByCooldown(
    prisma,
    candidates.map((u) => u.id),
    'LOTTERY-3X',
    30,
  );

  let sent = 0;
  for (const user of candidates) {
    if (!eligible.has(user.id)) continue;
    try {
      await sendTemplatedEmail(prisma, {
        to: user.email,
        ruleId: 'LOTTERY-3X',
        variables: { userName: user.name },
        ctaLabel: '加入轮值候选池',
        ctaUrl: `${siteUrl}/settings`,
      });
      await prisma.emailLog.create({
        data: { userId: user.id, ruleId: 'LOTTERY-3X' },
      });
      sent++;
    } catch (err) {
      log.error({ err, userId: user.id }, 'LOTTERY-3X send failed');
    }
  }

  log.info(`LOTTERY-3X consecutive events reminder: ${sent}/${candidates.length} sent`);
  return sent;
}

// ── P0-D: Same-day event reminder (0-8h before event) ─────

export async function sendSameDayReminder(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'P0-D' } });
  if (!rule?.enabled) return 0;

  const now = new Date();
  const in8h = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  const events = await prisma.event.findMany({
    where: {
      startsAt: { gte: now, lte: in8h },
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
  for (const event of events) {
    const participants = event.signups.map((s) => s.user).filter((u): u is UserRow => !!u?.email);
    const eligible = await filterByRefId(prisma, participants.map((u) => u.id), 'P0-D', event.id);
    const eventDate = event.startsAt.toLocaleDateString('zh-CN', {
      month: 'long', day: 'numeric', weekday: 'short',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });

    for (const user of participants) {
      if (!eligible.has(user.id)) continue;
      try {
        const result = await sendTemplatedEmail(prisma, {
          to: user.email,
          ruleId: 'P0-D',
          variables: {
            userName: user.name,
            eventTitle: event.title,
            eventDate,
            eventLocation: event.location ?? '',
          },
          ctaLabel: '查看活动详情',
          ctaUrl: `https://chuanmener.club/events/${event.id}`,
        });
        await prisma.emailLog.create({
          data: { userId: user.id, ruleId: 'P0-D', refId: event.id, messageId: result.MessageId },
        });
        sent++;
      } catch (err) {
        log.error({ err, userId: user.id, eventId: event.id }, 'P0-D send failed');
      }
    }
  }

  log.info(`P0-D same-day reminder: ${sent} sent for ${events.length} events`);
  return sent;
}

// ── P2-A: New event notification (all eligible users) ─────

export async function sendNewEventNotif(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'P2-A' } });
  if (!rule?.enabled) return 0;

  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  const twentyMinAgo = new Date(Date.now() - 20 * 60 * 1000);

  // Find events created in the last 10-20 min window (agent runs every 10 min)
  const newEvents = await prisma.event.findMany({
    where: {
      createdAt: { gte: twentyMinAgo, lte: tenMinAgo },
      phase: { not: 'cancelled' },
    },
    include: {
      host: { select: { id: true, name: true } },
    },
  });

  if (newEvents.length === 0) return 0;

  const allUsers: UserRow[] = await prisma.user.findMany({
    where: ELIGIBLE_USER_WHERE,
    select: { id: true, name: true, email: true },
  });

  let sent = 0;
  for (const event of newEvents) {
    const eligible = await filterByRefId(prisma, allUsers.map((u) => u.id), 'P2-A', event.id);
    const eventDate = event.startsAt.toLocaleDateString('zh-CN', {
      month: 'long', day: 'numeric', weekday: 'short',
    });

    for (const user of allUsers) {
      if (!eligible.has(user.id)) continue;
      if (user.id === event.hostId) continue; // Don't notify the host
      try {
        const result = await sendTemplatedEmail(prisma, {
          to: user.email,
          ruleId: 'P2-A',
          variables: {
            userName: user.name,
            hostName: event.host?.name ?? '',
            eventTitle: event.title,
            eventDate,
            eventLocation: event.location ?? '',
          },
          ctaLabel: '查看活动',
          ctaUrl: `https://chuanmener.club/events/${event.id}`,
        });
        await prisma.emailLog.create({
          data: { userId: user.id, ruleId: 'P2-A', refId: event.id, messageId: result.MessageId },
        });
        sent++;
      } catch (err) {
        log.error({ err, userId: user.id, eventId: event.id }, 'P2-A send failed');
      }
    }
  }

  log.info(`P2-A new event notif: ${sent} sent for ${newEvents.length} events`);
  return sent;
}

// ── P2-B: New recommendation notification ─────────────────

export async function sendNewRecNotif(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'P2-B' } });
  if (!rule?.enabled) return 0;

  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  const twentyMinAgo = new Date(Date.now() - 20 * 60 * 1000);

  const newRecs = await prisma.recommendation.findMany({
    where: { createdAt: { gte: twentyMinAgo, lte: tenMinAgo } },
    include: { author: { select: { id: true, name: true } } },
  });

  if (newRecs.length === 0) return 0;

  const allUsers: UserRow[] = await prisma.user.findMany({
    where: ELIGIBLE_USER_WHERE,
    select: { id: true, name: true, email: true },
  });

  let sent = 0;
  for (const rec of newRecs) {
    const eligible = await filterByRefId(prisma, allUsers.map((u) => u.id), 'P2-B', rec.id);
    for (const user of allUsers) {
      if (!eligible.has(user.id)) continue;
      if (user.id === rec.authorId) continue;
      try {
        const result = await sendTemplatedEmail(prisma, {
          to: user.email,
          ruleId: 'P2-B',
          variables: {
            userName: user.name,
            authorName: rec.author?.name ?? '',
            recTitle: rec.title,
          },
          ctaLabel: '查看推荐',
          ctaUrl: `https://chuanmener.club/discover/recommendations/${rec.id}`,
        });
        await prisma.emailLog.create({
          data: { userId: user.id, ruleId: 'P2-B', refId: rec.id, messageId: result.MessageId },
        });
        sent++;
      } catch (err) {
        log.error({ err, userId: user.id }, 'P2-B send failed');
      }
    }
  }

  log.info(`P2-B new rec notif: ${sent} sent for ${newRecs.length} recs`);
  return sent;
}

// ── P3-A: One-week onboarding check-in ───────────────────

export async function sendOnboardingCheckin(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'P3-A' } });
  if (!rule?.enabled) return 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

  // Users approved 7-8 days ago
  const candidates: UserRow[] = await prisma.user.findMany({
    where: {
      ...ELIGIBLE_USER_WHERE,
      approvedAt: { gte: eightDaysAgo, lte: sevenDaysAgo },
    },
    select: { id: true, name: true, email: true },
  });

  const eligible = await filterByCooldown(prisma, candidates.map((u) => u.id), 'P3-A', rule.cooldownDays);

  let sent = 0;
  for (const user of candidates) {
    if (!eligible.has(user.id)) continue;
    try {
      const result = await sendTemplatedEmail(prisma, {
        to: user.email,
        ruleId: 'P3-A',
        variables: { userName: user.name },
        ctaLabel: '去串门儿看看',
        ctaUrl: 'https://chuanmener.club',
      });
      await prisma.emailLog.create({
        data: { userId: user.id, ruleId: 'P3-A', messageId: result.MessageId },
      });
      sent++;
    } catch (err) {
      log.error({ err, userId: user.id }, 'P3-A send failed');
    }
  }

  log.info(`P3-A onboarding check-in: ${sent}/${candidates.length} sent`);
  return sent;
}

// ── P3-B: Post-first-event follow-up ─────────────────────

export async function sendFirstEventFollowup(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'P3-B' } });
  if (!rule?.enabled) return 0;

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  // Find users whose first-ever participation was in an event that ended 6-12h ago
  const recentlyEnded = await prisma.event.findMany({
    where: {
      phase: 'ended',
      startsAt: { gte: new Date(twelveHoursAgo.getTime() - 4 * 60 * 60 * 1000), lte: new Date(sixHoursAgo.getTime() - 4 * 60 * 60 * 1000) },
    },
    select: {
      id: true,
      title: true,
      signups: {
        where: { status: 'accepted', participated: true },
        select: { userId: true, user: { select: { id: true, name: true, email: true, participationCount: true } } },
      },
    },
  });

  let sent = 0;
  for (const event of recentlyEnded) {
    // Only target users with participationCount <= 1 (first event)
    const firstTimers = event.signups
      .filter((s) => s.user && s.user.participationCount <= 1 && s.user.email)
      .map((s) => s.user as UserRow & { participationCount: number });

    const eligible = await filterByRefId(prisma, firstTimers.map((u) => u.id), 'P3-B', event.id);

    for (const user of firstTimers) {
      if (!eligible.has(user.id)) continue;
      try {
        const result = await sendTemplatedEmail(prisma, {
          to: user.email,
          ruleId: 'P3-B',
          variables: { userName: user.name, eventTitle: event.title },
          ctaLabel: '回顾活动',
          ctaUrl: `https://chuanmener.club/events/${event.id}`,
        });
        await prisma.emailLog.create({
          data: { userId: user.id, ruleId: 'P3-B', refId: event.id, messageId: result.MessageId },
        });
        sent++;
      } catch (err) {
        log.error({ err, userId: user.id }, 'P3-B send failed');
      }
    }
  }

  log.info(`P3-B first event follow-up: ${sent} sent`);
  return sent;
}

// ── P3-C: New member hasn't attended any event ────────────

export async function sendNewMemberNudge(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'P3-C' } });
  if (!rule?.enabled) return 0;

  const maxDays = (rule.config as any)?.maxDaysSinceJoin ?? 14;
  const cutoff = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000);

  // Users approved within maxDays who have never participated
  const candidates: UserRow[] = await prisma.user.findMany({
    where: {
      ...ELIGIBLE_USER_WHERE,
      approvedAt: { gte: cutoff },
      participationCount: 0,
    },
    select: { id: true, name: true, email: true },
  });

  const eligible = await filterByCooldown(prisma, candidates.map((u) => u.id), 'P3-C', rule.cooldownDays);

  // Get upcoming events for the email
  const upcomingEvents = await prisma.event.findMany({
    where: { phase: { in: ['open', 'invite'] }, startsAt: { gte: new Date() } },
    select: { title: true },
    orderBy: { startsAt: 'asc' },
    take: 3,
  });
  const eventList = upcomingEvents.map((e) => e.title).join(', ') || '(暂无)';

  let sent = 0;
  for (const user of candidates) {
    if (!eligible.has(user.id)) continue;
    try {
      const result = await sendTemplatedEmail(prisma, {
        to: user.email,
        ruleId: 'P3-C',
        variables: { userName: user.name, upcomingEvents: eventList },
        ctaLabel: '浏览活动',
        ctaUrl: 'https://chuanmener.club/events',
      });
      await prisma.emailLog.create({
        data: { userId: user.id, ruleId: 'P3-C', messageId: result.MessageId },
      });
      sent++;
    } catch (err) {
      log.error({ err, userId: user.id }, 'P3-C send failed');
    }
  }

  log.info(`P3-C new member nudge: ${sent}/${candidates.length} sent`);
  return sent;
}

// ── P4-B: Weekly recommendation digest ────────────────────

export async function sendRecDigest(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
): Promise<number> {
  const rule = await prisma.emailRule.findUnique({ where: { id: 'P4-B' } });
  if (!rule?.enabled) return 0;

  const minNewRecs = (rule.config as any)?.minNewMovies ?? 2;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const newRecs = await prisma.recommendation.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { id: true, title: true, category: true },
    orderBy: { createdAt: 'desc' },
  });

  if (newRecs.length < minNewRecs) {
    log.info(`P4-B: only ${newRecs.length} new recs (need ${minNewRecs}), skipping`);
    return 0;
  }

  const categoryIcons: Record<string, string> = {
    book: '📖', recipe: '🍽', place: '📍', music: '🎵', external_event: '🎭', movie: '🎬',
  };
  const recList = newRecs.map((r) => `${categoryIcons[r.category] ?? '📖'} [${r.title}](https://chuanmener.club/discover/recommendations/${r.id})`).join('\n');

  const allUsers: UserRow[] = await prisma.user.findMany({
    where: ELIGIBLE_USER_WHERE,
    select: { id: true, name: true, email: true },
  });

  const eligible = await filterByCooldown(prisma, allUsers.map((u) => u.id), 'P4-B', rule.cooldownDays);

  let sent = 0;
  for (const user of allUsers) {
    if (!eligible.has(user.id)) continue;
    try {
      const result = await sendTemplatedEmail(prisma, {
        to: user.email,
        ruleId: 'P4-B',
        variables: {
          userName: user.name,
          newRecCount: String(newRecs.length),
          recList,
        },
        ctaLabel: '查看所有推荐',
        ctaUrl: 'https://chuanmener.club/discover',
      });
      await prisma.emailLog.create({
        data: { userId: user.id, ruleId: 'P4-B', messageId: result.MessageId },
      });
      sent++;
    } catch (err) {
      log.error({ err, userId: user.id }, 'P4-B send failed');
    }
  }

  log.info(`P4-B rec digest: ${sent}/${allUsers.length} sent (${newRecs.length} recs)`);
  return sent;
}
