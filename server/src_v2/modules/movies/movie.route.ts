import type { FastifyPluginAsync } from 'fastify';
import { MovieRepository } from './movie.repository.js';
import { MovieService } from './movie.service.js';

export const movieRoutes: FastifyPluginAsync = async (app) => {
  const service = new MovieService(new MovieRepository(app.prisma));

  app.get('/', async () => service.list());

  app.get('/screened', async () => service.screened());

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
    const movie = await service.getById(id);
    if (!movie) return reply.notFound('电影不存在');
    return movie;
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
