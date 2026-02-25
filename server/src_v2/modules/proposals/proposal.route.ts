import type { FastifyPluginAsync } from 'fastify';
import { ProposalRepository } from './proposal.repository.js';
import { ProposalService } from './proposal.service.js';

export const proposalRoutes: FastifyPluginAsync = async (app) => {
  const service = new ProposalService(new ProposalRepository(app.prisma));

  app.get('/', async () => service.list());

  app.get('/search', async (request) => {
    const { q } = request.query as { q?: string };
    if (!q) return { items: [] };
    const items = await service.search(q);
    return { items };
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const proposal = await service.getById(id);
    if (!proposal) return reply.notFound('创意不存在');
    return proposal;
  });

  app.post('/', async (request, reply) => {
    const created = await service.create(request.body);
    return reply.code(201).send(created);
  });

  app.patch('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const updated = await service.update(id, request.body);
    return { ok: true, proposal: updated };
  });

  app.post('/:id/vote', async (request) => {
    const { id } = request.params as { id: string };
    return service.toggleVote(id, request.body);
  });

  // Admin: delete proposal
  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    await service.delete(id);
    return { ok: true };
  });
};
