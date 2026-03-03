import type { FastifyPluginAsync } from 'fastify';
import { healthRoutes } from './health.js';
import { authRoutes } from './auth.js';
import { mediaRoutes } from './media.js';
import { agentRoutes } from './agent.js';
import { emailRoutes } from './email.js';
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
    app.prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    }).catch(() => {});
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
  app.register(agentRoutes, { prefix: '/agent' });
  app.register(titleRuleRoutes, { prefix: '/title-rules' });
  app.register(taskPresetRoutes, { prefix: '/task-presets' });
  app.register(eventTaskRoutes, { prefix: '/events' });
  app.register(newsletterRoutes, { prefix: '/newsletters' });
  app.register(siteConfigRoutes, { prefix: '/config' });
  app.register(lotteryRoutes, { prefix: '/lottery' });

  // Admin dashboard stats
  app.get('/admin/stats', async () => {
    const prisma = app.prisma;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

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
      // Activity supply
      monthActiveHosts,
      waitlistSignups,
      totalSignupsThisMonth,
      eventTagCounts,
      // Postcard breakdown
      publicCards,
      // Member activity
      monthParticipants,
      monthMovieRecommenders,
      newMemberParticipants,
      totalNewMembers,
      // Host funnel
      activeParticipants3,
      firstCoHosts,
      soloHosts,
      veteranHosts,
      // Email stats
      emailActive,
      emailWeekly,
      emailStopped,
      emailUnsubscribed,
    ] = await Promise.all([
      prisma.user.count({ where: { userStatus: 'approved' } }),
      prisma.user.count({ where: { userStatus: 'applicant' } }),
      prisma.event.count(),
      prisma.event.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.postcard.count(),
      prisma.postcard.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.user.count({ where: { hostCount: { gt: 0 } } }),
      prisma.movie.count(),
      prisma.proposal.count(),
      // Activity supply: hosts who hosted this month
      prisma.event.findMany({ where: { createdAt: { gte: monthStart } }, select: { hostId: true } })
        .then(evts => new Set(evts.map(e => e.hostId)).size),
      // Waitlist signups this month
      prisma.eventSignup.count({ where: { status: 'waitlist', createdAt: { gte: monthStart } } }),
      // Total signups this month (for waitlist ratio)
      prisma.eventSignup.count({ where: { createdAt: { gte: monthStart } } }),
      // Event tag distribution (all events)
      prisma.event.findMany({ select: { tags: true } }),
      // Public postcards
      prisma.postcard.count({ where: { visibility: 'public' } }),
      // Members who participated in events this month
      prisma.eventSignup.findMany({
        where: { status: 'accepted', event: { startsAt: { gte: monthStart } } },
        select: { userId: true },
      }).then(rows => new Set(rows.map(r => r.userId)).size),
      // Members who recommended movies this month
      prisma.movie.findMany({
        where: { createdAt: { gte: monthStart }, recommendedById: { not: undefined } },
        select: { recommendedById: true },
      }).then(rows => new Set(rows.map(r => r.recommendedById).filter(Boolean)).size),
      // New members (joined this month) who participated in at least one event
      prisma.user.count({
        where: { createdAt: { gte: monthStart }, userStatus: 'approved', participationCount: { gt: 0 } },
      }),
      prisma.user.count({ where: { createdAt: { gte: monthStart }, userStatus: 'approved' } }),
      // Host funnel: active participants (≥3 events)
      prisma.user.count({ where: { userStatus: 'approved', participationCount: { gte: 3 } } }),
      // First co-hosts (appeared as coHost but hostCount = 0)
      prisma.eventCoHost.findMany({ select: { userId: true }, distinct: ['userId'] })
        .then(async rows => {
          if (rows.length === 0) return 0;
          return prisma.user.count({
            where: { id: { in: rows.map(r => r.userId) }, hostCount: 0 },
          });
        }),
      // Solo hosts (hostCount >= 1)
      prisma.user.count({ where: { userStatus: 'approved', hostCount: { gte: 1 } } }),
      // Veteran hosts (hostCount >= 5)
      prisma.user.count({ where: { userStatus: 'approved', hostCount: { gte: 5 } } }),
      // Email preference stats
      prisma.userPreference.count({ where: { emailState: 'active' } }),
      prisma.userPreference.count({ where: { emailState: 'weekly' } }),
      prisma.userPreference.count({ where: { emailState: 'stopped' } }),
      prisma.userPreference.count({ where: { emailState: 'unsubscribed' } }),
    ]);

    // Compute event tag distribution
    const tagMap: Record<string, number> = {};
    for (const e of eventTagCounts) {
      for (const t of e.tags) {
        tagMap[t] = (tagMap[t] || 0) + 1;
      }
    }
    const distinctTagCount = Object.keys(tagMap).length;
    const topTags = Object.entries(tagMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    // Recent activity log
    const [recentEvents, recentApplicants, recentCards] = await Promise.all([
      prisma.event.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { title: true, createdAt: true, host: { select: { name: true } } },
      }),
      prisma.user.findMany({
        where: { userStatus: 'applicant' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { name: true, createdAt: true },
      }),
      prisma.postcard.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { createdAt: true, from: { select: { name: true } }, to: { select: { name: true } } },
      }),
    ]);

    const recentActivity = [
      ...recentApplicants.map(u => ({
        text: `${u.name} 提交了入社申请`,
        time: u.createdAt.toISOString(),
      })),
      ...recentEvents.map(e => ({
        text: `${e.host.name} 创建了活动「${e.title}」`,
        time: e.createdAt.toISOString(),
      })),
      ...recentCards.map(c => ({
        text: `${c.from.name} 给 ${c.to.name} 寄了感谢卡`,
        time: c.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

    const privateCards = totalCards - publicCards;
    const publicPercent = totalCards > 0 ? Math.round((publicCards / totalCards) * 100) : 0;
    const waitlistPercent = totalSignupsThisMonth > 0 ? Math.round((waitlistSignups / totalSignupsThisMonth) * 100) : 0;
    const newMemberParticipationRate = totalNewMembers > 0 ? Math.round((newMemberParticipants / totalNewMembers) * 100) : 0;

    return {
      totalMembers,
      pendingApplicants,
      totalEvents,
      monthEvents,
      totalCards,
      monthCards,
      activeHosts,
      totalMovies,
      totalProposals,
      // Activity supply
      monthActiveHosts,
      waitlistPercent,
      distinctTagCount,
      topTags,
      // Postcard breakdown
      publicCards,
      privateCards,
      publicPercent,
      // Member activity
      monthParticipants,
      monthMovieRecommenders,
      newMemberParticipationRate,
      // Host funnel
      hostFunnel: {
        activeParticipants3,
        firstCoHosts,
        soloHosts,
        veteranHosts,
      },
      // Email stats
      emailStats: {
        active: emailActive,
        weekly: emailWeekly,
        stopped: emailStopped,
        unsubscribed: emailUnsubscribed,
      },
      // Recent activity
      recentActivity,
    };
  });
};
