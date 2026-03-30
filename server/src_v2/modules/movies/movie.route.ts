import type { FastifyPluginAsync } from 'fastify';
import { MovieRepository } from './movie.repository.js';
import { MovieService } from './movie.service.js';
import { canSeeScreenedEvent } from '../../utils/eventVisibility.js';

export const movieRoutes: FastifyPluginAsync = async (app) => {
  const service = new MovieService(new MovieRepository(app.prisma));

  app.get('/', async () => {
    const movies = await service.list();
    const ids = movies.map((m: any) => m.id);
    if (ids.length === 0) return movies;
    const counts = await app.prisma.comment.groupBy({
      by: ['entityId'],
      where: { entityType: 'movie', entityId: { in: ids } },
      _count: true,
    });
    const countMap = new Map(counts.map((c) => [c.entityId, c._count]));
    return movies.map((m: any) => ({ ...m, commentCount: countMap.get(m.id) ?? 0 }));
  });

  app.get('/screened', async (request) => {
    const userId = request.headers['x-user-id'] as string | undefined;
    const movies = await service.screened();
    // Attach comment counts
    const ids = (movies as any[]).map((m: any) => m.id);
    const commentCounts = ids.length > 0
      ? await app.prisma.comment.groupBy({ by: ['entityId'], where: { entityType: 'movie', entityId: { in: ids } }, _count: true })
      : [];
    const ccMap = new Map(commentCounts.map((c) => [c.entityId, c._count]));
    const withComments = (movies as any[]).map((m: any) => ({ ...m, commentCount: ccMap.get(m.id) ?? 0 }));
    // Filter out screenedEvents the user is excluded from or can't see (private)
    return withComments.map((m: any) => ({
      ...m,
      screenedEvents: m.screenedEvents?.filter((se: any) => {
        if (!canSeeScreenedEvent(se, userId)) return false;
        if (userId && se.event?.visibilityExclusions?.some((ex: any) => ex.userId === userId)) return false;
        return true;
      }),
    }));
  });

  app.get('/search', async (request) => {
    const { q } = request.query as { q?: string };
    if (!q) return { items: [] };
    const items = await service.search(q);
    return { items };
  });

  app.get('/search-external', async (request) => {
    const { q } = request.query as { q?: string };
    if (!q) return { items: [], source: 'tmdb' };
    return service.searchExternal(q);
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string | undefined;
    const movie = await service.getById(id);
    if (!movie) return reply.notFound('电影不存在');
    if (!(movie as any).screenedEvents?.length) return movie;
    // Filter out screenedEvents the user is excluded from or can't see (private)
    return {
      ...movie,
      screenedEvents: (movie as any).screenedEvents.filter((se: any) => {
        if (!canSeeScreenedEvent(se, userId)) return false;
        if (userId && se.event?.visibilityExclusions?.some((ex: any) => ex.userId === userId)) return false;
        return true;
      }),
    };
  });

  app.post('/', async (request) => {
    const body = request.body as any;
    if (body.tmdbId) {
      // Auto-fetch director from TMDB
      if (!body.director) {
        const director = await service.fetchDirector(Number(body.tmdbId));
        if (director) body.director = director;
      }
      // Store TMDB link
      if (!body.doubanUrl) {
        body.doubanUrl = `https://www.themoviedb.org/movie/${body.tmdbId}`;
      }
    }
    return service.create(body);
  });

  app.post('/:id/vote', async (request) => {
    const { id } = request.params as { id: string };
    return service.toggleVote(id, request.body);
  });

  // Admin: update movie
  app.patch('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const movie = await service.update(id, request.body);
    return { ok: true, movie };
  });

  // Admin: delete movie
  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    await service.delete(id);
    return { ok: true };
  });
};
