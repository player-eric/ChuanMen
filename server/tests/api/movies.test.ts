import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, closeTestApp, cleanDb, seedTestUser, seedTestMovie, getTestPrisma } from '../helpers.js';
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

describe('GET /api/movies', () => {
  it('lists candidate movies', async () => {
    const user = await seedTestUser();
    await seedTestMovie(user.id, { title: '肖申克的救赎' });

    const res = await app.inject({ method: 'GET', url: '/api/movies' });
    expect(res.statusCode).toBe(200);
    const movies = res.json();
    expect(Array.isArray(movies)).toBe(true);
    expect(movies.length).toBe(1);
    expect(movies[0].title).toBe('肖申克的救赎');
  });
});

describe('GET /api/movies/screened', () => {
  it('lists screened movies', async () => {
    const user = await seedTestUser();
    await seedTestMovie(user.id, { title: '已放映', status: 'screened' });

    const res = await app.inject({ method: 'GET', url: '/api/movies/screened' });
    expect(res.statusCode).toBe(200);
    const movies = res.json();
    expect(Array.isArray(movies)).toBe(true);
  });
});

describe('GET /api/movies/search', () => {
  it('searches movies by title', async () => {
    const user = await seedTestUser();
    await seedTestMovie(user.id, { title: '千与千寻' });
    await seedTestMovie(user.id, { title: '龙猫' });

    const res = await app.inject({ method: 'GET', url: '/api/movies/search?q=千与' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items.length).toBe(1);
    expect(body.items[0].title).toBe('千与千寻');
  });

  it('returns empty for no query', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/movies/search' });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toEqual([]);
  });
});

describe('GET /api/movies/:id', () => {
  it('returns movie detail', async () => {
    const user = await seedTestUser();
    const movie = await seedTestMovie(user.id, { title: '霸王别姬' });

    const res = await app.inject({ method: 'GET', url: `/api/movies/${movie.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().title).toBe('霸王别姬');
  });

  it('returns 404 for nonexistent movie', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/movies/nonexistent-id-123456789' });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/movies', () => {
  it('creates a movie', async () => {
    const user = await seedTestUser();

    const res = await app.inject({
      method: 'POST',
      url: '/api/movies',
      payload: {
        title: '新电影',
        year: 2024,
        director: '某导演',
        recommendedById: user.id,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.title).toBe('新电影');
    expect(body.recommendedById).toBe(user.id);
  });
});

describe('POST /api/movies/:id/vote', () => {
  it('toggles vote on a movie', async () => {
    const user = await seedTestUser();
    const voter = await seedTestUser();
    const movie = await seedTestMovie(user.id);

    // Vote
    const res1 = await app.inject({
      method: 'POST',
      url: `/api/movies/${movie.id}/vote`,
      payload: { userId: voter.id },
    });
    expect(res1.statusCode).toBe(200);

    // Verify vote exists
    const prisma = getTestPrisma();
    const votes = await prisma.movieVote.findMany({
      where: { movieId: movie.id, userId: voter.id },
    });
    expect(votes.length).toBe(1);

    // Toggle (unvote)
    const res2 = await app.inject({
      method: 'POST',
      url: `/api/movies/${movie.id}/vote`,
      payload: { userId: voter.id },
    });
    expect(res2.statusCode).toBe(200);

    const votesAfter = await prisma.movieVote.findMany({
      where: { movieId: movie.id, userId: voter.id },
    });
    expect(votesAfter.length).toBe(0);
  });
});

describe('PATCH /api/movies/:id', () => {
  it('updates a movie', async () => {
    const user = await seedTestUser();
    const movie = await seedTestMovie(user.id);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/movies/${movie.id}`,
      payload: { title: '更新后的标题', year: 2025 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const prisma = getTestPrisma();
    const updated = await prisma.movie.findUnique({ where: { id: movie.id } });
    expect(updated!.title).toBe('更新后的标题');
  });
});

describe('DELETE /api/movies/:id', () => {
  it('deletes a movie', async () => {
    const user = await seedTestUser();
    const movie = await seedTestMovie(user.id);

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/movies/${movie.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const prisma = getTestPrisma();
    const deleted = await prisma.movie.findUnique({ where: { id: movie.id } });
    expect(deleted).toBeNull();
  });
});
