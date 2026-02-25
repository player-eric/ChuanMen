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
        signups: {
          where: { status: 'accepted' },
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        selectedMovie: { select: { title: true } },
        _count: { select: { signups: true } },
      },
    });
  }

  getById(id: string) {
    return this.prisma.event.findUnique({
      where: { id },
      include: {
        host: true,
        coHosts: { include: { user: true } },
        signups: {
          where: { status: { notIn: ['cancelled', 'declined', 'rejected'] } },
          include: { user: true },
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
    tags?: ('movie' | 'chuanmen' | 'holiday' | 'hiking' | 'outdoor' | 'small_group' | 'other')[];
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
        tags: input.tags ?? ['other'],
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

  signup(eventId: string, userId: string, status: string = 'accepted') {
    return this.prisma.eventSignup.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, status: status as any },
      update: { status: status as any },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
  }

  cancelSignup(eventId: string, userId: string) {
    return this.prisma.eventSignup.update({
      where: { eventId_userId: { eventId, userId } },
      data: { status: 'cancelled' },
    });
  }

  listPast() {
    return this.prisma.event.findMany({
      where: { status: 'completed' },
      orderBy: { startsAt: 'desc' },
      include: {
        host: { select: { id: true, name: true, avatar: true } },
        _count: { select: { signups: true } },
      },
    });
  }

  listCancelled() {
    return this.prisma.event.findMany({
      where: { status: 'cancelled' },
      orderBy: { startsAt: 'desc' },
      include: {
        host: { select: { id: true, name: true, avatar: true } },
        _count: { select: { signups: true } },
      },
    });
  }

  delete(id: string) {
    return this.prisma.event.delete({ where: { id } });
  }
}
