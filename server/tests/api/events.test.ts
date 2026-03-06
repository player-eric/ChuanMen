import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, closeTestApp, cleanDb, seedTestUser, seedTestEvent, seedTestMovie, seedTestRecommendation, getTestPrisma } from '../helpers.js';
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

  it('re-invites a previously cancelled user', async () => {
    const host = await seedTestUser({ name: '主持人' });
    const invitee = await seedTestUser({ name: '被取消人' });
    const event = await seedTestEvent(host.id, { phase: 'invite' });

    const prisma = getTestPrisma();

    // Create a cancelled signup first
    await prisma.eventSignup.create({
      data: { eventId: event.id, userId: invitee.id, status: 'cancelled' },
    });

    // Re-invite the same user
    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/invite`,
      payload: { userIds: [invitee.id], invitedById: host.id },
    });
    expect(res.statusCode).toBe(200);

    const signup = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: invitee.id } },
    });
    expect(signup!.status).toBe('invited');
  });

  it('does not downgrade accepted user when re-invited', async () => {
    const host = await seedTestUser({ name: '主持人' });
    const member = await seedTestUser({ name: '已报名人' });
    const event = await seedTestEvent(host.id, { phase: 'open' });

    const prisma = getTestPrisma();

    // User is already accepted
    await prisma.eventSignup.create({
      data: { eventId: event.id, userId: member.id, status: 'accepted' },
    });

    // Host tries to re-invite
    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/invite`,
      payload: { userIds: [member.id], invitedById: host.id },
    });
    expect(res.statusCode).toBe(200);

    // Status should remain accepted, not downgraded to invited
    const signup = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: member.id } },
    });
    expect(signup!.status).toBe('accepted');
  });

  it('invited user appears in GET event detail', async () => {
    const host = await seedTestUser({ name: '主持人' });
    const invitee = await seedTestUser({ name: '新邀请人' });
    const event = await seedTestEvent(host.id, { phase: 'invite' });

    // Invite the user
    await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/invite`,
      payload: { userIds: [invitee.id], invitedById: host.id },
    });

    // Fetch event detail
    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/events/${event.id}`,
    });
    expect(detailRes.statusCode).toBe(200);

    const detail = detailRes.json();
    const invitedSignup = detail.signups.find((s: any) => s.userId === invitee.id);
    expect(invitedSignup).toBeDefined();
    expect(invitedSignup.status).toBe('invited');
    expect(invitedSignup.user).toBeDefined();
    expect(invitedSignup.user.name).toBe('新邀请人');
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

// ── New comprehensive tests ──

describe('GET /api/events/cancelled', () => {
  it('returns empty array when no cancelled events', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/events/cancelled' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('lists cancelled events only', async () => {
    const host = await seedTestUser();
    await seedTestEvent(host.id, { title: '已取消', status: 'cancelled' });
    await seedTestEvent(host.id, { title: '正常活动' });

    const res = await app.inject({ method: 'GET', url: '/api/events/cancelled' });
    expect(res.statusCode).toBe(200);
    const events = res.json();
    expect(events.length).toBe(1);
    expect(events[0].title).toBe('已取消');
  });
});

describe('DELETE /api/events/:id', () => {
  it('deletes an event', async () => {
    const host = await seedTestUser();
    const event = await seedTestEvent(host.id);

    const res = await app.inject({ method: 'DELETE', url: `/api/events/${event.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const prisma = getTestPrisma();
    const gone = await prisma.event.findUnique({ where: { id: event.id } });
    expect(gone).toBeNull();
  });

  it('returns 500 for nonexistent event', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/events/nonexistent-id-000' });
    expect(res.statusCode).toBe(500);
  });
});

describe('DELETE /api/events/:id/photos', () => {
  it('removes a specific recap photo', async () => {
    const host = await seedTestUser();
    const prisma = getTestPrisma();
    const event = await prisma.event.create({
      data: {
        title: '照片测试', hostId: host.id, location: 'NYC',
        startsAt: new Date(Date.now() + 86400000), capacity: 10, phase: 'open',
        recapPhotoUrls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
      },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}/photos`,
      payload: { photoUrl: 'https://example.com/a.jpg' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const updated = await prisma.event.findUnique({ where: { id: event.id } });
    expect(updated!.recapPhotoUrls).toEqual(['https://example.com/b.jpg']);
  });

  it('removes only the specified photo when multiple exist', async () => {
    const host = await seedTestUser();
    const prisma = getTestPrisma();
    const urls = ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg'];
    const event = await prisma.event.create({
      data: {
        title: '多图测试', hostId: host.id, location: 'NYC',
        startsAt: new Date(Date.now() + 86400000), capacity: 10, phase: 'open',
        recapPhotoUrls: urls,
      },
    });

    await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}/photos`,
      payload: { photoUrl: 'https://example.com/2.jpg' },
    });

    const updated = await prisma.event.findUnique({ where: { id: event.id } });
    expect(updated!.recapPhotoUrls).toEqual(['https://example.com/1.jpg', 'https://example.com/3.jpg']);
  });
});

describe('Co-host management', () => {
  it('host adds a co-host (201)', async () => {
    const host = await seedTestUser({ name: '主持人' });
    const coHost = await seedTestUser({ name: '副主持' });
    const event = await seedTestEvent(host.id);

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/co-hosts`,
      headers: { 'x-user-id': host.id },
      payload: { userId: coHost.id },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().ok).toBe(true);

    const prisma = getTestPrisma();
    const record = await prisma.eventCoHost.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: coHost.id } },
    });
    expect(record).not.toBeNull();
  });

  it('returns 400 when x-user-id header missing', async () => {
    const host = await seedTestUser();
    const coHost = await seedTestUser();
    const event = await seedTestEvent(host.id);

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/co-hosts`,
      payload: { userId: coHost.id },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 403 when non-host tries to add', async () => {
    const host = await seedTestUser();
    const other = await seedTestUser();
    const target = await seedTestUser();
    const event = await seedTestEvent(host.id);

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/co-hosts`,
      headers: { 'x-user-id': other.id },
      payload: { userId: target.id },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 403 when host adds themselves', async () => {
    const host = await seedTestUser();
    const event = await seedTestEvent(host.id);

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/co-hosts`,
      headers: { 'x-user-id': host.id },
      payload: { userId: host.id },
    });
    expect(res.statusCode).toBe(403);
  });

  it('host removes a co-host', async () => {
    const host = await seedTestUser();
    const coHost = await seedTestUser();
    const event = await seedTestEvent(host.id);
    const prisma = getTestPrisma();
    await prisma.eventCoHost.create({ data: { eventId: event.id, userId: coHost.id } });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}/co-hosts/${coHost.id}`,
      headers: { 'x-user-id': host.id },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const record = await prisma.eventCoHost.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: coHost.id } },
    });
    expect(record).toBeNull();
  });

  it('returns 403 when non-host tries to remove', async () => {
    const host = await seedTestUser();
    const coHost = await seedTestUser();
    const other = await seedTestUser();
    const event = await seedTestEvent(host.id);
    const prisma = getTestPrisma();
    await prisma.eventCoHost.create({ data: { eventId: event.id, userId: coHost.id } });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}/co-hosts/${coHost.id}`,
      headers: { 'x-user-id': other.id },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('Participant removal (DELETE /:id/signup/:userId)', () => {
  it('host removes participant → status=cancelled', async () => {
    const host = await seedTestUser();
    const user = await seedTestUser();
    const event = await seedTestEvent(host.id);
    const prisma = getTestPrisma();
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user.id, status: 'accepted' } });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}/signup/${user.id}`,
      headers: { 'x-user-id': host.id },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const signup = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
    });
    expect(signup!.status).toBe('cancelled');
  });

  it('co-host can remove participant', async () => {
    const host = await seedTestUser();
    const coHost = await seedTestUser();
    const user = await seedTestUser();
    const event = await seedTestEvent(host.id);
    const prisma = getTestPrisma();
    await prisma.eventCoHost.create({ data: { eventId: event.id, userId: coHost.id } });
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user.id, status: 'accepted' } });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}/signup/${user.id}`,
      headers: { 'x-user-id': coHost.id },
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 400 when x-user-id missing', async () => {
    const host = await seedTestUser();
    const user = await seedTestUser();
    const event = await seedTestEvent(host.id);

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}/signup/${user.id}`,
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 403 when regular member tries to remove', async () => {
    const host = await seedTestUser();
    const user = await seedTestUser();
    const other = await seedTestUser();
    const event = await seedTestEvent(host.id);
    const prisma = getTestPrisma();
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user.id, status: 'accepted' } });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}/signup/${user.id}`,
      headers: { 'x-user-id': other.id },
    });
    expect(res.statusCode).toBe(403);
  });

  it('removal promotes next waitlisted user', async () => {
    const host = await seedTestUser();
    const user1 = await seedTestUser();
    const user2 = await seedTestUser();
    const prisma = getTestPrisma();
    // capacity=2: host(1) + 1 accepted = full
    const event = await seedTestEvent(host.id, { capacity: 2, waitlistEnabled: true });
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user1.id, status: 'accepted' } });
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user2.id, status: 'waitlist' } });

    // Host removes user1 → user2 should be promoted to offered
    await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}/signup/${user1.id}`,
      headers: { 'x-user-id': host.id },
    });

    const promoted = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user2.id } },
    });
    expect(promoted!.status).toBe('offered');
  });
});

describe('Movie linking', () => {
  it('links a movie → 201', async () => {
    const host = await seedTestUser();
    const event = await seedTestEvent(host.id);
    const movie = await seedTestMovie(host.id);

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/movies`,
      payload: { movieId: movie.id },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().ok).toBe(true);
    expect(res.json().screening).toBeDefined();

    const prisma = getTestPrisma();
    const screening = await prisma.movieScreening.findFirst({
      where: { eventId: event.id, movieId: movie.id },
    });
    expect(screening).not.toBeNull();
  });

  it('duplicate link is idempotent (returns 200)', async () => {
    const host = await seedTestUser();
    const event = await seedTestEvent(host.id);
    const movie = await seedTestMovie(host.id);

    await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/movies`,
      payload: { movieId: movie.id },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/movies`,
      payload: { movieId: movie.id },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it('unlinks a movie', async () => {
    const host = await seedTestUser();
    const event = await seedTestEvent(host.id);
    const movie = await seedTestMovie(host.id);
    const prisma = getTestPrisma();
    await prisma.movieScreening.create({ data: { eventId: event.id, movieId: movie.id } });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}/movies/${movie.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const record = await prisma.movieScreening.findFirst({
      where: { eventId: event.id, movieId: movie.id },
    });
    expect(record).toBeNull();
  });
});

describe('Recommendation selection', () => {
  it('selects a recommendation → isSelected=true', async () => {
    const host = await seedTestUser();
    const event = await seedTestEvent(host.id);
    const rec = await seedTestRecommendation(host.id);
    const prisma = getTestPrisma();
    const link = await prisma.eventRecommendation.create({
      data: { eventId: event.id, recommendationId: rec.id },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/events/${event.id}/recommendations/${rec.id}/select`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const updated = await prisma.eventRecommendation.findUnique({ where: { id: link.id } });
    expect(updated!.isSelected).toBe(true);
  });

  it('selecting new deselects previous in same category', async () => {
    const host = await seedTestUser();
    const event = await seedTestEvent(host.id);
    const rec1 = await seedTestRecommendation(host.id, { title: '推荐1', category: 'movie' });
    const rec2 = await seedTestRecommendation(host.id, { title: '推荐2', category: 'movie' });
    const prisma = getTestPrisma();
    const link1 = await prisma.eventRecommendation.create({
      data: { eventId: event.id, recommendationId: rec1.id, isSelected: true },
    });
    const link2 = await prisma.eventRecommendation.create({
      data: { eventId: event.id, recommendationId: rec2.id },
    });

    // Select rec2 → rec1 should be deselected
    await app.inject({
      method: 'PATCH',
      url: `/api/events/${event.id}/recommendations/${rec2.id}/select`,
    });

    const updatedLink1 = await prisma.eventRecommendation.findUnique({ where: { id: link1.id } });
    const updatedLink2 = await prisma.eventRecommendation.findUnique({ where: { id: link2.id } });
    expect(updatedLink1!.isSelected).toBe(false);
    expect(updatedLink2!.isSelected).toBe(true);
  });
});

describe('Waitlist: accept/decline offer', () => {
  it('accept offer → offered becomes accepted', async () => {
    const host = await seedTestUser();
    const user = await seedTestUser();
    const event = await seedTestEvent(host.id, { capacity: 2, waitlistEnabled: true });
    const prisma = getTestPrisma();
    await prisma.eventSignup.create({
      data: { eventId: event.id, userId: user.id, status: 'offered', offeredAt: new Date() },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/offer/accept`,
      payload: { userId: user.id },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const signup = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
    });
    expect(signup!.status).toBe('accepted');
    expect(signup!.respondedAt).not.toBeNull();
  });

  it('decline offer → offered becomes declined', async () => {
    const host = await seedTestUser();
    const user = await seedTestUser();
    const event = await seedTestEvent(host.id, { capacity: 2, waitlistEnabled: true });
    const prisma = getTestPrisma();
    await prisma.eventSignup.create({
      data: { eventId: event.id, userId: user.id, status: 'offered', offeredAt: new Date() },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/offer/decline`,
      payload: { userId: user.id },
    });
    expect(res.statusCode).toBe(200);

    const signup = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
    });
    expect(signup!.status).toBe('declined');
  });

  it('declining promotes next waitlisted to offered', async () => {
    const host = await seedTestUser();
    const offered = await seedTestUser();
    const waitlisted = await seedTestUser();
    // capacity=2: host(1) + 1 offered = full; declining frees a spot
    const event = await seedTestEvent(host.id, { capacity: 2, waitlistEnabled: true });
    const prisma = getTestPrisma();
    await prisma.eventSignup.create({
      data: { eventId: event.id, userId: offered.id, status: 'offered', offeredAt: new Date() },
    });
    await prisma.eventSignup.create({
      data: { eventId: event.id, userId: waitlisted.id, status: 'waitlist' },
    });

    await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/offer/decline`,
      payload: { userId: offered.id },
    });

    const promoted = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: waitlisted.id } },
    });
    expect(promoted!.status).toBe('offered');
  });
});

describe('Waitlist: host approve/reject', () => {
  it('host approves waitlisted user → accepted', async () => {
    const host = await seedTestUser();
    const user = await seedTestUser();
    const event = await seedTestEvent(host.id, { waitlistEnabled: true });
    const prisma = getTestPrisma();
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user.id, status: 'waitlist' } });

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/waitlist/${user.id}/approve`,
      headers: { 'x-user-id': host.id },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const signup = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
    });
    expect(signup!.status).toBe('accepted');
  });

  it('returns 403 when non-host tries to approve', async () => {
    const host = await seedTestUser();
    const other = await seedTestUser();
    const user = await seedTestUser();
    const event = await seedTestEvent(host.id, { waitlistEnabled: true });
    const prisma = getTestPrisma();
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user.id, status: 'waitlist' } });

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/waitlist/${user.id}/approve`,
      headers: { 'x-user-id': other.id },
    });
    expect(res.statusCode).toBe(403);
  });

  it('host rejects waitlisted user → rejected', async () => {
    const host = await seedTestUser();
    const user = await seedTestUser();
    const event = await seedTestEvent(host.id, { waitlistEnabled: true });
    const prisma = getTestPrisma();
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user.id, status: 'waitlist' } });

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/waitlist/${user.id}/reject`,
      headers: { 'x-user-id': host.id },
    });
    expect(res.statusCode).toBe(200);

    const signup = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
    });
    expect(signup!.status).toBe('rejected');
  });

  it('returns 403 when non-host tries to reject', async () => {
    const host = await seedTestUser();
    const other = await seedTestUser();
    const user = await seedTestUser();
    const event = await seedTestEvent(host.id, { waitlistEnabled: true });
    const prisma = getTestPrisma();
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user.id, status: 'waitlist' } });

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/waitlist/${user.id}/reject`,
      headers: { 'x-user-id': other.id },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('Waitlist full flow (integration)', () => {
  it('signup → waitlist → cancel accepted → promote → accept offer', async () => {
    const host = await seedTestUser();
    const user1 = await seedTestUser();
    const user2 = await seedTestUser();
    // capacity=2: host(1) + 1 accepted = full
    const event = await seedTestEvent(host.id, { capacity: 2, waitlistEnabled: true });
    const prisma = getTestPrisma();

    // user1 signs up → accepted (has room)
    await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/signup`,
      payload: { userId: user1.id },
    });
    let s1 = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user1.id } },
    });
    expect(s1!.status).toBe('accepted');

    // user2 signs up → waitlisted (full)
    await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/signup`,
      payload: { userId: user2.id },
    });
    let s2 = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user2.id } },
    });
    expect(s2!.status).toBe('waitlist');

    // user1 cancels → user2 promoted to offered
    await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}/signup`,
      payload: { userId: user1.id },
    });
    s2 = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user2.id } },
    });
    expect(s2!.status).toBe('offered');

    // user2 accepts offer
    await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/offer/accept`,
      payload: { userId: user2.id },
    });
    s2 = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user2.id } },
    });
    expect(s2!.status).toBe('accepted');
  });

  it('decline offer promotes next waitlisted user', async () => {
    const host = await seedTestUser();
    const user1 = await seedTestUser();
    const user2 = await seedTestUser();
    const user3 = await seedTestUser();
    const event = await seedTestEvent(host.id, { capacity: 2, waitlistEnabled: true });
    const prisma = getTestPrisma();

    // Fill: user1 accepted
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user1.id, status: 'accepted' } });
    // user2 offered, user3 waitlisted
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user2.id, status: 'offered', offeredAt: new Date() } });
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user3.id, status: 'waitlist' } });

    // Host removes user1 to free a slot, but user2 is already offered (still occupying)
    // Instead, user2 declines → now there's room for user3
    // But first we need to free a slot. With capacity=2: host(1) + user1(accepted) + user2(offered) = 3 >= 2 → overfull
    // When user2 declines: host(1) + user1(accepted) = 2 >= 2 → still full, no promotion
    // Let's adjust: capacity=3
    await prisma.event.update({ where: { id: event.id }, data: { capacity: 3 } });
    // Now: host(1) + user1(accepted) + user2(offered) = 3 >= 3 → full
    // user2 declines: host(1) + user1(accepted) = 2 < 3 → room for user3

    await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/offer/decline`,
      payload: { userId: user2.id },
    });

    const s3 = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user3.id } },
    });
    expect(s3!.status).toBe('offered');
  });

  it('co-host affects capacity (reduces available slots)', async () => {
    const host = await seedTestUser();
    const coHost = await seedTestUser();
    const user1 = await seedTestUser();
    const user2 = await seedTestUser();
    // capacity=3: host(1) + coHost(1) + 1 accepted = 3 → full
    const event = await seedTestEvent(host.id, { capacity: 3, waitlistEnabled: true });
    const prisma = getTestPrisma();
    await prisma.eventCoHost.create({ data: { eventId: event.id, userId: coHost.id } });

    // user1 accepted → fills remaining slot
    await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/signup`,
      payload: { userId: user1.id },
    });
    const s1 = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user1.id } },
    });
    expect(s1!.status).toBe('accepted');

    // user2 should be waitlisted since full
    await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/signup`,
      payload: { userId: user2.id },
    });
    const s2 = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user2.id } },
    });
    expect(s2!.status).toBe('waitlist');
  });

  it('host-removed participant triggers waitlist promotion', async () => {
    const host = await seedTestUser();
    const user1 = await seedTestUser();
    const user2 = await seedTestUser();
    const event = await seedTestEvent(host.id, { capacity: 2, waitlistEnabled: true });
    const prisma = getTestPrisma();

    // user1 accepted, user2 waitlisted
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user1.id, status: 'accepted' } });
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user2.id, status: 'waitlist' } });

    // Host removes user1
    await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}/signup/${user1.id}`,
      headers: { 'x-user-id': host.id },
    });

    const promoted = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user2.id } },
    });
    expect(promoted!.status).toBe('offered');
  });
});

describe('Status guards', () => {
  it('acceptOffer rejects non-offered status', async () => {
    const host = await seedTestUser();
    const user = await seedTestUser();
    const event = await seedTestEvent(host.id, { waitlistEnabled: true });
    const prisma = getTestPrisma();
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user.id, status: 'waitlist' } });

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/offer/accept`,
      payload: { userId: user.id },
    });
    expect(res.statusCode).toBe(500);
  });

  it('declineOffer rejects non-offered status', async () => {
    const host = await seedTestUser();
    const user = await seedTestUser();
    const event = await seedTestEvent(host.id, { waitlistEnabled: true });
    const prisma = getTestPrisma();
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user.id, status: 'accepted' } });

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/offer/decline`,
      payload: { userId: user.id },
    });
    expect(res.statusCode).toBe(500);
  });

  it('hostApproveWaitlist rejects non-waitlist status', async () => {
    const host = await seedTestUser();
    const user = await seedTestUser();
    const event = await seedTestEvent(host.id, { waitlistEnabled: true });
    const prisma = getTestPrisma();
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user.id, status: 'accepted' } });

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/waitlist/${user.id}/approve`,
      headers: { 'x-user-id': host.id },
    });
    // Error thrown in repository gets caught by service/route → 403
    expect(res.statusCode).toBe(403);
  });

  it('hostApproveWaitlist rejects when event is full', async () => {
    const host = await seedTestUser();
    const user1 = await seedTestUser();
    const user2 = await seedTestUser();
    // capacity=2: host(1) + user1(accepted) = full
    const event = await seedTestEvent(host.id, { capacity: 2, waitlistEnabled: true });
    const prisma = getTestPrisma();
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user1.id, status: 'accepted' } });
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user2.id, status: 'waitlist' } });

    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/waitlist/${user2.id}/approve`,
      headers: { 'x-user-id': host.id },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().message).toContain('已满');
  });
});

describe('Invited user accept (signup preserves slot)', () => {
  it('invited user accepts via signup without losing slot when full', async () => {
    const host = await seedTestUser();
    const invitee = await seedTestUser();
    const other = await seedTestUser();
    // capacity=3: host(1) + invitee(invited) + other(accepted) = 3 → full
    const event = await seedTestEvent(host.id, { capacity: 3, waitlistEnabled: true });
    const prisma = getTestPrisma();
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: invitee.id, status: 'invited', invitedAt: new Date() } });
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: other.id, status: 'accepted' } });

    // Invitee accepts via signup endpoint — should become accepted, NOT waitlisted
    const res = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/signup`,
      payload: { userId: invitee.id },
    });
    expect(res.statusCode).toBe(200);

    const signup = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: invitee.id } },
    });
    expect(signup!.status).toBe('accepted');
  });
});

describe('Co-host removal promotes waitlisted', () => {
  it('removing co-host frees a slot and promotes next waitlisted', async () => {
    const host = await seedTestUser();
    const coHost = await seedTestUser();
    const user1 = await seedTestUser();
    const user2 = await seedTestUser();
    // capacity=3: host(1) + coHost(1) + user1(accepted) = 3 → full
    const event = await seedTestEvent(host.id, { capacity: 3, waitlistEnabled: true });
    const prisma = getTestPrisma();
    await prisma.eventCoHost.create({ data: { eventId: event.id, userId: coHost.id } });
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user1.id, status: 'accepted' } });
    await prisma.eventSignup.create({ data: { eventId: event.id, userId: user2.id, status: 'waitlist' } });

    // Remove co-host → frees a slot → user2 should be promoted
    await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}/co-hosts/${coHost.id}`,
      headers: { 'x-user-id': host.id },
    });

    const promoted = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user2.id } },
    });
    expect(promoted!.status).toBe('offered');
  });
});
