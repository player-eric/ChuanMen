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

describe('POST /api/auth/check-email', () => {
  it('returns not_found for unknown email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/check-email',
      payload: { email: 'unknown@example.com' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('not_found');
  });

  it('returns applicant status for pending applicant', async () => {
    await seedTestUser({ email: 'pending@example.com', userStatus: 'applicant' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/check-email',
      payload: { email: 'pending@example.com' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('applicant');
  });

  it('returns approved status for approved user', async () => {
    await seedTestUser({ email: 'approved@example.com', userStatus: 'approved' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/check-email',
      payload: { email: 'approved@example.com' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('approved');
  });
});

describe('POST /api/auth/send-code', () => {
  it('returns 404 for unregistered email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/send-code',
      payload: { email: 'nobody@example.com' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('not_registered');
  });

  it('returns 403 for pending applicant', async () => {
    await seedTestUser({ email: 'pending@example.com', userStatus: 'applicant' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/send-code',
      payload: { email: 'pending@example.com' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('pending_review');
  });

  it('returns 403 for rejected user', async () => {
    await seedTestUser({ email: 'rejected@example.com', userStatus: 'rejected' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/send-code',
      payload: { email: 'rejected@example.com' },
    });
    expect(res.statusCode).toBe(403);
    // Either 'rejected' or 'rejected_can_reapply' depending on creation date
    expect(res.json().error).toMatch(/^rejected/);
  });

  it('returns 403 for banned user', async () => {
    await seedTestUser({ email: 'banned@example.com', userStatus: 'banned' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/send-code',
      payload: { email: 'banned@example.com' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('banned');
  });

  it('creates LoginCode for approved user (email send may fail without RESEND_API_KEY)', async () => {
    await seedTestUser({ email: 'user@example.com', userStatus: 'approved' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/send-code',
      payload: { email: 'user@example.com' },
    });
    // May return 500 if RESEND_API_KEY is not set, but LoginCode should still be created
    const prisma = getTestPrisma();
    const codes = await prisma.loginCode.findMany({ where: { email: 'user@example.com' } });
    expect(codes.length).toBe(1);
    expect(codes[0].code).toHaveLength(6);
    expect(codes[0].usedAt).toBeNull();
  });
});

describe('POST /api/auth/verify-code', () => {
  it('returns 401 for invalid code', async () => {
    await seedTestUser({ email: 'user@example.com', userStatus: 'approved' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-code',
      payload: { email: 'user@example.com', code: '000000' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns user data for valid code', async () => {
    const user = await seedTestUser({ email: 'user@example.com', userStatus: 'approved' });
    const prisma = getTestPrisma();

    // Create a valid login code
    await prisma.loginCode.create({
      data: {
        email: 'user@example.com',
        code: '123456',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-code',
      payload: { email: 'user@example.com', code: '123456' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.user.id).toBe(user.id);
    expect(body.user.email).toBe('user@example.com');
    expect(body.user.role).toBe('member');
  });

  it('returns 401 for expired code', async () => {
    await seedTestUser({ email: 'user@example.com', userStatus: 'approved' });
    const prisma = getTestPrisma();

    await prisma.loginCode.create({
      data: {
        email: 'user@example.com',
        code: '111111',
        expiresAt: new Date(Date.now() - 1000), // expired
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-code',
      payload: { email: 'user@example.com', code: '111111' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('marks code as used after successful verification', async () => {
    await seedTestUser({ email: 'user@example.com', userStatus: 'approved' });
    const prisma = getTestPrisma();

    const loginCode = await prisma.loginCode.create({
      data: {
        email: 'user@example.com',
        code: '222222',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await app.inject({
      method: 'POST',
      url: '/api/auth/verify-code',
      payload: { email: 'user@example.com', code: '222222' },
    });

    const updated = await prisma.loginCode.findUnique({ where: { id: loginCode.id } });
    expect(updated!.usedAt).not.toBeNull();

    // Second use should fail
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-code',
      payload: { email: 'user@example.com', code: '222222' },
    });
    expect(res2.statusCode).toBe(401);
  });
});

describe('POST /api/auth/google', () => {
  it('returns 501 when GOOGLE_CLIENT_ID not configured', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/google',
      payload: { credential: 'fake-token' },
    });
    expect(res.statusCode).toBe(501);
  });
});
