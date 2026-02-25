import { z } from 'zod';
import type { PostcardRepository } from './postcard.repository.js';

const createPostcardSchema = z.object({
  fromId: z.string().min(1),
  toId: z.string().min(1),
  message: z.string().min(1),
  eventId: z.string().optional(),
  visibility: z.enum(['public', 'private']).optional(),
  photoUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export class PostcardService {
  constructor(private readonly repository: PostcardRepository) {}

  listReceived(userId: string) {
    return this.repository.listReceived(userId);
  }

  listSent(userId: string) {
    return this.repository.listSent(userId);
  }

  async create(input: unknown) {
    const data = createPostcardSchema.parse(input);
    // Decrement credits
    const creditInfo = await this.repository.getCredits(data.fromId);
    if (!creditInfo || creditInfo.postcardCredits <= 0) {
      throw new Error('明信片额度不足');
    }
    const postcard = await this.repository.create(data);
    await this.repository.decrementCredits(data.fromId);
    return postcard;
  }

  getCredits(userId: string) {
    return this.repository.getCredits(userId);
  }

  async delete(id: string, userId: string) {
    const postcard = await this.repository.findById(id);
    if (!postcard) throw new Error('感谢卡不存在');
    if (postcard.fromId !== userId && postcard.toId !== userId) {
      throw new Error('无权删除此感谢卡');
    }
    return this.repository.delete(id);
  }

  adminListAll() {
    return this.repository.adminListAll();
  }

  adminDelete(id: string) {
    return this.repository.adminDelete(id);
  }
}
