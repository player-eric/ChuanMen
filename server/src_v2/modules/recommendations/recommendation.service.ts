import { z } from 'zod';
import type { RecommendationCategory } from '@prisma/client';
import type { RecommendationRepository } from './recommendation.repository.js';

const listSchema = z.object({
  category: z.enum(['movie', 'recipe', 'music', 'place', 'book', 'external_event']).optional(),
});

const createSchema = z.object({
  category: z.enum(['movie', 'recipe', 'music', 'place', 'book', 'external_event']),
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

  getById(id: string) {
    return this.repository.getById(id);
  }

  search(query: unknown) {
    const parsed = z.object({
      q: z.string().default(''),
      category: z.enum(['movie', 'recipe', 'music', 'place', 'book', 'external_event']).optional(),
    }).parse(query);
    return this.repository.search(parsed.q, parsed.category as RecommendationCategory | undefined);
  }

  createRecommendation(input: unknown) {
    const data = createSchema.parse(input);
    return this.repository.create(data);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }

  update(id: string, input: unknown) {
    const data = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      sourceUrl: z.string().optional(),
      coverUrl: z.string().optional(),
    }).parse(input);
    return this.repository.update(id, data);
  }

  async searchExternalBooks(query: string) {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { items: [], source: 'openlibrary', error: `Open Library ${res.status}` };

    const data = await res.json() as { docs?: any[] };
    const items = (data.docs ?? []).map((b: any) => ({
      openLibraryKey: b.key ?? '',
      title: b.title ?? '',
      authors: (b.author_name ?? []).join(', '),
      year: b.first_publish_year ? String(b.first_publish_year) : '',
      description: '',
      cover: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : '',
      pageCount: b.number_of_pages_median ?? null,
      rating: b.ratings_average ? Number(b.ratings_average.toFixed(1)) : null,
      infoLink: b.key ? `https://openlibrary.org${b.key}` : '',
    }));
    return { items, source: 'openlibrary' };
  }

  async searchExternalMusic(query: string) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=10`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { items: [], source: 'itunes', error: `iTunes ${res.status}` };

    const data = await res.json() as { results?: any[] };
    // Deduplicate by collectionId (album) to avoid showing same album multiple times
    const seen = new Set<number>();
    const items: any[] = [];
    for (const t of (data.results ?? [])) {
      const key = t.collectionId ?? t.trackId;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        itunesId: t.trackId ?? t.collectionId ?? 0,
        title: t.trackName ?? t.collectionName ?? '',
        artist: t.artistName ?? '',
        album: t.collectionName ?? '',
        year: t.releaseDate ? t.releaseDate.slice(0, 4) : '',
        cover: t.artworkUrl100?.replace('100x100', '200x200') ?? '',
        previewUrl: t.previewUrl ?? '',
        infoLink: t.trackViewUrl ?? t.collectionViewUrl ?? '',
      });
    }
    return { items, source: 'itunes' };
  }

}
