import type { FastifyInstance } from 'fastify';
import { sendTemplatedEmail } from './emailService.js';
import { detectMilestones, generateHostTribute, processAnnouncedUsers } from '../agent/contentAutomation.js';
import {
  sendPostEventRecap,
  sendEventReminder,
  sendUnclaimedTaskReminder,
  sendDailyDigest,
  processWaitlistExpiry,
  sendLotteryDrawNotif,
  sendConsecutiveEventsReminder,
  sendSameDayReminder,
  sendFirstEventFollowup,
  sendNewEventNotif,
  sendOnboardingCheckin,
  sendSecondRecall,
  sendMilestoneNotif,
  sendHostTributeNotif,
} from '../agent/emailAutomation.js';
import { drawWeeklyHost } from '../modules/lottery/lottery.service.js';
import { getWeekKey } from '../utils/weekKey.js';
import { cleanOldSignals } from '../modules/signals/signal.service.js';
import { parseGlobalConfig } from '../types/emailConfig.js';

/* ── Credit config defaults (overridable via SiteConfig key "postcardCredits") ── */
interface CreditConfig {
  newUserCredit: number;
  eventCredit: number;
  hostCredit: number;
  purchasePrice: number;
}

const DEFAULT_CREDIT_CONFIG: CreditConfig = {
  newUserCredit: 4,
  eventCredit: 2,
  hostCredit: 4,
  purchasePrice: 5,
};

export async function getCreditConfig(
  prisma: { siteConfig: { findUnique: (args: any) => Promise<any> } },
): Promise<CreditConfig> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { key: 'postcardCredits' } });
    if (row?.value && typeof row.value === 'object') {
      const v = row.value as Record<string, unknown>;
      return {
        newUserCredit: typeof v.newUserCredit === 'number' ? v.newUserCredit : DEFAULT_CREDIT_CONFIG.newUserCredit,
        eventCredit: typeof v.eventCredit === 'number' ? v.eventCredit : DEFAULT_CREDIT_CONFIG.eventCredit,
        hostCredit: typeof v.hostCredit === 'number' ? v.hostCredit : DEFAULT_CREDIT_CONFIG.hostCredit,
        purchasePrice: typeof v.purchasePrice === 'number' ? v.purchasePrice : DEFAULT_CREDIT_CONFIG.purchasePrice,
      };
    }
  } catch { /* fall through to defaults */ }
  return { ...DEFAULT_CREDIT_CONFIG };
}

/**
 * Award postcard credits for a single event.
 * Host gets +6, co-hosts +6, regular participants +2.
 * No-ops if already awarded or no participants besides host.
 */
export async function awardCreditsForEvent(
  prisma: Parameters<typeof runAgentCycle>[0]['prisma'],
  eventId: string,
  log: { info: (...args: any[]) => void; error: (...args: any[]) => void },
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      hostId: true,
      creditsAwarded: true,
      host: { select: { id: true, name: true, email: true } },
      signups: {
        where: { status: 'accepted' },
        select: { userId: true, user: { select: { id: true, name: true, email: true } } },
      },
      coHosts: {
        select: { userId: true, user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!event || event.creditsAwarded) return;

  const participants = event.signups.filter((s) => s.userId !== event.hostId);
  const coHostParticipants = (event.coHosts ?? []).filter(
    (ch) => ch.userId !== event.hostId && !participants.some((p) => p.userId === ch.userId),
  );
  const allParticipants = [...participants, ...coHostParticipants];

  if (allParticipants.length === 0) {
    await prisma.event.update({ where: { id: event.id }, data: { creditsAwarded: true } });
    return;
  }

  const allParticipantIds = allParticipants.map((s) => s.userId);
  const coHostIds = (event.coHosts ?? []).map((ch) => ch.userId).filter((id) => id !== event.hostId);
  const hostAndCoHostIds = new Set([event.hostId, ...coHostIds]);

  const creditCfg = await getCreditConfig(prisma);
  const participantIncrement = creditCfg.eventCredit;
  const hostIncrement = creditCfg.eventCredit + creditCfg.hostCredit;

  const regularParticipantIds = allParticipantIds.filter((id) => !hostAndCoHostIds.has(id));
  if (regularParticipantIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: regularParticipantIds } },
      data: { postcardCredits: { increment: participantIncrement } },
    });
  }

  await prisma.user.update({
    where: { id: event.hostId },
    data: { postcardCredits: { increment: hostIncrement } },
  });

  if (coHostIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: coHostIds } },
      data: { postcardCredits: { increment: hostIncrement } },
    });
  }

  await prisma.event.update({ where: { id: event.id }, data: { creditsAwarded: true } });

  // Send credit notification emails (best effort)
  try {
    const coHostIdSet = new Set(coHostIds);
    for (const s of allParticipants) {
      if (coHostIdSet.has(s.userId)) continue;
      if (s.user?.email) {
        await sendTemplatedEmail(prisma, {
          to: s.user.email,
          ruleId: 'TXN-14',
          variables: { userName: s.user.name, eventTitle: event.title },
          ctaLabel: '寄感谢卡',
          ctaUrl: 'https://chuanmener.club/cards',
        });
      }
    }
    for (const ch of event.coHosts ?? []) {
      if (ch.userId === event.hostId) continue;
      if (ch.user?.email) {
        await sendTemplatedEmail(prisma, {
          to: ch.user.email,
          ruleId: 'TXN-15',
          variables: { userName: ch.user.name, eventTitle: event.title },
          ctaLabel: '寄感谢卡',
          ctaUrl: 'https://chuanmener.club/cards',
        });
      }
    }
    if (event.host?.email) {
      await sendTemplatedEmail(prisma, {
        to: event.host.email,
        ruleId: 'TXN-16',
        variables: { userName: event.host.name, eventTitle: event.title },
        ctaLabel: '寄感谢卡',
        ctaUrl: 'https://chuanmener.club/cards',
      });
    }
  } catch { /* email failure should not block credit award */ }

  log.info(
    { eventId: event.id, participants: allParticipantIds.length },
    'Awarded postcard credits (host +6, participants +2 each)',
  );
}

export async function runAgentCycle(app: FastifyInstance) {
  const prisma = app.prisma;
  const log = app.log;

  // Phase 0: Auto-end events that have passed their start time + duration
  try {
    const now = new Date();
    // Events still in active phases but startsAt is past
    // Use endsAt if set, otherwise startsAt + 4h as default end estimate
    const overdue = await prisma.event.findMany({
      where: {
        phase: { in: ['open', 'closed', 'invite'] },
        startsAt: { lt: new Date(now.getTime() - 4 * 60 * 60 * 1000) }, // at least 4h past start
      },
      select: { id: true, title: true, startsAt: true, endsAt: true },
    });

    for (const event of overdue) {
      const effectiveEnd = event.endsAt ?? new Date(event.startsAt.getTime() + 4 * 60 * 60 * 1000);
      if (now > effectiveEnd) {
        await prisma.event.update({
          where: { id: event.id },
          data: { phase: 'ended' },
        });
        log.info(`Agent: auto-ended event "${event.title}" (id: ${event.id})`);
        // Award credits immediately so we don't depend on the next tick
        await awardCreditsForEvent(prisma, event.id, log);
      }
    }
  } catch (err) {
    log.error({ err }, 'Agent: auto-end events failed');
  }

  // Phase 1: Content automation (each try/catch)
  let milestones: string[] = [];
  try {
    milestones = await detectMilestones(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: detectMilestones failed');
  }

  let tribute: { title: string; hostIds: string[] } | null = null;
  try {
    tribute = await generateHostTribute(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: generateHostTribute failed');
  }

  // Phase 1b: Auto-approve announced users whose introduction period has ended
  try {
    const autoApproved = await processAnnouncedUsers(prisma, log);
    if (autoApproved > 0) {
      log.info(`Agent: auto-approved ${autoApproved} announced user(s)`);
    }
  } catch (err) {
    log.error({ err }, 'Agent: processAnnouncedUsers failed');
  }

  // Phase 1c: Weekly lottery draw (run on Mondays)
  try {
    const now = new Date();
    const isMonday = now.getDay() === 1;
    if (isMonday) {
      // Check if draw already exists for this week
      const weekKey = getWeekKey(now);
      const existingDraw = await prisma.weeklyLottery.findFirst({
        where: { weekKey, status: { not: 'skipped' } },
      });
      if (!existingDraw) {
        const draw = await drawWeeklyHost(prisma, log);
        if (draw && draw.drawnMember) {
          log.info(`Agent: weekly lottery drew ${draw.drawnMember.name}`);
          // Send notification email to the drawn user
          if (draw.drawnMember.email) {
            await sendLotteryDrawNotif(prisma, log, draw.drawnMember, draw.weekNumber);
          }
        }
      }
    }
  } catch (err) {
    log.error({ err }, 'Agent: weekly lottery draw failed');
  }

  // Phase 1c2: Auto-reject pending applications for ended events (silent, no email)
  try {
    const updatedPending = await prisma.eventSignup.updateMany({
      where: {
        status: 'pending',
        event: { phase: 'ended' },
      },
      data: { status: 'rejected' },
    });
    if (updatedPending.count > 0) {
      log.info(`Agent: auto-rejected ${updatedPending.count} pending application(s) for ended events`);
    }
  } catch (err) {
    log.error({ err }, 'Agent: auto-reject pending applications failed');
  }

  // Phase 1d: Update consecutiveEvents for recently ended events
  try {
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
    const recentlyEnded = await prisma.event.findMany({
      where: {
        phase: 'ended',
        OR: [
          { endsAt: { gte: eightHoursAgo, lte: new Date() } },
          { endsAt: null, startsAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000), lte: new Date() } },
        ],
      },
      select: {
        id: true,
        startsAt: true,
        signups: {
          where: { status: 'accepted', participated: true },
          select: { userId: true },
        },
      },
    });

    for (const event of recentlyEnded) {
      for (const signup of event.signups) {
        // Update lastEventAt and increment consecutiveEvents
        const user = await prisma.user.findUnique({
          where: { id: signup.userId },
          select: { consecutiveEvents: true, lastEventAt: true },
        });
        if (!user) continue;

        // Reset if more than 30 days since last event
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const shouldReset = user.lastEventAt && user.lastEventAt < thirtyDaysAgo;

        await prisma.user.update({
          where: { id: signup.userId },
          data: {
            consecutiveEvents: shouldReset ? 1 : { increment: 1 },
            lastEventAt: event.startsAt,
          },
        });
      }
    }
  } catch (err) {
    log.error({ err }, 'Agent: consecutiveEvents update failed');
  }

  // Phase 1e: Award postcard credits for completed events
  try {
    const unprocessed = await prisma.event.findMany({
      where: {
        startsAt: { lte: new Date() },
        phase: { not: 'cancelled' },
        creditsAwarded: false,
      },
      select: { id: true },
    });

    for (const event of unprocessed) {
      await awardCreditsForEvent(prisma, event.id, log);
    }
  } catch (err) {
    log.error({ err }, 'Agent: postcard credit award failed');
  }

  // Phase 1f: Auto-mark movies as screened when linked event ends
  try {
    const endedWithMovies = await prisma.event.findMany({
      where: { phase: 'ended', screenedMovies: { some: {} } },
      select: { id: true, screenedMovies: { select: { movieId: true } } },
    });
    const movieIds = [...new Set(endedWithMovies.flatMap(e => e.screenedMovies.map(s => s.movieId)))];
    if (movieIds.length > 0) {
      const { count } = await prisma.movie.updateMany({
        where: { id: { in: movieIds }, status: 'candidate' },
        data: { status: 'screened' },
      });
      if (count > 0) log.info(`Agent: auto-screened ${count} movies from ended events`);
    }
  } catch (err) {
    log.error({ err }, 'Agent: auto-screen movies failed');
  }

  // Phase 1g: Clean old activity signals (older than 4 weeks)
  try {
    const fourWeeksAgo = new Date(Date.now() - 28 * 86400000);
    const cutoffWeekKey = getWeekKey(fourWeeksAgo);
    const { count } = await cleanOldSignals(prisma, cutoffWeekKey);
    if (count > 0) log.info(`Agent: cleaned ${count} old activity signal(s)`);
  } catch (err) {
    log.error({ err }, 'Agent: cleanOldSignals failed');
  }

  // ── Check global email pause ──
  let emailPaused = false;
  try {
    const globalCfgRow = await prisma.siteConfig.findUnique({ where: { key: 'emailConfig.global' } });
    const globalCfg = parseGlobalConfig(globalCfgRow?.value);
    if (globalCfg.systemPaused) {
      log.info('Agent: email system is paused globally, skipping all email phases');
      emailPaused = true;
    }
  } catch (err) {
    log.error({ err }, 'Agent: failed to read global email config, proceeding with emails');
  }

  // Phase 2: Waitlist offer expiry (time-sensitive, run before emails)
  // Note: waitlist expiry is operational, not email — always runs
  try {
    await processWaitlistExpiry(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: processWaitlistExpiry failed');
  }

  if (!emailPaused) {
  // Phase 3: Instant email automation (time-sensitive, event-related)

  // P1: Post-event recap (2-6h after event ends)
  try {
    await sendPostEventRecap(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendPostEventRecap failed');
  }

  // P0-B: Event reminder (20-28h before event)
  try {
    await sendEventReminder(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendEventReminder failed');
  }

  // Unclaimed task reminder (44-52h before event)
  try {
    await sendUnclaimedTaskReminder(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendUnclaimedTaskReminder failed');
  }

  // P0-D: Same-day event reminder (0-8h before)
  try {
    await sendSameDayReminder(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendSameDayReminder failed');
  }

  // P3-B: Post-first-event follow-up (event-related, instant)
  try {
    await sendFirstEventFollowup(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendFirstEventFollowup failed');
  }

  // Lottery: consecutive events reminder
  try {
    await sendConsecutiveEventsReminder(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendConsecutiveEventsReminder failed');
  }

  // P2-A: New event notification (10-20 min after creation)
  try {
    await sendNewEventNotif(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendNewEventNotif failed');
  }

  // P2-B: New recommendation notification — disabled, included in daily digest instead
  // try {
  //   await sendNewRecNotif(prisma, log);
  // } catch (err) {
  //   log.error({ err }, 'Agent: sendNewRecNotif failed');
  // }

  // P3-A: One-week onboarding check-in
  try {
    await sendOnboardingCheckin(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendOnboardingCheckin failed');
  }

  // P3-G: Second churn recall (30+ days inactive)
  try {
    await sendSecondRecall(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendSecondRecall failed');
  }

  // Phase 4: Daily digest (consolidates all non-instant notifications)
  // Covers: new events, new recs, new members, postcards, milestones,
  // engagement nudges (P3-C/D/E/F/G), community stats
  try {
    await sendDailyDigest(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendDailyDigest failed');
  }

  // P4-A: Milestone notification (uses milestones from Phase 1)
  if (milestones.length > 0) {
    try {
      await sendMilestoneNotif(prisma, log, milestones);
    } catch (err) {
      log.error({ err }, 'Agent: sendMilestoneNotif failed');
    }
  }

  // P4-C: Host tribute notification (uses tribute from Phase 1)
  if (tribute) {
    try {
      await sendHostTributeNotif(prisma, log, tribute);
    } catch (err) {
      log.error({ err }, 'Agent: sendHostTributeNotif failed');
    }
  }

  // P4-B: Weekly recommendation digest — merged into DIGEST, no longer sent separately.
  } // end if (!emailPaused)

  return { milestones, tribute };
}
