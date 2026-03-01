import type { FastifyPluginAsync } from 'fastify';
import { RecommendationRepository } from './recommendation.repository.js';
import { RecommendationService } from './recommendation.service.js';

export const recommendationRoutes: FastifyPluginAsync = async (app) => {
  const service = new RecommendationService(new RecommendationRepository(app.prisma));

  app.get('/', async (request) => service.listRecommendations(request.query));

  app.get('/search', async (request) => {
    const items = await service.search(request.query);
    return { items };
  });

  app.get('/search-external', async (request) => {
    const { q, category } = request.query as { q?: string; category?: string };
    if (!q) return { items: [], source: 'none' };
    if (category === 'book') return service.searchExternalBooks(q);
    if (category === 'music') return service.searchExternalMusic(q);
    return { items: [], source: 'none', error: `No external search for category: ${category}` };
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await service.getById(id);
    if (!item) return reply.notFound('推荐不存在');
    return item;
  });

  app.post('/', async (request, reply) => {
    const created = await service.createRecommendation(request.body);
    return reply.code(201).send(created);
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string | undefined;
    if (!userId) return reply.unauthorized('请先登录');

    const item = await service.getById(id);
    if (!item) return reply.notFound('推荐不存在');

    // Author or admin can delete
    const user = await app.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (item.authorId !== userId && user?.role !== 'admin') {
      return reply.forbidden('只能删除自己的推荐');
    }

    await service.delete(id);
    return { ok: true };
  });

  app.post('/:id/vote', async (request) => {
    const { id } = request.params as { id: string };
    const { userId } = request.body as { userId: string };
    const repo = new RecommendationRepository(app.prisma);
    return repo.toggleVote(id, userId);
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string | undefined;
    if (!userId) return reply.unauthorized('请先登录');

    const item = await service.getById(id);
    if (!item) return reply.notFound('推荐不存在');

    // Author or admin can edit
    const user = await app.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (item.authorId !== userId && user?.role !== 'admin') {
      return reply.forbidden('只能编辑自己的推荐');
    }

    const updated = await service.update(id, request.body);
    return updated;
  });
};
