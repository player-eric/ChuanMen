import type { FastifyPluginAsync } from 'fastify';

/**
 * GET /api/profile?userId=xxx  OR  ?name=xxx
 * Optional: viewerId (via query or x-user-id header) for mutual computation
 * Returns aggregated user profile data
 */
export const profileRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    const { userId, name, viewerId: qViewerId } = request.query as { userId?: string; name?: string; viewerId?: string };
    if (!userId && !name) return reply.badRequest('缺少 userId 或 name');

    const prisma = app.prisma;
    const viewerId = qViewerId || (request.headers['x-user-id'] as string) || '';

    const user = name
      ? await prisma.user.findFirst({ where: { name }, include: { socialTitles: true, preferences: true } })
      : await prisma.user.findUnique({ where: { id: userId! }, include: { socialTitles: true, preferences: true } });
    if (!user) return reply.notFound('用户不存在');

    const targetId = user.id;
    const isOwnProfile = !!(viewerId && viewerId === targetId);

    // Parallelize all aggregation queries
    const [
      hostedEvents,
      participatedSignups,
      movieCount,
      screenedMovieCount,
      proposalCount,
      voteCount,
      postcardsSent,
      postcardsReceived,
      recentMovies,
      votedMovies,
      upcomingEvents,
      pastEvents,
      galleryEvents,
    ] = await Promise.all([
      // Events user hosted
      prisma.event.count({ where: { hostId: targetId } }),

      // Events user participated in (accepted signups)
      prisma.eventSignup.count({ where: { userId: targetId, status: 'accepted' } }),

      // Movies recommended
      prisma.movie.count({ where: { recommendedById: targetId } }),

      // Movies screened
      prisma.movie.count({
        where: { recommendedById: targetId, status: 'screened' },
      }),

      // Proposal count
      prisma.proposal.count({ where: { authorId: targetId } }),

      // MovieVote count (votes user received on their movies)
      prisma.movieVote.count({
        where: { movie: { recommendedById: targetId } },
      }),

      // Postcards sent (for non-owner: only public ones)
      prisma.postcard.findMany({
        where: { fromId: targetId, ...(isOwnProfile ? {} : { visibility: 'public' }) },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          to: { select: { id: true, name: true, avatar: true } },
          tags: true,
        },
      }),

      // Postcards received (for non-owner: only public ones)
      prisma.postcard.findMany({
        where: { toId: targetId, ...(isOwnProfile ? {} : { visibility: 'public' }) },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          from: { select: { id: true, name: true, avatar: true } },
          tags: true,
        },
      }),

      // Recent movies user recommended
      prisma.movie.findMany({
        where: { recommendedById: targetId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { _count: { select: { votes: true } } },
      }),

      // Movies user voted for (not their own)
      prisma.movieVote.findMany({
        where: { userId: targetId, movie: { recommendedById: { not: targetId } } },
        include: {
          movie: {
            include: {
              recommendedBy: { select: { id: true, name: true } },
              _count: { select: { votes: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Upcoming events where user is host or signed up
      prisma.event.findMany({
        where: {
          status: 'scheduled',
          startsAt: { gte: new Date() },
          OR: [
            { hostId: targetId },
            { signups: { some: { userId: targetId, status: 'accepted' } } },
          ],
        },
        orderBy: { startsAt: 'asc' },
        take: 10,
        include: {
          host: { select: { id: true, name: true } },
        },
      }),

      // Past events where user participated
      prisma.event.findMany({
        where: {
          OR: [
            { hostId: targetId, status: 'completed' },
            { signups: { some: { userId: targetId, status: 'accepted' } }, status: 'completed' },
          ],
        },
        orderBy: { startsAt: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          startsAt: true,
          hostId: true,
          tags: true,
          status: true,
          host: { select: { id: true, name: true } },
          recapPhotoUrls: true,
        },
      }),

      // Events with photos that user participated in
      prisma.event.findMany({
        where: {
          recapPhotoUrls: { isEmpty: false },
          OR: [
            { hostId: targetId },
            { signups: { some: { userId: targetId, status: 'accepted' } } },
          ],
        },
        orderBy: { startsAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          recapPhotoUrls: true,
          startsAt: true,
        },
      }),
    ]);

    // Mutual computation (when viewing someone else's profile)
    let mutual = undefined;
    if (viewerId && !isOwnProfile) {
      const [viewerSignups, viewerVotes, viewerRecVotes, targetRecVotes, mutualCardsSent, mutualCardsReceived] = await Promise.all([
        prisma.eventSignup.findMany({ where: { userId: viewerId, status: 'accepted' }, select: { eventId: true } }),
        prisma.movieVote.findMany({ where: { userId: viewerId }, select: { movieId: true } }),
        prisma.recommendationVote.findMany({ where: { userId: viewerId }, select: { recommendationId: true } }),
        prisma.recommendationVote.findMany({
          where: { userId: targetId },
          include: { recommendation: { select: { id: true, title: true, category: true } } },
        }),
        prisma.postcard.count({ where: { fromId: viewerId, toId: targetId } }),
        prisma.postcard.count({ where: { fromId: targetId, toId: viewerId } }),
      ]);

      const viewerEventIds = new Set(viewerSignups.map((s) => s.eventId));
      const viewerMovieIds = new Set(viewerVotes.map((v) => v.movieId));

      // Find mutual events from pastEvents (already fetched)
      const mutualEvents = pastEvents
        .filter((e) => viewerEventIds.has(e.id))
        .map((e) => ({ id: e.id, title: e.title, scene: (e as any).tags?.[0] ?? '' }));
      // Also check upcoming
      const mutualUpcoming = upcomingEvents
        .filter((e) => viewerEventIds.has(e.id))
        .map((e) => ({ id: e.id, title: e.title, scene: (e as any).tags?.[0] ?? '' }));

      // Find mutual movies from votedMovies (already fetched)
      const targetMovieIds = votedMovies.map((v) => v.movie.id);
      const mutualMovies = targetMovieIds
        .filter((id) => viewerMovieIds.has(id))
        .map((id) => {
          const m = votedMovies.find((v) => v.movie.id === id)!.movie;
          return { id: m.id, title: m.title };
        });

      // Find mutual recommendation votes (exclude 'movie' to avoid overlap with MovieVote)
      const viewerRecIds = new Set(viewerRecVotes.map((v) => v.recommendationId));
      const mutualRecs: Record<string, { id: string; title: string }[]> = {};
      let totalRecCount = 0;
      for (const rv of targetRecVotes) {
        if (!viewerRecIds.has(rv.recommendationId)) continue;
        if (rv.recommendation.category === 'movie') continue;
        const cat = rv.recommendation.category;
        (mutualRecs[cat] ??= []).push({ id: rv.recommendation.id, title: rv.recommendation.title });
        totalRecCount++;
      }

      mutual = {
        evtCount: mutualEvents.length + mutualUpcoming.length,
        events: [...mutualUpcoming, ...mutualEvents],
        movies: mutualMovies,
        recommendations: mutualRecs,
        tasteCount: mutualMovies.length + totalRecCount,
        cards: mutualCardsSent + mutualCardsReceived,
      };
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: isOwnProfile ? user.email : undefined,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        city: user.city,
        state: user.state,
        coverImageUrl: user.coverImageUrl,
        selfAsFriend: user.selfAsFriend,
        idealFriend: user.idealFriend,
        participationPlan: user.participationPlan,
        titles: user.socialTitles.map((t) => t.value),
        createdAt: user.createdAt,
      },
      stats: {
        hostCount: hostedEvents,
        eventCount: participatedSignups + hostedEvents,
        movieCount,
        screenedCount: screenedMovieCount,
        proposalCount,
        voteCount,
        cardsSent: postcardsSent.length,
        cardsReceived: postcardsReceived.length,
      },
      recentMovies,
      votedMovies: votedMovies.map((v) => v.movie),
      upcomingEvents,
      pastEvents,
      postcardsSent,
      postcardsReceived,
      galleryPhotos: galleryEvents.flatMap((e) =>
        e.recapPhotoUrls.map((url, i) => ({
          id: `${e.id}-${i}`,
          url,
          eventId: e.id,
          eventTitle: e.title,
          createdAt: e.startsAt.toISOString(),
        })),
      ),
      isOwnProfile,
      mutual,
    };
  });
};
