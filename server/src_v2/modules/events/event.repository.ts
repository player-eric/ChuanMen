import type { PrismaClient } from '@prisma/client';

export class EventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list() {
    return this.prisma.event.findMany({
      orderBy: { startsAt: 'asc' },
      include: {
        host: true,
        coHosts: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  create(input: {
    title: string;
    hostId: string;
    startsAt: Date;
    location?: string;
    description?: string;
    tag?: 'movie' | 'chuanmen' | 'holiday' | 'hiking' | 'outdoor' | 'small_group' | 'other';
  }) {
    return this.prisma.event.create({
      data: {
        title: input.title,
        hostId: input.hostId,
        startsAt: input.startsAt,
        location: input.location ?? '',
        description: input.description ?? '',
        tag: input.tag ?? 'other',
      },
    });
  }
}
