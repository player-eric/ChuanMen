import type { FastifyInstance } from 'fastify';
import { sendEmail } from './emailService.js';
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
} from '../agent/emailAutomation.js';
import { drawWeeklyHost, getWeekKey } from '../modules/lottery/lottery.service.js';

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
        updatedAt: { gte: eightHoursAgo },
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
    // Find events that have started and haven't awarded credits yet
    const unprocessed = await prisma.event.findMany({
      where: {
        startsAt: { lte: new Date() },
        phase: { not: 'cancelled' },
        creditsAwarded: false,
      },
      select: {
        id: true,
        title: true,
        hostId: true,
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

    for (const event of unprocessed) {
      // Only award if at least 1 participant besides host (signups + co-hosts)
      const participants = event.signups
        .filter((s) => s.userId !== event.hostId);
      // Co-hosts are also participants (exclude host who already gets host bonus)
      const coHostParticipants = (event.coHosts ?? [])
        .filter((ch) => ch.userId !== event.hostId && !participants.some((p) => p.userId === ch.userId));

      const allParticipants = [...participants, ...coHostParticipants];

      if (allParticipants.length === 0) {
        // No real participants — mark as processed but don't award
        await prisma.event.update({
          where: { id: event.id },
          data: { creditsAwarded: true },
        });
        continue;
      }

      const allParticipantIds = allParticipants.map((s) => s.userId);

      // Co-host IDs (excluding primary host)
      const coHostIds = (event.coHosts ?? [])
        .map((ch) => ch.userId)
        .filter((id) => id !== event.hostId);
      const hostAndCoHostIds = new Set([event.hostId, ...coHostIds]);

      // Award +2 credits to regular participants (excluding host and co-hosts)
      const regularParticipantIds = allParticipantIds.filter((id) => !hostAndCoHostIds.has(id));
      if (regularParticipantIds.length > 0) {
        await prisma.user.updateMany({
          where: { id: { in: regularParticipantIds } },
          data: { postcardCredits: { increment: 2 } },
        });
      }

      // Award +6 to host (attend +2, host bonus +4)
      await prisma.user.update({
        where: { id: event.hostId },
        data: { postcardCredits: { increment: 6 } },
      });

      // Award +6 to each co-host (attend +2, host bonus +4)
      if (coHostIds.length > 0) {
        await prisma.user.updateMany({
          where: { id: { in: coHostIds } },
          data: { postcardCredits: { increment: 6 } },
        });
      }

      await prisma.event.update({
        where: { id: event.id },
        data: { creditsAwarded: true },
      });

      // Send credit notification emails (best effort)
      try {
        // Notify regular participants (+2)
        const coHostIdSet = new Set(coHostIds);
        for (const s of allParticipants) {
          if (coHostIdSet.has(s.userId)) continue;
          if (s.user?.email) {
            await sendEmail({
              to: s.user.email,
              subject: `【串门儿】参加「${event.title}」获得感谢卡额度 +2`,
              text: `Hi ${s.user.name}，\n\n感谢你参加「${event.title}」！你获得了 2 张感谢卡额度，快去给一起参加的小伙伴寄张感谢卡吧 ✉️\n\n寄感谢卡：https://chuanmener.club/cards\n\n— 串门儿`,
            });
          }
        }
        // Notify co-hosts (+6)
        for (const ch of event.coHosts ?? []) {
          if (ch.userId === event.hostId) continue;
          if (ch.user?.email) {
            await sendEmail({
              to: ch.user.email,
              subject: `【串门儿】协办「${event.title}」获得感谢卡额度 +6`,
              text: `Hi ${ch.user.name}，\n\n感谢你协办「${event.title}」！作为 Co-Host 你获得了 6 张感谢卡额度（参加 +2，Host 奖励 +4）。快去给参与的小伙伴寄张感谢卡吧 ✉️\n\n寄感谢卡：https://chuanmener.club/cards\n\n— 串门儿`,
            });
          }
        }
        // Notify host (+6)
        if (event.host?.email) {
          await sendEmail({
            to: event.host.email,
            subject: `【串门儿】发起「${event.title}」获得感谢卡额度 +6`,
            text: `Hi ${event.host.name}，\n\n感谢你组织「${event.title}」！作为 Host 你获得了 6 张感谢卡额度（参加 +2，Host 奖励 +4）。快去给参与的小伙伴寄张感谢卡吧 ✉️\n\n寄感谢卡：https://chuanmener.club/cards\n\n— 串门儿`,
          });
        }
      } catch { /* email failure should not block credit award */ }

      log.info(
        { eventId: event.id, participants: allParticipantIds.length },
        'Agent: awarded postcard credits (host +6, participants +2 each)',
      );
    }
  } catch (err) {
    log.error({ err }, 'Agent: postcard credit award failed');
  }

  // Phase 2: Waitlist offer expiry (time-sensitive, run before emails)
  try {
    await processWaitlistExpiry(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: processWaitlistExpiry failed');
  }

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

  // Phase 4: Daily digest (consolidates all non-instant notifications)
  // Covers: new events, new recs, new members, postcards, milestones,
  // engagement nudges (P3-C/D/E/F/G), community stats
  try {
    await sendDailyDigest(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendDailyDigest failed');
  }

  return { milestones, tribute };
}
