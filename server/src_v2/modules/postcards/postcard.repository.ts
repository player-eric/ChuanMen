import type { PrismaClient } from '@prisma/client';
import { USER_BRIEF_SELECT } from '../../utils/prisma-selects.js';

export class PostcardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listReceived(userId: string) {
    return this.prisma.postcard.findMany({
      where: { toId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        from: { select: USER_BRIEF_SELECT },
        to: { select: USER_BRIEF_SELECT },
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
        from: { select: USER_BRIEF_SELECT },
        to: { select: USER_BRIEF_SELECT },
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
        visibility: input.visibility ?? 'public',
        photoUrl: input.photoUrl ?? '',
        tags: input.tags?.length
          ? { create: input.tags.map((value) => ({ value })) }
          : undefined,
      },
      include: {
        from: { select: USER_BRIEF_SELECT },
        to: { select: USER_BRIEF_SELECT },
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
   * Find people the user co-attended events with, grouped by event (most recent first).
   */
  async listEligibleRecipients(userId: string) {
    // "Participated" means either:
    //   a) participated flag is true (legacy), OR
    //   b) status is 'accepted' in an event that has already started
    const participatedFilter = {
      OR: [
        { participated: true },
        { status: 'accepted' as const, event: { startsAt: { lte: new Date() } } },
      ],
    };

    // Only look at events from the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Get events the user participated in (via signup)
    const mySignups = await this.prisma.eventSignup.findMany({
      where: { userId, event: { startsAt: { gte: sixMonthsAgo } }, ...participatedFilter },
      select: { eventId: true, event: { select: { id: true, title: true, startsAt: true } } },
      orderBy: { event: { startsAt: 'desc' } },
    });

    // Also include events the user hosted or co-hosted (they don't have EventSignup records)
    const hostedEvents = await this.prisma.event.findMany({
      where: {
        startsAt: { gte: sixMonthsAgo, lte: new Date() },
        OR: [{ hostId: userId }, { coHosts: { some: { userId } } }],
      },
      select: { id: true, title: true, startsAt: true },
      orderBy: { startsAt: 'desc' },
    });

    // Merge and deduplicate event IDs
    const eventMap = new Map<string, { id: string; title: string; startsAt: Date | null }>();
    for (const e of hostedEvents) eventMap.set(e.id, e);
    for (const s of mySignups) eventMap.set(s.eventId, s.event);
    if (!eventMap.size) return [];

    const myEventIds = Array.from(eventMap.keys());

    // Find other users who participated in those events
    const coSignups = await this.prisma.eventSignup.findMany({
      where: {
        eventId: { in: myEventIds },
        userId: { not: userId },
        ...participatedFilter,
      },
      select: {
        userId: true,
        eventId: true,
        user: { select: USER_BRIEF_SELECT },
      },
    });

    // Also include hosts and co-hosts of events (they don't have EventSignup records)
    const eventsWithHosts = await this.prisma.event.findMany({
      where: { id: { in: myEventIds } },
      select: {
        id: true,
        hostId: true,
        host: { select: USER_BRIEF_SELECT },
        coHosts: { select: { userId: true, user: { select: USER_BRIEF_SELECT } } },
      },
    });
    for (const e of eventsWithHosts) {
      if (e.hostId !== userId) {
        coSignups.push({ userId: e.hostId, eventId: e.id, user: e.host });
      }
      for (const ch of e.coHosts) {
        if (ch.userId !== userId) {
          coSignups.push({ userId: ch.userId, eventId: e.id, user: ch.user });
        }
      }
    }

    // Build per-event people map
    const eventPeopleMap = new Map<string, Set<string>>();
    const userMap = new Map<string, { id: string; name: string; avatar: string | null }>();
    for (const s of coSignups) {
      if (!eventPeopleMap.has(s.eventId)) eventPeopleMap.set(s.eventId, new Set());
      eventPeopleMap.get(s.eventId)!.add(s.userId);
      if (!userMap.has(s.userId)) userMap.set(s.userId, { id: s.user.id, name: s.user.name, avatar: s.user.avatar });
    }

    // Build grouped result, ordered by event date desc
    const sortedEvents = Array.from(eventMap.values()).sort((a, b) => {
      const ta = a.startsAt?.getTime() ?? 0;
      const tb = b.startsAt?.getTime() ?? 0;
      return tb - ta;
    });
    const events: { eventId: string; title: string; startsAt: string | null; people: { id: string; name: string; avatar: string | null }[] }[] = [];
    for (const evt of sortedEvents) {
      const peopleIds = eventPeopleMap.get(evt.id);
      if (!peopleIds?.size) continue;
      events.push({
        eventId: evt.id,
        title: evt.title,
        startsAt: evt.startsAt?.toISOString() ?? null,
        people: Array.from(peopleIds).map((uid) => userMap.get(uid)!).filter(Boolean),
      });
    }
    return events;
  }

  adminListAll() {
    return this.prisma.postcard.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        from: { select: USER_BRIEF_SELECT },
        to: { select: USER_BRIEF_SELECT },
        event: { select: { id: true, title: true } },
        tags: true,
      },
    });
  }

  adminDelete(id: string) {
    return this.prisma.postcard.delete({ where: { id } });
  }
}
