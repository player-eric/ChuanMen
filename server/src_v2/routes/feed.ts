import type { FastifyPluginAsync } from 'fastify';
import { getWeekKey } from '../utils/weekKey.js';
import { getFutureWeekKeys, weekKeyToLabel } from '../utils/weekKey.js';
import { getSignalSummary, getMySignals } from '../modules/signals/signal.service.js';
import { DailyQuestionService } from '../modules/daily-question/daily-question.service.js';

/**
 * GET /api/feed?userId=xxx
 * Returns aggregated feed data: recent events, announcements, recommendations, postcards
 */
export const feedRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    const queryUserId = (request.query as { userId?: string }).userId;
    const headerUserId = (request.headers as Record<string, string>)['x-user-id'];
    const userId = queryUserId || headerUserId || undefined;
    const prisma = app.prisma;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Birthday week helper: check if a birthday falls within ±3 days of today
    const today = new Date();
    const todayMonth = today.getUTCMonth() + 1;
    const todayDay = today.getUTCDate();

    // Pre-fetch: event IDs with recent comments or signups (so old events with new activity get included)
    const [recentCommentEventIds, recentSignupEventIds] = await Promise.all([
      prisma.comment.findMany({
        where: { entityType: 'event', createdAt: { gte: sevenDaysAgo } },
        select: { entityId: true },
        distinct: ['entityId'],
      }),
      prisma.eventSignup.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { eventId: true },
        distinct: ['eventId'],
      }),
    ]);
    const activeEventIds = [
      ...new Set([
        ...recentCommentEventIds.map((r) => r.entityId),
        ...recentSignupEventIds.map((r) => r.eventId),
      ]),
    ];

    // Fetch in parallel
    const [events, announcements, recommendations, members, postcards, recentMovies, recentProposals, newMembers] =
      await Promise.all([
        // Recent events + events with recent activity
        prisma.event.findMany({
          where: {
            status: { not: 'cancelled' },
            ...(userId ? { NOT: { visibilityExclusions: { some: { userId } } } } : {}),
            OR: [
              { updatedAt: { gte: sevenDaysAgo } },
              ...(activeEventIds.length > 0 ? [{ id: { in: activeEventIds } }] : []),
            ],
          },
          orderBy: { updatedAt: 'desc' },
          take: 40,
          include: {
            host: { select: { id: true, name: true, avatar: true } },
            coHosts: { include: { user: { select: { id: true, name: true, avatar: true } } } },
            signups: {
              where: { status: { notIn: ['cancelled', 'declined', 'rejected'] } },
              include: { user: { select: { id: true, name: true, avatar: true } } },
            },
            screenedMovies: {
              include: { movie: { select: { id: true, title: true, poster: true, _count: { select: { votes: true } } } } },
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
            _count: { select: { votes: true } },
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
            lastActiveAt: true,
          },
          orderBy: { lastActiveAt: 'desc' },
        }).then(members => {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return members.map(m => ({
            ...m,
            recentlyActive: m.lastActiveAt ? m.lastActiveAt > sevenDaysAgo : false,
          }));
        }),

        // Recent public postcards (exclude those linked to events user is excluded from)
        prisma.postcard.findMany({
          where: {
            visibility: 'public',
            ...(userId ? {
              OR: [
                { eventId: null },
                { event: { NOT: { visibilityExclusions: { some: { userId } } } } },
              ],
            } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            from: { select: { id: true, name: true, avatar: true } },
            to: { select: { id: true, name: true, avatar: true } },
            tags: true,
          },
        }),

        // Recently active movies (any status)
        prisma.movie.findMany({
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
            votes: { include: { user: { select: { id: true, name: true, avatar: true } } } },
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
            city: true,
            state: true,
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
    // If user has notifReadAt, use it as a floor so older notifs are excluded
    let notifCutoff = fourteenDaysAgo;
    let notifReadAtISO: string | null = null;
    let notifReadAtDate: Date | null = null;
    if (userId) {
      const pref = await prisma.userPreference.findUnique({ where: { userId }, select: { notifReadAt: true } });
      if (pref?.notifReadAt) {
        notifReadAtDate = pref.notifReadAt;
        notifReadAtISO = pref.notifReadAt.toISOString();
        if (pref.notifReadAt > fourteenDaysAgo) {
          notifCutoff = pref.notifReadAt;
        }
      }
    }
    const notificationQueries = userId
      ? await Promise.all([
          // 1. 被@提及
          prisma.comment.findMany({
            where: { mentionedUserIds: { has: userId }, createdAt: { gte: notifCutoff } },
            select: {
              id: true, entityType: true, entityId: true, createdAt: true,
              author: { select: { id: true, name: true } },
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
          }),
          // 2. 被邀请活动
          prisma.eventSignup.findMany({
            where: { userId, status: 'invited', createdAt: { gte: notifCutoff } },
            select: {
              createdAt: true, invitedById: true,
              event: { select: { id: true, title: true } },
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
          }),
          // 3. 被安排分工 (someone else assigned me)
          prisma.eventTask.findMany({
            where: { claimedById: userId, updatedAt: { gte: notifCutoff } },
            select: {
              role: true, updatedAt: true,
              event: { select: { id: true, title: true, hostId: true } },
            },
            take: 10,
            orderBy: { updatedAt: 'desc' },
          }),
          // 4. 收到感谢卡
          prisma.postcard.findMany({
            where: { toId: userId, createdAt: { gte: notifCutoff } },
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
              offeredAt: { gte: notifCutoff },
            },
            select: {
              status: true, offeredAt: true, respondedAt: true,
              event: { select: { id: true, title: true } },
            },
            take: 10,
            orderBy: { offeredAt: 'desc' },
          }),
          // 8. 收到申请 (application_received — I'm host, someone applied)
          prisma.eventSignup.findMany({
            where: {
              status: 'pending',
              createdAt: { gte: notifCutoff },
              event: { hostId: userId, signupMode: 'application' },
            },
            select: {
              createdAt: true, note: true,
              user: { select: { id: true, name: true } },
              event: { select: { id: true, title: true } },
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
          }),
          // 9. 申请通过 (application_approved — my application was approved)
          prisma.eventSignup.findMany({
            where: {
              userId,
              status: 'accepted',
              respondedAt: { gte: notifCutoff },
              event: { signupMode: 'application' },
            },
            select: {
              respondedAt: true,
              event: { select: { id: true, title: true } },
            },
            take: 10,
            orderBy: { respondedAt: 'desc' },
          }),
          // 7. 创意变活动 (proposals I voted on that now have a linked event)
          prisma.proposalVote.findMany({
            where: { userId },
            select: {
              proposal: {
                select: {
                  id: true, title: true,
                  events: {
                    where: { createdAt: { gte: notifCutoff } },
                    select: { id: true, title: true, createdAt: true },
                    take: 1,
                  },
                },
              },
            },
          }),
          // 10. 同讨论有新评论 (someone commented on an entity I also commented on)
          (async () => {
            // Find entities this user commented on
            const myComments = await prisma.comment.findMany({
              where: { authorId: userId },
              select: { entityType: true, entityId: true },
              distinct: ['entityType', 'entityId'],
            });
            if (myComments.length === 0) return [];
            // Find recent comments by others on those same entities
            const orConditions = myComments.map(c => ({
              entityType: c.entityType,
              entityId: c.entityId,
            }));
            return prisma.comment.findMany({
              where: {
                OR: orConditions,
                authorId: { not: userId },
                createdAt: { gte: notifCutoff },
                // Exclude comments where user is already @mentioned (they get 'mention' notification)
                NOT: { mentionedUserIds: { has: userId } },
              },
              select: {
                id: true, entityType: true, entityId: true, createdAt: true,
                author: { select: { id: true, name: true } },
              },
              take: 20,
              orderBy: { createdAt: 'desc' },
            });
          })(),
        ])
      : [[], [], [], [], [], [], [], [], []];

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
      const [mentions, invites, taskAssigns, postcardReceived, waitlistSignups, applicationReceived, applicationApproved, proposalVotes, coComments] = notificationQueries;

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

      // 8. Application received (host sees pending applications)
      for (const s of applicationReceived as any[]) {
        notifications.push({
          action: 'application_received',
          name: s.user?.name ?? '',
          targetTitle: s.event?.title ?? '',
          detail: s.note || undefined,
          navTarget: `/events/${s.event?.id}`,
          createdAt: s.createdAt?.toISOString() ?? '',
        });
      }

      // 9. Application approved (applicant sees approval)
      for (const s of applicationApproved as any[]) {
        notifications.push({
          action: 'application_approved',
          name: '',
          targetTitle: s.event?.title ?? '',
          navTarget: `/events/${s.event?.id}`,
          createdAt: s.respondedAt?.toISOString() ?? '',
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

      // 10. Co-comment notifications (someone else commented where I also commented)
      // Pre-fetch recommendation categories for correct URLs
      const recCommentIds = (coComments as any[]).filter((c: any) => c.entityType === 'recommendation').map((c: any) => c.entityId);
      const recCatMap = new Map<string, string>();
      if (recCommentIds.length > 0) {
        const recs = await prisma.recommendation.findMany({ where: { id: { in: recCommentIds } }, select: { id: true, category: true } });
        for (const r of recs) recCatMap.set(r.id, r.category);
      }
      for (const c of coComments as any[]) {
        let nav = '/';
        if (c.entityType === 'event') nav = `/events/${c.entityId}`;
        else if (c.entityType === 'movie') nav = `/discover/movies/${c.entityId}`;
        else if (c.entityType === 'proposal') nav = `/events/proposals/${c.entityId}`;
        else if (c.entityType === 'recommendation') nav = `/discover/${recCatMap.get(c.entityId) ?? 'book'}/${c.entityId}`;
        notifications.push({
          action: 'comment_reply',
          name: c.author?.name ?? '',
          targetTitle: entityTitleMap.get(c.entityId) ?? '',
          navTarget: nav,
          createdAt: c.createdAt?.toISOString() ?? '',
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

    // Batch fetch likes, comment counts, and latest comment time for events
    const [allLikes, commentCounts, newCommentCounts, latestCommentTimes, latestEventComments, latestEventSignups] = await Promise.all([
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
      // New comments per entity (comments created after user's last notifReadAt)
      allEntityIds.length > 0 && notifReadAtDate
        ? prisma.comment.groupBy({
            by: ['entityType', 'entityId'],
            where: { entityId: { in: allEntityIds }, createdAt: { gt: notifReadAtDate } },
            _count: true,
          })
        : [],
      // Latest comment time per entity (for sorting non-event items by activity)
      allEntityIds.length > 0
        ? prisma.$queryRawUnsafe<{ entityId: string; latestCommentAt: Date }[]>(
            `SELECT c."entityId", MAX(c."createdAt") AS "latestCommentAt"
             FROM "Comment" c
             WHERE c."entityId" = ANY($1::text[])
             GROUP BY c."entityId"`,
            allEntityIds,
          )
        : [],
      // Latest comment per event (for activity hint — who commented)
      eventIds.length > 0
        ? prisma.$queryRawUnsafe<{ entityId: string; createdAt: Date; userName: string; content: string }[]>(
            `SELECT DISTINCT ON (c."entityId") c."entityId", c."createdAt", u."name" AS "userName", c."content"
             FROM "Comment" c JOIN "User" u ON u.id = c."authorId"
             WHERE c."entityType" = 'event' AND c."entityId" = ANY($1::text[])
             ORDER BY c."entityId", c."createdAt" DESC`,
            eventIds,
          )
        : [],
      // Latest accepted signup per event (for activity hint — who signed up successfully)
      eventIds.length > 0
        ? prisma.$queryRawUnsafe<{ eventId: string; createdAt: Date; userName: string }[]>(
            `SELECT DISTINCT ON (s."eventId") s."eventId", s."createdAt", u."name" AS "userName"
             FROM "EventSignup" s JOIN "User" u ON u.id = s."userId"
             WHERE s."eventId" = ANY($1::text[]) AND s."status" = 'accepted'
             ORDER BY s."eventId", s."createdAt" DESC`,
            eventIds,
          )
        : [],
    ]) as [
      Awaited<ReturnType<typeof prisma.like.findMany<{ where: any; include: { user: { select: { id: true; name: true } } } }>>>,
      { entityType: string; entityId: string; _count: number }[],
      { entityType: string; entityId: string; _count: number }[],
      { entityId: string; latestCommentAt: Date }[],
      { entityId: string; createdAt: Date; userName: string; content: string }[],
      { eventId: string; createdAt: Date; userName: string }[],
    ];

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

    // Group new comment counts by entityId
    const newCommentCountMap = new Map<string, number>();
    for (const row of newCommentCounts) {
      newCommentCountMap.set(row.entityId, row._count);
    }

    // Map: entityId → latest comment time (for sorting all entity types)
    const latestCommentAtMap = new Map<string, Date>();
    for (const row of latestCommentTimes) {
      latestCommentAtMap.set(row.entityId, row.latestCommentAt);
    }

    // Map: eventId → latest comment/signup { at, userName }
    const latestCommentMap = new Map<string, { at: Date; userName: string; content: string }>();
    for (const row of latestEventComments) {
      latestCommentMap.set(row.entityId, { at: row.createdAt, userName: row.userName, content: row.content });
    }
    const latestSignupMap = new Map<string, { at: Date; userName: string }>();
    for (const row of latestEventSignups) {
      latestSignupMap.set(row.eventId, { at: row.createdAt, userName: row.userName });
    }

    // Helper to attach likes + commentCount + newCommentCount + latestCommentAt to an entity
    const withInteraction = <T extends { id: string }>(entity: T) => {
      const likeData = likesMap.get(entity.id);
      const lca = latestCommentAtMap.get(entity.id);
      return {
        ...entity,
        likes: likeData?.count ?? 0,
        likedBy: likeData?.names ?? [],
        commentCount: commentCountMap.get(entity.id) ?? 0,
        newCommentCount: newCommentCountMap.get(entity.id) ?? 0,
        latestCommentAt: lca ? lca.toISOString() : undefined,
      };
    };

    // Fetch user's current postcard credits + voted entity IDs
    let postcardCredits: number | undefined;
    let myVotedIds: { movieIds: string[]; proposalIds: string[]; recommendationIds: string[] } = { movieIds: [], proposalIds: [], recommendationIds: [] };
    if (userId) {
      const [u, movieVotes, proposalVotes2, recVotes] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { postcardCredits: true } }),
        prisma.movieVote.findMany({ where: { userId }, select: { movieId: true } }),
        prisma.proposalVote.findMany({ where: { userId }, select: { proposalId: true } }),
        prisma.recommendationVote.findMany({ where: { userId }, select: { recommendationId: true } }),
      ]);
      postcardCredits = u?.postcardCredits ?? undefined;
      myVotedIds = {
        movieIds: movieVotes.map(v => v.movieId),
        proposalIds: proposalVotes2.map(v => v.proposalId),
        recommendationIds: recVotes.map(v => v.recommendationId),
      };
    }

    // ── Daily question + demand signal ──
    const dailyQuestionService = new DailyQuestionService(prisma);
    const signalWeekKeys = getFutureWeekKeys(3);
    const BUSY_TAGS = new Set(['study', 'overtime', 'travel', 'other']);

    // Fetch signals first, then use current-week tags for personalized question selection
    const [signalSummary, mySignals] = await Promise.all([
      getSignalSummary(prisma, signalWeekKeys),
      userId ? getMySignals(prisma, userId, signalWeekKeys) : Promise.resolve([]),
    ]);

    const currentWeekTags = mySignals
      .filter(s => s.weekKey === signalWeekKeys[0] && !BUSY_TAGS.has(s.tag))
      .map(s => s.tag);

    const dailyQuestion = await dailyQuestionService
      .getToday(userId, currentWeekTags.length > 0 ? currentWeekTags : undefined)
      .catch(() => null);

    // Build demandSignal response
    const now2 = new Date();
    const demandSignal = {
      weeks: Object.fromEntries(
        signalWeekKeys.map((wk) => [
          wk,
          {
            label: weekKeyToLabel(wk, now2),
            tags: signalSummary[wk] ?? [],
          },
        ]),
      ),
      mySignals: mySignals.map((s) => ({ tag: s.tag, weekKey: s.weekKey })),
    };

    // Filter out invite-phase events unless user is host or has a signup
    const visibleEvents = events.filter((e) => {
      if (e.phase !== 'invite') return true;
      if (!userId) return false;
      if (e.hostId === userId) return true;
      return e.signups.some((s) => s.userId === userId);
    });

    // Compute activity hint + real activityAt per event, then sort & trim
    const enrichedEvents = visibleEvents.map((e) => {
      const base = { ...withInteraction(e), photoCount: e.recapPhotoUrls?.length ?? 0 };
      const latestComment = latestCommentMap.get(e.id);
      const latestSignup = latestSignupMap.get(e.id);
      const isNewlyCreated = e.updatedAt.getTime() - e.createdAt.getTime() < 60_000;
      let activityHint: string | undefined;
      let activityHintUser: string | undefined;
      let activityHintAt: Date | undefined;
      if (!isNewlyCreated) {
        const candidates: { type: string; at: Date; userName: string }[] = [];
        if (latestComment && latestComment.at > e.createdAt) candidates.push({ type: 'comment', at: latestComment.at, userName: latestComment.userName });
        if (latestSignup && latestSignup.at > e.createdAt) candidates.push({ type: 'signup', at: latestSignup.at, userName: latestSignup.userName });
        // Photos compete with comments/signups — most recent wins
        if (e.recapPhotoUrls?.length > 0 && e.phase === 'ended' && e.updatedAt > e.createdAt) {
          candidates.push({ type: 'photo', at: e.updatedAt, userName: '' });
        }
        if (candidates.length > 0) {
          candidates.sort((a, b) => b.at.getTime() - a.at.getTime());
          activityHint = candidates[0].type;
          activityHintUser = candidates[0].userName || undefined;
          activityHintAt = candidates[0].at;
        } else {
          activityHint = 'update';
        }
      }
      // Real activity time: comments and signups both bump sort order
      const now = new Date();
      const interactionAt = (activityHint === 'comment' || activityHint === 'signup' || activityHint === 'photo') ? activityHintAt : undefined;
      const realActivityAt = interactionAt
        ?? (e.startsAt && e.startsAt <= now ? e.startsAt : e.createdAt);
      const activityHintComment = activityHint === 'comment' && latestComment ? latestComment.content : undefined;
      return { ...base, activityHint, activityHintUser, activityHintComment, activityAt: realActivityAt };
    });
    // Sort by real activity time (most recent first) and take top 20
    enrichedEvents.sort((a, b) => b.activityAt.getTime() - a.activityAt.getTime());

    return {
      events: enrichedEvents.slice(0, 20),
      notifReadAt: notifReadAtISO,
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
      myVotedIds,
      dailyQuestion,
      demandSignal,
    };
  });

  // ── Mark all notifications as read ──
  app.post('/mark-read', async (request, reply) => {
    const userId = (request.headers as Record<string, string>)['x-user-id'];
    if (!userId) return reply.status(401).send({ message: 'Missing x-user-id' });

    await app.prisma.userPreference.upsert({
      where: { userId },
      update: { notifReadAt: new Date() },
      create: { userId, notifReadAt: new Date() },
    });

    return { ok: true };
  });
};
