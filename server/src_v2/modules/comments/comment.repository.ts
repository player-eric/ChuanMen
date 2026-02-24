import type { PrismaClient, InteractionEntityType } from '@prisma/client';

export class CommentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listByEntity(entityType: InteractionEntityType, entityId: string) {
    return this.prisma.comment.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
  }

  create(input: {
    entityType: InteractionEntityType;
    entityId: string;
    authorId: string;
    content: string;
    parentCommentId?: string;
  }) {
    return this.prisma.comment.create({
      data: input,
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
  }

  delete(id: string) {
    return this.prisma.comment.delete({ where: { id } });
  }
}
