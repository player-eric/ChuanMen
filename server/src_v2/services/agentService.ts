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

  return { milestones, tribute };
}
