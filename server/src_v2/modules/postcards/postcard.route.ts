import type { FastifyPluginAsync } from 'fastify';
import { PostcardRepository } from './postcard.repository.js';
import { PostcardService } from './postcard.service.js';

export const postcardRoutes: FastifyPluginAsync = async (app) => {
  const service = new PostcardService(new PostcardRepository(app.prisma));

  // Get postcards for a user (received + sent + credits)
  app.get('/', async (request) => {
    const { userId } = request.query as { userId: string };
    if (!userId) throw new Error('缺少 userId');
    const [received, sent, creditInfo, eligible] = await Promise.all([
      service.listReceived(userId),
      service.listSent(userId),
      service.getCredits(userId),
      service.listEligibleRecipients(userId),
    ]);
    return {
      received,
      sent,
      credits: creditInfo?.postcardCredits ?? 0,
      eligible,
    };
  });

  app.post('/', async (request, reply) => {
    const created = await service.create(request.body);
    return reply.code(201).send(created);
  });

  app.patch('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const { userId, visibility } = request.body as { userId: string; visibility: 'public' | 'private' };
    if (!userId) throw new Error('缺少 userId');
    await service.updateVisibility(id, userId, visibility);
    return { ok: true };
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.query as { userId: string };
    if (!userId) throw new Error('缺少 userId');
    await service.delete(id, userId);
    return reply.code(204).send();
  });

  // Admin: list all postcards
  app.get('/admin/list', async () => service.adminListAll());

  // Admin: delete any postcard
  app.delete('/admin/:id', async (request) => {
    const { id } = request.params as { id: string };
    await service.adminDelete(id);
    return { ok: true };
  });
};
