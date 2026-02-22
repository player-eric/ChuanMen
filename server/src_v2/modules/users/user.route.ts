import type { FastifyPluginAsync } from 'fastify';
import { UserRepository } from './user.repository.js';
import { UserService } from './user.service.js';

export const userRoutes: FastifyPluginAsync = async (app) => {
  const service = new UserService(new UserRepository(app.prisma));

  app.get('/', async () => service.listUsers());

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await service.getUserById(id);
    if (!user) {
      return reply.notFound('用户不存在');
    }
    return user;
  });

  app.post('/', async (request, reply) => {
    const user = await service.createUser(request.body);
    return reply.code(201).send(user);
  });

  // v2.1: Application submission
  app.post('/apply', async (request, reply) => {
    const applicant = await service.submitApplication(request.body);
    return reply.code(201).send({ ok: true, id: applicant.id });
  });

  // v2.1: Update own settings (requires auth - placeholder)
  app.patch('/me/settings', async (request, reply) => {
    // TODO: extract userId from auth session
    const userId = (request.headers['x-user-id'] as string) || '';
    if (!userId) {
      return reply.unauthorized('需要登录');
    }
    const updated = await service.updateSettings(userId, request.body);
    return { ok: true, user: updated };
  });
};
