import type { FastifyPluginAsync } from 'fastify';
import { DailyQuestionService } from './daily-question.service.js';

export const dailyQuestionRoutes: FastifyPluginAsync = async (app) => {
  const service = new DailyQuestionService(app.prisma);

  /** GET /api/daily-question/today?userId=xxx */
  app.get('/today', async (request) => {
    const { userId } = request.query as { userId?: string };
    const result = await service.getToday(userId);
    return result ?? { question: null };
  });

  /** POST /api/daily-question/answer */
  app.post('/answer', async (request, reply) => {
    const { questionId, text, userId } = request.body as {
      questionId: string;
      text: string;
      userId: string;
    };
    if (!questionId || !text?.trim() || !userId) {
      return reply.badRequest('缺少必要参数');
    }
    const result = await service.submitAnswer(questionId, text.trim(), userId);
    return reply.code(201).send(result);
  });

  /** GET /api/daily-question/random?exclude=xxx&userId=xxx — random question with template rendering */
  app.get('/random', async (request) => {
    const { exclude, userId } = request.query as { exclude?: string; userId?: string };
    const pool = await app.prisma.dailyQuestion.findMany({
      where: exclude ? { id: { not: exclude } } : {},
    });
    if (pool.length === 0) return { question: null };

    // Shuffle and try to find a renderable question (comment types need a target entity)
    const shuffled = pool.sort(() => Math.random() - 0.5);
    for (const pick of shuffled) {
      let text = pick.text;
      let targetEvent: { id: string; title: string } | undefined;
      let targetRecommendation: { id: string; title: string } | undefined;

      if (pick.targetType === 'comment') {
        if (pick.targetEntityType === 'event') {
          const evt = userId
            ? await app.prisma.event.findFirst({
                where: { status: { not: 'cancelled' }, startsAt: { lt: new Date() }, signups: { some: { userId, status: 'accepted' } } },
                orderBy: { startsAt: 'desc' },
                select: { id: true, title: true },
              })
            : null;
          if (!evt) continue; // skip this question
          targetEvent = evt;
          text = text.replace(/\{\{eventTitle\}\}/g, evt.title);
        } else if (pick.targetEntityType === 'recommendation') {
          const rec = await app.prisma.recommendation.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { id: true, title: true },
          });
          if (!rec) continue;
          targetRecommendation = rec;
          text = text.replace(/\{\{recTitle\}\}/g, rec.title);
        }
      }

      return {
        question: {
          id: pick.id,
          text,
          targetType: pick.targetType,
          targetCategory: pick.targetCategory,
          targetEntityType: pick.targetEntityType,
        },
        answers: [],
        myAnswerId: undefined,
        targetEvent,
        targetRecommendation,
      };
    }
    return { question: null };
  });

  // ── Admin CRUD ──

  /** GET /api/daily-question — list all questions */
  app.get('/', async () => {
    return service.list();
  });

  /** POST /api/daily-question — create question */
  app.post('/', async (request, reply) => {
    const { text, targetType, targetCategory, targetEntityType } = request.body as {
      text: string;
      targetType: string;
      targetCategory?: string;
      targetEntityType?: string;
    };
    if (!text?.trim() || !targetType) {
      return reply.badRequest('缺少必要参数');
    }
    const created = await service.create({ text: text.trim(), targetType, targetCategory, targetEntityType });
    return reply.code(201).send(created);
  });

  /** PATCH /api/daily-question/:id — update question */
  app.patch('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      text?: string;
      targetType?: string;
      targetCategory?: string | null;
      targetEntityType?: string | null;
    };
    const updated = await service.update(id, body);
    return { ok: true, question: updated };
  });

  /** DELETE /api/daily-question/:id — delete question */
  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    await service.remove(id);
    return { ok: true };
  });
};
