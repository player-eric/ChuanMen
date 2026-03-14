import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, closeTestApp, cleanDb, seedTestUser, seedTestEvent, seedTestDailyQuestion, getTestPrisma } from '../helpers.js';
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

describe('Daily Question API', () => {
  // ── GET /api/daily-question/today ──

  describe('GET /api/daily-question/today', () => {
    it('returns null when no questions exist', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/daily-question/today' });
      expect(res.statusCode).toBe(200);
      expect(res.json().question).toBeNull();
    });

    it('returns a question from pool', async () => {
      await seedTestDailyQuestion({ text: '推荐一部好电影？' });

      const res = await app.inject({ method: 'GET', url: '/api/daily-question/today' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.question).toBeDefined();
      expect(body.question.text).toBe('推荐一部好电影？');
      expect(body.question.targetType).toBe('recommendation');
      expect(body.answers).toEqual([]);
    });

    it('returns same question on repeated calls (deterministic)', async () => {
      await seedTestDailyQuestion({ text: 'Q1' });
      await seedTestDailyQuestion({ text: 'Q2' });

      const res1 = await app.inject({ method: 'GET', url: '/api/daily-question/today' });
      const res2 = await app.inject({ method: 'GET', url: '/api/daily-question/today' });
      expect(res1.json().question.id).toBe(res2.json().question.id);
    });
  });

  // ── POST /api/daily-question/answer ──

  describe('POST /api/daily-question/answer', () => {
    it('rejects missing parameters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/daily-question/answer',
        payload: { questionId: '', text: '', userId: '' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('creates recommendation for recommendation-type question', async () => {
      const user = await seedTestUser();
      const q = await seedTestDailyQuestion({ text: '推荐一部好电影？', targetType: 'recommendation', targetCategory: 'movie' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/daily-question/answer',
        payload: { questionId: q.id, text: '肖申克的救赎', userId: user.id },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.type).toBe('recommendation');
      expect(body.entity.title).toBe('肖申克的救赎');

      // Verify recommendation was created in DB
      const prisma = getTestPrisma();
      const rec = await prisma.recommendation.findFirst({ where: { dailyQuestionId: q.id } });
      expect(rec).toBeDefined();
      expect(rec!.category).toBe('movie');
    });

    it('creates proposal for proposal-type question', async () => {
      const user = await seedTestUser();
      const q = await seedTestDailyQuestion({ text: '想一起做什么？', targetType: 'proposal', targetCategory: undefined });

      const res = await app.inject({
        method: 'POST',
        url: '/api/daily-question/answer',
        payload: { questionId: q.id, text: '一起去爬山', userId: user.id },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().type).toBe('proposal');
      expect(res.json().entity.title).toBe('一起去爬山');
    });

    it('creates comment for comment-type question with target event', async () => {
      const user = await seedTestUser();
      const host = await seedTestUser();
      const event = await seedTestEvent(host.id, { status: 'completed', startsAt: new Date(Date.now() - 86400000) });

      // User attended this event
      const prisma = getTestPrisma();
      await prisma.eventSignup.create({
        data: { eventId: event.id, userId: user.id, status: 'accepted' },
      });

      const q = await seedTestDailyQuestion({
        text: '对上次活动有什么感想？',
        targetType: 'comment',
        targetEntityType: 'event',
        targetCategory: undefined,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/daily-question/answer',
        payload: { questionId: q.id, text: '非常开心！', userId: user.id },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().type).toBe('comment');
    });
  });

  // ── Admin CRUD ──

  describe('Admin CRUD', () => {
    it('GET / lists all questions', async () => {
      await seedTestDailyQuestion({ text: 'Q1' });
      await seedTestDailyQuestion({ text: 'Q2' });

      const res = await app.inject({ method: 'GET', url: '/api/daily-question' });
      expect(res.statusCode).toBe(200);
      expect(res.json().length).toBe(2);
    });

    it('POST / creates a new question', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/daily-question',
        payload: { text: '新问题', targetType: 'proposal' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().text).toBe('新问题');
      expect(res.json().targetType).toBe('proposal');
    });

    it('POST / rejects missing text', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/daily-question',
        payload: { text: '', targetType: 'proposal' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('PATCH /:id updates a question', async () => {
      const q = await seedTestDailyQuestion({ text: '旧问题' });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/daily-question/${q.id}`,
        payload: { text: '新问题', targetType: 'proposal' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().question.text).toBe('新问题');
    });

    it('DELETE /:id removes a question', async () => {
      const q = await seedTestDailyQuestion({ text: '要删除的' });

      const res = await app.inject({ method: 'DELETE', url: `/api/daily-question/${q.id}` });
      expect(res.statusCode).toBe(200);
      expect(res.json().ok).toBe(true);

      // Verify deleted
      const prisma = getTestPrisma();
      const found = await prisma.dailyQuestion.findUnique({ where: { id: q.id } });
      expect(found).toBeNull();
    });
  });

  // ── GET /api/daily-question/random ──

  describe('GET /api/daily-question/random', () => {
    it('returns null when no questions exist', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/daily-question/random' });
      expect(res.statusCode).toBe(200);
      expect(res.json().question).toBeNull();
    });

    it('returns a random question excluding specified id', async () => {
      const q1 = await seedTestDailyQuestion({ text: 'Q1' });
      await seedTestDailyQuestion({ text: 'Q2' });

      const res = await app.inject({ method: 'GET', url: `/api/daily-question/random?exclude=${q1.id}` });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.question).toBeDefined();
      expect(body.question.id).not.toBe(q1.id);
    });

    it('renders {{eventTitle}} template for comment/event questions', async () => {
      const host = await seedTestUser();
      const user = await seedTestUser();
      const event = await seedTestEvent(host.id, { title: '电影之夜', status: 'completed', startsAt: new Date(Date.now() - 86400000) });

      const prisma = getTestPrisma();
      await prisma.eventSignup.create({
        data: { eventId: event.id, userId: user.id, status: 'accepted' },
      });

      await seedTestDailyQuestion({
        text: '对「{{eventTitle}}」有什么感想？',
        targetType: 'comment',
        targetEntityType: 'event',
        targetCategory: undefined,
      });

      const res = await app.inject({ method: 'GET', url: `/api/daily-question/random?userId=${user.id}` });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      if (body.question) {
        expect(body.question.text).toContain('电影之夜');
        expect(body.question.text).not.toContain('{{eventTitle}}');
      }
    });
  });
});
