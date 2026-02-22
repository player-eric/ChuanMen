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
}
