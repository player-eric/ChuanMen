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

    // Birthday week helper: check if a birthday falls within ±3 days of today
    const today = new Date();
    const todayMonth = today.getUTCMonth() + 1;
    const todayDay = today.getUTCDate();

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
            birthday: true,
            hideBirthday: true,
            socialTitles: true,
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

    // Birthday users: find approved users whose birthday is within ±3 days of today
    let birthdayUsers: { id: string; name: string; avatar: string; birthday: string }[] = [];
    if (userId) {
      // Filter members who have visible birthdays within birthday week
      const candidateBirthday = members.filter((m) => {
        if (!m.birthday || m.hideBirthday) return false;
        const bd = new Date(m.birthday);
        const bdMonth = bd.getUTCMonth() + 1;
        const bdDay = bd.getUTCDate();
        // Check if within ±3 days (simplified: compare day-of-year distance)
        const todayDOY = todayMonth * 31 + todayDay;
        const bdDOY = bdMonth * 31 + bdDay;
        const diff = Math.abs(todayDOY - bdDOY);
        // Handle year wrap (e.g. Dec 30 vs Jan 2)
        const wrapDiff = 12 * 31 - diff;
        return Math.min(diff, wrapDiff) <= 3;
      });

      if (candidateBirthday.length > 0) {
        // Filter to only birthday users who have mutual postcards with the viewer
        const mutualPostcards = await prisma.postcard.findMany({
          where: {
            OR: [
              { fromId: userId, toId: { in: candidateBirthday.map((u) => u.id) } },
              { toId: userId, fromId: { in: candidateBirthday.map((u) => u.id) } },
            ],
          },
          select: { fromId: true, toId: true },
        });

        // Build sets of who sent to whom
        const viewerSentTo = new Set<string>();
        const viewerReceivedFrom = new Set<string>();
        for (const pc of mutualPostcards) {
          if (pc.fromId === userId) viewerSentTo.add(pc.toId);
          if (pc.toId === userId) viewerReceivedFrom.add(pc.fromId);
        }

        // Mutual = viewer sent to them AND they sent to viewer
        birthdayUsers = candidateBirthday
          .filter((u) => viewerSentTo.has(u.id) && viewerReceivedFrom.has(u.id))
          .map((u) => ({
            id: u.id,
            name: u.name,
            avatar: u.avatar,
            birthday: u.birthday!.toISOString(),
          }));
      }
    }

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
      events: events.map((e) => ({ ...withInteraction(e), photoCount: e.recapPhotoUrls?.length ?? 0 })),
      announcements,
      recommendations,
      members,
      postcards: postcards.map(withInteraction),
      recentMovies: recentMovies.map(withInteraction),
      recentProposals: recentProposals.map(withInteraction),
      newMembers: newMembers.map(withInteraction),
      birthdayUsers,
    };
  });
};
