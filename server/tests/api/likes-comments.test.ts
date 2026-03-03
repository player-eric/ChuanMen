import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, closeTestApp, cleanDb, seedTestUser, seedTestEvent, seedTestMovie, seedTestProposal, getTestPrisma } from '../helpers.js';
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

// ── Likes ──

describe('POST /api/likes/toggle', () => {
  it('toggles like on an event', async () => {
    const host = await seedTestUser();
    const liker = await seedTestUser();
    const event = await seedTestEvent(host.id);

    // Like
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/likes/toggle',
      payload: { entityType: 'event', entityId: event.id, userId: liker.id },
    });
    expect(res1.statusCode).toBe(200);

    const prisma = getTestPrisma();
    let likes = await prisma.like.findMany({
      where: { entityType: 'event', entityId: event.id, userId: liker.id },
    });
    expect(likes.length).toBe(1);

    // Unlike
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/likes/toggle',
      payload: { entityType: 'event', entityId: event.id, userId: liker.id },
    });
    expect(res2.statusCode).toBe(200);

    likes = await prisma.like.findMany({
      where: { entityType: 'event', entityId: event.id, userId: liker.id },
    });
    expect(likes.length).toBe(0);
  });

  it('toggles like on a movie', async () => {
    const user = await seedTestUser();
    const liker = await seedTestUser();
    const movie = await seedTestMovie(user.id);

    const res = await app.inject({
      method: 'POST',
      url: '/api/likes/toggle',
      payload: { entityType: 'movie', entityId: movie.id, userId: liker.id },
    });
    expect(res.statusCode).toBe(200);
  });

  it('toggles like on a proposal', async () => {
    const user = await seedTestUser();
    const liker = await seedTestUser();
    const proposal = await seedTestProposal(user.id);

    const res = await app.inject({
      method: 'POST',
      url: '/api/likes/toggle',
      payload: { entityType: 'proposal', entityId: proposal.id, userId: liker.id },
    });
    expect(res.statusCode).toBe(200);
  });

  it('toggles like on a user profile', async () => {
    const userA = await seedTestUser();
    const userB = await seedTestUser();

    const res = await app.inject({
      method: 'POST',
      url: '/api/likes/toggle',
      payload: { entityType: 'user', entityId: userA.id, userId: userB.id },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /api/likes', () => {
  it('lists likers for an entity', async () => {
    const host = await seedTestUser({ name: '主持人' });
    const liker = await seedTestUser({ name: '点赞者' });
    const event = await seedTestEvent(host.id);

    const prisma = getTestPrisma();
    await prisma.like.create({
      data: { entityType: 'event', entityId: event.id, userId: liker.id },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/likes?entityType=event&entityId=${event.id}`,
    });
    expect(res.statusCode).toBe(200);
    const likes = res.json();
    expect(Array.isArray(likes)).toBe(true);
    expect(likes.length).toBe(1);
  });
});

// ── Comments ──

describe('POST /api/comments', () => {
  it('creates a comment on an event', async () => {
    const host = await seedTestUser();
    const commenter = await seedTestUser();
    const event = await seedTestEvent(host.id);

    const res = await app.inject({
      method: 'POST',
      url: '/api/comments',
      payload: {
        entityType: 'event',
        entityId: event.id,
        authorId: commenter.id,
        content: '这个活动太棒了！',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.content).toBe('这个活动太棒了！');
    expect(body.authorId).toBe(commenter.id);
    expect(body.entityType).toBe('event');
  });

  it('creates a comment on a movie', async () => {
    const user = await seedTestUser();
    const movie = await seedTestMovie(user.id);

    const res = await app.inject({
      method: 'POST',
      url: '/api/comments',
      payload: {
        entityType: 'movie',
        entityId: movie.id,
        authorId: user.id,
        content: '经典电影',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().entityType).toBe('movie');
  });

  it('creates a comment on a proposal', async () => {
    const user = await seedTestUser();
    const proposal = await seedTestProposal(user.id);

    const res = await app.inject({
      method: 'POST',
      url: '/api/comments',
      payload: {
        entityType: 'proposal',
        entityId: proposal.id,
        authorId: user.id,
        content: '好主意',
      },
    });
    expect(res.statusCode).toBe(201);
  });
});

describe('GET /api/comments', () => {
  it('lists comments for an entity', async () => {
    const host = await seedTestUser();
    const commenter = await seedTestUser();
    const event = await seedTestEvent(host.id);

    const prisma = getTestPrisma();
    await prisma.comment.create({
      data: {
        entityType: 'event',
        entityId: event.id,
        authorId: commenter.id,
        content: '评论内容',
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/comments?entityType=event&entityId=${event.id}`,
    });
    expect(res.statusCode).toBe(200);
    const comments = res.json();
    expect(Array.isArray(comments)).toBe(true);
    expect(comments.length).toBe(1);
    expect(comments[0].content).toBe('评论内容');
  });
});

describe('DELETE /api/comments/:id', () => {
  it('deletes a comment', async () => {
    const user = await seedTestUser();
    const event = await seedTestEvent(user.id);

    const prisma = getTestPrisma();
    const comment = await prisma.comment.create({
      data: {
        entityType: 'event',
        entityId: event.id,
        authorId: user.id,
        content: '要删除的评论',
      },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/comments/${comment.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const deleted = await prisma.comment.findUnique({ where: { id: comment.id } });
    expect(deleted).toBeNull();
  });
});

describe('GET /api/comments/admin/list', () => {
  it('returns all comments for admin', async () => {
    const user = await seedTestUser();
    const event = await seedTestEvent(user.id);

    const prisma = getTestPrisma();
    await prisma.comment.create({
      data: {
        entityType: 'event',
        entityId: event.id,
        authorId: user.id,
        content: '管理员可见的评论',
      },
    });

    const res = await app.inject({ method: 'GET', url: '/api/comments/admin/list' });
    expect(res.statusCode).toBe(200);
    const comments = res.json();
    expect(Array.isArray(comments)).toBe(true);
    expect(comments.length).toBe(1);
  });
});
