import type { FastifyPluginAsync } from 'fastify';

/**
 * GET /api/feed?userId=xxx
 * Returns aggregated feed data: recent events, announcements, recommendations, postcards
 */
export const feedRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request) => {
    const { userId } = request.query as { userId?: string };
    const prisma = app.prisma;

    // Fetch in parallel
    const [events, announcements, recommendations, members, postcards, recentMovies, recentProposals] =
      await Promise.all([
        // Recent events (upcoming + recently ended)
        prisma.event.findMany({
          orderBy: { startsAt: 'desc' },
          take: 20,
          include: {
            host: { select: { id: true, name: true, avatar: true } },
            signups: { include: { user: { select: { id: true, name: true } } } },
            selectedMovie: { select: { title: true } },
          },
        }),

        // Recent announcements
        prisma.announcement.findMany({
          where: { published: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { author: { select: { id: true, name: true, avatar: true } } },
        }),

        // Recent recommendations
        prisma.recommendation.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            author: { select: { id: true, name: true, avatar: true } },
            tags: true,
          },
        }),

        // All approved members (for top row)
        prisma.user.findMany({
          where: { userStatus: 'approved' },
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            hostCount: true,
            city: true,
          },
          orderBy: { lastActiveAt: 'desc' },
        }),

        // Recent public postcards
        prisma.postcard.findMany({
          where: { visibility: 'public' },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            from: { select: { id: true, name: true, avatar: true } },
            to: { select: { id: true, name: true, avatar: true } },
          },
        }),

        // Recently recommended movies
        prisma.movie.findMany({
          where: { status: 'candidate' },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            recommendedBy: { select: { id: true, name: true, avatar: true } },
            _count: { select: { votes: true } },
          },
        }),

        // Recent proposals
        prisma.proposal.findMany({
          where: { status: 'discussing' },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            author: { select: { id: true, name: true, avatar: true } },
            _count: { select: { votes: true } },
          },
        }),
      ]);

    return {
      events,
      announcements,
      recommendations,
      members,
      postcards,
      recentMovies,
      recentProposals,
    };
  });
};
