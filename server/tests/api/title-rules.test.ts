import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, closeTestApp, cleanDb, seedTestUser, getTestPrisma } from '../helpers.js';
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

describe('Title Rules CRUD', () => {
  it('creates a title rule', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/title-rules',
      payload: {
        emoji: '🎬',
        name: '影迷',
        description: '经常看电影',
        stampEmoji: '🎥',
        threshold: 5,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.emoji).toBe('🎬');
    expect(body.name).toBe('影迷');
    expect(body.threshold).toBe(5);
  });

  it('lists title rules', async () => {
    const prisma = getTestPrisma();
    await prisma.titleRule.create({
      data: { emoji: '🎬', name: '影迷', stampEmoji: '🎥', threshold: 5 },
    });

    const res = await app.inject({ method: 'GET', url: '/api/title-rules' });
    expect(res.statusCode).toBe(200);
    const rules = res.json();
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBe(1);
  });

  it('updates a title rule', async () => {
    const prisma = getTestPrisma();
    const rule = await prisma.titleRule.create({
      data: { emoji: '🎬', name: '影迷', stampEmoji: '🎥', threshold: 5 },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/title-rules/${rule.id}`,
      payload: { name: '电影达人', threshold: 10 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const updated = await prisma.titleRule.findUnique({ where: { id: rule.id } });
    expect(updated!.name).toBe('电影达人');
    expect(updated!.threshold).toBe(10);
  });

  it('deletes a title rule', async () => {
    const prisma = getTestPrisma();
    const rule = await prisma.titleRule.create({
      data: { emoji: '🎬', name: '影迷', stampEmoji: '🎥' },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/title-rules/${rule.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const deleted = await prisma.titleRule.findUnique({ where: { id: rule.id } });
    expect(deleted).toBeNull();
  });
});

describe('Grant / Revoke titles', () => {
  it('grants a title to a user', async () => {
    const user = await seedTestUser();
    const res = await app.inject({
      method: 'POST',
      url: '/api/title-rules/grant',
      payload: { userId: user.id, value: '影迷' },
    });
    expect(res.statusCode).toBe(201);

    const prisma = getTestPrisma();
    const titles = await prisma.userSocialTitle.findMany({ where: { userId: user.id } });
    expect(titles.length).toBe(1);
    expect(titles[0].value).toBe('影迷');
  });

  it('revokes a title from a user', async () => {
    const user = await seedTestUser();
    const prisma = getTestPrisma();
    await prisma.userSocialTitle.create({
      data: { userId: user.id, value: '影迷' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/title-rules/revoke',
      payload: { userId: user.id, value: '影迷' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const titles = await prisma.userSocialTitle.findMany({ where: { userId: user.id } });
    expect(titles.length).toBe(0);
  });
});

describe('GET /api/title-rules/holders-count', () => {
  it('returns holder counts', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/title-rules/holders-count' });
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /api/title-rules/members', () => {
  it('returns members with their titles', async () => {
    const user = await seedTestUser();
    const prisma = getTestPrisma();
    await prisma.userSocialTitle.create({
      data: { userId: user.id, value: '影迷' },
    });

    const res = await app.inject({ method: 'GET', url: '/api/title-rules/members' });
    expect(res.statusCode).toBe(200);
    const members = res.json();
    expect(Array.isArray(members)).toBe(true);
  });
});
