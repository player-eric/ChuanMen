import type { FastifyPluginAsync } from 'fastify';
import { CommentRepository } from './comment.repository.js';
import { CommentService } from './comment.service.js';

export const commentRoutes: FastifyPluginAsync = async (app) => {
  const service = new CommentService(new CommentRepository(app.prisma));

  // GET /api/comments?entityType=event&entityId=xxx
  app.get('/', async (request) => {
    const { entityType, entityId } = request.query as { entityType: string; entityId: string };
    return service.list(entityType, entityId);
  });

  // POST /api/comments
  app.post('/', async (request, reply) => {
    const comment = await service.create(request.body);
    return reply.code(201).send(comment);
  });

  // DELETE /api/comments/:id
  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    await service.delete(id);
    return { ok: true };
  });
};
