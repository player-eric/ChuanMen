import type { PrismaClient, RecommendationCategory, RecommendationStatus } from '@prisma/client';
import { USER_BRIEF_SELECT } from '../../utils/prisma-selects.js';

export class RecommendationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(category?: RecommendationCategory) {
    return this.prisma.recommendation.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        author: true,
        tags: true,
        votes: { select: { userId: true } },
        _count: { select: { votes: true } },
      },
    });
  }

  getById(id: string) {
    return this.prisma.recommendation.findUnique({
      where: { id },
      include: {
        author: true,
        tags: true,
        votes: { select: { userId: true, user: { select: USER_BRIEF_SELECT } } },
        _count: { select: { votes: true } },
        events: {
          where: { isSelected: true },
          include: { event: { select: { id: true, title: true, startsAt: true, host: { select: USER_BRIEF_SELECT } } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  search(keyword: string, category?: RecommendationCategory) {
    return this.prisma.recommendation.findMany({
      where: {
        ...(category ? { category } : {}),
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        author: true,
        tags: true,
        votes: { select: { userId: true } },
        _count: { select: { votes: true } },
      },
    });
  }

  async toggleVote(recommendationId: string, userId: string) {
    const existing = await this.prisma.recommendationVote.findUnique({
      where: { recommendationId_userId: { recommendationId, userId } },
    });
    if (existing) {
      await this.prisma.recommendationVote.delete({ where: { id: existing.id } });
      const voteCount = await this.prisma.recommendationVote.count({ where: { recommendationId } });
      return { voted: false, voteCount };
    }
    await this.prisma.recommendationVote.create({ data: { recommendationId, userId } });
    const voteCount = await this.prisma.recommendationVote.count({ where: { recommendationId } });
    return { voted: true, voteCount };
  }

  delete(id: string) {
    return this.prisma.recommendation.delete({ where: { id } });
  }

  update(id: string, data: { title?: string; description?: string; sourceUrl?: string; coverUrl?: string; eventDate?: Date | null; eventEndDate?: Date | null; authorId?: string }) {
    return this.prisma.recommendation.update({
      where: { id },
      data,
      include: { author: true, tags: true },
    });
  }

  async create(input: {
    category: RecommendationCategory;
    title: string;
    authorId: string;
    description?: string;
    sourceUrl?: string;
    coverUrl?: string;
    eventDate?: Date;
    eventEndDate?: Date;
    status?: RecommendationStatus;
    tags?: string[];
  }) {
    const rec = await this.prisma.recommendation.create({
      data: {
        category: input.category,
        title: input.title,
        authorId: input.authorId,
        description: input.description ?? '',
        sourceUrl: input.sourceUrl ?? '',
        coverUrl: input.coverUrl ?? '',
        eventDate: input.eventDate ?? null,
        eventEndDate: input.eventEndDate ?? null,
        status: input.status ?? 'candidate',
        tags: input.tags?.length
          ? {
              create: input.tags.map((value) => ({ value })),
            }
          : undefined,
        // Auto-vote by recommender
        votes: { create: { userId: input.authorId } },
      },
      include: {
        tags: true,
      },
    });
    return rec;
  }
}
