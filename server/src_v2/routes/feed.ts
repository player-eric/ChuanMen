import type { FastifyPluginAsync } from 'fastify';
import { getWeekKey } from '../modules/lottery/lottery.service.js';

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
            tasks: {
              include: { claimedBy: { select: { id: true, name: true } } },
              orderBy: { createdAt: 'asc' as const },
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

    // ── Personal notifications (14 days, only when userId is present) ──
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);
    const notificationQueries = userId
      ? await Promise.all([
          // 1. 被@提及
          prisma.comment.findMany({
            where: { mentionedUserIds: { has: userId }, createdAt: { gte: fourteenDaysAgo } },
            select: {
              id: true, entityType: true, entityId: true, createdAt: true,
              author: { select: { id: true, name: true } },
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
          }),
          // 2. 被邀请活动
          prisma.eventSignup.findMany({
            where: { userId, status: 'invited', createdAt: { gte: fourteenDaysAgo } },
            select: {
              createdAt: true, invitedById: true,
              event: { select: { id: true, title: true } },
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
          }),
          // 3. 被安排分工 (someone else assigned me)
          prisma.eventTask.findMany({
            where: { claimedById: userId, updatedAt: { gte: fourteenDaysAgo } },
            select: {
              role: true, updatedAt: true,
              event: { select: { id: true, title: true, hostId: true } },
            },
            take: 10,
            orderBy: { updatedAt: 'desc' },
          }),
          // 4. 收到感谢卡
          prisma.postcard.findMany({
            where: { toId: userId, createdAt: { gte: fourteenDaysAgo } },
            select: {
              createdAt: true,
              from: { select: { id: true, name: true } },
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
          }),
          // 5+6. 等位有名额 (offered) + 被接纳 (accepted from waitlist)
          prisma.eventSignup.findMany({
            where: {
              userId,
              status: { in: ['offered', 'accepted'] },
              offeredAt: { gte: fourteenDaysAgo },
            },
            select: {
              status: true, offeredAt: true, respondedAt: true,
              event: { select: { id: true, title: true } },
            },
            take: 10,
            orderBy: { offeredAt: 'desc' },
          }),
          // 7. 创意变活动 (proposals I voted on that now have a linked event)
          prisma.proposalVote.findMany({
            where: { userId },
            select: {
              proposal: {
                select: {
                  id: true, title: true,
                  events: {
                    where: { createdAt: { gte: fourteenDaysAgo } },
                    select: { id: true, title: true, createdAt: true },
                    take: 1,
                  },
                },
              },
            },
          }),
        ])
      : [[], [], [], [], [], []];

    // Normalize notifications into a flat array
    const notifications: {
      action: string;
      name: string;
      targetTitle: string;
      detail?: string;
      navTarget: string;
      createdAt: string;
    }[] = [];

    if (userId) {
      const [mentions, invites, taskAssigns, postcardReceived, waitlistSignups, proposalVotes] = notificationQueries;

      // Build a userId→name map from already-fetched members for name lookups
      const memberNameMap = new Map<string, string>();
      for (const m of members) memberNameMap.set(m.id, m.name);

      // Build entity title maps from already-fetched data for mention target titles
      const entityTitleMap = new Map<string, string>();
      for (const e of events) entityTitleMap.set(e.id, e.title);
      for (const m of recentMovies) entityTitleMap.set(m.id, m.title);
      for (const p of recentProposals) entityTitleMap.set(p.id, p.title);

      // 1. Mentions
      for (const c of mentions as any[]) {
        // Determine navTarget from entityType + entityId
        let nav = '/';
        if (c.entityType === 'event') nav = `/events/${c.entityId}`;
        else if (c.entityType === 'movie') nav = `/discover/movies/${c.entityId}`;
        else if (c.entityType === 'proposal') nav = `/events/proposals/${c.entityId}`;
        notifications.push({
          action: 'mention',
          name: c.author?.name ?? '',
          targetTitle: entityTitleMap.get(c.entityId) ?? '',
          navTarget: nav,
          createdAt: c.createdAt?.toISOString() ?? '',
        });
      }

      // 2. Event invites
      for (const s of invites as any[]) {
        notifications.push({
          action: 'event_invite',
          name: (s.invitedById ? memberNameMap.get(s.invitedById) : '') ?? '',
          targetTitle: s.event?.title ?? '',
          navTarget: `/events/${s.event?.id}`,
          createdAt: s.createdAt?.toISOString() ?? '',
        });
      }

      // 3. Task assignments
      for (const t of taskAssigns as any[]) {
        notifications.push({
          action: 'task_assign',
          name: '',
          targetTitle: t.event?.title ?? '',
          detail: t.role,
          navTarget: `/events/${t.event?.id}`,
          createdAt: t.updatedAt?.toISOString() ?? '',
        });
      }

      // 4. Postcards received
      for (const p of postcardReceived as any[]) {
        notifications.push({
          action: 'postcard_received',
          name: p.from?.name ?? '',
          targetTitle: '',
          navTarget: '/cards',
          createdAt: p.createdAt?.toISOString() ?? '',
        });
      }

      // 5+6. Waitlist offered / approved
      for (const s of waitlistSignups as any[]) {
        notifications.push({
          action: s.status === 'offered' ? 'waitlist_offered' : 'waitlist_approved',
          name: '',
          targetTitle: s.event?.title ?? '',
          navTarget: `/events/${s.event?.id}`,
          createdAt: (s.status === 'offered' ? s.offeredAt : s.respondedAt ?? s.offeredAt)?.toISOString() ?? '',
        });
      }

      // 7. Proposal realized
      for (const v of proposalVotes as any[]) {
        const linkedEvent = v.proposal?.events?.[0];
        if (!linkedEvent) continue;
        notifications.push({
          action: 'proposal_realized',
          name: '',
          targetTitle: v.proposal?.title ?? '',
          navTarget: `/events/${linkedEvent.id}`,
          createdAt: linkedEvent.createdAt?.toISOString() ?? '',
        });
      }
    }

    // Fetch current lottery draw
    const weekKey = getWeekKey();
    const currentLottery = await prisma.weeklyLottery.findFirst({
      where: { weekKey, status: { not: 'skipped' } },
      include: {
        drawnMember: { select: { id: true, name: true, avatar: true } },
        event: { select: { id: true, title: true, startsAt: true } },
      },
    });

    // Fetch user's lottery/candidate status if logged in
    let lotteryUserStatus: { hostCandidate: boolean; consecutiveEvents: number } | null = null;
    if (userId) {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { hostCandidate: true, consecutiveEvents: true },
      });
      if (u) lotteryUserStatus = u;
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

    // Fetch user's current postcard credits (for credit change toast)
    let postcardCredits: number | undefined;
    if (userId) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { postcardCredits: true } });
      postcardCredits = u?.postcardCredits ?? undefined;
    }

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
      currentLottery,
      lotteryUserStatus,
      notifications,
      postcardCredits,
    };
  });
};
