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

describe('GET /api/postcards', () => {
  it('returns sent, received, credits, and eligible recipients for a user', async () => {
    const userA = await seedTestUser({ name: 'A' });
    const userB = await seedTestUser({ name: 'B' });
    await seedTestPostcard(userA.id, userB.id);

    const res = await app.inject({
      method: 'GET',
      url: `/api/postcards?userId=${userA.id}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.sent).toBeDefined();
    expect(body.received).toBeDefined();
    expect(typeof body.credits).toBe('number');
    expect(body.eligible).toBeDefined();
    expect(body.sent.length).toBe(1);
  });

  it('shows received postcards', async () => {
    const userA = await seedTestUser();
    const userB = await seedTestUser();
    await seedTestPostcard(userA.id, userB.id);

    const res = await app.inject({
      method: 'GET',
      url: `/api/postcards?userId=${userB.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().received.length).toBe(1);
  });
});

describe('POST /api/postcards', () => {
  it('creates a postcard and deducts credit', async () => {
    const sender = await seedTestUser({ postcardCredits: 5 });
    const receiver = await seedTestUser();

    const res = await app.inject({
      method: 'POST',
      url: '/api/postcards',
      payload: {
        fromId: sender.id,
        toId: receiver.id,
        message: '感谢你的帮助！',
        visibility: 'public',
        tags: ['热心'],
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.message).toBe('感谢你的帮助！');
    expect(body.fromId).toBe(sender.id);
    expect(body.toId).toBe(receiver.id);

    // Check credit was deducted
    const prisma = getTestPrisma();
    const updatedSender = await prisma.user.findUnique({ where: { id: sender.id } });
    expect(updatedSender!.postcardCredits).toBe(4);
  });

  it('fails when insufficient credits', async () => {
    const sender = await seedTestUser({ postcardCredits: 0 });
    const receiver = await seedTestUser();

    const res = await app.inject({
      method: 'POST',
      url: '/api/postcards',
      payload: {
        fromId: sender.id,
        toId: receiver.id,
        message: '感谢！',
      },
    });
    // Should fail with some error status
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe('PATCH /api/postcards/:id', () => {
  it('toggles postcard visibility', async () => {
    const userA = await seedTestUser();
    const userB = await seedTestUser();
    const card = await seedTestPostcard(userA.id, userB.id, { visibility: 'public' });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/postcards/${card.id}`,
      payload: { userId: userA.id, visibility: 'private' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const prisma = getTestPrisma();
    const updated = await prisma.postcard.findUnique({ where: { id: card.id } });
    expect(updated!.visibility).toBe('private');
  });
});

describe('DELETE /api/postcards/:id', () => {
  it('deletes own postcard', async () => {
    const userA = await seedTestUser();
    const userB = await seedTestUser();
    const card = await seedTestPostcard(userA.id, userB.id);

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/postcards/${card.id}?userId=${userA.id}`,
    });
    expect(res.statusCode).toBe(204);

    const prisma = getTestPrisma();
    const deleted = await prisma.postcard.findUnique({ where: { id: card.id } });
    expect(deleted).toBeNull();
  });
});

describe('Admin postcard operations', () => {
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
  });
});
