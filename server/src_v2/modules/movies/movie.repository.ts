import type { PrismaClient } from '@prisma/client';

export class MovieRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list() {
    return this.prisma.movie.findMany({
      where: { status: 'candidate' },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        recommendedBy: { select: { id: true, name: true } },
        votes: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        _count: { select: { votes: true } },
      },
    });
  }

  getById(id: string) {
    return this.prisma.movie.findUnique({
      where: { id },
      include: {
        recommendedBy: { select: { id: true, name: true } },
        votes: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        screenedEvents: {
          include: {
            event: {
              select: {
                id: true, title: true, startsAt: true, status: true,
                host: { select: { name: true } },
                _count: { select: { signups: true } },
                visibilityExclusions: { select: { userId: true } },
              },
            },
          },
        },
        _count: { select: { votes: true } },
      },
    });
  }

  search(keyword: string) {
    return this.prisma.movie.findMany({
      where: {
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { director: { contains: keyword, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        recommendedBy: { select: { id: true, name: true } },
        _count: { select: { votes: true } },
      },
    });
  }

  async toggleVote(movieId: string, userId: string) {
    const existing = await this.prisma.movieVote.findUnique({
      where: { movieId_userId: { movieId, userId } },
    });
    if (existing) {
      await this.prisma.movieVote.delete({ where: { id: existing.id } });
      return { voted: false };
    }
    await this.prisma.movieVote.create({ data: { movieId, userId } });
    return { voted: true };
  }

  create(data: { title: string; year?: number; director?: string; poster?: string; doubanUrl?: string; doubanRating?: number; synopsis?: string; recommendedById: string }) {
    return this.prisma.movie.create({
      data: {
        title: data.title,
        year: data.year,
        director: data.director ?? '',
        poster: data.poster ?? '',
        doubanUrl: data.doubanUrl ?? '',
        doubanRating: data.doubanRating,
        synopsis: data.synopsis ?? '',
        recommendedById: data.recommendedById,
      },
      include: {
        recommendedBy: { select: { id: true, name: true } },
        _count: { select: { votes: true } },
      },
    });
  }

  screened() {
    return this.prisma.movie.findMany({
      where: { status: 'screened' },
      orderBy: { updatedAt: 'desc' },
      include: {
        screenedEvents: {
          orderBy: { event: { startsAt: 'desc' } },
          take: 1,
          include: {
            event: {
              select: {
                id: true, title: true, startsAt: true,
                host: { select: { name: true } },
                visibilityExclusions: { select: { userId: true } },
              },
            },
          },
        },
      },
    });
  }

  update(id: string, data: { title?: string; status?: string; director?: string; synopsis?: string }) {
    return this.prisma.movie.update({ where: { id }, data: data as any });
  }

  delete(id: string) {
    return this.prisma.movie.delete({ where: { id } });
  }
}
