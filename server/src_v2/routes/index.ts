import type { FastifyPluginAsync } from 'fastify';
import { healthRoutes } from './health.js';
import { authRoutes } from './auth.js';
import { mediaRoutes } from './media.js';
import { agentRoutes } from './agent.js';
import { emailRoutes } from './email.js';
import { feedbackRoutes } from './feedback.js';
import { feedRoutes } from './feed.js';
import { profileRoutes } from './profile.js';
import { userRoutes } from '../modules/users/user.route.js';
import { eventRoutes } from '../modules/events/event.route.js';
import { recommendationRoutes } from '../modules/recommendations/recommendation.route.js';
import { commentRoutes } from '../modules/comments/comment.route.js';
import { likeRoutes } from '../modules/likes/like.route.js';
import { proposalRoutes } from '../modules/proposals/proposal.route.js';
import { movieRoutes } from '../modules/movies/movie.route.js';
import { postcardRoutes } from '../modules/postcards/postcard.route.js';
import { aboutRoutes } from '../modules/about/about.route.js';
import { titleRuleRoutes } from '../modules/title-rules/title-rule.route.js';
import { taskPresetRoutes } from '../modules/task-presets/task-preset.route.js';
import { eventTaskRoutes } from '../modules/event-tasks/event-task.route.js';
import { newsletterRoutes } from '../modules/newsletters/newsletter.route.js';
import { siteConfigRoutes } from '../modules/site-config/site-config.route.js';
import { lotteryRoutes } from '../modules/lottery/lottery.route.js';
import { dailyQuestionRoutes } from '../modules/daily-question/daily-question.route.js';
import { signalRoutes } from '../modules/signals/signal.route.js';
import { migrationRoutes } from './migration.js';

export const apiRoutes: FastifyPluginAsync = async (app) => {
  // Touch lastActiveAt on meaningful API activity (throttled per user, fire-and-forget)
  const activeCache = new Map<string, number>();
  const TOUCH_INTERVAL = 5 * 60 * 1000;

  app.addHook('onRequest', async (request) => {
    const userId =
      (request.headers['x-user-id'] as string) ||
      (request.method !== 'GET' && (request.body as any)?.userId);
    if (!userId || typeof userId !== 'string') return;
    if (userId.length < 20 || userId.startsWith('walkthrough-')) return;
    const now = Date.now();
    if (now - (activeCache.get(userId) ?? 0) < TOUCH_INTERVAL) return;
    activeCache.set(userId, now);
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    Promise.all([
      app.prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
      }),
      app.prisma.dailyActiveLog.upsert({
        where: { userId_date: { userId, date: today } },
        create: { userId, date: today },
        update: {},
      }),
    ]).catch(() => {});
  });

  app.register(healthRoutes, { prefix: '/health' });
  app.register(authRoutes);
  app.register(userRoutes, { prefix: '/users' });
  app.register(eventRoutes, { prefix: '/events' });
  app.register(recommendationRoutes, { prefix: '/recommendations' });
  app.register(commentRoutes, { prefix: '/comments' });
  app.register(likeRoutes, { prefix: '/likes' });
  app.register(proposalRoutes, { prefix: '/proposals' });
  app.register(movieRoutes, { prefix: '/movies' });
  app.register(postcardRoutes, { prefix: '/postcards' });
  app.register(aboutRoutes, { prefix: '/about' });
  app.register(feedRoutes, { prefix: '/feed' });
  app.register(profileRoutes, { prefix: '/profile' });
  app.register(mediaRoutes, { prefix: '/media' });
  app.register(emailRoutes, { prefix: '/email' });
  app.register(feedbackRoutes, { prefix: '/feedback' });
  app.register(agentRoutes, { prefix: '/agent' });
  app.register(titleRuleRoutes, { prefix: '/title-rules' });
  app.register(taskPresetRoutes, { prefix: '/task-presets' });
  app.register(eventTaskRoutes, { prefix: '/events' });
  app.register(newsletterRoutes, { prefix: '/newsletters' });
  app.register(siteConfigRoutes, { prefix: '/config' });
  app.register(lotteryRoutes, { prefix: '/lottery' });
  app.register(dailyQuestionRoutes, { prefix: '/daily-question' });
  app.register(signalRoutes, { prefix: '/signals' });
  app.register(migrationRoutes, { prefix: '/migration' });

  // Admin dashboard stats
  app.get('/admin/stats', async () => {
    const prisma = app.prisma;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d7ago = new Date(now.getTime() - 7 * 86400000);
    const d30ago = new Date(now.getTime() - 30 * 86400000);
    const d60ago = new Date(now.getTime() - 60 * 86400000);
    const d14ago = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13); // start of 14 days ago

    // Shared filters
    const monthEventFilter = { startsAt: { gte: monthStart, lt: nextMonthStart } };
    const prevMonthEventFilter = { startsAt: { gte: prevMonthStart, lt: monthStart } };

    type MiniMember = { id: string; name: string; avatar: string | null; lastActiveAt: string | null; approvedAt: string | null };

    const toMini = (u: { id: string; name: string; avatar: string; lastActiveAt: Date | null; approvedAt: Date | null }): MiniMember => ({
      id: u.id, name: u.name, avatar: u.avatar || null,
      lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
      approvedAt: u.approvedAt?.toISOString() ?? null,
    });

    const [
      totalMembers,
      pendingApplicants,
      totalEvents,
      monthEvents,
      totalCards,
      monthCards,
      activeHosts,
      totalMovies,
      totalProposals,
      monthActiveHostEvents,
      waitlistSignups,
      totalSignupsThisMonth,
      eventTagCounts,
      publicCards,
      // Activity: DAU/MAU
      dauCount,
      mauCount,
      // Participation: this month + prev month accepted signups
      thisMonthSignups,
      prevMonthSignups,
      // All approved members (for distribution, leaderboard, host evolution)
      allMembers,
      // Recent applicants (60 days) for onboarding funnel
      recentApplicants60d,
      // Host funnel
      activeParticipants3,
      firstCoHosts,
      soloHosts,
      veteranHosts,
      // Email stats
      emailWeekly,
      emailStopped,
      emailUnsubscribed,
      // Prev month events count
      prevMonthEventsCount,
      // Month events with signup counts (for avg attendance)
      monthEventsWithCounts,
      // This month's host events for first-time host detection
      thisMonthHostEvents,
      // Leaderboard: postcards, comments, recommendations this month
      monthPostcards,
      monthComments,
      monthRecommendations,
      // DAU activity records (last 14 days)
      dauComments,
      dauPostcards,
      dauSignups,
      dauLikes,
      dauRecs,
      allTimeHosts,
      // Daily active logs (last 14 days) — accurate per-day tracking
      dauActiveLogs,
    ] = await Promise.all([
      prisma.user.count({ where: { userStatus: 'approved' } }),
      prisma.user.count({ where: { userStatus: 'applicant' } }),
      prisma.event.count(),
      prisma.event.count({ where: monthEventFilter }),
      prisma.postcard.count(),
      prisma.postcard.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.user.count({ where: { hostCount: { gt: 0 } } }),
      prisma.movie.count(),
      prisma.proposal.count(),
      prisma.event.findMany({ where: monthEventFilter, select: { hostId: true } }),
      prisma.eventSignup.count({ where: { status: 'waitlist', event: monthEventFilter } }),
      prisma.eventSignup.count({ where: { event: monthEventFilter } }),
      prisma.event.findMany({ select: { tags: true } }),
      prisma.postcard.count({ where: { visibility: 'public' } }),
      // DAU
      prisma.user.count({ where: { userStatus: 'approved', lastActiveAt: { gte: todayStart } } }),
      // MAU
      prisma.user.count({ where: { userStatus: 'approved', lastActiveAt: { gte: d30ago } } }),
      // This month accepted signups (userId set)
      prisma.eventSignup.findMany({
        where: { status: 'accepted', event: monthEventFilter },
        select: { userId: true },
      }),
      // Prev month accepted signups (userId set)
      prisma.eventSignup.findMany({
        where: { status: 'accepted', event: prevMonthEventFilter },
        select: { userId: true },
      }),
      // All approved members
      prisma.user.findMany({
        where: { userStatus: 'approved' },
        select: { id: true, name: true, avatar: true, lastActiveAt: true, approvedAt: true, participationCount: true, hostCount: true, createdAt: true, role: true },
      }),
      // Recent 60-day applicants/approved for onboarding
      prisma.user.findMany({
        where: { createdAt: { gte: d60ago } },
        select: { id: true, name: true, avatar: true, userStatus: true, createdAt: true, approvedAt: true, lastActiveAt: true, participationCount: true },
      }),
      // Host funnel
      prisma.user.count({ where: { userStatus: 'approved', participationCount: { gte: 3 }, hostCount: 0 } }),
      prisma.eventCoHost.findMany({ select: { userId: true }, distinct: ['userId'] })
        .then(async rows => {
          if (rows.length === 0) return 0;
          return prisma.user.count({ where: { id: { in: rows.map(r => r.userId) }, hostCount: 0 } });
        }),
      prisma.user.count({ where: { userStatus: 'approved', hostCount: { gte: 1, lt: 5 } } }),
      prisma.user.count({ where: { userStatus: 'approved', hostCount: { gte: 5 } } }),
      // Email
      prisma.userPreference.count({ where: { emailState: 'weekly' } }),
      prisma.userPreference.count({ where: { emailState: 'stopped' } }),
      prisma.userPreference.count({ where: { emailState: 'unsubscribed' } }),
      // Prev month events
      prisma.event.count({ where: prevMonthEventFilter }),
      // Month events with accepted signup counts
      prisma.event.findMany({
        where: monthEventFilter,
        select: { id: true, signups: { where: { status: 'accepted' }, select: { userId: true } } },
      }),
      // This month host events (for first-time host detection)
      prisma.event.findMany({
        where: monthEventFilter,
        select: { hostId: true, host: { select: { id: true, name: true, avatar: true, hostCount: true, lastActiveAt: true, approvedAt: true } } },
      }),
      // Leaderboard data: postcards sent this month
      prisma.postcard.findMany({
        where: { createdAt: { gte: monthStart } },
        select: { fromId: true },
      }),
      // Comments this month
      prisma.comment.findMany({
        where: { createdAt: { gte: monthStart } },
        select: { authorId: true },
      }),
      // Recommendations this month
      prisma.recommendation.findMany({
        where: { createdAt: { gte: monthStart } },
        select: { authorId: true },
      }),
      // DAU activity records (last 14 days) — for accurate daily trend
      prisma.comment.findMany({
        where: { createdAt: { gte: d14ago } },
        select: { authorId: true, createdAt: true },
      }),
      prisma.postcard.findMany({
        where: { createdAt: { gte: d14ago } },
        select: { fromId: true, createdAt: true },
      }),
      prisma.eventSignup.findMany({
        where: { createdAt: { gte: d14ago } },
        select: { userId: true, createdAt: true },
      }),
      prisma.like.findMany({
        where: { createdAt: { gte: d14ago } },
        select: { userId: true, createdAt: true },
      }),
      prisma.recommendation.findMany({
        where: { createdAt: { gte: d14ago } },
        select: { authorId: true, createdAt: true },
      }),
      // All-time distinct host IDs (for accurate "never hosted" check)
      prisma.event.findMany({
        select: { hostId: true },
        distinct: ['hostId'],
      }),
      // Daily active logs (last 14 days)
      prisma.dailyActiveLog.findMany({
        where: { date: { gte: d14ago.toISOString().slice(0, 10) } },
        select: { userId: true, date: true },
      }),
    ]);

    // ── Existing computations ──
    const monthActiveHosts = new Set(monthActiveHostEvents.map(e => e.hostId)).size;
    const emailActive = totalMembers - emailWeekly - emailStopped - emailUnsubscribed;

    const tagMap: Record<string, number> = {};
    for (const e of eventTagCounts) {
      for (const t of e.tags) tagMap[t] = (tagMap[t] || 0) + 1;
    }
    const distinctTagCount = Object.keys(tagMap).length;
    const topTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag]) => tag);

    const privateCards = totalCards - publicCards;
    const publicPercent = totalCards > 0 ? Math.round((publicCards / totalCards) * 100) : 0;
    const waitlistPercent = totalSignupsThisMonth > 0 ? Math.round((waitlistSignups / totalSignupsThisMonth) * 100) : 0;

    // ── Activity & Participation Rate ──
    const thisMonthIds = new Set(thisMonthSignups.map(r => r.userId));
    const prevMonthIds = new Set(prevMonthSignups.map(r => r.userId));
    const participationRate = totalMembers > 0 ? Math.round((thisMonthIds.size / totalMembers) * 100) : 0;
    const prevParticipationRate = totalMembers > 0 ? Math.round((prevMonthIds.size / totalMembers) * 100) : 0;
    // Return rate: people active in both months / prev month participants
    const returnIntersection = [...thisMonthIds].filter(id => prevMonthIds.has(id)).length;
    const returnRate = prevMonthIds.size > 0 ? Math.round((returnIntersection / prevMonthIds.size) * 100) : 0;

    // ── Member Distribution ──
    let activeCount = 0;
    let occasionalCount = 0;
    const awayMembers: MiniMember[] = [];
    for (const m of allMembers) {
      if (m.lastActiveAt && m.lastActiveAt >= d7ago) activeCount++;
      else if (m.lastActiveAt && m.lastActiveAt >= d30ago) occasionalCount++;
      else awayMembers.push(toMini(m as any));
    }

    // ── Onboarding Funnel (60 days) ──
    const applied = recentApplicants60d.length;
    const approvedRecent = recentApplicants60d.filter(u => u.userStatus === 'approved');
    const approvedCount = approvedRecent.length;
    // Average approval days
    const approvalDays = approvedRecent
      .filter(u => u.approvedAt)
      .map(u => (u.approvedAt!.getTime() - u.createdAt.getTime()) / 86400000);
    const avgApprovalDays = approvalDays.length > 0 ? Math.round((approvalDays.reduce((a, b) => a + b, 0) / approvalDays.length) * 10) / 10 : 0;
    // Logged in = approved + has lastActiveAt
    const loggedIn = approvedRecent.filter(u => u.lastActiveAt).length;
    // Need signup data for new members
    const newMemberIds = approvedRecent.map(u => u.id);
    let newMemberSignupIds = new Set<string>();
    let newMemberAttendedIds = new Set<string>();
    let newMemberAcceptedIds = new Set<string>(); // any accepted (for backward-compat rate)
    let newMemberInteractedIds = new Set<string>();
    if (newMemberIds.length > 0) {
      const [nmSignups, nmAttended, nmAccepted, nmComments, nmPostcards, nmLikes, nmRecs] = await Promise.all([
        // "报名过" — exclude 'invited' (host action, not user action)
        prisma.eventSignup.findMany({
          where: { userId: { in: newMemberIds }, status: { not: 'invited' } },
          select: { userId: true },
        }),
        // "参加过" — accepted + event already started (for onboarding funnel)
        prisma.eventSignup.findMany({
          where: { userId: { in: newMemberIds }, status: 'accepted', event: { startsAt: { lt: now } } },
          select: { userId: true },
        }),
        // Any accepted signup (for backward-compat newMemberParticipationRate)
        prisma.eventSignup.findMany({
          where: { userId: { in: newMemberIds }, status: 'accepted' },
          select: { userId: true },
        }),
        prisma.comment.findMany({
          where: { authorId: { in: newMemberIds } },
          select: { authorId: true },
          distinct: ['authorId'],
        }),
        prisma.postcard.findMany({
          where: { fromId: { in: newMemberIds } },
          select: { fromId: true },
          distinct: ['fromId'],
        }),
        prisma.like.findMany({
          where: { userId: { in: newMemberIds } },
          select: { userId: true },
          distinct: ['userId'],
        }),
        prisma.recommendation.findMany({
          where: { authorId: { in: newMemberIds } },
          select: { authorId: true },
          distinct: ['authorId'],
        }),
      ]);
      newMemberSignupIds = new Set(nmSignups.map(s => s.userId));
      newMemberAttendedIds = new Set(nmAttended.map(s => s.userId));
      newMemberAcceptedIds = new Set(nmAccepted.map(s => s.userId));
      const interacted = new Set([
        ...nmComments.map(c => c.authorId),
        ...nmPostcards.map(p => p.fromId),
        ...nmLikes.map(l => l.userId),
        ...nmRecs.map(r => r.authorId),
      ]);
      newMemberInteractedIds = interacted;
    }

    // Stuck members (>7 days since approval/login with no progress)
    const stuckThreshold = 7 * 86400000;
    const stuckAfterApproval: MiniMember[] = [];
    const stuckAfterLogin: MiniMember[] = [];
    const stuckAfterSignup: MiniMember[] = [];
    for (const u of approvedRecent) {
      if (!u.approvedAt) continue;
      const sinceApproval = now.getTime() - u.approvedAt.getTime();
      if (sinceApproval < stuckThreshold) continue;
      if (!u.lastActiveAt) {
        stuckAfterApproval.push(toMini(u as any));
      } else if (!newMemberSignupIds.has(u.id)) {
        stuckAfterLogin.push(toMini(u as any));
      } else if (!newMemberAttendedIds.has(u.id)) {
        stuckAfterSignup.push(toMini(u as any));
      }
    }

    // New members with funnel stage
    const newMembersWithStage = approvedRecent
      .filter(u => u.approvedAt && now.getTime() - u.createdAt.getTime() <= 60 * 86400000)
      .map(u => {
        let funnelStage = '已批准';
        if (u.lastActiveAt) funnelStage = '已登录';
        if (newMemberSignupIds.has(u.id)) funnelStage = '已报名';
        if (newMemberAttendedIds.has(u.id)) funnelStage = '已参加';
        if (newMemberInteractedIds.has(u.id)) funnelStage = '已互动';
        return { ...toMini(u as any), funnelStage };
      });

    // ── Host Evolution ──
    const allTimeHostIds = new Set(allTimeHosts.map(h => h.hostId));
    const readyToHost: MiniMember[] = allMembers
      .filter(m => m.participationCount >= 3 && !allTimeHostIds.has(m.id))
      .map(m => toMini(m as any));

    // First-time hosts this month: all their hosting ever is within this month
    // Count how many events each person hosted this month
    const thisMonthHostCountMap = new Map<string, number>();
    for (const e of thisMonthHostEvents) {
      thisMonthHostCountMap.set(e.hostId, (thisMonthHostCountMap.get(e.hostId) ?? 0) + 1);
    }
    const firstTimeHosts: MiniMember[] = [];
    const seenHostIds = new Set<string>();
    for (const e of thisMonthHostEvents) {
      if (seenHostIds.has(e.hostId)) continue;
      seenHostIds.add(e.hostId);
      // hostCount equals this month's count → all hosting is from this month = new host
      if (e.host.hostCount === thisMonthHostCountMap.get(e.hostId)) {
        firstTimeHosts.push(toMini(e.host as any));
      }
    }

    const uniqueHostsThisMonth = new Set(thisMonthHostEvents.map(e => e.hostId)).size;
    // Prev month unique hosts
    const prevMonthHostEvents = await prisma.event.findMany({
      where: prevMonthEventFilter,
      select: { hostId: true },
    });
    const prevUniqueHosts = new Set(prevMonthHostEvents.map(e => e.hostId)).size;

    // ── Leaderboard ──
    const memberMap = new Map(allMembers.map(m => [m.id, m]));
    // Count events per user this month
    const eventCounts = new Map<string, number>();
    for (const s of thisMonthSignups) {
      eventCounts.set(s.userId, (eventCounts.get(s.userId) ?? 0) + 1);
    }
    // Host counts this month
    const hostCounts = new Map<string, number>();
    for (const e of thisMonthHostEvents) {
      hostCounts.set(e.hostId, (hostCounts.get(e.hostId) ?? 0) + 1);
    }
    // Postcard counts
    const postcardCounts = new Map<string, number>();
    for (const p of monthPostcards) {
      postcardCounts.set(p.fromId, (postcardCounts.get(p.fromId) ?? 0) + 1);
    }
    // Comment counts
    const commentCounts = new Map<string, number>();
    for (const c of monthComments) {
      commentCounts.set(c.authorId, (commentCounts.get(c.authorId) ?? 0) + 1);
    }
    // Recommendation counts
    const recCounts = new Map<string, number>();
    for (const r of monthRecommendations) {
      recCounts.set(r.authorId, (recCounts.get(r.authorId) ?? 0) + 1);
    }
    // Merge scores
    const allUserIds = new Set([
      ...eventCounts.keys(), ...hostCounts.keys(), ...postcardCounts.keys(),
      ...commentCounts.keys(), ...recCounts.keys(),
    ]);
    const leaderboard = [...allUserIds].map(uid => {
      const events = eventCounts.get(uid) ?? 0;
      const hosted = hostCounts.get(uid) ?? 0;
      const postcards = postcardCounts.get(uid) ?? 0;
      const comments = commentCounts.get(uid) ?? 0;
      const recommendations = recCounts.get(uid) ?? 0;
      const score = events * 3 + hosted * 5 + postcards * 2 + comments * 1 + recommendations * 2;
      const m = memberMap.get(uid);
      return {
        id: uid,
        name: m?.name ?? '未知',
        avatar: m?.avatar || null,
        score,
        breakdown: { events, hosted, postcards, comments, recommendations },
      };
    }).sort((a, b) => b.score - a.score).slice(0, 10);

    // ── Event Metrics ──
    const totalAccepted = monthEventsWithCounts.reduce((sum, e) => sum + e.signups.length, 0);
    const avgAttendance = monthEventsWithCounts.length > 0 ? Math.round((totalAccepted / monthEventsWithCounts.length) * 10) / 10 : 0;

    // ── DAU Trend (last 14 days) ──
    // Combine activity records (comments, postcards, signups, likes, recs) + lastActiveAt
    // lastActiveAt alone only shows LAST active day per user; activity records capture multiple days
    const dauTrend: { date: string; count: number; userIds: string[] }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const inRange = (d: Date) => d >= dayStart && d < dayEnd;
      const dayUsers = new Set<string>();
      const dateStr = dayStart.toISOString().slice(0, 10); // "YYYY-MM-DD"
      // DailyActiveLog — most accurate source (tracks all visits)
      for (const log of dauActiveLogs) { if (log.date === dateStr) dayUsers.add(log.userId); }
      // Also count content creation activity
      for (const c of dauComments) { if (inRange(c.createdAt)) dayUsers.add(c.authorId); }
      for (const p of dauPostcards) { if (inRange(p.createdAt)) dayUsers.add(p.fromId); }
      for (const s of dauSignups) { if (inRange(s.createdAt)) dayUsers.add(s.userId); }
      for (const l of dauLikes) { if (inRange(l.createdAt)) dayUsers.add(l.userId); }
      for (const r of dauRecs) { if (inRange(r.createdAt)) dayUsers.add(r.authorId); }
      // Fallback: lastActiveAt (for users who browsed but no DailyActiveLog entry yet)
      for (const m of allMembers) {
        if (m.lastActiveAt && inRange(m.lastActiveAt)) dayUsers.add(m.id);
      }
      dauTrend.push({
        date: dayStart.toISOString().slice(5, 10), // "MM-DD"
        count: dayUsers.size,
        userIds: [...dayUsers],
      });
    }

    // ── Recent Activity ──
    const [recentEvents, recentApplicantsLog, recentCards] = await Promise.all([
      prisma.event.findMany({
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { title: true, createdAt: true, host: { select: { name: true } } },
      }),
      prisma.user.findMany({
        where: { userStatus: 'applicant' }, orderBy: { createdAt: 'desc' }, take: 5,
        select: { name: true, createdAt: true },
      }),
      prisma.postcard.findMany({
        orderBy: { createdAt: 'desc' }, take: 3,
        select: { createdAt: true, from: { select: { name: true } }, to: { select: { name: true } } },
      }),
    ]);

    const recentActivity = [
      ...recentApplicantsLog.map(u => ({ text: `${u.name} 提交了入社申请`, time: u.createdAt.toISOString() })),
      ...recentEvents.map(e => ({ text: `${e.host.name} 创建了活动「${e.title}」`, time: e.createdAt.toISOString() })),
      ...recentCards.map(c => ({ text: `${c.from.name} 给 ${c.to.name} 寄了感谢卡`, time: c.createdAt.toISOString() })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

    // ── Recently Active Members (sorted by lastActiveAt desc, nulls last) ──
    const recentlyActiveMembers = [...allMembers]
      .sort((a, b) => {
        if (a.lastActiveAt && b.lastActiveAt) return b.lastActiveAt.getTime() - a.lastActiveAt.getTime();
        if (a.lastActiveAt) return -1;
        if (b.lastActiveAt) return 1;
        return 0;
      })
      .slice(0, 50)
      .map(m => ({
        id: m.id,
        name: m.name,
        avatar: m.avatar || null,
        role: (m as any).role as string,
        hostCount: m.hostCount,
        participationCount: m.participationCount,
        lastActiveAt: m.lastActiveAt?.toISOString() ?? null,
      }));

    return {
      // Existing fields (preserved for backward compat)
      totalMembers,
      pendingApplicants,
      totalEvents,
      monthEvents,
      totalCards,
      monthCards,
      activeHosts,
      totalMovies,
      totalProposals,
      monthActiveHosts,
      waitlistPercent,
      distinctTagCount,
      topTags,
      publicCards,
      privateCards,
      publicPercent,
      monthParticipants: thisMonthIds.size,
      monthMovieRecommenders: 0,
      newMemberParticipationRate: approvedCount > 0 ? Math.round((newMemberAcceptedIds.size / approvedCount) * 100) : 0,
      hostFunnel: { activeParticipants3, firstCoHosts, soloHosts, veteranHosts },
      emailStats: { active: emailActive, weekly: emailWeekly, stopped: emailStopped, unsubscribed: emailUnsubscribed },
      recentActivity,

      // ── NEW: Deep engagement metrics ──
      activity: {
        dau: dauCount,
        mau: mauCount,
        totalApproved: totalMembers,
        participationRate,
        prevParticipationRate,
        returnRate,
      },

      onboarding: {
        applied,
        approved: approvedCount,
        avgApprovalDays,
        loggedIn,
        signedUp: newMemberSignupIds.size,
        attended: newMemberAttendedIds.size,
        interacted: newMemberInteractedIds.size,
        stuckAfterApproval,
        stuckAfterLogin,
        stuckAfterSignup,
      },

      memberDistribution: {
        active: activeCount,
        occasional: occasionalCount,
        away: awayMembers,
        newMembers: newMembersWithStage,
      },

      hostEvolution: {
        readyToHost,
        firstTimeHosts,
        uniqueHostsThisMonth,
        uniqueHostsPrevMonth: prevUniqueHosts,
      },

      leaderboard,

      eventMetrics: {
        avgAttendance,
        prevMonthEvents: prevMonthEventsCount,
      },

      dauTrend,

      recentlyActiveMembers,
    };
  });
};
