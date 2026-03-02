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

/** Extract user IDs from TipTap mention HTML: <span data-type="mention" data-id="userId"> */
function extractMentionIds(html: string): string[] {
  const ids: string[] = [];
  const regex = /data-type="mention"[^>]*data-id="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    ids.push(match[1]);
  }
  // Also try reversed attribute order
  const regex2 = /data-id="([^"]+)"[^>]*data-type="mention"/g;
  while ((match = regex2.exec(html)) !== null) {
    if (!ids.includes(match[1])) ids.push(match[1]);
  }
  return ids;
}

export class CommentService {
  constructor(private readonly repository: CommentRepository) {}

  list(entityType: string, entityId: string) {
    return this.repository.listByEntity(entityType as InteractionEntityType, entityId);
  }

  create(input: unknown) {
    const data = createSchema.parse(input);
    const mentionedUserIds = extractMentionIds(data.content);
    return this.repository.create({
      ...(data as any),
      ...(mentionedUserIds.length > 0 ? { mentionedUserIds } : {}),
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }

  adminListAll() {
    return this.repository.adminListAll();
  }
}

export { extractMentionIds };
