import { fetchRecommendations, fetchRecommendationById } from '@/mock/api';

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
  if (data === null) {
    throw new Error('Invalid JSON response');
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

/* ═══════════════════════════════════════════════════════════════
   Media / S3 upload API
   ═══════════════════════════════════════════════════════════════ */

export type MediaCategory =
  | 'avatar'
  | 'cover'
  | 'event-image'
  | 'event-recap'
  | 'poster'
  | 'postcard'
  | 'recommendation'
  | 'general';

export interface MediaAsset {
  id: string;
  key: string;
  ownerId: string | null;
  contentType: string;
  fileSize: number;
  status: 'pending' | 'uploaded';
  url: string;
  createdAt: string;
  updatedAt: string;
}

interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  asset: MediaAsset;
}

/**
 * Step 1 — Request a presigned S3 upload URL from the server.
 */
export async function requestPresignedUrl(opts: {
  category: MediaCategory;
  contentType: string;
  fileSize: number;
  ownerId?: string;
  fileName?: string;
}): Promise<PresignResponse> {
  return requestJson<PresignResponse>('/api/media/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
}

/**
 * Step 2 — Upload the file directly to S3 using the presigned URL.
 */
export async function uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`S3 upload failed: ${res.status} ${res.statusText}`);
  }
}

/**
 * Step 3 — Confirm the upload so the server marks the asset as "uploaded".
 */
export async function confirmMediaUpload(assetId: string): Promise<{ asset: MediaAsset }> {
  return requestJson<{ asset: MediaAsset }>('/api/media/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetId }),
  });
}

/**
 * Delete a media asset (and its S3 object).
 */
export async function deleteMediaAsset(assetId: string): Promise<void> {
  await requestJson<{ success: boolean }>(`/api/media/${assetId}`, {
    method: 'DELETE',
  });
}

/**
 * Convenience: presign → upload → confirm in one call.
 * Returns the public URL of the uploaded file.
 */
export async function uploadMedia(
  file: File,
  category: MediaCategory,
  ownerId?: string,
): Promise<{ publicUrl: string; asset: MediaAsset }> {
  const { uploadUrl, publicUrl, asset } = await requestPresignedUrl({
    category,
    contentType: file.type,
    fileSize: file.size,
    ownerId,
    fileName: file.name,
  });

  await uploadFileToS3(uploadUrl, file);
  const { asset: confirmed } = await confirmMediaUpload(asset.id);

  return { publicUrl, asset: confirmed };
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
  try {
    return await requestJson<{ items: EntityMap[] }>(
      `/api/search/recommendations${toQueryString({ category, q: keyword })}`,
    );
  } catch {
    // Fallback to local mock data (CSR / Amplify without backend)
    return fetchRecommendations(category, keyword);
  }
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
  try {
    return await requestJson<EntityMap>(`/api/recommendations/${id}`);
  } catch {
    // Fallback to local mock data (CSR / Amplify without backend)
    const item = await fetchRecommendationById(id);
    if (!item) throw new Error('未找到该推荐');
    return item;
  }
}
