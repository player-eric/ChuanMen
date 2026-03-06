import type { FastifyInstance } from 'fastify';
import { detectMilestones, generateHostTribute, processAnnouncedUsers } from '../agent/contentAutomation.js';
import {
  sendPostEventRecap,
  sendEventReminder,
  sendUnclaimedTaskReminder,
  sendChurnRecall,
  sendSecondRecall,
  sendSilentHostRecall,
  sendEncourageHosting,
  sendMilestoneNotif,
  sendHostTributeNotif,
  sendDailyDigest,
  processWaitlistExpiry,
} from '../agent/emailAutomation.js';
import { drawWeeklyHost, getWeekKey } from '../modules/lottery/lottery.service.js';
import { sendLotteryDrawNotif, sendConsecutiveEventsReminder } from '../agent/emailAutomation.js';

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
        hostId: true,
        signups: {
          where: { status: 'accepted', participated: true },
          select: { userId: true },
        },
      },
    });

    for (const event of unprocessed) {
      // Only award if at least 1 participant besides host
      const participantIds = event.signups
        .map((s) => s.userId)
        .filter((uid) => uid !== event.hostId);

      if (participantIds.length === 0) {
        // No real participants — mark as processed but don't award
        await prisma.event.update({
          where: { id: event.id },
          data: { creditsAwarded: true },
        });
        continue;
      }

      // Award +2 credits to each participant
      if (participantIds.length > 0) {
        await prisma.user.updateMany({
          where: { id: { in: participantIds } },
          data: { postcardCredits: { increment: 2 } },
        });
      }

      // Award +2 (attend) + 4 (host bonus) = +6 to host
      await prisma.user.update({
        where: { id: event.hostId },
        data: { postcardCredits: { increment: 6 } },
      });

      await prisma.event.update({
        where: { id: event.id },
        data: { creditsAwarded: true },
      });

      log.info(
        { eventId: event.id, participants: participantIds.length },
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

  // Phase 3: Email automation (each try/catch, independent)

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

  try {
    await sendChurnRecall(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendChurnRecall failed');
  }

  // P3-G: Second recall (30 days inactive, after P3-F sent)
  try {
    await sendSecondRecall(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendSecondRecall failed');
  }

  try {
    await sendSilentHostRecall(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendSilentHostRecall failed');
  }

  try {
    await sendEncourageHosting(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendEncourageHosting failed');
  }

  if (milestones.length > 0) {
    try {
      await sendMilestoneNotif(prisma, log, milestones);
    } catch (err) {
      log.error({ err }, 'Agent: sendMilestoneNotif failed');
    }
  }

  if (tribute) {
    try {
      await sendHostTributeNotif(prisma, log, tribute);
    } catch (err) {
      log.error({ err }, 'Agent: sendHostTributeNotif failed');
    }
  }

  try {
    await sendDailyDigest(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendDailyDigest failed');
  }

  // Lottery: consecutive events reminder
  try {
    await sendConsecutiveEventsReminder(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendConsecutiveEventsReminder failed');
  }

  return { milestones, tribute };
}
