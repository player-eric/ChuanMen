import type { PrismaClient, EventStatus, EventPhase, EventSignupStatus } from '@prisma/client';

/** Statuses that "occupy" a seat (count toward capacity). */
const OCCUPYING_STATUSES: EventSignupStatus[] = ['accepted', 'invited', 'offered'];

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
          where: { status: { notIn: ['cancelled', 'declined', 'rejected'] } },
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        screenedMovies: {
          include: { movie: { select: { id: true, title: true, poster: true, _count: { select: { votes: true } } } } },
          take: 1,
        },
        recommendations: {
          include: {
            recommendation: { select: { id: true, title: true, category: true, coverUrl: true, voteCount: true } },
            linkedBy: { select: { id: true, name: true } },
          },
        },
        tasks: {
          include: { claimedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' as const },
        },
        _count: { select: { signups: { where: { status: { notIn: ['cancelled', 'declined', 'rejected'] } } } } },
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
        screenedMovies: {
          include: { movie: { select: { id: true, title: true, poster: true, _count: { select: { votes: true } } } } },
        },
        recommendations: {
          include: {
            recommendation: { select: { id: true, title: true, category: true, coverUrl: true, voteCount: true } },
            linkedBy: { select: { id: true, name: true } },
          },
        },
        tasks: {
          include: { claimedBy: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
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
    phase?: 'invite' | 'open' | 'ended';
    publishAt?: Date;
    recSelectionMode?: string;
    recCategories?: string[];
    isPrivate?: boolean;
    isWeeklyLotteryEvent?: boolean;
    isHomeEvent?: boolean;
    houseRules?: string;
    locationPrivate?: boolean;
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
        phase: input.phase,
        publishAt: input.publishAt,
        recSelectionMode: input.recSelectionMode,
        recCategories: input.recCategories,
        isPrivate: input.isPrivate ?? false,
        isWeeklyLotteryEvent: input.isWeeklyLotteryEvent ?? false,
        isHomeEvent: input.isHomeEvent ?? false,
        houseRules: input.houseRules ?? '',
        locationPrivate: input.locationPrivate ?? false,
      },
    });
  }

  update(id: string, data: {
    title?: string;
    description?: string;
    titleImageUrl?: string;
    location?: string;
    capacity?: number;
    status?: EventStatus;
    pinned?: boolean;
    phase?: EventPhase;
    startsAt?: Date;
    endsAt?: Date;
    recSelectionMode?: string;
    recCategories?: string[];
    isPrivate?: boolean;
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

  /** Touch updatedAt so the event bubbles up in the feed. */
  private touchUpdatedAt(eventId: string) {
    return this.prisma.event.update({ where: { id: eventId }, data: { updatedAt: new Date() } }).catch(() => {});
  }

  /** Count seats occupied (accepted + invited + offered). */
  private async countOccupying(eventId: string): Promise<number> {
    return this.prisma.eventSignup.count({
      where: { eventId, status: { in: OCCUPYING_STATUSES } },
    });
  }

  /** Count co-hosts for an event. */
  private async countCoHosts(eventId: string): Promise<number> {
    return this.prisma.eventCoHost.count({ where: { eventId } });
  }

  /**
   * Available signup slots = capacity - 1 (host) - coHostCount - occupyingSignups.
   * Returns true if the event is full.
   */
  private async isFull(eventId: string, capacity: number): Promise<boolean> {
    const [occupied, coHostCount] = await Promise.all([
      this.countOccupying(eventId),
      this.countCoHosts(eventId),
    ]);
    const hostSlots = 1 + coHostCount; // host + co-hosts
    return occupied + hostSlots >= capacity;
  }

  // ── Co-host management ──

  async addCoHost(eventId: string, userId: string) {
    return this.prisma.eventCoHost.create({
      data: { eventId, userId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async removeCoHost(eventId: string, userId: string) {
    return this.prisma.eventCoHost.delete({
      where: { eventId_userId: { eventId, userId } },
    });
  }

  /**
   * Signup with capacity awareness.
   * Returns the signup record plus `wasWaitlisted` flag.
   */
  async signup(eventId: string, userId: string) {
    const event = await this.prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      select: { capacity: true, waitlistEnabled: true, phase: true, status: true },
    });

    const isEnded = event.phase === 'ended' || event.status === 'completed';

    // Check if user already has an occupying signup (invited/offered) — just accept it
    const existing = await this.prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { status: true },
    });
    if (existing && OCCUPYING_STATUSES.includes(existing.status)) {
      const signup = await this.prisma.eventSignup.update({
        where: { eventId_userId: { eventId, userId } },
        data: { status: 'accepted', ...(isEnded ? { participated: true } : {}) },
        include: { user: { select: { id: true, name: true, avatar: true } } },
      });
      return { ...signup, wasWaitlisted: false };
    }

    const full = await this.isFull(eventId, event.capacity);
    let status: EventSignupStatus = 'accepted';
    if (!isEnded && full && event.waitlistEnabled) {
      status = 'waitlist';
    }

    const signup = await this.prisma.eventSignup.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, status, participated: isEnded },
      update: { status, ...(isEnded ? { participated: true } : {}) },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    this.touchUpdatedAt(eventId);
    return { ...signup, wasWaitlisted: status === 'waitlist' };
  }

  async inviteUsers(eventId: string, userIds: string[], invitedById: string) {
    const results = [];
    for (const userId of userIds) {
      const existing = await this.prisma.eventSignup.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });
      // Skip if already accepted/offered (don't downgrade to invited)
      if (existing && ['accepted', 'offered'].includes(existing.status)) {
        const signup = await this.prisma.eventSignup.findUnique({
          where: { eventId_userId: { eventId, userId } },
          include: { user: { select: { id: true, name: true, avatar: true } } },
        });
        if (signup) results.push(signup);
        continue;
      }
      const signup = await this.prisma.eventSignup.upsert({
        where: { eventId_userId: { eventId, userId } },
        create: { eventId, userId, invitedById, status: 'invited', invitedAt: new Date() },
        update: { invitedById, status: 'invited', invitedAt: new Date() },
        include: { user: { select: { id: true, name: true, avatar: true } } },
      });
      results.push(signup);
    }
    return results;
  }

  /**
   * Cancel a signup and auto-promote the next waitlisted person if there's room.
   * Returns { cancelled, promoted } where promoted is the signup that got offered (or null).
   */
  async cancelSignup(eventId: string, userId: string) {
    const cancelled = await this.prisma.eventSignup.update({
      where: { eventId_userId: { eventId, userId } },
      data: { status: 'cancelled' },
    });

    this.touchUpdatedAt(eventId);
    const promoted = await this.promoteNextWaitlisted(eventId);
    return { cancelled, promoted };
  }

  /**
   * If there is room (occupying + host + coHosts < capacity), promote the earliest waitlisted signup to `offered`.
   * Returns the promoted signup or null.
   */
  async promoteNextWaitlisted(eventId: string) {
    const event = await this.prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      select: { capacity: true, waitlistEnabled: true },
    });
    if (!event.waitlistEnabled) return null;

    const full = await this.isFull(eventId, event.capacity);
    if (full) return null;

    const next = await this.prisma.eventSignup.findFirst({
      where: { eventId, status: 'waitlist' },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!next) return null;

    return this.prisma.eventSignup.update({
      where: { id: next.id },
      data: { status: 'offered', offeredAt: new Date() },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  /** User accepts an offer — offered → accepted */
  async acceptOffer(eventId: string, userId: string) {
    const signup = await this.prisma.eventSignup.findUniqueOrThrow({
      where: { eventId_userId: { eventId, userId } },
    });
    if (signup.status !== 'offered') throw new Error('只有 offered 状态可以接受');
    return this.prisma.eventSignup.update({
      where: { eventId_userId: { eventId, userId } },
      data: { status: 'accepted', respondedAt: new Date() },
    });
  }

  /**
   * User declines an offer — offered → declined, then promote next.
   * Returns { declined, promoted }.
   */
  async declineOffer(eventId: string, userId: string) {
    const signup = await this.prisma.eventSignup.findUniqueOrThrow({
      where: { eventId_userId: { eventId, userId } },
    });
    if (signup.status !== 'offered') throw new Error('只有 offered 状态可以拒绝');
    const declined = await this.prisma.eventSignup.update({
      where: { eventId_userId: { eventId, userId } },
      data: { status: 'declined', respondedAt: new Date() },
    });
    const promoted = await this.promoteNextWaitlisted(eventId);
    return { declined, promoted };
  }

  /** Host directly accepts a waitlisted person (skip 24h offer). */
  async hostApproveWaitlist(eventId: string, userId: string) {
    const signup = await this.prisma.eventSignup.findUniqueOrThrow({
      where: { eventId_userId: { eventId, userId } },
    });
    if (signup.status !== 'waitlist') throw new Error('只有 waitlist 状态可以批准');
    return this.prisma.eventSignup.update({
      where: { eventId_userId: { eventId, userId } },
      data: { status: 'accepted', respondedAt: new Date() },
    });
  }

  /** Host rejects a waitlisted person. */
  async hostRejectWaitlist(eventId: string, userId: string) {
    const signup = await this.prisma.eventSignup.findUniqueOrThrow({
      where: { eventId_userId: { eventId, userId } },
    });
    if (signup.status !== 'waitlist') throw new Error('只有 waitlist 状态可以拒绝');
    return this.prisma.eventSignup.update({
      where: { eventId_userId: { eventId, userId } },
      data: { status: 'rejected', respondedAt: new Date() },
    });
  }

  /** Get waitlist position (1-based) for a user. Returns 0 if not waitlisted. */
  async getWaitlistPosition(eventId: string, userId: string): Promise<number> {
    const waitlisted = await this.prisma.eventSignup.findMany({
      where: { eventId, status: 'waitlist' },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    });
    const idx = waitlisted.findIndex((s) => s.userId === userId);
    return idx >= 0 ? idx + 1 : 0;
  }

  listPast() {
    return this.prisma.event.findMany({
      where: { status: 'completed' },
      orderBy: { startsAt: 'desc' },
      include: {
        host: { select: { id: true, name: true, avatar: true } },
        coHosts: { include: { user: { select: { id: true, name: true } } } },
        _count: { select: { signups: { where: { status: { notIn: ['cancelled', 'declined', 'rejected'] } } } } },
      },
    });
  }

  listCancelled() {
    return this.prisma.event.findMany({
      where: { status: 'cancelled' },
      orderBy: { startsAt: 'desc' },
      include: {
        host: { select: { id: true, name: true, avatar: true } },
        _count: { select: { signups: { where: { status: { notIn: ['cancelled', 'declined', 'rejected'] } } } } },
      },
    });
  }

  delete(id: string) {
    return this.prisma.event.delete({ where: { id } });
  }
}
