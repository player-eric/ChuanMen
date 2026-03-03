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

// ── Newsletters ──

describe('Newsletter CRUD', () => {
  it('creates a newsletter draft', async () => {
    const author = await seedTestUser({ role: 'admin' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/newsletters',
      payload: {
        subject: '第一期通讯',
        body: '通讯内容',
        authorId: author.id,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.subject).toBe('第一期通讯');
    expect(body.status).toBe('draft');
    expect(body.author).toBeDefined();
  });

  it('lists newsletters', async () => {
    const author = await seedTestUser({ role: 'admin' });
    const prisma = getTestPrisma();
    await prisma.newsletter.create({
      data: { subject: '测试通讯', authorId: author.id },
    });

    const res = await app.inject({ method: 'GET', url: '/api/newsletters' });
    expect(res.statusCode).toBe(200);
    const newsletters = res.json();
    expect(Array.isArray(newsletters)).toBe(true);
    expect(newsletters.length).toBe(1);
  });

  it('filters newsletters by status', async () => {
    const author = await seedTestUser({ role: 'admin' });
    const prisma = getTestPrisma();
    await prisma.newsletter.create({
      data: { subject: '草稿', authorId: author.id, status: 'draft' },
    });
    await prisma.newsletter.create({
      data: { subject: '已发送', authorId: author.id, status: 'sent', sentAt: new Date() },
    });

    const draftRes = await app.inject({ method: 'GET', url: '/api/newsletters?status=draft' });
    expect(draftRes.json().length).toBe(1);
    expect(draftRes.json()[0].subject).toBe('草稿');

    const sentRes = await app.inject({ method: 'GET', url: '/api/newsletters?status=sent' });
    expect(sentRes.json().length).toBe(1);
    expect(sentRes.json()[0].subject).toBe('已发送');
  });

  it('updates a newsletter', async () => {
    const author = await seedTestUser({ role: 'admin' });
    const prisma = getTestPrisma();
    const nl = await prisma.newsletter.create({
      data: { subject: '原标题', authorId: author.id },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/newsletters/${nl.id}`,
      payload: { subject: '新标题', body: '新内容' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().subject).toBe('新标题');
  });

  it('sends a newsletter (marks as sent)', async () => {
    const author = await seedTestUser({ role: 'admin', userStatus: 'approved' });
    const prisma = getTestPrisma();
    const nl = await prisma.newsletter.create({
      data: { subject: '待发送', authorId: author.id, recipientGroup: '全部成员' },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/newsletters/${nl.id}/send`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('sent');
    expect(body.sentAt).toBeDefined();
    expect(body.recipientCount).toBeGreaterThanOrEqual(1);
  });

  it('deletes a newsletter', async () => {
    const author = await seedTestUser({ role: 'admin' });
    const prisma = getTestPrisma();
    const nl = await prisma.newsletter.create({
      data: { subject: '待删除', authorId: author.id },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/newsletters/${nl.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });
});

describe('GET /api/newsletters/stats', () => {
  it('returns subscriber group counts', async () => {
    await seedTestUser({ userStatus: 'approved', role: 'admin' });
    await seedTestUser({ userStatus: 'approved', role: 'member' });

    const res = await app.inject({ method: 'GET', url: '/api/newsletters/stats' });
    expect(res.statusCode).toBe(200);
    const stats = res.json();
    expect(Array.isArray(stats)).toBe(true);
    expect(stats.length).toBe(5);
    // Should have group labels
    const labels = stats.map((s: any) => s.label);
    expect(labels).toContain('全部成员');
    expect(labels).toContain('管理员');
    // Total should be >= 2
    const total = stats.find((s: any) => s.label === '全部成员');
    expect(total.count).toBeGreaterThanOrEqual(2);
  });
});

// ── Site Config ──

describe('Site Config CRUD', () => {
  it('PUT /api/config/:key upserts a config entry', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/config/site_name',
      payload: { value: '串门儿' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().key).toBe('site_name');
    expect(res.json().value).toBe('串门儿');
  });

  it('GET /api/config returns all config as key-value object', async () => {
    const prisma = getTestPrisma();
    await prisma.siteConfig.create({ data: { key: 'k1', value: 'v1' } });
    await prisma.siteConfig.create({ data: { key: 'k2', value: 42 } });

    const res = await app.inject({ method: 'GET', url: '/api/config' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.k1).toBe('v1');
    expect(body.k2).toBe(42);
  });

  it('GET /api/config/:key returns single config', async () => {
    const prisma = getTestPrisma();
    await prisma.siteConfig.create({ data: { key: 'test_key', value: 'test_value' } });

    const res = await app.inject({ method: 'GET', url: '/api/config/test_key' });
    expect(res.statusCode).toBe(200);
    expect(res.json().key).toBe('test_key');
    expect(res.json().value).toBe('test_value');
  });

  it('GET /api/config/:key returns 404 for missing key', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/config/nonexistent' });
    expect(res.statusCode).toBe(404);
  });

  it('DELETE /api/config/:key deletes a config entry', async () => {
    const prisma = getTestPrisma();
    await prisma.siteConfig.create({ data: { key: 'to_delete', value: 'bye' } });

    const res = await app.inject({ method: 'DELETE', url: '/api/config/to_delete' });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const deleted = await prisma.siteConfig.findUnique({ where: { key: 'to_delete' } });
    expect(deleted).toBeNull();
  });

  it('POST /api/config/batch upserts multiple configs', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/config/batch',
      payload: {
        batch_key1: 'value1',
        batch_key2: 'value2',
        batch_key3: 123,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
    expect(res.json().count).toBe(3);

    const prisma = getTestPrisma();
    const k1 = await prisma.siteConfig.findUnique({ where: { key: 'batch_key1' } });
    expect(k1!.value).toBe('value1');
  });
});
