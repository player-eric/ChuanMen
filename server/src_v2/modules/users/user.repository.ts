import type { PrismaClient } from '@prisma/client';

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        preferences: true,
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
    });
  }
}
