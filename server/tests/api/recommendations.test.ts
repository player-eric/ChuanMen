import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, closeTestApp, cleanDb, seedTestUser, seedTestRecommendation, getTestPrisma } from '../helpers.js';
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

describe('GET /api/recommendations', () => {
  it('lists recommendations', async () => {
    const user = await seedTestUser();
    await seedTestRecommendation(user.id, { title: '好电影推荐' });

    const res = await app.inject({ method: 'GET', url: '/api/recommendations' });
    expect(res.statusCode).toBe(200);
    const recs = res.json();
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBe(1);
    expect(recs[0].title).toBe('好电影推荐');
  });
});

describe('GET /api/recommendations/search', () => {
  it('searches recommendations by title', async () => {
    const user = await seedTestUser();
    await seedTestRecommendation(user.id, { title: '北京烤鸭做法', category: 'recipe' });
    await seedTestRecommendation(user.id, { title: '纽约旅行指南', category: 'place' });

    const res = await app.inject({ method: 'GET', url: '/api/recommendations/search?q=烤鸭' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items.length).toBe(1);
    expect(body.items[0].title).toBe('北京烤鸭做法');
  });
});

describe('GET /api/recommendations/:id', () => {
  it('returns recommendation detail', async () => {
    const user = await seedTestUser();
    const rec = await seedTestRecommendation(user.id, { title: '详情测试' });

    const res = await app.inject({ method: 'GET', url: `/api/recommendations/${rec.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().title).toBe('详情测试');
  });

  it('returns 404 for nonexistent recommendation', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/recommendations/nonexistent-id-123' });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/recommendations', () => {
  it('creates recommendations of various categories', async () => {
    const user = await seedTestUser();

    for (const category of ['movie', 'book', 'recipe', 'place'] as const) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/recommendations',
        payload: {
          category,
          title: `${category}推荐`,
          authorId: user.id,
          description: `一个${category}推荐`,
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().category).toBe(category);
    }
  });
});

describe('POST /api/recommendations/:id/vote', () => {
  it('toggles vote on a recommendation', async () => {
    const author = await seedTestUser();
    const voter = await seedTestUser();
    const rec = await seedTestRecommendation(author.id);

    // Vote
    const res1 = await app.inject({
      method: 'POST',
      url: `/api/recommendations/${rec.id}/vote`,
      payload: { userId: voter.id },
    });
    expect(res1.statusCode).toBe(200);

    const prisma = getTestPrisma();
    let votes = await prisma.recommendationVote.findMany({
      where: { recommendationId: rec.id, userId: voter.id },
    });
    expect(votes.length).toBe(1);

    // Toggle (unvote)
    const res2 = await app.inject({
      method: 'POST',
      url: `/api/recommendations/${rec.id}/vote`,
      payload: { userId: voter.id },
    });
    expect(res2.statusCode).toBe(200);

    votes = await prisma.recommendationVote.findMany({
      where: { recommendationId: rec.id, userId: voter.id },
    });
    expect(votes.length).toBe(0);
  });
});

describe('PATCH /api/recommendations/:id', () => {
  it('allows author to edit', async () => {
    const author = await seedTestUser();
    const rec = await seedTestRecommendation(author.id, { title: '原始标题' });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/recommendations/${rec.id}`,
      headers: { 'x-user-id': author.id },
      payload: { title: '新标题', description: '新描述' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().title).toBe('新标题');
  });

  it('forbids non-author from editing', async () => {
    const author = await seedTestUser();
    const other = await seedTestUser();
    const rec = await seedTestRecommendation(author.id);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/recommendations/${rec.id}`,
      headers: { 'x-user-id': other.id },
      payload: { title: '恶意修改' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('DELETE /api/recommendations/:id', () => {
  it('allows author to delete', async () => {
    const author = await seedTestUser();
    const rec = await seedTestRecommendation(author.id);

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/recommendations/${rec.id}`,
      headers: { 'x-user-id': author.id },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it('allows admin to delete others recommendation', async () => {
    const author = await seedTestUser();
    const admin = await seedTestUser({ role: 'admin' });
    const rec = await seedTestRecommendation(author.id);

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/recommendations/${rec.id}`,
      headers: { 'x-user-id': admin.id },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it('forbids non-author non-admin from deleting', async () => {
    const author = await seedTestUser();
    const other = await seedTestUser();
    const rec = await seedTestRecommendation(author.id);

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/recommendations/${rec.id}`,
      headers: { 'x-user-id': other.id },
    });
    expect(res.statusCode).toBe(403);
  });

  it('requires auth header', async () => {
    const author = await seedTestUser();
    const rec = await seedTestRecommendation(author.id);

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/recommendations/${rec.id}`,
    });
    expect(res.statusCode).toBe(401);
  });
});
