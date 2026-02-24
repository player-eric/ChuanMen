import { z } from 'zod';
import type { MovieRepository } from './movie.repository.js';

const voteSchema = z.object({ userId: z.string().min(1) });

export class MovieService {
  constructor(private readonly repository: MovieRepository) {}

  list() { return this.repository.list(); }
  getById(id: string) { return this.repository.getById(id); }
  search(keyword: string) { return this.repository.search(keyword); }
  screened() { return this.repository.screened(); }

  toggleVote(movieId: string, input: unknown) {
    const { userId } = voteSchema.parse(input);
    return this.repository.toggleVote(movieId, userId);
  }
}
