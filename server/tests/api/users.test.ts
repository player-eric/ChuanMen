import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, closeTestApp, cleanDb, seedTestUser, seedTestAdmin, seedTestEvent, getTestPrisma } from '../helpers.js';
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

describe('POST /api/users/apply', () => {
  it('creates an applicant', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users/apply',
      payload: {
        displayName: '新用户',
        city: 'NYC',
        bio: '我是新用户',
        selfAsFriend: '开朗的朋友',
        idealFriend: '有趣的人',
        participationPlan: '经常参加',
        email: 'newuser@example.com',
        wechatId: 'newuser123',
      },
    });
    // 201 created (email notification may fail silently)
    expect(res.statusCode).toBe(201);
    expect(res.json().ok).toBe(true);
    expect(res.json().id).toBeDefined();

    // Verify user was created in DB with applicant status
    const prisma = getTestPrisma();
    const user = await prisma.user.findUnique({ where: { email: 'newuser@example.com' } });
    expect(user).not.toBeNull();
    expect(user!.userStatus).toBe('applicant');
    expect(user!.name).toBe('新用户');
  });

  it('rejects duplicate email', async () => {
    await seedTestUser({ email: 'dup@example.com' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/users/apply',
      payload: {
        displayName: '重复用户',
        city: 'NYC',
        bio: '我是重复用户',
        selfAsFriend: '开朗的朋友',
        idealFriend: '有趣的人',
        participationPlan: '经常参加',
        email: 'dup@example.com',
        wechatId: 'dup123',
      },
    });
    expect(res.statusCode).toBe(409);
  });
});

describe('GET /api/users', () => {
  it('lists all users', async () => {
    await seedTestUser({ name: '用户A', userStatus: 'approved' });
    await seedTestUser({ name: '用户B', userStatus: 'approved' });
    await seedTestUser({ name: '申请人C', userStatus: 'applicant' });

    const res = await app.inject({ method: 'GET', url: '/api/users' });
    expect(res.statusCode).toBe(200);
    const users = res.json();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBe(3);
    const names = users.map((u: any) => u.name);
    expect(names).toContain('用户A');
    expect(names).toContain('用户B');
  });
});

describe('GET /api/users/:id', () => {
  it('returns user by id', async () => {
    const user = await seedTestUser({ name: '测试查找' });
    const res = await app.inject({ method: 'GET', url: `/api/users/${user.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('测试查找');
  });

  it('returns 404 for nonexistent user', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/users/nonexistent-id-12345678901' });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/users/search', () => {
  it('searches users by name', async () => {
    await seedTestUser({ name: '张三', userStatus: 'approved' });
    await seedTestUser({ name: '李四', userStatus: 'approved' });

    const res = await app.inject({ method: 'GET', url: '/api/users/search?q=张' });
    expect(res.statusCode).toBe(200);
    const results = res.json();
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].name).toContain('张');
  });
});

describe('PATCH /api/users/me/settings', () => {
  it('requires x-user-id header', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/users/me/settings',
      payload: { bio: '新简介' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('updates user settings', async () => {
    const user = await seedTestUser();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/users/me/settings',
      headers: { 'x-user-id': user.id },
      payload: { bio: '更新后的简介', hideEmail: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const prisma = getTestPrisma();
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.bio).toBe('更新后的简介');
    expect(updated!.hideEmail).toBe(true);
  });
});

describe('POST /api/users/:id/announce', () => {
  it('starts introduction period for applicant', async () => {
    const user = await seedTestUser({ userStatus: 'applicant' });
    const res = await app.inject({
      method: 'POST',
      url: `/api/users/${user.id}/announce`,
      payload: { days: 3 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
    expect(res.json().publicityEndsAt).toBeDefined();

    const prisma = getTestPrisma();
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.userStatus).toBe('announced');
    expect(updated!.announcedAt).not.toBeNull();
    expect(updated!.announcedEndAt).not.toBeNull();
  });

  it('rejects non-applicant announce', async () => {
    const user = await seedTestUser({ userStatus: 'approved' });
    const res = await app.inject({
      method: 'POST',
      url: `/api/users/${user.id}/announce`,
      payload: { days: 3 },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/users/:id/approve', () => {
  it('approves applicant', async () => {
    const user = await seedTestUser({ userStatus: 'applicant' });
    const res = await app.inject({
      method: 'POST',
      url: `/api/users/${user.id}/approve`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const prisma = getTestPrisma();
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.userStatus).toBe('approved');
    expect(updated!.approvedAt).not.toBeNull();
  });
});

describe('POST /api/users/:id/reject', () => {
  it('rejects applicant', async () => {
    const user = await seedTestUser({ userStatus: 'applicant' });
    const res = await app.inject({
      method: 'POST',
      url: `/api/users/${user.id}/reject`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const prisma = getTestPrisma();
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.userStatus).toBe('rejected');
  });
});

describe('PUT /api/users/:id/operator-roles', () => {
  it('sets operator roles', async () => {
    const user = await seedTestUser();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/users/${user.id}/operator-roles`,
      payload: { roles: ['photographer', 'recorder'] },
    });
    expect(res.statusCode).toBe(200);

    const prisma = getTestPrisma();
    const roles = await prisma.userOperatorRole.findMany({ where: { userId: user.id } });
    expect(roles.length).toBe(2);
    const values = roles.map((r) => r.value).sort();
    expect(values).toEqual(['photographer', 'recorder']);
  });
});

describe('GET /api/users/:id/co-attendees', () => {
  it('returns co-attendees for users who attended same events', async () => {
    const userA = await seedTestUser({ name: 'A' });
    const userB = await seedTestUser({ name: 'B' });
    const host = await seedTestUser({ name: 'Host' });
    const event = await seedTestEvent(host.id);

    const prisma = getTestPrisma();
    // Both userA and userB signed up and accepted
    await prisma.eventSignup.createMany({
      data: [
        { eventId: event.id, userId: userA.id, status: 'accepted' },
        { eventId: event.id, userId: userB.id, status: 'accepted' },
      ],
    });

    const res = await app.inject({ method: 'GET', url: `/api/users/${userA.id}/co-attendees` });
    expect(res.statusCode).toBe(200);
    const coAttendees = res.json();
    expect(Array.isArray(coAttendees)).toBe(true);
    // userB and host should appear
    const ids = coAttendees.map((c: any) => c.userId);
    expect(ids).toContain(userB.id);
    // Host is co-attendee via hosting
    expect(ids).toContain(host.id);
  });

  it('returns empty array for user with no events', async () => {
    const user = await seedTestUser();
    const res = await app.inject({ method: 'GET', url: `/api/users/${user.id}/co-attendees` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });
});

describe('GET /api/users/by-name/:name', () => {
  it('returns member profile by name', async () => {
    const user = await seedTestUser({ name: '独特名字', userStatus: 'approved' });
    const res = await app.inject({
      method: 'GET',
      url: `/api/users/by-name/${encodeURIComponent('独特名字')}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('独特名字');
  });

  it('returns 404 for unknown name', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/users/by-name/${encodeURIComponent('不存在的人')}`,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/users/admin/list', () => {
  it('returns detailed user list for admin', async () => {
    await seedTestUser({ name: 'Admin列表用户' });

    const res = await app.inject({ method: 'GET', url: '/api/users/admin/list' });
    expect(res.statusCode).toBe(200);
    const users = res.json();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThanOrEqual(1);
  });
});
