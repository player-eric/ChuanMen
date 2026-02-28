import type { FastifyPluginAsync } from 'fastify';

/**
 * GET /api/feed?userId=xxx
 * Returns aggregated feed data: recent events, announcements, recommendations, postcards
 */
export const feedRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request) => {
    const { userId } = request.query as { userId?: string };
    const prisma = app.prisma;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Fetch in parallel
    const [events, announcements, recommendations, members, postcards, recentMovies, recentProposals, newMembers] =
      await Promise.all([
        // Recent events (upcoming + recently ended)
        prisma.event.findMany({
          orderBy: { startsAt: 'desc' },
          take: 20,
          include: {
            host: { select: { id: true, name: true, avatar: true } },
            signups: {
              where: { status: { notIn: ['cancelled', 'declined', 'rejected'] } },
              include: { user: { select: { id: true, name: true } } },
            },
            screenedMovies: {
              include: { movie: { select: { id: true, title: true } } },
              take: 1,
            },
            recommendations: {
              include: {
                recommendation: { select: { id: true, title: true, category: true } },
              },
            },
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

        // New members: announced (introducing) + recently approved via announcement (welcomed)
        prisma.user.findMany({
          where: {
            OR: [
              { userStatus: 'announced' },
              {
                userStatus: 'approved',
                announcedAt: { not: null },
                approvedAt: { gte: sevenDaysAgo },
              },
            ],
          },
          select: {
            id: true,
            name: true,
            avatar: true,
            bio: true,
            location: true,
            selfAsFriend: true,
            idealFriend: true,
            participationPlan: true,
            announcedAt: true,
            announcedEndAt: true,
            approvedAt: true,
            userStatus: true,
          },
          orderBy: { announcedAt: 'desc' },
        }),
      ]);

    // Fetch likes for new members
    const newMemberIds = newMembers.map((m) => m.id);
    const newMemberLikes = newMemberIds.length > 0
      ? await prisma.like.findMany({
          where: { entityType: 'user', entityId: { in: newMemberIds } },
          include: { user: { select: { id: true, name: true } } },
        })
      : [];

    // Group likes by entityId
    const likesMap = new Map<string, { count: number; names: string[] }>();
    for (const like of newMemberLikes) {
      const entry = likesMap.get(like.entityId) ?? { count: 0, names: [] };
      entry.count++;
      entry.names.push(like.user.name);
      likesMap.set(like.entityId, entry);
    }

    const newMembersWithLikes = newMembers.map((m) => {
      const likeData = likesMap.get(m.id);
      return { ...m, likes: likeData?.count ?? 0, likedBy: likeData?.names ?? [] };
    });

    return {
      events,
      announcements,
      recommendations,
      members,
      postcards,
      recentMovies,
      recentProposals,
      newMembers: newMembersWithLikes,
    };
  });
};
