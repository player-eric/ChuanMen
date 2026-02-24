import type { PrismaClient } from '@prisma/client';

export class MovieRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list() {
    return this.prisma.movie.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        recommendedBy: { select: { id: true, name: true } },
        votes: { include: { user: { select: { id: true, name: true } } } },
        _count: { select: { votes: true } },
      },
    });
  }

  getById(id: string) {
    return this.prisma.movie.findUnique({
      where: { id },
      include: {
        recommendedBy: { select: { id: true, name: true } },
        votes: { include: { user: { select: { id: true, name: true } } } },
        screenedEvents: {
          include: {
            event: { select: { id: true, title: true, startsAt: true, status: true, host: { select: { name: true } }, _count: { select: { signups: true } } } },
          },
        },
        selectedInEvents: {
          select: { id: true, title: true, startsAt: true, status: true, host: { select: { name: true } }, _count: { select: { signups: true } } },
          where: { status: { not: 'cancelled' } },
          orderBy: { startsAt: 'asc' },
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

  screened() {
    return this.prisma.movieScreening.findMany({
      orderBy: { event: { startsAt: 'desc' } },
      include: {
        movie: { select: { id: true, title: true, year: true, director: true } },
        event: { select: { id: true, title: true, startsAt: true, host: { select: { name: true } } } },
      },
    });
  }
}
