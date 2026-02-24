import type { FastifyPluginAsync } from 'fastify';
import { LikeRepository } from './like.repository.js';
import { LikeService } from './like.service.js';

export const likeRoutes: FastifyPluginAsync = async (app) => {
  const service = new LikeService(new LikeRepository(app.prisma));

  // GET /api/likes?entityType=event&entityId=xxx
  app.get('/', async (request) => {
    const { entityType, entityId } = request.query as { entityType: string; entityId: string };
    return service.list(entityType, entityId);
  });

  // POST /api/likes/toggle
  app.post('/toggle', async (request) => {
    return service.toggle(request.body);
  });
};
