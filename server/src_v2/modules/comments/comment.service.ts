import { z } from 'zod';
import type { CommentRepository } from './comment.repository.js';
import type { InteractionEntityType } from '@prisma/client';

const entityTypes: [string, ...string[]] = ['event', 'movie', 'proposal', 'postcard', 'seed', 'seed_update', 'discussion', 'comment', 'announcement', 'recommendation'];

const createSchema = z.object({
  entityType: z.enum(entityTypes),
  entityId: z.string().min(1),
  authorId: z.string().min(1),
  content: z.string().min(1),
  parentCommentId: z.string().optional(),
});

export class CommentService {
  constructor(private readonly repository: CommentRepository) {}

  list(entityType: string, entityId: string) {
    return this.repository.listByEntity(entityType as InteractionEntityType, entityId);
  }

  create(input: unknown) {
    const data = createSchema.parse(input);
    return this.repository.create(data as any);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }

  adminListAll() {
    return this.repository.adminListAll();
  }
}
