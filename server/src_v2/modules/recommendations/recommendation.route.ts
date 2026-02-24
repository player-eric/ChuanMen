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
};
