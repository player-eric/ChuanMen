import type { PrismaClient, InteractionEntityType } from '@prisma/client';

export class LikeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listByEntity(entityType: InteractionEntityType, entityId: string) {
    return this.prisma.like.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async toggle(entityType: InteractionEntityType, entityId: string, userId: string) {
    const existing = await this.prisma.like.findUnique({
      where: { entityType_entityId_userId: { entityType, entityId, userId } },
    });
    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
      return { liked: false };
    }
    await this.prisma.like.create({ data: { entityType, entityId, userId } });
    return { liked: true };
  }

  countByEntity(entityType: InteractionEntityType, entityId: string) {
    return this.prisma.like.count({ where: { entityType, entityId } });
  }
}
