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
