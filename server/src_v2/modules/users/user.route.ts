import type { FastifyPluginAsync } from 'fastify';
import { UserRepository } from './user.repository.js';
import { UserService } from './user.service.js';

export const userRoutes: FastifyPluginAsync = async (app) => {
  const service = new UserService(new UserRepository(app.prisma));

  // Admin: list users with detail counts (host count, event count, operator roles)
  app.get('/admin/list', async () => service.listUsersDetailed());

  app.get('/', async () => service.listUsers());

  app.get('/by-email/:email', async (request, reply) => {
    const { email } = request.params as { email: string };
    const user = await service.getUserByEmail(email);
    if (!user) return reply.notFound('用户不存在');
    return user;
  });

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

  // Admin: update user (role, status, name, email, location, etc.)
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await service.adminUpdateUser(id, request.body);
    return { ok: true, user: updated };
  });

  // Admin: delete user
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.deleteUser(id);
    return { ok: true };
  });

  // Admin: set operator roles
  app.put('/:id/operator-roles', async (request) => {
    const { id } = request.params as { id: string };
    return service.setOperatorRoles(id, request.body);
  });
};
