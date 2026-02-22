import type { FastifyPluginAsync } from 'fastify';
import { runAgentCycle } from '../services/agentService.js';

export const agentRoutes: FastifyPluginAsync = async (app) => {
  app.post('/tick', async (_request, reply) => {
    const result = await runAgentCycle(app);
    return reply.send({ ok: true, ...result });
  });
};
