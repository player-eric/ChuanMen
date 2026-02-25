import { z } from 'zod';
import type { TitleRuleRepository } from './title-rule.repository.js';

const createSchema = z.object({
  emoji: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().default(''),
  stampEmoji: z.string().min(1),
  threshold: z.number().int().positive().optional().default(3),
});

const updateSchema = z.object({
  emoji: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  stampEmoji: z.string().min(1).optional(),
  threshold: z.number().int().positive().optional(),
});

export class TitleRuleService {
  constructor(private readonly repository: TitleRuleRepository) {}

  list() { return this.repository.list(); }
  getById(id: string) { return this.repository.getById(id); }

  create(input: unknown) {
    const data = createSchema.parse(input);
    return this.repository.create(data);
  }

  update(id: string, input: unknown) {
    const data = updateSchema.parse(input);
    return this.repository.update(id, data);
  }

  delete(id: string) { return this.repository.delete(id); }

  holdersCount() { return this.repository.holdersCount(); }

  listMembersWithTitles() { return this.repository.listMembersWithTitles(); }

  grantTitle(userId: string, value: string) {
    return this.repository.grantTitle(userId, value);
  }

  revokeTitle(userId: string, value: string) {
    return this.repository.revokeTitle(userId, value);
  }
}
