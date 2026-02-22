import type { FastifyPluginAsync } from 'fastify';
import { RecommendationRepository } from './recommendation.repository.js';
import { RecommendationService } from './recommendation.service.js';

export const recommendationRoutes: FastifyPluginAsync = async (app) => {
  const service = new RecommendationService(new RecommendationRepository(app.prisma));

  app.get('/', async (request) => service.listRecommendations(request.query));

  app.post('/', async (request, reply) => {
    const created = await service.createRecommendation(request.body);
    return reply.code(201).send(created);
  });
};
