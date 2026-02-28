import type { FastifyInstance } from 'fastify';
import { detectMilestones, generateHostTribute } from '../agent/contentAutomation.js';
import {
  sendChurnRecall,
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

  // Phase 2: Waitlist offer expiry (time-sensitive, run before emails)
  try {
    await processWaitlistExpiry(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: processWaitlistExpiry failed');
  }

  // Phase 3: Email automation (each try/catch, independent)
  try {
    await sendChurnRecall(prisma, log);
  } catch (err) {
    log.error({ err }, 'Agent: sendChurnRecall failed');
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
