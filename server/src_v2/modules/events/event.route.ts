import type { FastifyPluginAsync } from 'fastify';
import { EventRepository } from './event.repository.js';
import { EventService } from './event.service.js';

export const eventRoutes: FastifyPluginAsync = async (app) => {
  const service = new EventService(new EventRepository(app.prisma));

  app.get('/', async () => service.listEvents());

  app.post('/', async (request, reply) => {
    const created = await service.createEvent(request.body);
    return reply.code(201).send(created);
  });
};
