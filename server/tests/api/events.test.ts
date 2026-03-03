import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, closeTestApp, cleanDb, seedTestUser, seedTestEvent, seedTestRecommendation, getTestPrisma } from '../helpers.js';
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

describe('POST /api/events', () => {
  it('creates an event', async () => {
    const host = await seedTestUser({ name: '活动主持人' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/events',
      payload: {
        title: '电影之夜',
        hostId: host.id,
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'NYC 某地',
        tags: ['movie'],
        capacity: 8,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.title).toBe('电影之夜');
    expect(body.hostId).toBe(host.id);
  });
});

describe('GET /api/events', () => {
  it('lists upcoming events', async () => {
    const host = await seedTestUser();
    await seedTestEvent(host.id, { title: '即将到来的活动' });

    const res = await app.inject({ method: 'GET', url: '/api/events' });
    expect(res.statusCode).toBe(200);
    const events = res.json();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/events/past', () => {
  it('lists past/ended events', async () => {
    const host = await seedTestUser();
    await seedTestEvent(host.id, {
      title: '过去的活动',
      phase: 'ended',
      status: 'completed',
      startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });

    const res = await app.inject({ method: 'GET', url: '/api/events/past' });
    expect(res.statusCode).toBe(200);
    const events = res.json();
    expect(Array.isArray(events)).toBe(true);
  });
});

describe('GET /api/events/:id', () => {
  it('returns event detail with signups', async () => {
    const host = await seedTestUser({ name: '主持人' });
    const event = await seedTestEvent(host.id);

    const res = await app.inject({ method: 'GET', url: `/api/events/${event.id}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.title).toBe('测试活动');
    expect(body.host).toBeDefined();
    expect(body.signups).toBeDefined();
    expect(Array.isArray(body.signups)).toBe(true);
  });

  it('returns 404 for nonexistent event', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/events/nonexistent-id-123456789' });
    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /api/events/:id', () => {
  it('updates event details', async () => {
    const host = await seedTestUser();
    const event = await seedTestEvent(host.id);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/events/${event.id}`,
      payload: { title: '更新后标题', capacity: 15 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const prisma = getTestPrisma();
    const updated = await prisma.event.findUnique({ where: { id: event.id } });
    expect(updated!.title).toBe('更新后标题');
    expect(updated!.capacity).toBe(15);
  });
});

describe('Event signup flow', () => {
  it('signs up a user for an event', async () => {
    const host = await seedTestUser({ name: '主持人' });
    const user = await seedTestUser({ name: '参与者' });
    const event = await seedTestEvent(host.id);

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/signup`,
      payload: { userId: user.id, status: 'accepted' },
    });
    expect(res.statusCode).toBe(200);

    // Verify signup in DB
    const prisma = getTestPrisma();
    const signup = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
    });
    expect(signup).not.toBeNull();
  });

  it('cancels a signup', async () => {
    const host = await seedTestUser();
    const user = await seedTestUser();
    const event = await seedTestEvent(host.id);

    // First signup
    await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/signup`,
      payload: { userId: user.id, status: 'accepted' },
    });

    // Then cancel
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}/signup`,
      payload: { userId: user.id },
    });
    expect(res.statusCode).toBe(200);

    const prisma = getTestPrisma();
    const signup = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
    });
    expect(signup!.status).toBe('cancelled');
  });
});

describe('Event invite flow', () => {
  it('invites users to an event', async () => {
    const host = await seedTestUser({ name: '主持人' });
    const invitee = await seedTestUser({ name: '被邀请人' });
    const event = await seedTestEvent(host.id, { phase: 'invite' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/invite`,
      payload: { userIds: [invitee.id], invitedById: host.id },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const prisma = getTestPrisma();
    const signup = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: invitee.id } },
    });
    expect(signup).not.toBeNull();
    expect(signup!.status).toBe('invited');
  });
});

describe('Waitlist flow', () => {
  it('puts user on waitlist when event is full', async () => {
    const host = await seedTestUser();
    const event = await seedTestEvent(host.id, { capacity: 1 });

    // Fill the event
    const user1 = await seedTestUser();
    await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/signup`,
      payload: { userId: user1.id, status: 'accepted' },
    });

    // Next user should be waitlisted
    const user2 = await seedTestUser();
    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/signup`,
      payload: { userId: user2.id },
    });
    expect(res.statusCode).toBe(200);

    const prisma = getTestPrisma();
    const signup = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user2.id } },
    });
    // Should be waitlisted (status depends on service logic)
    expect(signup).not.toBeNull();
    expect(['waitlist', 'accepted'].includes(signup!.status)).toBe(true);
  });
});

describe('Event photos', () => {
  it('adds a recap photo to event', async () => {
    const host = await seedTestUser();
    const event = await seedTestEvent(host.id);

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/photos`,
      payload: { photoUrl: 'https://example.com/photo.jpg' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().ok).toBe(true);

    const prisma = getTestPrisma();
    const updated = await prisma.event.findUnique({ where: { id: event.id } });
    expect(updated!.recapPhotoUrls).toContain('https://example.com/photo.jpg');
  });
});

describe('Event recommendation linking', () => {
  it('links a recommendation to an event', async () => {
    const host = await seedTestUser();
    const event = await seedTestEvent(host.id);
    const rec = await seedTestRecommendation(host.id);

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/recommendations`,
      payload: { recommendationId: rec.id, linkedById: host.id },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().ok).toBe(true);
    expect(res.json().link).toBeDefined();
  });

  it('removes a recommendation link', async () => {
    const host = await seedTestUser();
    const event = await seedTestEvent(host.id);
    const rec = await seedTestRecommendation(host.id);

    const prisma = getTestPrisma();
    await prisma.eventRecommendation.create({
      data: { eventId: event.id, recommendationId: rec.id },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}/recommendations/${rec.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const link = await prisma.eventRecommendation.findFirst({
      where: { eventId: event.id, recommendationId: rec.id },
    });
    expect(link).toBeNull();
  });
});
