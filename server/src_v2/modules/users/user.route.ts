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
};
