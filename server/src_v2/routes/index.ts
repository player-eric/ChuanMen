import type { FastifyPluginAsync } from 'fastify';
import { healthRoutes } from './health.js';
import { mediaRoutes } from './media.js';
import { agentRoutes } from './agent.js';
import { emailRoutes } from './email.js';
import { userRoutes } from '../modules/users/user.route.js';
import { eventRoutes } from '../modules/events/event.route.js';
import { recommendationRoutes } from '../modules/recommendations/recommendation.route.js';

export const apiRoutes: FastifyPluginAsync = async (app) => {
  app.register(healthRoutes, { prefix: '/health' });
  app.register(userRoutes, { prefix: '/users' });
  app.register(eventRoutes, { prefix: '/events' });
  app.register(recommendationRoutes, { prefix: '/recommendations' });
  app.register(mediaRoutes, { prefix: '/media' });
  app.register(emailRoutes, { prefix: '/email' });
  app.register(agentRoutes, { prefix: '/agent' });
};
