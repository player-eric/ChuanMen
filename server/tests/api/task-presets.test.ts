import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, closeTestApp, cleanDb, getTestPrisma } from '../helpers.js';
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

describe('Task Presets CRUD', () => {
  it('creates a task preset', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/task-presets',
      payload: {
        tag: 'movie',
        roles: ['recorder', 'photographer', 'equipment'],
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.tag).toBe('movie');
    expect(body.roles).toEqual(['recorder', 'photographer', 'equipment']);
  });

  it('lists task presets', async () => {
    const prisma = getTestPrisma();
    await prisma.taskPreset.create({
      data: { tag: 'movie', roles: ['recorder', 'photographer'] },
    });

    const res = await app.inject({ method: 'GET', url: '/api/task-presets' });
    expect(res.statusCode).toBe(200);
    const presets = res.json();
    expect(Array.isArray(presets)).toBe(true);
    expect(presets.length).toBe(1);
    expect(presets[0].tag).toBe('movie');
  });

  it('updates a task preset', async () => {
    const prisma = getTestPrisma();
    const preset = await prisma.taskPreset.create({
      data: { tag: 'hiking', roles: ['leader'] },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/task-presets/${preset.id}`,
      payload: { roles: ['leader', 'navigator', 'first_aid'] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const updated = await prisma.taskPreset.findUnique({ where: { id: preset.id } });
    expect(updated!.roles).toEqual(['leader', 'navigator', 'first_aid']);
  });

  it('deletes a task preset', async () => {
    const prisma = getTestPrisma();
    const preset = await prisma.taskPreset.create({
      data: { tag: 'outdoors', roles: ['guide'] },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/task-presets/${preset.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const deleted = await prisma.taskPreset.findUnique({ where: { id: preset.id } });
    expect(deleted).toBeNull();
  });
});
