import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const TEST_DB_URL = 'postgresql://chuanmen:chuanmen@localhost:5432/chuanmen_test';

let _prisma: PrismaClient | null = null;

/** Get a shared PrismaClient for test seeding/cleanup. */
export function getTestPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = new PrismaClient({ datasourceUrl: TEST_DB_URL });
  }
  return _prisma;
}

/** Create a Fastify app instance for testing (no listen, use app.inject). */
export async function createTestApp(): Promise<FastifyInstance> {
  // Ensure env is set before importing app
  process.env.DATABASE_URL = TEST_DB_URL;
  process.env.NODE_ENV = 'test';

  const { createApp } = await import('../src_v2/app.js');
  const app = await createApp();
  await app.ready();
  return app;
}

/** Disconnect test prisma and close app. */
export async function closeTestApp(app: FastifyInstance) {
  await app.close();
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = null;
  }
}

/** Clean all rows from key tables (run between test suites for isolation). */
export async function cleanDb() {
  const prisma = getTestPrisma();
  // Delete in dependency order (children first)
  // PostcardTag has cascade delete from Postcard, so delete tags first
  await prisma.$transaction([
    prisma.emailLog.deleteMany(),
    prisma.emailQueue.deleteMany(),
    prisma.loginCode.deleteMany(),
    prisma.postcardTag.deleteMany(),
    prisma.postcard.deleteMany(),
    prisma.movieVote.deleteMany(),
    prisma.movieScreening.deleteMany(),
    prisma.proposalVote.deleteMany(),
    prisma.recommendationVote.deleteMany(),
    prisma.eventRecommendation.deleteMany(),
    prisma.recommendation.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.like.deleteMany(),
    prisma.eventSignup.deleteMany(),
    prisma.eventCoHost.deleteMany(),
    prisma.eventVisibilityExclusion.deleteMany(),
    prisma.eventTask.deleteMany(),
    prisma.weeklyLottery.deleteMany(),
    prisma.event.deleteMany(),
    prisma.movie.deleteMany(),
    prisma.proposal.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.userSocialTitle.deleteMany(),
    prisma.userOperatorRole.deleteMany(),
    prisma.userPreference.deleteMany(),
    prisma.titleRule.deleteMany(),
    prisma.taskPreset.deleteMany(),
    prisma.newsletter.deleteMany(),
    prisma.siteConfig.deleteMany(),
    prisma.aboutContent.deleteMany(),
    prisma.mediaAsset.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

// ── Seed helpers ──

let _userCounter = 0;

export async function seedTestUser(overrides: Record<string, any> = {}) {
  const prisma = getTestPrisma();
  _userCounter++;
  const defaults = {
    name: `测试用户${_userCounter}`,
    email: `test${_userCounter}@example.com`,
    bio: '测试用户简介',
    location: 'NYC',
    role: 'member' as const,
    userStatus: 'approved' as const,
    selfAsFriend: '好朋友',
    idealFriend: '好伙伴',
    participationPlan: '经常参加',
  };
  return prisma.user.create({ data: { ...defaults, ...overrides } });
}

export async function seedTestAdmin(overrides: Record<string, any> = {}) {
  return seedTestUser({ role: 'admin', ...overrides });
}

export async function seedTestEvent(hostId: string, overrides: Record<string, any> = {}) {
  const prisma = getTestPrisma();
  const defaults = {
    title: '测试活动',
    description: '测试活动描述',
    tags: ['movie'] as any,
    startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    location: 'NYC Test Location',
    capacity: 10,
    hostId,
    phase: 'open' as any,
  };
  return prisma.event.create({ data: { ...defaults, ...overrides } });
}

export async function seedTestMovie(recommendedById: string, overrides: Record<string, any> = {}) {
  const prisma = getTestPrisma();
  const defaults = {
    title: '测试电影',
    year: 2024,
    director: '测试导演',
    recommendedById,
    status: 'candidate' as any,
  };
  return prisma.movie.create({ data: { ...defaults, ...overrides } });
}

export async function seedTestProposal(authorId: string, overrides: Record<string, any> = {}) {
  const prisma = getTestPrisma();
  const defaults = {
    title: '测试提案',
    description: '测试提案描述',
    authorId,
    status: 'discussing' as const,
  };
  return prisma.proposal.create({ data: { ...defaults, ...overrides } });
}

export async function seedTestRecommendation(authorId: string, overrides: Record<string, any> = {}) {
  const prisma = getTestPrisma();
  const defaults = {
    title: '测试推荐',
    category: 'movie' as any,
    authorId,
    description: '一部好电影',
  };
  return prisma.recommendation.create({ data: { ...defaults, ...overrides } });
}

export async function seedTestPostcard(fromId: string, toId: string, overrides: Record<string, any> = {}) {
  const prisma = getTestPrisma();
  const defaults = {
    fromId,
    toId,
    message: '谢谢你！',
    visibility: 'public' as any,
  };
  return prisma.postcard.create({ data: { ...defaults, ...overrides } });
}
