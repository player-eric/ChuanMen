import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, closeTestApp, cleanDb, seedTestUser, seedTestEvent, seedTestMovie, seedTestProposal, seedTestPostcard, getTestPrisma } from '../helpers.js';
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

describe('GET /api/feed', () => {
  it('returns empty feed when no data', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.events).toEqual([]);
    expect(body.postcards).toEqual([]);
    expect(body.recentMovies).toEqual([]);
    expect(body.recentProposals).toEqual([]);
    expect(body.members).toEqual([]);
    expect(body.announcements).toEqual([]);
    expect(body.newMembers).toEqual([]);
    expect(body.birthdayUsers).toEqual([]);
  });

  it('returns events in feed', async () => {
    const host = await seedTestUser();
    await seedTestEvent(host.id, { title: '动态里的活动' });

    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.events.length).toBeGreaterThanOrEqual(1);
    expect(body.events[0].title).toBe('动态里的活动');
    expect(body.events[0].host).toBeDefined();
    // Should have interaction fields
    expect(typeof body.events[0].likes).toBe('number');
    expect(typeof body.events[0].commentCount).toBe('number');
    expect(typeof body.events[0].photoCount).toBe('number');
  });

  it('returns postcards in feed', async () => {
    const userA = await seedTestUser({ name: 'A' });
    const userB = await seedTestUser({ name: 'B' });
    await seedTestPostcard(userA.id, userB.id, { visibility: 'public' });

    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.postcards.length).toBe(1);
    expect(body.postcards[0].from).toBeDefined();
    expect(body.postcards[0].to).toBeDefined();
  });

  it('does not return private postcards in feed', async () => {
    const userA = await seedTestUser();
    const userB = await seedTestUser();
    await seedTestPostcard(userA.id, userB.id, { visibility: 'private' });

    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    expect(res.json().postcards.length).toBe(0);
  });

  it('returns movies in feed', async () => {
    const user = await seedTestUser();
    await seedTestMovie(user.id, { title: '好电影' });

    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.recentMovies.length).toBe(1);
    expect(body.recentMovies[0].title).toBe('好电影');
    expect(body.recentMovies[0].recommendedBy).toBeDefined();
  });

  it('returns proposals in feed', async () => {
    const user = await seedTestUser();
    await seedTestProposal(user.id, { title: '好主意' });

    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.recentProposals.length).toBe(1);
    expect(body.recentProposals[0].title).toBe('好主意');
  });

  it('returns approved members list', async () => {
    await seedTestUser({ name: '成员A', userStatus: 'approved' });
    await seedTestUser({ name: '申请中B', userStatus: 'applicant' });

    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.members.length).toBe(1);
    expect(body.members[0].name).toBe('成员A');
  });

  it('returns new members (announced and recently welcomed)', async () => {
    const prisma = getTestPrisma();
    const now = new Date();
    // Announced user (in introduction period)
    await seedTestUser({
      name: '新人',
      userStatus: 'announced',
      announcedAt: now,
      announcedEndAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    });

    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.newMembers.length).toBe(1);
    expect(body.newMembers[0].name).toBe('新人');
    expect(body.newMembers[0].userStatus).toBe('announced');
  });

  it('includes likes and comment counts on events', async () => {
    const host = await seedTestUser();
    const liker = await seedTestUser();
    const event = await seedTestEvent(host.id);

    const prisma = getTestPrisma();
    await prisma.like.create({
      data: { entityType: 'event', entityId: event.id, userId: liker.id },
    });
    await prisma.comment.create({
      data: {
        entityType: 'event',
        entityId: event.id,
        authorId: liker.id,
        content: '好活动！',
      },
    });

    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    const feedEvent = res.json().events.find((e: any) => e.id === event.id);
    expect(feedEvent).toBeDefined();
    expect(feedEvent.likes).toBe(1);
    expect(feedEvent.commentCount).toBe(1);
    expect(feedEvent.likedBy).toContain(liker.name);
  });
});
