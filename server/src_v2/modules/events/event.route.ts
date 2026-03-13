import type { FastifyPluginAsync } from 'fastify';
import { EventRepository } from './event.repository.js';
import { EventService } from './event.service.js';
import { sendEmail, sendTemplatedEmail } from '../../services/emailService.js';
import { renderNotificationEmail } from '../../emails/template.js';

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
      // Hide from excluded users (host/coHost always see their own events)
      if (userId && e.hostId !== userId && !e.coHosts?.some((ch: any) => ch.userId === userId)) {
        if (e.visibilityExclusions?.some((ex: any) => ex.userId === userId)) return false;
      }
      if (e.phase !== 'invite') return true;
      if (!userId) return false;
      if (e.hostId === userId) return true;
      return e.signups?.some((s: any) => s.userId === userId);
    });
    // Strip detailed address and visibilityExclusions from list
    return withInteractionCounts(visible.map(({ visibilityExclusions, ...e }: any) => ({ ...e, address: '', location: '' })));
  });

  // Past/completed events - must come before /:id
  app.get('/past', async (request) => {
    const userId = request.headers['x-user-id'] as string | undefined;
    const events = await service.listPast();
    const visible = events.filter((e: any) => {
      if (!userId) return true;
      if (e.hostId === userId || e.coHosts?.some((ch: any) => ch.userId === userId)) return true;
      return !e.visibilityExclusions?.some((ex: any) => ex.userId === userId);
    });
    return withInteractionCounts(visible.map(({ visibilityExclusions, ...e }: any) => ({ ...e, address: '', location: '' })));
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await service.getEventById(id);
    if (!event) return reply.notFound('活动不存在');

    // Check exclusion: blocked users get 404 (unless host/coHost)
    const requestUserId = request.headers['x-user-id'] as string | undefined;
    if (requestUserId && (event as any).hostId !== requestUserId && !(event as any).coHosts?.some((ch: any) => ch.userId === requestUserId)) {
      if ((event as any).visibilityExclusions?.some((ex: any) => ex.userId === requestUserId)) {
        return reply.notFound('活动不存在');
      }
    }

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

    // Strip visibilityExclusions from response (only accessible via dedicated endpoint)
    const { visibilityExclusions: _ve, ...eventWithoutExclusions } = event as any;
    return {
      ...eventWithoutExclusions,
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
          sendTemplatedEmail(app.prisma, {
            to: vote.user.email,
            ruleId: 'TXN-13',
            variables: { userName: vote.user.name, eventTitle: eventResponse.title },
            ctaLabel: '查看活动',
            ctaUrl: `https://chuanmener.club/events/${eventResponse.id}`,
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
      select: { phase: true, title: true, startsAt: true, city: true, location: true, address: true, host: { select: { name: true } } },
    });

    const updated = await service.updateEvent(id, body);

    // Fire-and-forget: TXN-1 (event cancelled) or TXN-2 (event updated)
    if (oldEvent) {
      const wasCancelled = oldEvent.phase !== 'cancelled' && body.phase === 'cancelled';
      // Only treat as "updated" if key fields actually changed (compare with old values)
      const meaningfulChange =
        (body.title && body.title !== oldEvent.title) ||
        (body.startsAt && new Date(body.startsAt).getTime() !== oldEvent.startsAt?.getTime()) ||
        (body.location && body.location !== oldEvent.location) ||
        (body.city && body.city !== oldEvent.city) ||
        (body.address !== undefined && body.address !== (oldEvent as any).address);
      const wasUpdated = !wasCancelled && meaningfulChange;

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

    // Fire-and-forget: notify host when someone applies (application mode)
    if (result.wasPending && result.user) {
      const event = await app.prisma.event.findUnique({
        where: { id },
        select: { title: true, hostId: true, host: { select: { name: true, email: true, preferences: true } } },
      });
      if (event?.host?.email) {
        const prefs = event.host.preferences as { emailState?: string } | null;
        if (prefs?.emailState !== 'unsubscribed') {
          const note = (request.body as any)?.note ?? '';
          const rendered = renderNotificationEmail({
            subject: `${result.user.name} 申请参加「${event.title}」`,
            body: `Hi {hostName}，\n\n**{applicantName}** 申请参加「**{eventTitle}**」。`,
            variables: {
              hostName: event.host.name ?? '',
              applicantName: result.user.name ?? '',
              eventTitle: event.title,
            },
            linkLabel: '前往活动页审批 →',
            linkUrl: `https://chuanmener.club/events/${id}`,
            quote: note || undefined,
          });
          sendEmail({
            to: event.host.email,
            subject: rendered.subject,
            text: rendered.text,
            html: rendered.html,
          }).catch((err) => {
            app.log.error({ err }, 'Application notification to host failed');
          });
        }
      }
    }

    // Fire-and-forget: TXN-3 signup confirmation (only for accepted, not waitlisted/pending)
    if (!result.wasWaitlisted && !result.wasPending && result.user) {
      const event = await app.prisma.event.findUnique({
        where: { id },
        select: { title: true, startsAt: true, city: true, location: true, hostId: true, host: { select: { name: true, email: true, preferences: true } } },
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

        // Notify host about the direct signup (skip if host signed up for own event)
        if (event.hostId !== result.userId && event.host?.email) {
          const hostPrefs = event.host.preferences as { emailState?: string } | null;
          if (hostPrefs?.emailState !== 'unsubscribed') {
            const rendered = renderNotificationEmail({
              subject: `${result.user.name} 已报名「${event.title}」`,
              body: `Hi {hostName}，\n\n**{userName}** 已报名参加「**{eventTitle}**」。`,
              variables: {
                hostName: event.host.name ?? '',
                userName: result.user.name ?? '',
                eventTitle: event.title,
              },
              linkLabel: '查看活动详情 →',
              linkUrl: `https://chuanmener.club/events/${id}`,
            });
            sendEmail({
              to: event.host.email,
              subject: rendered.subject,
              text: rendered.text,
              html: rendered.html,
            }).catch((err) => {
              app.log.error({ err }, 'Direct signup notification to host failed');
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
    const { userId } = request.body as { userId: string };

    // Check previous status before cancelling
    const existingSignup = await app.prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: id, userId } },
      select: { status: true, user: { select: { name: true } } },
    });
    const prevStatus = existingSignup?.status;

    const result = await service.cancelSignup(id, request.body);

    // Fire-and-forget: notify host when someone withdraws application or cancels signup
    if ((prevStatus === 'pending' || prevStatus === 'accepted') && existingSignup?.user && userId !== undefined) {
      const event = await app.prisma.event.findUnique({
        where: { id },
        select: { title: true, hostId: true, host: { select: { name: true, email: true, preferences: true } } },
      });
      // Don't notify host about their own cancellation
      if (event?.host?.email && event.hostId !== userId) {
        const prefs = event.host.preferences as { emailState?: string } | null;
        if (prefs?.emailState !== 'unsubscribed') {
          const isPending = prevStatus === 'pending';
          const rendered = renderNotificationEmail({
            subject: isPending
              ? `${existingSignup.user.name} 撤回了「${event.title}」的申请`
              : `${existingSignup.user.name} 取消了「${event.title}」的报名`,
            body: isPending
              ? `Hi {hostName}，\n\n**{userName}** 撤回了「**{eventTitle}**」的参加申请。`
              : `Hi {hostName}，\n\n**{userName}** 取消了「**{eventTitle}**」的报名。`,
            variables: {
              hostName: event.host.name ?? '',
              userName: existingSignup.user.name ?? '',
              eventTitle: event.title,
            },
            linkLabel: '查看活动详情 →',
            linkUrl: `https://chuanmener.club/events/${id}`,
          });
          sendEmail({
            to: event.host.email,
            subject: rendered.subject,
            text: rendered.text,
            html: rendered.html,
          }).catch((err) => {
            app.log.error({ err }, 'Signup cancellation notification to host failed');
          });
        }
      }
    }

    return result;
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

  // ── Application: host approves/rejects application ──

  app.post('/:id/application/:userId/approve', async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    const requesterId = request.headers['x-user-id'] as string;
    if (!requesterId) return reply.code(400).send({ message: '缺少 x-user-id' });
    try {
      const result = await service.hostApproveApplication(id, userId, requesterId);
      return { ok: true, signup: result };
    } catch (err: any) {
      const isFull = err.message?.includes('已满');
      return reply.code(isFull ? 409 : 403).send({ message: err.message ?? '操作失败' });
    }
  });

  app.post('/:id/application/:userId/reject', async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    const requesterId = request.headers['x-user-id'] as string;
    if (!requesterId) return reply.code(400).send({ message: '缺少 x-user-id' });
    try {
      const result = await service.hostRejectApplication(id, userId, requesterId);
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

  // ── Visibility exclusion management ──

  app.get('/:id/exclusions', async (request, reply) => {
    const { id } = request.params as { id: string };
    const requesterId = request.headers['x-user-id'] as string;
    if (!requesterId) return reply.code(400).send({ message: '缺少 x-user-id' });
    const event = await service.getEventById(id);
    if (!event) return reply.notFound('活动不存在');
    const isHostOrCoHost = (event as any).hostId === requesterId || (event as any).coHosts?.some((ch: any) => ch.userId === requesterId);
    if (!isHostOrCoHost) return reply.code(403).send({ message: '仅 Host 或 Co-Host 可查看' });
    const userIds = await service.getExclusions(id);
    return { userIds };
  });

  app.put('/:id/exclusions', async (request, reply) => {
    const { id } = request.params as { id: string };
    const requesterId = request.headers['x-user-id'] as string;
    if (!requesterId) return reply.code(400).send({ message: '缺少 x-user-id' });
    const event = await service.getEventById(id);
    if (!event) return reply.notFound('活动不存在');
    const isHostOrCoHost = (event as any).hostId === requesterId || (event as any).coHosts?.some((ch: any) => ch.userId === requesterId);
    if (!isHostOrCoHost) return reply.code(403).send({ message: '仅 Host 或 Co-Host 可设置' });
    const { userIds } = request.body as { userIds: string[] };
    if (!Array.isArray(userIds)) return reply.badRequest('缺少 userIds');
    await service.setExclusions(id, userIds);
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
