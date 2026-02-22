type EntityMap = Record<string, unknown>;

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

function getApiUrl(path: string): string {
  if (!apiBaseUrl) {
    return path;
  }

  const normalizedBase = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
  return `${normalizedBase}${path}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(path), init);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message ?? '请求失败，请稍后重试');
  }
  return data as T;
}

function toQueryString(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    params.set(key, String(value));
  }
  const raw = params.toString();
  return raw ? `?${raw}` : '';
}

export type RecommendationCategory = 'movie' | 'recipe' | 'music' | 'place';

export async function searchEvents(keyword: string) {
  return requestJson<{ items: EntityMap[] }>(`/api/search/events${toQueryString({ q: keyword })}`);
}

export async function createSmallGroupEvent(payload: {
  title: string;
  hostId: string;
  location: string;
  startsAt: string;
  capacity: number;
  description?: string;
}) {
  return requestJson<EntityMap>('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      tag: 'small-group',
      phase: 'open',
      isWeeklyLotteryEvent: true,
    }),
  });
}

export async function getEventById(id: string) {
  return requestJson<EntityMap>(`/api/events/${id}`);
}

export async function signupEvent(eventId: string, userId: string) {
  return requestJson<EntityMap>('/api/event-signups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, userId, status: 'accepted' }),
  });
}

export async function searchProposals(keyword: string) {
  return requestJson<{ items: EntityMap[] }>(`/api/search/proposals${toQueryString({ q: keyword })}`);
}

export async function createProposal(payload: {
  title: string;
  description: string;
  authorId: string;
}) {
  return requestJson<EntityMap>('/api/proposals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function searchRecommendations(category: RecommendationCategory, keyword: string) {
  return requestJson<{ items: EntityMap[] }>(
    `/api/search/recommendations${toQueryString({ category, q: keyword })}`,
  );
}

export async function createRecommendation(payload: {
  category: RecommendationCategory;
  title: string;
  description: string;
  sourceUrl?: string;
  tags?: string[];
  authorId: string;
}) {
  return requestJson<EntityMap>('/api/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getRecommendationById(id: string) {
  return requestJson<EntityMap>(`/api/recommendations/${id}`);
}
