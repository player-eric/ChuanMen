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

  app.get('/', async (request) => {
    const userId = request.headers['x-user-id'] as string | undefined;
    const events = await service.listEvents();
    // Filter out invite-phase events unless user is host or has a signup
    const visible = events.filter((e: any) => {
      if (e.phase !== 'invite') return true;
      if (!userId) return false;
      if (e.hostId === userId) return true;
      return e.signups?.some((s: any) => s.userId === userId);
    });
    // Strip detailed address from list — only city is public
    return withInteractionCounts(visible.map((e) => ({ ...e, address: '', location: '' })));
  });

  // Past/completed events - must come before /:id
  app.get('/past', async () => {
    const events = await service.listPast();
    return withInteractionCounts(events.map((e) => ({ ...e, address: '', location: '' })));
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await service.getEventById(id);
    if (!event) return reply.notFound('活动不存在');

    // Compute attendeeVotes for each linked recommendation and movie
    // Participants = host + co-hosts + accepted/invited/offered signups
    const signupUserIds = event.signups
      .filter((s: any) => s.status === 'accepted' || s.status === 'invited' || s.status === 'offered')
      .map((s: any) => s.user?.id ?? s.userId)
      .filter(Boolean);
    const hostId = (event as any).hostId;
    const coHostIds = ((event as any).coHosts ?? []).map((ch: any) => ch.userId).filter(Boolean);

    // Strip detailed address (location) unless user is signed up / host / co-host
    const requesterId = request.headers['x-user-id'] as string | undefined;
    const isParticipant = requesterId && (
      requesterId === hostId ||
      coHostIds.includes(requesterId) ||
      signupUserIds.includes(requesterId)
    );
    const acceptedUserIds = [...new Set([...(hostId ? [hostId] : []), ...coHostIds, ...signupUserIds])];
    const attendeeTotal = acceptedUserIds.length;

    let enrichedRecs = event.recommendations;
    if (event.recommendations && event.recommendations.length > 0) {
      const recIds = event.recommendations.map((er: any) => er.recommendationId);
      // Fetch ALL votes (not just attendees) so we can show voter IDs for the toggle
      const [attendeeVotes, allVotes] = await Promise.all([
        app.prisma.recommendationVote.findMany({
          where: { recommendationId: { in: recIds }, userId: { in: acceptedUserIds } },
          select: { recommendationId: true },
        }),
        app.prisma.recommendationVote.findMany({
          where: { recommendationId: { in: recIds } },
          select: { recommendationId: true, userId: true },
        }),
      ]);
      const attendeeVoteMap = new Map<string, number>();
      for (const v of attendeeVotes) {
        attendeeVoteMap.set(v.recommendationId, (attendeeVoteMap.get(v.recommendationId) ?? 0) + 1);
      }
      const voterIdsMap = new Map<string, string[]>();
      for (const v of allVotes) {
        const arr = voterIdsMap.get(v.recommendationId) ?? [];
        arr.push(v.userId);
        voterIdsMap.set(v.recommendationId, arr);
      }
      enrichedRecs = event.recommendations.map((er: any) => {
        const voters = voterIdsMap.get(er.recommendationId) ?? [];
        return {
          ...er,
          globalVotes: voters.length,
          attendeeVotes: attendeeVoteMap.get(er.recommendationId) ?? 0,
          attendeeTotal,
          voterIds: voters,
        };
      });
    }

    // Compute attendeeVotes for screenedMovies (Movie table entries)
    let enrichedMovies = event.screenedMovies;
    if (event.screenedMovies && event.screenedMovies.length > 0) {
      const movieIds = event.screenedMovies.map((sm: any) => sm.movieId);
      const [movieAttendeeVotes, movieAllVotes] = await Promise.all([
        acceptedUserIds.length > 0
          ? app.prisma.movieVote.findMany({
              where: { movieId: { in: movieIds }, userId: { in: acceptedUserIds } },
              select: { movieId: true },
            })
          : [],
        app.prisma.movieVote.findMany({
          where: { movieId: { in: movieIds } },
          select: { movieId: true, userId: true },
        }),
      ]);
      const movieVoteMap = new Map<string, number>();
      for (const v of movieAttendeeVotes) {
        movieVoteMap.set(v.movieId, (movieVoteMap.get(v.movieId) ?? 0) + 1);
      }
      const movieVoterIdsMap = new Map<string, string[]>();
      for (const v of movieAllVotes) {
        const arr = movieVoterIdsMap.get(v.movieId) ?? [];
        arr.push(v.userId);
        movieVoterIdsMap.set(v.movieId, arr);
      }
      enrichedMovies = event.screenedMovies.map((sm: any) => {
        const voters = movieVoterIdsMap.get(sm.movieId) ?? [];
        return {
          ...sm,
          globalVotes: voters.length,
          attendeeVotes: movieVoteMap.get(sm.movieId) ?? 0,
          attendeeTotal,
          voterIds: voters,
        };
      });
    }

    return {
      ...event,
      address: isParticipant ? (event as any).address : '',
      location: isParticipant ? event.location : '',
      recommendations: enrichedRecs,
      screenedMovies: enrichedMovies,
    };
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
    const body = request.body as Record<string, any>;

    // Snapshot old phase before update (for TXN-1 cancel detection)
    const oldEvent = await app.prisma.event.findUnique({
      where: { id },
      select: { phase: true, title: true, startsAt: true, city: true, location: true, host: { select: { name: true } } },
    });

    const updated = await service.updateEvent(id, body);

    // Fire-and-forget: TXN-1 (event cancelled) or TXN-2 (event updated)
    if (oldEvent) {
      const wasCancelled = oldEvent.phase !== 'cancelled' && body.phase === 'cancelled';
      const wasUpdated = !wasCancelled && (body.startsAt || body.location || body.address || body.city || body.title);

      if (wasCancelled || wasUpdated) {
        const ruleId = wasCancelled ? 'TXN-1' : 'TXN-2';
        const participants = await app.prisma.eventSignup.findMany({
          where: { eventId: id, status: { in: ['accepted', 'offered', 'invited'] } },
          include: { user: { select: { id: true, name: true, email: true, preferences: true } } },
        });
        const eventDate = (updated as any).startsAt
          ? new Date((updated as any).startsAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })
          : '';
        for (const s of participants) {
          if (!s.user?.email) continue;
          const prefs = s.user.preferences as { emailState?: string } | null;
          if (prefs?.emailState === 'unsubscribed') continue;
          sendTemplatedEmail(app.prisma, {
            to: s.user.email,
            ruleId,
            variables: {
              userName: s.user.name,
              eventTitle: oldEvent.title,
              eventDate,
              eventLocation: (updated as any).location || (updated as any).city || oldEvent.location || oldEvent.city || '',
              hostName: oldEvent.host?.name ?? '',
            },
            ctaLabel: wasCancelled ? '查看其他活动' : '查看活动详情',
            ctaUrl: wasCancelled ? 'https://chuanmener.club/events' : `https://chuanmener.club/events/${id}`,
          }).then((result) => {
            return app.prisma.emailLog.create({
              data: { userId: s.user.id, ruleId, refId: id, messageId: result.MessageId },
            });
          }).catch((err) => {
            app.log.error({ err, userId: s.user.id }, `${ruleId} email failed`);
          });
        }
      }
    }

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
        city: true,
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
            eventLocation: event.city || event.location || '',
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

    // Backfill postcard credits if credits were already awarded for this event
    const eventForCredits = await app.prisma.event.findUnique({
      where: { id },
      select: { creditsAwarded: true, hostId: true },
    });
    if (eventForCredits?.creditsAwarded) {
      const { userIds: invitedUserIds } = request.body as { userIds: string[] };
      // Award +2 to each newly invited user (exclude host who already got +6)
      const newUserIds = invitedUserIds.filter((uid) => uid !== eventForCredits.hostId);
      if (newUserIds.length > 0) {
        await app.prisma.user.updateMany({
          where: { id: { in: newUserIds } },
          data: { postcardCredits: { increment: 2 } },
        });
        app.log.info({ eventId: id, users: newUserIds.length }, 'Backfilled postcard credits for late invites');
      }
    }

    return { ok: true, signups };
  });

  // Event signup
  app.post('/:id/signup', async (request) => {
    const { id } = request.params as { id: string };
    const result = await service.signup(id, request.body);

    // Fire-and-forget: TXN-3 signup confirmation (only for accepted, not waitlisted)
    if (!result.wasWaitlisted && result.user) {
      const event = await app.prisma.event.findUnique({
        where: { id },
        select: { title: true, startsAt: true, city: true, location: true },
      });
      if (event && result.user.name) {
        const user = await app.prisma.user.findUnique({
          where: { id: result.userId },
          select: { email: true, preferences: true },
        });
        if (user?.email) {
          const prefs = user.preferences as { emailState?: string } | null;
          if (prefs?.emailState !== 'unsubscribed') {
            const eventDate = event.startsAt.toLocaleDateString('zh-CN', {
              month: 'long', day: 'numeric', weekday: 'short',
            });
            sendTemplatedEmail(app.prisma, {
              to: user.email,
              ruleId: 'TXN-3',
              variables: {
                userName: result.user.name,
                eventTitle: event.title,
                eventDate,
                eventLocation: event.location || event.city || '',
              },
              ctaLabel: '查看活动详情',
              ctaUrl: `https://chuanmener.club/events/${id}`,
            }).then((r) => {
              return app.prisma.emailLog.create({
                data: { userId: result.userId, ruleId: 'TXN-3', refId: id, messageId: r.MessageId },
              });
            }).catch((err) => {
              app.log.error({ err, userId: result.userId }, 'TXN-3 signup email failed');
            });
          }
        }
      }
    }

    return result;
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

  // ── Co-host management ──

  app.post('/:id/co-hosts', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.body as { userId: string };
    const requesterId = request.headers['x-user-id'] as string;
    if (!requesterId) return reply.code(400).send({ message: '缺少 x-user-id' });
    if (!userId) return reply.badRequest('缺少 userId');
    try {
      const coHost = await service.addCoHost(id, userId, requesterId);
      return reply.code(201).send({ ok: true, coHost });
    } catch (err: any) {
      return reply.code(403).send({ message: err.message ?? '操作失败' });
    }
  });

  app.delete('/:id/co-hosts/:userId', async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    const requesterId = request.headers['x-user-id'] as string;
    if (!requesterId) return reply.code(400).send({ message: '缺少 x-user-id' });
    try {
      await service.removeCoHost(id, userId, requesterId);
      return { ok: true };
    } catch (err: any) {
      return reply.code(403).send({ message: err.message ?? '操作失败' });
    }
  });

  // ── Event ↔ Movie (screening) linking ──

  app.post('/:id/movies', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { movieId } = request.body as { movieId: string };
    if (!movieId) return reply.badRequest('缺少 movieId');
    const existing = await app.prisma.movieScreening.findFirst({ where: { eventId: id, movieId } });
    if (existing) return reply.code(200).send({ ok: true, screening: existing });
    const screening = await app.prisma.movieScreening.create({
      data: { eventId: id, movieId },
      include: { movie: { select: { id: true, title: true } } },
    });
    return reply.code(201).send({ ok: true, screening });
  });

  app.delete('/:id/movies/:movieId', async (request, reply) => {
    const { id, movieId } = request.params as { id: string; movieId: string };
    await app.prisma.movieScreening.deleteMany({ where: { eventId: id, movieId } });
    return { ok: true };
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
  app.get('/cancelled', async () => {
    const events = await service.listCancelled();
    return events.map((e) => ({ ...e, address: '', location: '' }));
  });

  // Admin: delete event
  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    await service.delete(id);
    return { ok: true };
  });
};
