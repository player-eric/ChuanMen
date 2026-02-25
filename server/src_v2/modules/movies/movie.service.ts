import { z } from 'zod';
import type { MovieRepository } from './movie.repository.js';
import { env } from '../../config/env.js';

const voteSchema = z.object({ userId: z.string().min(1) });

const createSchema = z.object({
  title: z.string().min(1),
  year: z.number().int().optional(),
  director: z.string().optional(),
  poster: z.string().optional(),
  doubanUrl: z.string().optional(),
  doubanRating: z.number().optional(),
  synopsis: z.string().optional(),
  recommendedById: z.string().min(1),
});

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

  create(input: unknown) {
    const data = createSchema.parse(input);
    return this.repository.create(data);
  }

  async searchExternal(query: string) {
    const apiKey = env.TMDB_API_KEY;
    if (!apiKey) return { items: [], source: 'tmdb', error: 'TMDB_API_KEY not configured' };

    const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=zh-CN&page=1`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { items: [], source: 'tmdb', error: `TMDB ${res.status}` };

    const data = await res.json() as { results: any[] };
    const items = (data.results ?? []).slice(0, 10).map((r: any) => ({
      tmdbId: r.id,
      title: r.title ?? '',
      originalTitle: r.original_title ?? '',
      year: r.release_date ? r.release_date.slice(0, 4) : '',
      overview: r.overview ?? '',
      poster: r.poster_path ? `https://image.tmdb.org/t/p/w200${r.poster_path}` : '',
      rating: r.vote_average ? Number(r.vote_average.toFixed(1)) : null,
    }));
    return { items, source: 'tmdb' };
  }
}
