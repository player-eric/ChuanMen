import type { PrismaClient } from '@prisma/client';

export class PostcardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listReceived(userId: string) {
    return this.prisma.postcard.findMany({
      where: { toId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        from: { select: { id: true, name: true, avatar: true } },
        to: { select: { id: true, name: true, avatar: true } },
        event: { select: { id: true, title: true } },
        tags: true,
      },
    });
  }

  listSent(userId: string) {
    return this.prisma.postcard.findMany({
      where: { fromId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        from: { select: { id: true, name: true, avatar: true } },
        to: { select: { id: true, name: true, avatar: true } },
        event: { select: { id: true, title: true } },
        tags: true,
      },
    });
  }

  create(input: {
    fromId: string;
    toId: string;
    message: string;
    eventId?: string;
    visibility?: 'public' | 'private';
    photoUrl?: string;
    tags?: string[];
  }) {
    return this.prisma.postcard.create({
      data: {
        fromId: input.fromId,
        toId: input.toId,
        message: input.message,
        eventId: input.eventId,
        visibility: input.visibility ?? 'private',
        photoUrl: input.photoUrl ?? '',
        tags: input.tags?.length
          ? { create: input.tags.map((value) => ({ value })) }
          : undefined,
      },
      include: {
        from: { select: { id: true, name: true, avatar: true } },
        to: { select: { id: true, name: true, avatar: true } },
        tags: true,
      },
    });
  }

  getCredits(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { postcardCredits: true },
    });
  }

  async decrementCredits(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { postcardCredits: { decrement: 1 } },
    });
  }

  async delete(id: string) {
    return this.prisma.postcard.delete({ where: { id } });
  }

  async findById(id: string) {
    return this.prisma.postcard.findUnique({ where: { id } });
  }

  adminListAll() {
    return this.prisma.postcard.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        from: { select: { id: true, name: true, avatar: true } },
        to: { select: { id: true, name: true, avatar: true } },
        event: { select: { id: true, title: true } },
        tags: true,
      },
    });
  }

  adminDelete(id: string) {
    return this.prisma.postcard.delete({ where: { id } });
  }
}
