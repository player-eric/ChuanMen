import type { FastifyPluginAsync } from 'fastify';
import { TitleRuleRepository } from './title-rule.repository.js';
import { TitleRuleService } from './title-rule.service.js';

export const titleRuleRoutes: FastifyPluginAsync = async (app) => {
  const service = new TitleRuleService(new TitleRuleRepository(app.prisma));

  app.get('/', async () => service.list());

  app.get('/holders-count', async () => service.holdersCount());

  app.get('/members', async () => service.listMembersWithTitles());

  app.post('/', async (request, reply) => {
    const created = await service.create(request.body);
    return reply.code(201).send(created);
  });

  app.patch('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const updated = await service.update(id, request.body);
    return { ok: true, titleRule: updated };
  });

  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    await service.delete(id);
    return { ok: true };
  });

  // Grant / revoke social titles on users
  app.post('/grant', async (request, reply) => {
    const { userId, value } = request.body as { userId: string; value: string };
    const result = await service.grantTitle(userId, value);
    return reply.code(201).send(result);
  });

  app.post('/revoke', async (request) => {
    const { userId, value } = request.body as { userId: string; value: string };
    await service.revokeTitle(userId, value);
    return { ok: true };
  });
};
