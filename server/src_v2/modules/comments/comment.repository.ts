import type { PrismaClient, InteractionEntityType } from '@prisma/client';
import { USER_BRIEF_SELECT } from '../../utils/prisma-selects.js';

export class CommentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listByEntity(entityType: InteractionEntityType, entityId: string) {
    return this.prisma.comment.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: USER_BRIEF_SELECT } },
    });
  }

  create(input: {
    entityType: InteractionEntityType;
    entityId: string;
    authorId: string;
    content: string;
    parentCommentId?: string;
    mentionedUserIds?: string[];
  }) {
    return this.prisma.comment.create({
      data: input,
      include: { author: { select: USER_BRIEF_SELECT } },
    });
  }

  delete(id: string) {
    return this.prisma.comment.delete({ where: { id } });
  }

  adminListAll() {
    return this.prisma.comment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { author: { select: USER_BRIEF_SELECT } },
    });
  }
}
