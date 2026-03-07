import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, closeTestApp, cleanDb, seedTestUser, seedTestEvent, seedTestPostcard, getTestPrisma } from '../helpers.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await closeTestApp(app);
});

beforeEach(async () => {
  await cleanDb();
});

describe('GET /api/admin/stats', () => {
  it('returns dashboard statistics', async () => {
    // Seed some data
    const user = await seedTestUser({ userStatus: 'approved' });
    await seedTestEvent(user.id);

    const res = await app.inject({ method: 'GET', url: '/api/admin/stats' });
    expect(res.statusCode).toBe(200);
    const stats = res.json();
    expect(stats).toBeDefined();
    // Should return various stat fields
    expect(typeof stats.totalMembers).toBe('number');
    expect(stats.totalMembers).toBeGreaterThanOrEqual(1);
  });

  it('counts monthEvents by startsAt not createdAt', async () => {
    const prisma = getTestPrisma();
    const user = await seedTestUser({ userStatus: 'approved' });
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);

    // Event starting this month (should count)
    await seedTestEvent(user.id, { startsAt: thisMonth });
    // Event created this month but starting last month (should NOT count)
    await seedTestEvent(user.id, { startsAt: lastMonth, title: '上月活动' });

    const res = await app.inject({ method: 'GET', url: '/api/admin/stats' });
    const stats = res.json();
    expect(stats.monthEvents).toBe(1);
    expect(stats.monthActiveHosts).toBe(1);
  });

  it('computes email stats counting users without UserPreference as active', async () => {
    const prisma = getTestPrisma();
    // 3 approved users, none with UserPreference → all should be "active"
    await seedTestUser({ userStatus: 'approved' });
    await seedTestUser({ userStatus: 'approved' });
    const userC = await seedTestUser({ userStatus: 'approved' });
    // Give one user a weekly preference
    await prisma.userPreference.create({
      data: { userId: userC.id, emailState: 'weekly' },
    });

    const res = await app.inject({ method: 'GET', url: '/api/admin/stats' });
    const stats = res.json();
    // 3 total members, 1 weekly → active = 3 - 1 = 2
    expect(stats.emailStats.active).toBe(2);
    expect(stats.emailStats.weekly).toBe(1);
    expect(stats.emailStats.stopped).toBe(0);
    expect(stats.emailStats.unsubscribed).toBe(0);
  });

  it('computes mutually exclusive host funnel stages', async () => {
    const prisma = getTestPrisma();
    // Veteran host (hostCount=5)
    await seedTestUser({ userStatus: 'approved', hostCount: 5, participationCount: 10 });
    // Solo host (hostCount=2)
    await seedTestUser({ userStatus: 'approved', hostCount: 2, participationCount: 5 });
    // Active participant who never hosted (participationCount=4, hostCount=0)
    await seedTestUser({ userStatus: 'approved', hostCount: 0, participationCount: 4 });
    // New member (participationCount=1, hostCount=0) — should NOT be in funnel
    await seedTestUser({ userStatus: 'approved', hostCount: 0, participationCount: 1 });

    const res = await app.inject({ method: 'GET', url: '/api/admin/stats' });
    const stats = res.json();
    // activeParticipants3: participationCount>=3 AND hostCount==0 → only the 4-participation user
    expect(stats.hostFunnel.activeParticipants3).toBe(1);
    // soloHosts: hostCount 1-4 → only the hostCount=2 user
    expect(stats.hostFunnel.soloHosts).toBe(1);
    // veteranHosts: hostCount>=5 → only the hostCount=5 user
    expect(stats.hostFunnel.veteranHosts).toBe(1);
  });

  it('computes new member participation rate from actual signups', async () => {
    const prisma = getTestPrisma();
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15);

    // Existing host
    const host = await seedTestUser({ userStatus: 'approved', createdAt: new Date('2024-01-01') });
    // Event this month
    const event = await seedTestEvent(host.id, { startsAt: thisMonth });

    // New member who joined this month and signed up for the event
    const newActive = await seedTestUser({ userStatus: 'approved', createdAt: new Date() });
    await prisma.eventSignup.create({
      data: { eventId: event.id, userId: newActive.id, status: 'accepted' },
    });

    // New member who joined this month but did NOT sign up (even if they have historical participationCount)
    await seedTestUser({ userStatus: 'approved', createdAt: new Date(), participationCount: 3 });

    const res = await app.inject({ method: 'GET', url: '/api/admin/stats' });
    const stats = res.json();
    // 2 new members this month, 1 has accepted signup → 50%
    expect(stats.newMemberParticipationRate).toBe(50);
  });

  it('counts waitlist ratio based on event startsAt', async () => {
    const prisma = getTestPrisma();
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);

    const host = await seedTestUser({ userStatus: 'approved' });
    const thisMonthEvent = await seedTestEvent(host.id, { startsAt: thisMonth });
    const lastMonthEvent = await seedTestEvent(host.id, { startsAt: lastMonth });
    const memberA = await seedTestUser({ userStatus: 'approved' });
    const memberB = await seedTestUser({ userStatus: 'approved' });

    // Waitlist signup for this month's event (should count)
    await prisma.eventSignup.create({
      data: { eventId: thisMonthEvent.id, userId: memberA.id, status: 'waitlist' },
    });
    // Accepted signup for this month's event (should count in total)
    await prisma.eventSignup.create({
      data: { eventId: thisMonthEvent.id, userId: memberB.id, status: 'accepted' },
    });
    // Waitlist signup for last month's event (should NOT count)
    await prisma.eventSignup.create({
      data: { eventId: lastMonthEvent.id, userId: memberA.id, status: 'waitlist' },
    });

    const res = await app.inject({ method: 'GET', url: '/api/admin/stats' });
    const stats = res.json();
    // 2 signups for this month's event, 1 waitlist → 50%
    expect(stats.waitlistPercent).toBe(50);
  });
});

describe('GET /api/users/admin/list', () => {
  it('returns admin user list with counts', async () => {
    await seedTestUser({ name: '管理列表用户', userStatus: 'approved' });

    const res = await app.inject({ method: 'GET', url: '/api/users/admin/list' });
    expect(res.statusCode).toBe(200);
    const users = res.json();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Admin postcard management', () => {
  it('GET /api/postcards/admin/list returns all postcards', async () => {
    const userA = await seedTestUser();
    const userB = await seedTestUser();
    await seedTestPostcard(userA.id, userB.id);

    const res = await app.inject({ method: 'GET', url: '/api/postcards/admin/list' });
    expect(res.statusCode).toBe(200);
    const list = res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(1);
  });

  it('DELETE /api/postcards/admin/:id deletes any postcard', async () => {
    const userA = await seedTestUser();
    const userB = await seedTestUser();
    const card = await seedTestPostcard(userA.id, userB.id);

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/postcards/admin/${card.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const prisma = getTestPrisma();
    const deleted = await prisma.postcard.findUnique({ where: { id: card.id } });
    expect(deleted).toBeNull();
  });
});

describe('Admin comment management', () => {
  it('GET /api/comments/admin/list returns all comments', async () => {
    const user = await seedTestUser();
    const event = await seedTestEvent(user.id);

    const prisma = getTestPrisma();
    await prisma.comment.create({
      data: {
        entityType: 'event',
        entityId: event.id,
        authorId: user.id,
        content: '管理员评论列表',
      },
    });

    const res = await app.inject({ method: 'GET', url: '/api/comments/admin/list' });
    expect(res.statusCode).toBe(200);
    const comments = res.json();
    expect(Array.isArray(comments)).toBe(true);
    expect(comments.length).toBe(1);
  });
});
