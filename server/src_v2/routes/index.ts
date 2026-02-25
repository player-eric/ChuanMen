import type { FastifyPluginAsync } from 'fastify';
import { healthRoutes } from './health.js';
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

export const apiRoutes: FastifyPluginAsync = async (app) => {
  app.register(healthRoutes, { prefix: '/health' });
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
    ]);

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
    };
  });
};
