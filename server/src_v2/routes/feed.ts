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

    // Collect all entity IDs by type for batch like/comment fetching
    const eventIds = events.map((e) => e.id);
    const postcardIds = postcards.map((p) => p.id);
    const movieIds = recentMovies.map((m) => m.id);
    const proposalIds = recentProposals.map((p) => p.id);
    const newMemberIds = newMembers.map((m) => m.id);
    const allEntityIds = [...eventIds, ...postcardIds, ...movieIds, ...proposalIds, ...newMemberIds];

    // Batch fetch likes and comment counts for all entities
    const [allLikes, commentCounts] = await Promise.all([
      allEntityIds.length > 0
        ? prisma.like.findMany({
            where: { entityId: { in: allEntityIds } },
            include: { user: { select: { id: true, name: true } } },
          })
        : [],
      allEntityIds.length > 0
        ? prisma.comment.groupBy({
            by: ['entityType', 'entityId'],
            where: { entityId: { in: allEntityIds } },
            _count: true,
          })
        : [],
    ]);

    // Group likes by entityId
    const likesMap = new Map<string, { count: number; names: string[] }>();
    for (const like of allLikes) {
      const entry = likesMap.get(like.entityId) ?? { count: 0, names: [] };
      entry.count++;
      entry.names.push(like.user.name);
      likesMap.set(like.entityId, entry);
    }

    // Group comment counts by entityId
    const commentCountMap = new Map<string, number>();
    for (const row of commentCounts) {
      commentCountMap.set(row.entityId, row._count);
    }

    // Helper to attach likes + commentCount to an entity
    const withInteraction = <T extends { id: string }>(entity: T) => {
      const likeData = likesMap.get(entity.id);
      return {
        ...entity,
        likes: likeData?.count ?? 0,
        likedBy: likeData?.names ?? [],
        commentCount: commentCountMap.get(entity.id) ?? 0,
      };
    };

    return {
      events: events.map(withInteraction),
      announcements,
      recommendations,
      members,
      postcards: postcards.map(withInteraction),
      recentMovies: recentMovies.map(withInteraction),
      recentProposals: recentProposals.map(withInteraction),
      newMembers: newMembers.map(withInteraction),
    };
  });
};
