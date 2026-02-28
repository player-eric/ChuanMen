import type { FastifyPluginAsync } from 'fastify';
import { EventRepository } from './event.repository.js';
import { EventService } from './event.service.js';

export const eventRoutes: FastifyPluginAsync = async (app) => {
  const service = new EventService(new EventRepository(app.prisma), app.prisma);

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

  // Host removes a participant
  app.delete('/:id/signup/:userId', async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    const requesterId = request.headers['x-user-id'] as string;
    if (!requesterId) return reply.code(400).send({ message: '缺少 x-user-id' });
    try {
      await service.removeParticipant(id, userId, requesterId);
      return { ok: true };
    } catch (err: any) {
      return reply.code(403).send({ message: err.message ?? '操作失败' });
    }
  });

  // ── Waitlist: user accepts/declines offer ──

  app.post('/:id/offer/accept', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.body as { userId: string };
    if (!userId) return reply.badRequest('缺少 userId');
    const result = await service.acceptOffer(id, userId);
    return { ok: true, signup: result };
  });

  app.post('/:id/offer/decline', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.body as { userId: string };
    if (!userId) return reply.badRequest('缺少 userId');
    const result = await service.declineOffer(id, userId);
    return { ok: true, signup: result };
  });

  // ── Waitlist: host approves/rejects waitlisted user ──

  app.post('/:id/waitlist/:userId/approve', async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    const requesterId = request.headers['x-user-id'] as string;
    if (!requesterId) return reply.code(400).send({ message: '缺少 x-user-id' });
    try {
      const result = await service.hostApproveWaitlist(id, userId, requesterId);
      return { ok: true, signup: result };
    } catch (err: any) {
      return reply.code(403).send({ message: err.message ?? '操作失败' });
    }
  });

  app.post('/:id/waitlist/:userId/reject', async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    const requesterId = request.headers['x-user-id'] as string;
    if (!requesterId) return reply.code(400).send({ message: '缺少 x-user-id' });
    try {
      const result = await service.hostRejectWaitlist(id, userId, requesterId);
      return { ok: true, signup: result };
    } catch (err: any) {
      return reply.code(403).send({ message: err.message ?? '操作失败' });
    }
  });

  // ── Event ↔ Recommendation linking ──

  app.post('/:id/recommendations', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { recommendationId } = request.body as { recommendationId: string };
    if (!recommendationId) return reply.badRequest('缺少 recommendationId');
    const link = await app.prisma.eventRecommendation.upsert({
      where: { eventId_recommendationId: { eventId: id, recommendationId } },
      create: { eventId: id, recommendationId },
      update: {},
      include: { recommendation: { select: { id: true, title: true, category: true } } },
    });
    return reply.code(201).send({ ok: true, link });
  });

  app.delete('/:id/recommendations/:recommendationId', async (request, reply) => {
    const { id, recommendationId } = request.params as { id: string; recommendationId: string };
    await app.prisma.eventRecommendation.deleteMany({
      where: { eventId: id, recommendationId },
    });
    return { ok: true };
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
