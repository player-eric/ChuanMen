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

  // --- Admin: Announcement CRUD ---
  app.get('/announcements/admin/list', async () => service.listAnnouncementsAdmin());

  app.post('/announcements', async (request, reply) => {
    const created = await service.createAnnouncement(request.body as any);
    return reply.code(201).send(created);
  });

  app.patch('/announcements/:id', async (request) => {
    const { id } = request.params as { id: string };
    const updated = await service.updateAnnouncement(id, request.body as any);
    return { ok: true, announcement: updated };
  });

  app.delete('/announcements/:id', async (request) => {
    const { id } = request.params as { id: string };
    await service.deleteAnnouncement(id);
    return { ok: true };
  });

  // --- Admin: About Content ---
  app.get('/content/all', async () => service.listAllContent());

  app.put('/content/:type', async (request) => {
    const { type } = request.params as { type: string };
    const updated = await service.upsertContent(type, request.body as any);
    return { ok: true, content: updated };
  });
};
