import { z } from 'zod';
import type { ProposalRepository } from './proposal.repository.js';

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  authorId: z.string().min(1),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['discussing', 'scheduled', 'completed', 'cancelled']).optional(),
});

const voteSchema = z.object({
  userId: z.string().min(1),
});

export class ProposalService {
  constructor(private readonly repository: ProposalRepository) {}

  list() { return this.repository.list(); }

  getById(id: string) { return this.repository.getById(id); }

  create(input: unknown) {
    return this.repository.create(createSchema.parse(input));
  }

  update(id: string, input: unknown) {
    return this.repository.update(id, updateSchema.parse(input));
  }

  toggleVote(proposalId: string, input: unknown) {
    const { userId } = voteSchema.parse(input);
    return this.repository.toggleVote(proposalId, userId);
  }

  search(keyword: string) { return this.repository.search(keyword); }

  delete(id: string) { return this.repository.delete(id); }
}
