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

describe('GET /api/about/stats', () => {
  it('returns community stats', async () => {
    await seedTestUser({ userStatus: 'approved' });
    await seedTestUser({ userStatus: 'approved' });

    const res = await app.inject({ method: 'GET', url: '/api/about/stats' });
    expect(res.statusCode).toBe(200);
    const stats = res.json();
    expect(stats).toBeDefined();
    // Stats should include member count
    expect(typeof stats.memberCount).toBe('number');
    expect(stats.memberCount).toBeGreaterThanOrEqual(2);
  });
});

describe('About content CRUD', () => {
  it('PUT /api/about/content/:type upserts content', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/about/content/principle',
      payload: { title: '串门原则', content: '我们的原则...' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    // GET returns array (findMany)
    const getRes = await app.inject({ method: 'GET', url: '/api/about/content/principle' });
    expect(getRes.statusCode).toBe(200);
    const items = getRes.json();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(1);
    expect(items[0].title).toBe('串门原则');
    expect(items[0].content).toBe('我们的原则...');
  });

  it('updates existing content on second PUT', async () => {
    await app.inject({
      method: 'PUT',
      url: '/api/about/content/host_guide',
      payload: { title: 'Host手册v1', content: '版本1' },
    });

    await app.inject({
      method: 'PUT',
      url: '/api/about/content/host_guide',
      payload: { title: 'Host手册v2', content: '版本2' },
    });

    const res = await app.inject({ method: 'GET', url: '/api/about/content/host_guide' });
    expect(res.statusCode).toBe(200);
    const items = res.json();
    expect(items[0].content).toBe('版本2');
  });
});

describe('Announcements CRUD', () => {
  it('creates an announcement', async () => {
    const admin = await seedTestUser({ role: 'admin' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/about/announcements',
      payload: {
        title: '社区公告',
        body: '这是一条公告',
        type: 'announcement',
        pinned: false,
        authorId: admin.id,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().title).toBe('社区公告');
  });

  it('lists published announcements', async () => {
    const admin = await seedTestUser({ role: 'admin' });
    const prisma = getTestPrisma();
    await prisma.announcement.create({
      data: {
        title: '已发布公告',
        body: '内容',
        authorId: admin.id,
        published: true,
      },
    });
    await prisma.announcement.create({
      data: {
        title: '未发布公告',
        body: '内容',
        authorId: admin.id,
        published: false,
      },
    });

    const res = await app.inject({ method: 'GET', url: '/api/about/announcements' });
    expect(res.statusCode).toBe(200);
    const announcements = res.json();
    expect(announcements.length).toBe(1);
    expect(announcements[0].title).toBe('已发布公告');
  });

  it('updates an announcement', async () => {
    const admin = await seedTestUser({ role: 'admin' });
    const prisma = getTestPrisma();
    const ann = await prisma.announcement.create({
      data: { title: '原标题', body: '原内容', authorId: admin.id },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/about/announcements/${ann.id}`,
      payload: { title: '新标题', pinned: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const updated = await prisma.announcement.findUnique({ where: { id: ann.id } });
    expect(updated!.title).toBe('新标题');
    expect(updated!.pinned).toBe(true);
  });

  it('deletes an announcement', async () => {
    const admin = await seedTestUser({ role: 'admin' });
    const prisma = getTestPrisma();
    const ann = await prisma.announcement.create({
      data: { title: '待删除', body: '内容', authorId: admin.id },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/about/announcements/${ann.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it('GET /api/about/announcements/:id returns single announcement', async () => {
    const admin = await seedTestUser({ role: 'admin' });
    const prisma = getTestPrisma();
    const ann = await prisma.announcement.create({
      data: { title: '单条公告', body: '详细内容', authorId: admin.id, published: true },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/about/announcements/${ann.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().title).toBe('单条公告');
  });
});
