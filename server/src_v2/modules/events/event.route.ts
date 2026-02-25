import type { FastifyPluginAsync } from 'fastify';
import { EventRepository } from './event.repository.js';
import { EventService } from './event.service.js';

export const eventRoutes: FastifyPluginAsync = async (app) => {
  const service = new EventService(new EventRepository(app.prisma));

  app.get('/', async () => service.listEvents());

  // Past/completed events - must come before /:id
  app.get('/past', async () => service.listPast());

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await service.getEventById(id);
    if (!event) return reply.notFound('活动不存在');
    return event;
  });

  app.post('/', async (request, reply) => {
    const created = await service.createEvent(request.body);
    return reply.code(201).send(created);
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await service.updateEvent(id, request.body);
    return { ok: true, event: updated };
  });

  // Recap photo management
  app.post('/:id/photos', async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await service.addRecapPhoto(id, request.body);
    return reply.code(201).send({ ok: true, event });
  });

  app.delete('/:id/photos', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { photoUrl } = request.body as { photoUrl: string };
    if (!photoUrl) return reply.badRequest('缺少 photoUrl');
    const event = await service.removeRecapPhoto(id, photoUrl);
    return { ok: true, event };
  });

  // Invite users to event
  app.post('/:id/invite', async (request) => {
    const { id } = request.params as { id: string };
    const signups = await service.inviteUsers(id, request.body);
    return { ok: true, signups };
  });

  // Event signup
  app.post('/:id/signup', async (request) => {
    const { id } = request.params as { id: string };
    return service.signup(id, request.body);
  });

  // Cancel signup
  app.delete('/:id/signup', async (request) => {
    const { id } = request.params as { id: string };
    return service.cancelSignup(id, request.body);
  });

  // Cancelled events list
  app.get('/cancelled', async () => service.listCancelled());

  // Admin: delete event
  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    await service.delete(id);
    return { ok: true };
  });
};
