import type { FastifyPluginAsync } from 'fastify';
import {
  getCurrentLottery,
  getLotteryHistory,
  acceptLottery,
  skipLottery,
  completeLottery,
} from './lottery.service.js';
import { respondSchema, completeSchema, hostCandidateSchema } from './lottery.schema.js';

export const lotteryRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/lottery/current — get current week's lottery draw
  app.get('/current', async () => {
    const current = await getCurrentLottery(app.prisma);
    return current ?? { none: true };
  });

  // GET /api/lottery/history — get lottery history
  app.get('/history', async (request) => {
    const { take, skip } = request.query as { take?: string; skip?: string };
    return getLotteryHistory(
      app.prisma,
      take ? parseInt(take, 10) : 20,
      skip ? parseInt(skip, 10) : 0,
    );
  });

  // POST /api/lottery/:id/accept — accept lottery draw
  app.post('/:id/accept', async (request) => {
    const { id } = request.params as { id: string };
    const body = respondSchema.parse(request.body);
    return acceptLottery(app.prisma, id, body.userId);
  });

  // POST /api/lottery/:id/skip — skip lottery draw (triggers re-draw)
  app.post('/:id/skip', async (request) => {
    const { id } = request.params as { id: string };
    const body = respondSchema.parse(request.body);
    const newDraw = await skipLottery(app.prisma, app.log, id, body.userId);
    return { ok: true, newDraw };
  });

  // POST /api/lottery/:id/complete — mark lottery as completed with event
  app.post('/:id/complete', async (request) => {
    const { id } = request.params as { id: string };
    const body = completeSchema.parse(request.body);
    return completeLottery(app.prisma, id, body.eventId);
  });

  // PATCH /api/lottery/host-candidate — toggle host candidate status
  app.patch('/host-candidate', async (request) => {
    const userId = request.headers['x-user-id'] as string;
    if (!userId) throw Object.assign(new Error('Missing x-user-id'), { statusCode: 401 });
    const body = hostCandidateSchema.parse(request.body);
    const user = await app.prisma.user.update({
      where: { id: userId },
      data: { hostCandidate: body.hostCandidate },
      select: { id: true, hostCandidate: true },
    });
    return user;
  });
};
