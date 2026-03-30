import type { PrismaClient } from '@prisma/client';
import { USER_BRIEF_SELECT } from '../../utils/prisma-selects.js';

/** Signal tag → matching question filter conditions */
const SIGNAL_TO_QUESTION: Record<string, { targetCategory?: string; targetType?: string; targetEntityType?: string }[]> = {
  movie:     [{ targetCategory: 'movie' }],
  eat:       [{ targetCategory: 'place' }],
  drink:     [{ targetCategory: 'place' }],
  music:     [{ targetCategory: 'music' }],
  reading:   [{ targetCategory: 'book' }],
  outdoor:   [{ targetType: 'proposal' }],
  sports:    [{ targetType: 'proposal' }],
  holiday:   [{ targetType: 'proposal' }],
  chuanmen:  [{ targetType: 'comment', targetEntityType: 'event' }],
  deeptalk:  [{ targetType: 'comment', targetEntityType: 'event' }],
  boardgame: [{ targetType: 'proposal' }],
  show:      [{ targetType: 'proposal' }],
};

export class DailyQuestionService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Get today's question + answers. Uses signal tags for personalized selection. */
  async getToday(userId?: string, userSignalTags?: string[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Day of year for deterministic selection
    const start = new Date(today.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((today.getTime() - start.getTime()) / 86400000);

    let question: Awaited<ReturnType<typeof this.prisma.dailyQuestion.findUnique>> = null;

    // 1. Try personalized selection based on signal tags
    if (userSignalTags && userSignalTags.length > 0) {
      // Collect unique filter conditions from signal tags
      const conditions: { targetCategory?: string; targetType?: string; targetEntityType?: string }[] = [];
      const seen = new Set<string>();
      for (const tag of userSignalTags) {
        const mappings = SIGNAL_TO_QUESTION[tag];
        if (!mappings) continue;
        for (const m of mappings) {
          const key = `${m.targetCategory ?? ''}-${m.targetType ?? ''}-${m.targetEntityType ?? ''}`;
          if (seen.has(key)) continue;
          seen.add(key);
          conditions.push(m);
        }
      }

      if (conditions.length > 0) {
        // Find all questions matching any of the signal conditions
        const allQuestions = await this.prisma.dailyQuestion.findMany({
          where: { OR: conditions },
        });
        if (allQuestions.length > 0) {
          // Deterministic pick: same day + same matched pool → same question
          question = allQuestions[dayOfYear % allQuestions.length];
        }
      }
    }

    // 2. Fallback: find question already assigned to today
    if (!question) {
      question = await this.prisma.dailyQuestion.findUnique({
        where: { date: today },
      });
    }

    // 3. Still no question → pick random from pool (date IS NULL) and assign
    if (!question) {
      const pool = await this.prisma.dailyQuestion.findMany({
        where: { date: null },
      });
      if (pool.length === 0) return null;
      const pick = pool[dayOfYear % pool.length];
      question = await this.prisma.dailyQuestion.update({
        where: { id: pick.id },
        data: { date: today },
      });
    }

    // 3. Fetch answers based on targetType
    const todayStart = new Date(today);
    const tomorrowStart = new Date(today);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    let answers: { id: string; userName: string; userAvatar?: string; text: string; createdAt: string }[] = [];
    let myAnswerId: string | undefined;
    let targetEvent: { id: string; title: string } | undefined;
    let targetRecommendation: { id: string; title: string } | undefined;

    if (question.targetType === 'recommendation') {
      const recs = await this.prisma.recommendation.findMany({
        where: { dailyQuestionId: question.id, createdAt: { gte: todayStart, lt: tomorrowStart } },
        include: { author: { select: USER_BRIEF_SELECT } },
        orderBy: { createdAt: 'asc' },
      });
      answers = recs.map((r) => ({
        id: r.id,
        userName: r.author.name,
        userAvatar: r.author.avatar || undefined,
        text: r.title,
        createdAt: r.createdAt.toISOString(),
      }));
      if (userId) {
        const mine = recs.find((r) => r.authorId === userId);
        if (mine) myAnswerId = mine.id;
      }
    } else if (question.targetType === 'proposal') {
      const props = await this.prisma.proposal.findMany({
        where: { dailyQuestionId: question.id, createdAt: { gte: todayStart, lt: tomorrowStart } },
        include: {
          author: { select: USER_BRIEF_SELECT },
          _count: { select: { votes: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      answers = props.map((p) => ({
        id: p.id,
        userName: p.author.name,
        userAvatar: p.author.avatar || undefined,
        text: p.title,
        createdAt: p.createdAt.toISOString(),
      }));
      if (userId) {
        const mine = props.find((p) => p.authorId === userId);
        if (mine) myAnswerId = mine.id;
      }
    } else if (question.targetType === 'comment') {
      // Find target entity for comment
      if (question.targetEntityType === 'event') {
        // Find the user's most recently completed event they attended
        const recentEvent = userId
          ? await this.prisma.event.findFirst({
              where: {
                status: { not: 'cancelled' },
                startsAt: { lt: new Date() },
                signups: { some: { userId, status: 'accepted' } },
              },
              orderBy: { startsAt: 'desc' },
              select: { id: true, title: true },
            })
          : null;
        if (!recentEvent) return null; // Skip this question if user hasn't attended events
        targetEvent = recentEvent;

        const comments = await this.prisma.comment.findMany({
          where: {
            entityType: 'event',
            entityId: recentEvent.id,
            createdAt: { gte: todayStart, lt: tomorrowStart },
          },
          include: { author: { select: USER_BRIEF_SELECT } },
          orderBy: { createdAt: 'asc' },
        });
        answers = comments.map((c) => ({
          id: c.id,
          userName: c.author.name,
          userAvatar: c.author.avatar || undefined,
          text: c.content,
          createdAt: c.createdAt.toISOString(),
        }));
        if (userId) {
          const mine = comments.find((c) => c.authorId === userId);
          if (mine) myAnswerId = mine.id;
        }
      } else if (question.targetEntityType === 'recommendation') {
        // Find a recent recommendation to comment on
        const recentRec = await this.prisma.recommendation.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true },
        });
        if (!recentRec) return null;
        targetRecommendation = recentRec;

        const comments = await this.prisma.comment.findMany({
          where: {
            entityType: 'recommendation',
            entityId: recentRec.id,
            createdAt: { gte: todayStart, lt: tomorrowStart },
          },
          include: { author: { select: USER_BRIEF_SELECT } },
          orderBy: { createdAt: 'asc' },
        });
        answers = comments.map((c) => ({
          id: c.id,
          userName: c.author.name,
          userAvatar: c.author.avatar || undefined,
          text: c.content,
          createdAt: c.createdAt.toISOString(),
        }));
        if (userId) {
          const mine = comments.find((c) => c.authorId === userId);
          if (mine) myAnswerId = mine.id;
        }
      }
    }

    // Render template text (replace {{recTitle}} etc.)
    let renderedText = question.text;
    if (targetEvent) {
      renderedText = renderedText.replace(/\{\{eventTitle\}\}/g, targetEvent.title);
    }
    if (targetRecommendation) {
      renderedText = renderedText.replace(/\{\{recTitle\}\}/g, targetRecommendation.title);
    }

    return {
      question: {
        id: question.id,
        text: renderedText,
        targetType: question.targetType,
        targetCategory: question.targetCategory,
        targetEntityType: question.targetEntityType,
      },
      answers,
      myAnswerId,
      targetEvent,
      targetRecommendation,
    };
  }

  // ── Admin CRUD ──

  async list() {
    return this.prisma.dailyQuestion.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: { text: string; targetType: string; targetCategory?: string; targetEntityType?: string }) {
    return this.prisma.dailyQuestion.create({
      data: {
        text: data.text,
        targetType: data.targetType,
        targetCategory: data.targetCategory ?? null,
        targetEntityType: data.targetEntityType ?? null,
      },
    });
  }

  async update(id: string, data: { text?: string; targetType?: string; targetCategory?: string | null; targetEntityType?: string | null }) {
    return this.prisma.dailyQuestion.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.dailyQuestion.delete({ where: { id } });
  }

  /** Submit an answer to a daily question */
  async submitAnswer(questionId: string, text: string, userId: string) {
    const question = await this.prisma.dailyQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new Error('问题不存在');

    if (question.targetType === 'recommendation') {
      if (!question.targetCategory) throw new Error('问题配置错误：缺少分类');
      const rec = await this.prisma.recommendation.create({
        data: {
          category: question.targetCategory as any,
          title: text,
          authorId: userId,
          dailyQuestionId: questionId,
        },
        include: { author: { select: USER_BRIEF_SELECT } },
      });
      return { type: 'recommendation', entity: rec };
    }

    if (question.targetType === 'proposal') {
      const proposal = await this.prisma.proposal.create({
        data: {
          title: text,
          authorId: userId,
          dailyQuestionId: questionId,
        },
        include: { author: { select: USER_BRIEF_SELECT } },
      });
      return { type: 'proposal', entity: proposal };
    }

    if (question.targetType === 'comment') {
      // Determine target entity
      let entityType = question.targetEntityType ?? 'event';
      let entityId: string | undefined;

      if (entityType === 'event') {
        const recentEvent = await this.prisma.event.findFirst({
          where: {
            status: { not: 'cancelled' },
            startsAt: { lt: new Date() },
            signups: { some: { userId, status: 'accepted' } },
          },
          orderBy: { startsAt: 'desc' },
          select: { id: true },
        });
        if (!recentEvent) throw new Error('没有找到你参加过的活动');
        entityId = recentEvent.id;
      } else if (entityType === 'recommendation') {
        const recentRec = await this.prisma.recommendation.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (!recentRec) throw new Error('没有找到推荐内容');
        entityId = recentRec.id;
      }

      if (!entityId) throw new Error('找不到评论目标');

      const comment = await this.prisma.comment.create({
        data: {
          entityType: entityType as any,
          entityId,
          authorId: userId,
          content: text,
        },
        include: { author: { select: USER_BRIEF_SELECT } },
      });
      return { type: 'comment', entity: comment };
    }

    throw new Error(`未知的问题类型: ${question.targetType}`);
  }
}
