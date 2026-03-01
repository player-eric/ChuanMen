import type { PrismaClient, RecommendationCategory, RecommendationStatus } from '@prisma/client';

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
        votes: { select: { userId: true, user: { select: { id: true, name: true } } } },
        _count: { select: { votes: true } },
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
      return { voted: false };
    }
    await this.prisma.recommendationVote.create({ data: { recommendationId, userId } });
    return { voted: true };
  }

  delete(id: string) {
    return this.prisma.recommendation.delete({ where: { id } });
  }

  update(id: string, data: { title?: string; description?: string; sourceUrl?: string; coverUrl?: string }) {
    return this.prisma.recommendation.update({
      where: { id },
      data,
      include: { author: true, tags: true },
    });
  }

  create(input: {
    category: RecommendationCategory;
    title: string;
    authorId: string;
    description?: string;
    sourceUrl?: string;
    coverUrl?: string;
    status?: RecommendationStatus;
    tags?: string[];
  }) {
    return this.prisma.recommendation.create({
      data: {
        category: input.category,
        title: input.title,
        authorId: input.authorId,
        description: input.description ?? '',
        sourceUrl: input.sourceUrl ?? '',
        coverUrl: input.coverUrl ?? '',
        status: input.status ?? 'candidate',
        tags: input.tags?.length
          ? {
              create: input.tags.map((value) => ({ value })),
            }
          : undefined,
      },
      include: {
        tags: true,
      },
    });
  }
}
