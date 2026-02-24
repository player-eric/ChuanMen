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

  getById(id: string) {
    return this.prisma.event.findUnique({
      where: { id },
      include: {
        host: true,
        coHosts: { include: { user: true } },
        signups: { include: { user: true } },
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
    titleImageUrl?: string;
    capacity?: number;
  }) {
    return this.prisma.event.create({
      data: {
        title: input.title,
        hostId: input.hostId,
        startsAt: input.startsAt,
        location: input.location ?? '',
        description: input.description ?? '',
        tag: input.tag ?? 'other',
        titleImageUrl: input.titleImageUrl ?? '',
        capacity: input.capacity ?? 10,
      },
    });
  }

  update(id: string, data: {
    title?: string;
    description?: string;
    titleImageUrl?: string;
    location?: string;
    capacity?: number;
  }) {
    return this.prisma.event.update({
      where: { id },
      data,
    });
  }

  async addRecapPhoto(eventId: string, photoUrl: string) {
    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        recapPhotoUrls: { push: photoUrl },
      },
    });
  }

  async removeRecapPhoto(eventId: string, photoUrl: string) {
    const event = await this.prisma.event.findUniqueOrThrow({ where: { id: eventId } });
    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        recapPhotoUrls: event.recapPhotoUrls.filter((u) => u !== photoUrl),
      },
    });
  }
}
