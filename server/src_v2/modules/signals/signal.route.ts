import type { FastifyPluginAsync } from 'fastify';
import { saveSignalsSchema } from './signal.schema.js';
import { saveSignals, getMySignals, getSignalSummary } from './signal.service.js';
import { getFutureWeekKeys } from '../../utils/weekKey.js';

export const signalRoutes: FastifyPluginAsync = async (app) => {
  /**
   * PUT /api/signals — save user's signals for given weeks
   */
  app.put('/', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string;
    if (!userId) return reply.badRequest('缺少 x-user-id');

    const parsed = saveSignalsSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);

    await saveSignals(app.prisma, userId, parsed.data);
    return { ok: true };
  });

  /**
   * GET /api/signals/mine — current user's future signals
   */
  app.get('/mine', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string;
    if (!userId) return reply.badRequest('缺少 x-user-id');

    const weekKeys = getFutureWeekKeys(3);
    const signals = await getMySignals(app.prisma, userId, weekKeys);
    return { signals };
  });

  /**
   * GET /api/signals/summary?weekKeys=2026-W12,2026-W13
   */
  app.get('/summary', async (request) => {
    const { weekKeys: raw } = request.query as { weekKeys?: string };
    const weekKeys = raw ? raw.split(',').filter(Boolean) : getFutureWeekKeys(3);
    const summary = await getSignalSummary(app.prisma, weekKeys);
    return { summary };
  });
};
