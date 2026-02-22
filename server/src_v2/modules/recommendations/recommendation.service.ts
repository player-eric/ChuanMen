import { z } from 'zod';
import type { RecommendationCategory } from '@prisma/client';
import type { RecommendationRepository } from './recommendation.repository.js';

const listSchema = z.object({
  category: z.enum(['movie', 'recipe', 'music', 'place']).optional(),
});

const createSchema = z.object({
  category: z.enum(['movie', 'recipe', 'music', 'place']),
  title: z.string().min(1),
  authorId: z.string().min(1),
  description: z.string().optional(),
  sourceUrl: z.string().optional(),
  coverUrl: z.string().optional(),
  status: z.enum(['candidate', 'featured', 'archived']).optional(),
  tags: z.array(z.string().min(1)).optional(),
});

export class RecommendationService {
  constructor(private readonly repository: RecommendationRepository) {}

  listRecommendations(query: unknown) {
    const parsed = listSchema.parse(query);
    return this.repository.list(parsed.category as RecommendationCategory | undefined);
  }

  createRecommendation(input: unknown) {
    const data = createSchema.parse(input);
    return this.repository.create(data);
  }
}
