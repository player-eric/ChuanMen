import type { PrismaClient } from '@prisma/client';

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        preferences: true,
        socialTitles: true,
      },
    });
  }

  getById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        preferences: true,
      },
    });
  }

  getByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        preferences: true,
      },
    });
  }

  create(input: {
    name: string;
    email: string;
    avatar?: string;
    bio?: string;
    city?: string;
  }) {
    return this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        avatar: input.avatar ?? '',
        bio: input.bio ?? '',
        city: input.city ?? '',
      },
    });
  }

  // v2.1: Create applicant from /apply form
  createApplicant(input: {
    displayName: string;
    location: string;
    bio: string;
    selfAsFriend: string;
    idealFriend: string;
    participationPlan: string;
    email: string;
    wechatId: string;
    referralSource?: string;
    coverImageUrl?: string;
  }) {
    return this.prisma.user.create({
      data: {
        name: input.displayName,
        email: input.email,
        bio: input.bio,
        location: input.location,
        selfAsFriend: input.selfAsFriend,
        idealFriend: input.idealFriend,
        participationPlan: input.participationPlan,
        wechatId: input.wechatId,
        referralSource: input.referralSource ?? '',
        coverImageUrl: input.coverImageUrl ?? '',
        userStatus: 'applicant',
      },
    });
  }

  // v2.1: Update user settings
  updateSettings(
    userId: string,
    data: {
      name?: string;
      avatar?: string;
      location?: string;
      bio?: string;
      selfAsFriend?: string;
      idealFriend?: string;
      participationPlan?: string;
      email?: string;
      coverImageUrl?: string;
      defaultHouseRules?: string;
      homeAddress?: string;
      hideEmail?: boolean;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      include: { preferences: true },
    });
  }

  // Upsert notification preferences
  updatePreferences(userId: string, data: Record<string, unknown>) {
    return this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...data } as any,
      update: data as any,
    });
  }

  // Admin: update any user fields (role, userStatus, name, etc.)
  adminUpdate(userId: string, data: Record<string, unknown>) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      include: {
        preferences: true,
        socialTitles: true,
        operatorRoles: true,
      },
    });
  }

  // Admin: list users including operator roles for admin page
  listWithDetails() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        preferences: true,
        socialTitles: true,
        operatorRoles: true,
        _count: {
          select: {
            hostedEvents: true,
            eventSignups: true,
          },
        },
      },
    });
  }

  // Admin: delete user
  async deleteUser(userId: string) {
    // Delete related records first, then the user
    await this.prisma.$transaction([
      this.prisma.userPreference.deleteMany({ where: { userId } }),
      this.prisma.userOperatorRole.deleteMany({ where: { userId } }),
      this.prisma.userSocialTitle.deleteMany({ where: { userId } }),
      this.prisma.movieVote.deleteMany({ where: { userId } }),
      this.prisma.proposalVote.deleteMany({ where: { userId } }),
      this.prisma.like.deleteMany({ where: { userId } }),
      this.prisma.comment.deleteMany({ where: { authorId: userId } }),
      this.prisma.eventSignup.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
    return { ok: true };
  }

  // Admin: set operator roles for a user
  async setOperatorRoles(userId: string, roles: string[]) {
    await this.prisma.userOperatorRole.deleteMany({ where: { userId } });
    if (roles.length > 0) {
      await this.prisma.userOperatorRole.createMany({
        data: roles.map((value) => ({ userId, value })),
      });
    }
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { operatorRoles: true },
    });
  }
}
