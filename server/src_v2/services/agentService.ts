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
    // Find completed events that haven't awarded credits yet
    const unprocessed = await prisma.event.findMany({
      where: {
        status: 'completed',
        creditsAwarded: false,
      },
      select: {
        id: true,
        title: true,
        hostId: true,
        host: { select: { id: true, name: true, email: true } },
        signups: {
          where: { status: 'accepted', participated: true },
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

      // Award +2 credits to each participant (including co-hosts)
      await prisma.user.updateMany({
        where: { id: { in: allParticipantIds } },
        data: { postcardCredits: { increment: 2 } },
      });

      // Award +2 (attend) + 4 (host bonus) = +6 to host
      await prisma.user.update({
        where: { id: event.hostId },
        data: { postcardCredits: { increment: 6 } },
      });

      await prisma.event.update({
        where: { id: event.id },
        data: { creditsAwarded: true },
      });

      // Send credit notification emails (best effort)
      try {
        // Notify participants & co-hosts (+2)
        for (const s of allParticipants) {
          if (s.user?.email) {
            await sendEmail({
              to: s.user.email,
              subject: `【串门儿】参加「${event.title}」获得感谢卡额度 +2`,
              text: `Hi ${s.user.name}，\n\n感谢你参加「${event.title}」！你获得了 2 张感谢卡额度，快去给一起参加的小伙伴寄张感谢卡吧 ✉️\n\n寄感谢卡：https://chuanmener.club/cards\n\n— 串门儿`,
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
