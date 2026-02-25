import type { FastifyPluginAsync } from 'fastify';
import { TaskPresetRepository } from './task-preset.repository.js';
import { TaskPresetService } from './task-preset.service.js';

export const taskPresetRoutes: FastifyPluginAsync = async (app) => {
  const service = new TaskPresetService(new TaskPresetRepository(app.prisma));

  app.get('/', async () => service.list());

  app.post('/', async (request, reply) => {
    const created = await service.create(request.body);
    return reply.code(201).send(created);
  });

  app.patch('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const updated = await service.update(id, request.body);
    return { ok: true, preset: updated };
  });

  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    await service.delete(id);
    return { ok: true };
  });
};
