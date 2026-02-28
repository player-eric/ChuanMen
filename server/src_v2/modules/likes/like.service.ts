import { z } from 'zod';
import type { LikeRepository } from './like.repository.js';
import type { InteractionEntityType } from '@prisma/client';

const entityTypes: [string, ...string[]] = ['event', 'movie', 'proposal', 'postcard', 'seed', 'seed_update', 'discussion', 'comment', 'announcement', 'user', 'recommendation'];

const toggleSchema = z.object({
  entityType: z.enum(entityTypes),
  entityId: z.string().min(1),
  userId: z.string().min(1),
});

export class LikeService {
  constructor(private readonly repository: LikeRepository) {}

  list(entityType: string, entityId: string) {
    return this.repository.listByEntity(entityType as InteractionEntityType, entityId);
  }

  toggle(input: unknown) {
    const data = toggleSchema.parse(input);
    return this.repository.toggle(data.entityType as InteractionEntityType, data.entityId, data.userId);
  }
}
