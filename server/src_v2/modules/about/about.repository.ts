import type { PrismaClient } from '@prisma/client';

export class AboutRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getStats() {
    const [memberCount, hostCount, eventCount, oldestEvent] = await Promise.all([
      this.prisma.user.count({ where: { userStatus: 'approved' } }),
      this.prisma.user.count({ where: { hostCount: { gt: 0 } } }),
      this.prisma.event.count(),
      this.prisma.event.findFirst({ orderBy: { startsAt: 'asc' }, select: { startsAt: true } }),
    ]);

    const months = oldestEvent
      ? Math.max(1, Math.ceil((Date.now() - oldestEvent.startsAt.getTime()) / (30 * 24 * 60 * 60 * 1000)))
      : 1;

    return { memberCount, hostCount, eventCount, months };
  }

  getContent(type: string) {
    return this.prisma.aboutContent.findMany({
      where: { type: type as any, published: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  getAnnouncement(id: string) {
    return this.prisma.announcement.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
  }

  listAnnouncements() {
    return this.prisma.announcement.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
  }
}
