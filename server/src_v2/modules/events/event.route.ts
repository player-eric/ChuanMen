import type { FastifyPluginAsync } from 'fastify';
import { EventRepository } from './event.repository.js';
import { EventService } from './event.service.js';
import { sendEmail, sendTemplatedEmail } from '../../services/emailService.js';

export const eventRoutes: FastifyPluginAsync = async (app) => {
  const service = new EventService(new EventRepository(app.prisma), app.prisma);

  /** Batch-attach like + comment counts to a list of events */
  async function withInteractionCounts<T extends { id: string }>(events: T[]) {
    if (events.length === 0) return events;
    const ids = events.map((e) => e.id);
    const [likes, comments] = await Promise.all([
      app.prisma.like.groupBy({ by: ['entityId'], where: { entityType: 'event', entityId: { in: ids } }, _count: true }),
      app.prisma.comment.groupBy({ by: ['entityId'], where: { entityType: 'event', entityId: { in: ids } }, _count: true }),
    ]);
    const likeMap = new Map(likes.map((l) => [l.entityId, l._count]));
    const commentMap = new Map(comments.map((c) => [c.entityId, c._count]));
    return events.map((e) => ({ ...e, likeCount: likeMap.get(e.id) ?? 0, commentCount: commentMap.get(e.id) ?? 0 }));
  }

  app.get('/', async () => withInteractionCounts(await service.listEvents()));

  // Past/completed events - must come before /:id
  app.get('/past', async () => withInteractionCounts(await service.listPast()));

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await service.getEventById(id);
    if (!event) return reply.notFound('活动不存在');

    // Compute attendeeVotes for each linked recommendation
    if (event.recommendations && event.recommendations.length > 0) {
      const acceptedUserIds = event.signups
        .filter((s: any) => s.status === 'accepted' || s.status === 'invited' || s.status === 'offered')
        .map((s: any) => s.user?.id ?? s.userId)
        .filter(Boolean);
      const recIds = event.recommendations.map((er: any) => er.recommendationId);
      const votes = await app.prisma.recommendationVote.findMany({
        where: {
          recommendationId: { in: recIds },
          userId: { in: acceptedUserIds },
        },
        select: { recommendationId: true, userId: true },
      });
      const attendeeVoteMap = new Map<string, number>();
      for (const v of votes) {
        attendeeVoteMap.set(v.recommendationId, (attendeeVoteMap.get(v.recommendationId) ?? 0) + 1);
      }
      const enriched = event.recommendations.map((er: any) => ({
        ...er,
        attendeeVotes: attendeeVoteMap.get(er.recommendationId) ?? 0,
        attendeeTotal: acceptedUserIds.length,
      }));
      return { ...event, recommendations: enriched };
    }

    return event;
  });

  app.post('/', async (request, reply) => {
    const created = await service.createEvent(request.body);
    const { proposalId, ...eventResponse } = created as typeof created & { proposalId?: string };

    // Fire-and-forget: notify proposal voters when proposal becomes an event
    if (proposalId) {
      app.prisma.proposal.update({
        where: { id: proposalId },
        data: { status: 'scheduled' },
      }).catch(() => {});

      app.prisma.proposalVote.findMany({
        where: { proposalId },
        include: { user: { select: { id: true, name: true, email: true } } },
      }).then(async (votes) => {
        for (const vote of votes) {
          if (!vote.user.email || vote.user.id === eventResponse.hostId) continue;
          sendEmail({
            to: vote.user.email,
            subject: `【串门儿】你感兴趣的创意「${eventResponse.title}」变成活动了！`,
            text: `Hi ${vote.user.name}，\n\n你之前感兴趣的创意「${eventResponse.title}」已经有人组织啦！快来看看并报名吧。\n\n查看活动：https://chuanmener.club/events/${eventResponse.id}\n\n— 串门儿`,
          }).catch((err) => {
            app.log.error({ err, userId: vote.user.id }, 'Proposal→event notification failed');
          });
        }
      }).catch(() => {});
    }

    return reply.code(201).send(eventResponse);
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

    // Fire-and-forget: send P0-A invite notification emails
    const event = await app.prisma.event.findUnique({
      where: { id },
      select: {
        title: true,
        startsAt: true,
        location: true,
        host: { select: { name: true } },
      },
    });
    if (event) {
      const { invitedById, userIds } = request.body as { invitedById: string; userIds: string[] };
      const invitedUsers = await app.prisma.user.findMany({
        where: {
          id: { in: userIds },
          userStatus: 'approved',
          OR: [
            { preferences: null },
            { preferences: { emailState: { not: 'unsubscribed' } } },
          ],
        },
        select: { id: true, name: true, email: true },
      });
      const eventDate = event.startsAt.toLocaleDateString('zh-CN', {
        month: 'long', day: 'numeric', weekday: 'short',
      });
      for (const user of invitedUsers) {
        sendTemplatedEmail(app.prisma, {
          to: user.email,
          ruleId: 'P0-A',
          variables: {
            userName: user.name,
            hostName: event.host?.name ?? '',
            eventTitle: event.title,
            eventDate,
            eventLocation: event.location ?? '',
          },
          ctaLabel: '查看活动并接受邀请',
          ctaUrl: `https://chuanmener.club/events/${id}`,
        }).then((result) => {
          return app.prisma.emailLog.create({
            data: { userId: user.id, ruleId: 'P0-A', refId: id, messageId: result.MessageId },
          });
        }).catch((err) => {
          app.log.error({ err, userId: user.id }, 'P0-A invite email failed');
        });
      }
    }

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
    const { recommendationId, linkedById, isNomination } = request.body as { recommendationId: string; linkedById?: string; isNomination?: boolean };
    if (!recommendationId) return reply.badRequest('缺少 recommendationId');
    const link = await app.prisma.eventRecommendation.upsert({
      where: { eventId_recommendationId: { eventId: id, recommendationId } },
      create: { eventId: id, recommendationId, linkedById: linkedById || null, isNomination: isNomination ?? false },
      update: {},
      include: { recommendation: { select: { id: true, title: true, category: true, coverUrl: true, voteCount: true } } },
    });
    return reply.code(201).send({ ok: true, link });
  });

  // Host selects a recommendation for the event
  app.patch('/:id/recommendations/:recId/select', async (request, reply) => {
    const { id, recId } = request.params as { id: string; recId: string };
    // Transaction: clear previous selections in same category, then mark this one
    const target = await app.prisma.eventRecommendation.findFirst({
      where: { eventId: id, recommendationId: recId },
      include: { recommendation: { select: { category: true } } },
    });
    if (!target) return reply.notFound('关联不存在');
    await app.prisma.$transaction([
      // Clear previous selections of same category for this event
      app.prisma.eventRecommendation.updateMany({
        where: { eventId: id, isSelected: true, recommendation: { category: target.recommendation.category } },
        data: { isSelected: false },
      }),
      // Mark this one as selected
      app.prisma.eventRecommendation.update({
        where: { id: target.id },
        data: { isSelected: true },
      }),
    ]);
    return { ok: true };
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
