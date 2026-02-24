import type { FastifyPluginAsync } from 'fastify';

/**
 * GET /api/profile?userId=xxx
 * Returns aggregated user profile data
 */
export const profileRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    const { userId } = request.query as { userId?: string };
    if (!userId) return reply.badRequest('缺少 userId');

    const prisma = app.prisma;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        socialTitles: true,
        preferences: true,
      },
    });
    if (!user) return reply.notFound('用户不存在');

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
      prisma.event.count({ where: { hostId: userId } }),

      // Events user participated in (accepted signups)
      prisma.eventSignup.count({ where: { userId, status: 'accepted' } }),

      // Movies recommended
      prisma.movie.count({ where: { recommendedById: userId } }),

      // Movies screened
      prisma.movie.count({
        where: { recommendedById: userId, status: 'screened' },
      }),

      // Proposal count
      prisma.proposal.count({ where: { authorId: userId } }),

      // MovieVote count (votes user received on their movies)
      prisma.movieVote.count({
        where: { movie: { recommendedById: userId } },
      }),

      // Postcards sent
      prisma.postcard.findMany({
        where: { fromId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          to: { select: { id: true, name: true, avatar: true } },
          tags: true,
        },
      }),

      // Postcards received
      prisma.postcard.findMany({
        where: { toId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          from: { select: { id: true, name: true, avatar: true } },
          tags: true,
        },
      }),

      // Recent movies user recommended
      prisma.movie.findMany({
        where: { recommendedById: userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { _count: { select: { votes: true } } },
      }),

      // Movies user voted for (not their own)
      prisma.movieVote.findMany({
        where: { userId, movie: { recommendedById: { not: userId } } },
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
            { hostId: userId },
            { signups: { some: { userId, status: 'accepted' } } },
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
            { hostId: userId, status: 'completed' },
            { signups: { some: { userId, status: 'accepted' } }, status: 'completed' },
          ],
        },
        orderBy: { startsAt: 'desc' },
        take: 20,
        include: {
          host: { select: { id: true, name: true } },
        },
      }),

      // Events with photos that user participated in
      prisma.event.findMany({
        where: {
          recapPhotoUrls: { isEmpty: false },
          OR: [
            { hostId: userId },
            { signups: { some: { userId, status: 'accepted' } } },
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

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        location: user.location,
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
    };
  });
};
