import type { PrismaClient, RecommendationCategory, RecommendationStatus } from '@prisma/client';

export class RecommendationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(category?: RecommendationCategory) {
    return this.prisma.recommendation.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ voteCount: 'desc' }, { createdAt: 'desc' }],
      include: {
        author: true,
        tags: true,
      },
    });
  }

  getById(id: string) {
    return this.prisma.recommendation.findUnique({
      where: { id },
      include: { author: true, tags: true },
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
      orderBy: [{ voteCount: 'desc' }, { createdAt: 'desc' }],
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
