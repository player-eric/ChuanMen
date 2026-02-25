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
    eventCtx?: string;
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
        eventCtx: input.eventCtx ?? '',
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

  async updateVisibility(id: string, visibility: 'public' | 'private') {
    return this.prisma.postcard.update({ where: { id }, data: { visibility } });
  }

  /**
   * Find people the user co-attended events with, returning the most recent shared event title.
   */
  async listEligibleRecipients(userId: string) {
    // Get events the user participated in
    const mySignups = await this.prisma.eventSignup.findMany({
      where: { userId, participated: true },
      select: { eventId: true },
    });
    const myEventIds = mySignups.map((s) => s.eventId);
    if (!myEventIds.length) return [];

    // Find other users who participated in those events, with the event info
    const coSignups = await this.prisma.eventSignup.findMany({
      where: {
        eventId: { in: myEventIds },
        userId: { not: userId },
        participated: true,
      },
      select: {
        userId: true,
        user: { select: { id: true, name: true } },
        event: { select: { id: true, title: true, startsAt: true } },
      },
      orderBy: { event: { startsAt: 'desc' } },
    });

    // Deduplicate by user, keeping the most recent shared event
    const seen = new Map<string, { id: string; name: string; eventCtx: string }>();
    for (const s of coSignups) {
      if (seen.has(s.userId)) continue;
      const dateStr = s.event.startsAt
        ? new Date(s.event.startsAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
        : '';
      seen.set(s.userId, {
        id: s.user.id,
        name: s.user.name,
        eventCtx: dateStr ? `${dateStr} ${s.event.title}` : s.event.title,
      });
    }
    return Array.from(seen.values());
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
