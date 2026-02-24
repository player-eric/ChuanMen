import type { FastifyPluginAsync } from 'fastify';
import { AboutRepository } from './about.repository.js';
import { AboutService } from './about.service.js';

export const aboutRoutes: FastifyPluginAsync = async (app) => {
  const service = new AboutService(new AboutRepository(app.prisma));

  app.get('/stats', async () => service.getStats());

  app.get('/content/:type', async (request) => {
    const { type } = request.params as { type: string };
    return service.getContent(type);
  });

  app.get('/announcements', async () => service.listAnnouncements());

  app.get('/announcements/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const announcement = await service.getAnnouncement(id);
    if (!announcement) return reply.notFound('公告不存在');
    return announcement;
  });
};
