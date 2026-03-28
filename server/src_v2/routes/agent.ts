import type { FastifyPluginAsync } from 'fastify';
import { runAgentCycle } from '../services/agentService.js';

export const agentRoutes: FastifyPluginAsync = async (app) => {
  app.post('/tick', async (_request, reply) => {
    const result = await runAgentCycle(app);
    return reply.send({ ok: true, ...result });
  });

  // GET /tick for external cron services (cron-job.org, Vercel cron)
  app.get('/tick', async (request, reply) => {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      // Support both: Vercel cron sends "Authorization: Bearer <secret>",
      // external services (cron-job.org) send "x-cron-secret: <secret>"
      const fromHeader = (request.headers['x-cron-secret'] as string) ?? '';
      const fromAuth = (request.headers.authorization ?? '').replace('Bearer ', '');
      if (fromHeader !== cronSecret && fromAuth !== cronSecret) {
        return reply.status(401).send({ error: 'Invalid cron secret' });
      }
    }
    const result = await runAgentCycle(app);
    return reply.send({ ok: true, ...result });
  });
};
