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
    return service.create(request.body);
  });

  app.post('/:id/vote', async (request) => {
    const { id } = request.params as { id: string };
    return service.toggleVote(id, request.body);
  });
};
