type EntityMap = Record<string, unknown>;

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
const isSSR = typeof window === 'undefined';
/** During SSR, Node.js fetch needs an absolute URL; fall back to the co-located API server */
const ssrApiOrigin = 'http://localhost:4000';

function getApiUrl(path: string): string {
  if (apiBaseUrl) {
    const normalizedBase = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
    return `${normalizedBase}${path}`;
  }
  // In SSR (Node.js), relative URLs don't work with fetch — prepend the local API origin
  if (isSSR) {
    return `${ssrApiOrigin}${path}`;
  }
  return path;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(path), init);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const err = new Error(data?.message ?? '请求失败，请稍后重试');
    (err as any).status = response.status;
    throw err;
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

/**
 * Delete a media asset (and its S3 object).
 */
export async function deleteMediaAsset(assetId: string): Promise<void> {
  await requestJson<{ success: boolean }>(`/api/media/${assetId}`, {
    method: 'DELETE',
  });
}

/**
 * Upload a file via the server-side upload endpoint (avoids browser→S3 CORS).
 * Sends the raw file bytes to /api/media/upload with metadata in query params.
 * Returns the public URL of the uploaded file.
 */
export async function uploadMedia(
  file: File,
  category: MediaCategory,
  ownerId?: string,
): Promise<{ publicUrl: string; asset: MediaAsset }> {
  const params = new URLSearchParams({
    category,
    contentType: file.type,
    fileSize: String(file.size),
  });
  if (ownerId) params.set('ownerId', ownerId);

  const arrayBuffer = await file.arrayBuffer();
  const response = await fetch(getApiUrl(`/api/media/upload?${params}`), {
    method: 'POST',
    headers: { 'Content-Type': file.type },
    body: arrayBuffer,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message ?? '上传失败');
  }
  return data as { publicUrl: string; asset: MediaAsset };
}

export type RecommendationCategory = 'movie' | 'book' | 'recipe' | 'music' | 'place' | 'external_event';

/* ═══════════════════════════════════════════════════════════════
   User lookup API
   ═══════════════════════════════════════════════════════════════ */

export async function getUserByEmail(email: string) {
  return requestJson<{ id: string; name: string; email: string; avatar?: string; bio?: string; role?: string; location?: string; [k: string]: unknown }>(
    `/api/users/by-email/${encodeURIComponent(email)}`,
  );
}

export async function searchEvents(keyword: string) {
  return requestJson<{ items: EntityMap[] }>(`/api/events${toQueryString({ q: keyword })}`);
}

export async function createEvent(payload: {
  title: string;
  hostId: string;
  location: string;
  startsAt: string;
  capacity: number;
  description?: string;
  tags?: string[];
  isWeeklyLotteryEvent?: boolean;
  phase?: 'invite' | 'open' | 'ended';
  publishAt?: string;
  recSelectionMode?: string;
  recCategories?: string[];
  isPrivate?: boolean;
  proposalId?: string;
  tasks?: { role: string; description?: string }[];
}) {
  return requestJson<EntityMap>('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function inviteToEvent(eventId: string, userIds: string[], invitedById: string) {
  return requestJson<{ ok: boolean; signups: EntityMap[] }>(`/api/events/${eventId}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIds, invitedById }),
  });
}

export async function getEventById(id: string) {
  return requestJson<EntityMap>(`/api/events/${id}`);
}

export async function signupEvent(eventId: string, userId: string) {
  return requestJson<EntityMap & { wasWaitlisted?: boolean }>(`/api/events/${eventId}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

export async function searchProposals(keyword: string) {
  return requestJson<{ items: EntityMap[] }>(`/api/proposals/search${toQueryString({ q: keyword })}`);
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
    `/api/recommendations/search${toQueryString({ category, q: keyword })}`,
  );
}

export async function createRecommendation(payload: {
  category: RecommendationCategory;
  title: string;
  description: string;
  sourceUrl?: string;
  coverUrl?: string;
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

export interface ExternalBookResult {
  openLibraryKey: string;
  title: string;
  authors: string;
  year: string;
  description: string;
  cover: string;
  pageCount: number | null;
  rating: number | null;
  infoLink: string;
}

export async function searchExternalBooks(query: string) {
  return requestJson<{ items: ExternalBookResult[]; source: string }>(`/api/recommendations/search-external${toQueryString({ q: query, category: 'book' })}`);
}

export interface ExternalMusicResult {
  itunesId: number;
  title: string;
  artist: string;
  album: string;
  year: string;
  cover: string;
  previewUrl: string;
  infoLink: string;
}

export async function searchExternalMusic(query: string) {
  return requestJson<{ items: ExternalMusicResult[]; source: string }>(`/api/recommendations/search-external${toQueryString({ q: query, category: 'music' })}`);
}

export async function toggleRecommendationVote(recommendationId: string, userId: string) {
  return requestJson<{ voted: boolean; voteCount?: number }>(`/api/recommendations/${recommendationId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

/* ═══════════════════════════════════════════════════════════════
   User Settings API
   ═══════════════════════════════════════════════════════════════ */

export interface UserSettingsPayload {
  name?: string;
  avatar?: string;
  location?: string;
  bio?: string;
  selfAsFriend?: string;
  idealFriend?: string;
  participationPlan?: string;
  email?: string;
  coverImageUrl?: string;
  defaultHouseRules?: string;
  homeAddress?: string;
  hideEmail?: boolean;
  birthday?: string;
  hideBirthday?: boolean;
  emailState?: 'active' | 'weekly' | 'stopped' | 'unsubscribed';
  notifyEvents?: boolean;
  notifyCards?: boolean;
  notifyOps?: boolean;
  notifyAnnounce?: boolean;
}

export async function updateUserSettings(userId: string, payload: UserSettingsPayload) {
  return requestJson<{ ok: boolean; user: EntityMap }>('/api/users/me/settings', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    },
    body: JSON.stringify(payload),
  });
}

/* ═══════════════════════════════════════════════════════════════
   Event API — PATCH + photo management
   ═══════════════════════════════════════════════════════════════ */

export async function updateEvent(eventId: string, payload: {
  title?: string;
  description?: string;
  titleImageUrl?: string;
  location?: string;
  capacity?: number;
  status?: string;
  pinned?: boolean;
  phase?: string;
  startsAt?: string;
  endsAt?: string;
  recSelectionMode?: string;
  recCategories?: string[];
  isPrivate?: boolean;
}) {
  return requestJson<{ ok: boolean; event: EntityMap }>(`/api/events/${eventId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function addEventRecapPhoto(eventId: string, photoUrl: string) {
  return requestJson<{ ok: boolean; event: EntityMap }>(`/api/events/${eventId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoUrl }),
  });
}

export async function removeEventRecapPhoto(eventId: string, photoUrl: string) {
  return requestJson<{ ok: boolean; event: EntityMap }>(`/api/events/${eventId}/photos`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoUrl }),
  });
}

export async function linkEventRecommendation(eventId: string, recommendationId: string, linkedById?: string, isNomination?: boolean) {
  return requestJson<{ ok: boolean }>(`/api/events/${eventId}/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recommendationId, linkedById, isNomination }),
  });
}

export async function linkEventMovie(eventId: string, movieId: string) {
  return requestJson<{ ok: boolean }>(`/api/events/${eventId}/movies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ movieId }),
  });
}

export async function unlinkEventMovie(eventId: string, movieId: string) {
  return requestJson<{ ok: boolean }>(`/api/events/${eventId}/movies/${movieId}`, {
    method: 'DELETE',
  });
}

export async function unlinkEventRecommendation(eventId: string, recommendationId: string) {
  return requestJson<{ ok: boolean }>(`/api/events/${eventId}/recommendations/${recommendationId}`, {
    method: 'DELETE',
  });
}

export async function selectEventRecommendation(eventId: string, recommendationId: string) {
  return requestJson<{ ok: boolean }>(`/api/events/${eventId}/recommendations/${recommendationId}/select`, {
    method: 'PATCH',
  });
}

/* ═══════════════════════════════════════════════════════════════
   Feed API  (aggregated timeline)
   ═══════════════════════════════════════════════════════════════ */

export async function fetchFeedApi(userId?: string) {
  return requestJson<EntityMap>(`/api/feed${toQueryString({ userId: userId ?? '' })}`);
}

/* ═══════════════════════════════════════════════════════════════
   Events API  (loader helpers)
   ═══════════════════════════════════════════════════════════════ */

export async function fetchEventsApi() {
  return requestJson<EntityMap[]>('/api/events');
}

export async function fetchPastEventsApi() {
  return requestJson<EntityMap[]>('/api/events/past');
}

/* ═══════════════════════════════════════════════════════════════
   Movies API
   ═══════════════════════════════════════════════════════════════ */

export async function fetchMoviesApi() {
  return requestJson<EntityMap[]>('/api/movies');
}

export async function fetchMovieByIdApi(id: string) {
  return requestJson<EntityMap>(`/api/movies/${id}`);
}

export async function fetchScreenedMoviesApi() {
  return requestJson<EntityMap[]>('/api/movies/screened');
}

export async function toggleMovieVote(movieId: string, userId: string) {
  return requestJson<EntityMap>(`/api/movies/${movieId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

export async function searchExternalMovies(query: string) {
  return requestJson<{ items: ExternalMovieResult[]; source: string }>(`/api/movies/search-external${toQueryString({ q: query })}`);
}

export interface ExternalMovieResult {
  tmdbId: number;
  title: string;
  originalTitle: string;
  year: string;
  overview: string;
  poster: string;
  rating: number | null;
}

export async function createMovie(data: {
  title: string;
  year?: number;
  director?: string;
  poster?: string;
  synopsis?: string;
  recommendedById: string;
  tmdbId?: number;
}) {
  return requestJson<EntityMap>('/api/movies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/* ═══════════════════════════════════════════════════════════════
   Proposals API
   ═══════════════════════════════════════════════════════════════ */

export async function fetchProposalsApi() {
  return requestJson<EntityMap[]>('/api/proposals');
}

export async function fetchProposalByIdApi(id: string) {
  return requestJson<EntityMap>(`/api/proposals/${id}`);
}

export async function toggleProposalVote(proposalId: string, userId: string) {
  return requestJson<EntityMap>(`/api/proposals/${proposalId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

export async function updateProposal(proposalId: string, payload: { description?: string; status?: string }) {
  return requestJson<EntityMap>(`/api/proposals/${proposalId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/* ═══════════════════════════════════════════════════════════════
   Members API
   ═══════════════════════════════════════════════════════════════ */

export async function fetchMembersApi() {
  return requestJson<EntityMap[]>('/api/users');
}

export async function searchUsersApi(q: string) {
  return requestJson<{ id: string; name: string; avatar: string | null }[]>(
    `/api/users/search${toQueryString({ q })}`,
  );
}

export async function fetchMemberByNameApi(name: string, viewerId?: string) {
  const headers: Record<string, string> = {};
  if (viewerId) headers['x-user-id'] = viewerId;
  return requestJson<EntityMap>(`/api/users/by-name/${encodeURIComponent(name)}`, { headers });
}

export async function fetchUserByIdApi(id: string) {
  return requestJson<EntityMap>(`/api/users/${id}`);
}

export async function fetchCoAttendees(userId: string) {
  return requestJson<{ userId: string; name: string; count: number }[]>(`/api/users/${userId}/co-attendees`);
}

/* ═══════════════════════════════════════════════════════════════
   Postcard / Cards API
   ═══════════════════════════════════════════════════════════════ */

export async function fetchPostcardsApi(userId: string) {
  return requestJson<{ received: EntityMap[]; sent: EntityMap[]; credits: number; eligible?: { id: string; name: string; eventCtx: string }[] }>(
    `/api/postcards${toQueryString({ userId })}`,
  );
}

export async function sendPostcard(payload: {
  fromId: string;
  toId: string;
  message: string;
  eventId?: string;
  eventCtx?: string;
  visibility?: 'public' | 'private';
  photoUrl?: string;
  tags?: string[];
}) {
  return requestJson<EntityMap>('/api/postcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updatePostcardVisibility(id: string, userId: string, visibility: 'public' | 'private') {
  return requestJson<{ ok: boolean }>(`/api/postcards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, visibility }),
  });
}

export async function deletePostcard(id: string, userId: string) {
  return requestJson<void>(`/api/postcards/${id}${toQueryString({ userId })}`, {
    method: 'DELETE',
  });
}

/* ═══════════════════════════════════════════════════════════════
   About / Announcements API
   ═══════════════════════════════════════════════════════════════ */

export async function fetchAboutStatsApi() {
  return requestJson<{ memberCount: number; hostCount: number; eventCount: number; months: number }>(
    '/api/about/stats',
  );
}

export async function fetchAboutContentApi(type: string) {
  return requestJson<EntityMap[]>(`/api/about/content/${type}`);
}

export async function fetchAnnouncementsApi() {
  return requestJson<EntityMap[]>('/api/about/announcements');
}

export async function fetchAnnouncementByIdApi(id: string) {
  return requestJson<EntityMap>(`/api/about/announcements/${id}`);
}

/* ═══════════════════════════════════════════════════════════════
   Profile API  (aggregated)
   ═══════════════════════════════════════════════════════════════ */

export async function fetchProfileApi(userId: string) {
  return requestJson<EntityMap>(`/api/profile${toQueryString({ userId })}`);
}

export async function fetchProfileByNameApi(name: string, viewerId?: string) {
  const headers: Record<string, string> = {};
  if (viewerId) headers['x-user-id'] = viewerId;
  return requestJson<EntityMap>(`/api/profile${toQueryString({ name })}`, { headers });
}

/* ═══════════════════════════════════════════════════════════════
   Comments API
   ═══════════════════════════════════════════════════════════════ */

export async function fetchCommentsApi(entityType: string, entityId: string) {
  return requestJson<EntityMap[]>(
    `/api/comments${toQueryString({ entityType, entityId })}`,
  );
}

export async function addComment(payload: {
  entityType: string;
  entityId: string;
  authorId: string;
  content: string;
}) {
  return requestJson<EntityMap>('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteComment(id: string) {
  return requestJson<{ ok: boolean }>(`/api/comments/${id}`, {
    method: 'DELETE',
  });
}

/* ═══════════════════════════════════════════════════════════════
   Likes API
   ═══════════════════════════════════════════════════════════════ */

export async function fetchLikesApi(entityType: string, entityId: string) {
  return requestJson<EntityMap[]>(
    `/api/likes${toQueryString({ entityType, entityId })}`,
  );
}

export async function toggleLike(entityType: string, entityId: string, userId: string) {
  return requestJson<EntityMap>('/api/likes/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityType, entityId, userId }),
  });
}

/* ═══════════════════════════════════════════════════════════════
   Auth API — Email verification code login
   ═══════════════════════════════════════════════════════════════ */

/** Send a 6-digit login verification code to the given email */
export async function sendLoginCode(email: string) {
  const url = getApiUrl('/api/auth/send-code');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const err = new Error(data?.message ?? '发送验证码失败');
    (err as any).status = response.status;
    (err as any).errorCode = data?.error;
    throw err;
  }

  return data as { ok: boolean; message: string };
}

/** Verify a login code and get user data */
export async function verifyLoginCode(email: string, code: string) {
  const url = getApiUrl('/api/auth/verify-code');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const err = new Error(data?.message ?? '验证失败');
    (err as any).status = response.status;
    (err as any).errorCode = data?.error;
    throw err;
  }

  return data as { ok: boolean; user: EntityMap };
}

/** Google OAuth login */
export interface GoogleProfile {
  googleId: string;
  name: string;
  email: string;
  picture: string;
}

export async function googleLogin(credential: string) {
  const url = getApiUrl('/api/auth/google');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const err = new Error(data?.message ?? 'Google 登录失败');
    (err as any).status = response.status;
    (err as any).errorCode = data?.error;
    (err as any).googleProfile = data?.googleProfile as GoogleProfile | undefined;
    throw err;
  }

  return data as { ok: boolean; user: EntityMap };
}

/** Check email registration status (before sending code) */
export async function checkEmailStatus(email: string) {
  return requestJson<{ status: string }>('/api/auth/check-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

/* ═══════════════════════════════════════════════════════════════
   Application API
   ═══════════════════════════════════════════════════════════════ */

export async function submitApplication(payload: {
  displayName: string;
  location: string;
  bio: string;
  selfAsFriend: string;
  idealFriend: string;
  participationPlan: string;
  email: string;
  wechatId: string;
  referralSource?: string;
  coverImageUrl?: string;
  googleId?: string;
  subscribeNewsletter?: boolean;
  birthday?: string;
}) {
  const base = typeof window === 'undefined' ? 'http://localhost:4000' : '';
  const res = await fetch(`${base}/api/users/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Submit failed') as any;
    err.errorCode = data.errorCode;
    throw err;
  }
  return data as { ok: boolean; id: string };
}

/* ═══════════════════════════════════════════════════════════════
   Admin: Approve / Reject applicant
   ═══════════════════════════════════════════════════════════════ */

export async function adminApproveUser(userId: string) {
  return requestJson<{ ok: boolean; user: EntityMap }>(`/api/users/${userId}/approve`, {
    method: 'POST',
  });
}

export async function adminRejectUser(userId: string) {
  return requestJson<{ ok: boolean; user: EntityMap }>(`/api/users/${userId}/reject`, {
    method: 'POST',
  });
}

export async function adminAnnounceUser(userId: string, days?: number) {
  return requestJson<{ ok: boolean; publicityEndsAt: string }>(`/api/users/${userId}/announce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ days }),
  });
}

/* ═══════════════════════════════════════════════════════════════
   Event Cancel Signup
   ═══════════════════════════════════════════════════════════════ */

export async function cancelSignup(eventId: string, userId: string) {
  return requestJson<EntityMap>(`/api/events/${eventId}/signup`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

/** Host removes a participant from an event */
export async function removeParticipant(eventId: string, userId: string, requesterId: string) {
  return requestJson<{ ok: boolean }>(`/api/events/${eventId}/signup/${userId}`, {
    method: 'DELETE',
    headers: { 'x-user-id': requesterId },
  });
}

/** User accepts a waitlist offer */
export async function acceptOffer(eventId: string, userId: string) {
  return requestJson<{ ok: boolean }>(`/api/events/${eventId}/offer/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

/** User declines a waitlist offer */
export async function declineOffer(eventId: string, userId: string) {
  return requestJson<{ ok: boolean }>(`/api/events/${eventId}/offer/decline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

/** Host directly approves a waitlisted person */
export async function hostApproveWaitlist(eventId: string, userId: string, requesterId: string) {
  return requestJson<{ ok: boolean }>(`/api/events/${eventId}/waitlist/${userId}/approve`, {
    method: 'POST',
    headers: { 'x-user-id': requesterId },
  });
}

/** Host rejects a waitlisted person */
export async function hostRejectWaitlist(eventId: string, userId: string, requesterId: string) {
  return requestJson<{ ok: boolean }>(`/api/events/${eventId}/waitlist/${userId}/reject`, {
    method: 'POST',
    headers: { 'x-user-id': requesterId },
  });
}

/* ═══════════════════════════════════════════════════════════════
   List Recommendations
   ═══════════════════════════════════════════════════════════════ */

export async function fetchRecommendationsApi(category?: string) {
  return requestJson<EntityMap[]>(
    `/api/recommendations${toQueryString({ category: category ?? '' })}`,
  );
}

/* ═══════════════════════════════════════════════════════════════
   Email Template API
   ═══════════════════════════════════════════════════════════════ */

export interface EmailTemplateRow {
  id: string;
  ruleId: string;
  variantKey: string;
  subject: string;
  body: string;
  isActive: boolean;
  updatedAt: string;
}

export interface EmailRuleRow {
  id: string;
  enabled: boolean;
  displayOrder: number;
  cooldownDays: number;
  config: Record<string, unknown>;
  updatedAt: string;
}

export async function fetchEmailRules() {
  return requestJson<EmailRuleRow[]>('/api/email/rules');
}

export async function updateEmailRule(id: string, payload: { enabled?: boolean; cooldownDays?: number; config?: Record<string, unknown> }) {
  return requestJson<EmailRuleRow>(`/api/email/rules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export interface EmailLogRow {
  id: string;
  userId: string;
  ruleId: string;
  refId?: string;
  messageId?: string;
  sentAt: string;
  openedAt?: string;
  clickedAt?: string;
  user: { name: string; email: string };
}

export async function fetchEmailLogs(params?: { limit?: number; ruleId?: string }) {
  return requestJson<EmailLogRow[]>(
    `/api/email/logs${toQueryString({ limit: String(params?.limit ?? 100), ruleId: params?.ruleId ?? '' })}`,
  );
}

export async function fetchRecommendationByIdApi(id: string) {
  return requestJson<EntityMap>(`/api/recommendations/${id}`);
}

export async function deleteRecommendation(id: string, userId: string) {
  return requestJson<{ ok: boolean }>(`/api/recommendations/${id}`, {
    method: 'DELETE',
    headers: { 'x-user-id': userId },
  });
}

export async function updateRecommendation(id: string, userId: string, data: { title?: string; description?: string; sourceUrl?: string; coverUrl?: string }) {
  return requestJson<EntityMap>(`/api/recommendations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(data),
  });
}

export async function fetchEmailTemplates(ruleId?: string) {
  return requestJson<EmailTemplateRow[]>(
    `/api/email/templates${toQueryString({ ruleId: ruleId ?? '' })}`,
  );
}

export async function createEmailTemplate(payload: {
  ruleId: string;
  variantKey: string;
  subject: string;
  body: string;
  isActive: boolean;
}) {
  return requestJson<EmailTemplateRow>('/api/email/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateEmailTemplate(id: string, payload: {
  ruleId?: string;
  variantKey?: string;
  subject?: string;
  body?: string;
  isActive?: boolean;
}) {
  return requestJson<EmailTemplateRow>(`/api/email/templates/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteEmailTemplate(id: string) {
  return requestJson<{ ok: boolean }>(`/api/email/templates/${id}`, {
    method: 'DELETE',
  });
}

export async function previewEmailTemplate(subject: string, body: string, variables: Record<string, string>) {
  return requestJson<{ subject: string; html: string; text: string }>('/api/email/templates/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, body, variables }),
  });
}

/* ── Admin: User management ── */

/** List users with detail counts (for admin page) */
export async function fetchUsersAdmin() {
  return requestJson<EntityMap[]>('/api/users/admin/list');
}

/** Admin update user fields (role, userStatus, name, email, location, etc.) */
export async function adminUpdateUser(userId: string, data: Record<string, unknown>) {
  return requestJson<{ ok: boolean; user: EntityMap }>(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/** Admin: delete user */
export async function adminDeleteUser(userId: string) {
  return requestJson<{ ok: boolean }>(`/api/users/${userId}`, {
    method: 'DELETE',
  });
}

/** Admin: set operator roles */
export async function adminSetOperatorRoles(userId: string, roles: string[]) {
  return requestJson<EntityMap>(`/api/users/${userId}/operator-roles`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roles }),
  });
}

/* ═══════════════════════════════════════════════════════════════
   Admin: Event operations
   ═══════════════════════════════════════════════════════════════ */

export async function deleteEvent(eventId: string) {
  return requestJson<{ ok: boolean }>(`/api/events/${eventId}`, { method: 'DELETE' });
}

export async function fetchCancelledEventsApi() {
  return requestJson<EntityMap[]>('/api/events/cancelled');
}

/* ═══════════════════════════════════════════════════════════════
   Admin: Movie operations
   ═══════════════════════════════════════════════════════════════ */

export async function updateMovie(movieId: string, payload: { title?: string; status?: string; director?: string; synopsis?: string; doubanUrl?: string }) {
  return requestJson<{ ok: boolean; movie: EntityMap }>(`/api/movies/${movieId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteMovie(movieId: string) {
  return requestJson<{ ok: boolean }>(`/api/movies/${movieId}`, { method: 'DELETE' });
}

/* ═══════════════════════════════════════════════════════════════
   Admin: Proposal operations
   ═══════════════════════════════════════════════════════════════ */

export async function deleteProposal(proposalId: string) {
  return requestJson<{ ok: boolean }>(`/api/proposals/${proposalId}`, { method: 'DELETE' });
}

/* ═══════════════════════════════════════════════════════════════
   Admin: Announcement CRUD
   ═══════════════════════════════════════════════════════════════ */

export async function fetchAnnouncementsAdminApi() {
  return requestJson<EntityMap[]>('/api/about/announcements/admin/list');
}

export async function createAnnouncement(payload: { title: string; body: string; type: string; pinned: boolean; authorId: string }) {
  return requestJson<EntityMap>('/api/about/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateAnnouncement(id: string, payload: { title?: string; body?: string; type?: string; pinned?: boolean }) {
  return requestJson<{ ok: boolean; announcement: EntityMap }>(`/api/about/announcements/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteAnnouncement(id: string) {
  return requestJson<{ ok: boolean }>(`/api/about/announcements/${id}`, { method: 'DELETE' });
}

/* ═══════════════════════════════════════════════════════════════
   Admin: About Content CRUD
   ═══════════════════════════════════════════════════════════════ */

export async function fetchAllAboutContentApi() {
  return requestJson<EntityMap[]>('/api/about/content/all');
}

export async function upsertAboutContent(type: string, payload: { title: string; content: string }) {
  return requestJson<{ ok: boolean; content: EntityMap }>(`/api/about/content/${type}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/* ═══════════════════════════════════════════════════════════════
   Admin: Postcard operations
   ═══════════════════════════════════════════════════════════════ */

export async function fetchPostcardsAdminApi() {
  return requestJson<EntityMap[]>('/api/postcards/admin/list');
}

export async function adminDeletePostcard(id: string) {
  return requestJson<{ ok: boolean }>(`/api/postcards/admin/${id}`, { method: 'DELETE' });
}

/* ═══════════════════════════════════════════════════════════════
   Admin: Comments list
   ═══════════════════════════════════════════════════════════════ */

export async function fetchCommentsAdminApi() {
  return requestJson<EntityMap[]>('/api/comments/admin/list');
}

/* ═══════════════════════════════════════════════════════════════
   Admin: Title Rule CRUD
   ═══════════════════════════════════════════════════════════════ */

export interface TitleRuleRow {
  id: string;
  emoji: string;
  name: string;
  description: string;
  stampEmoji: string;
  threshold: number;
}

export async function fetchTitleRules() {
  return requestJson<TitleRuleRow[]>('/api/title-rules');
}

export async function createTitleRule(payload: { emoji: string; name: string; description: string; stampEmoji: string; threshold: number }) {
  return requestJson<TitleRuleRow>('/api/title-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateTitleRule(id: string, payload: { emoji?: string; name?: string; description?: string; stampEmoji?: string; threshold?: number }) {
  return requestJson<{ ok: boolean; titleRule: TitleRuleRow }>(`/api/title-rules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteTitleRule(id: string) {
  return requestJson<{ ok: boolean }>(`/api/title-rules/${id}`, { method: 'DELETE' });
}

export async function fetchTitleHoldersCount() {
  return requestJson<Record<string, number>>('/api/title-rules/holders-count');
}

export async function fetchMembersWithTitles() {
  return requestJson<{ id: string; name: string; avatar: string; socialTitles: { id: string; value: string }[] }[]>('/api/title-rules/members');
}

export async function grantUserTitle(userId: string, value: string) {
  return requestJson<EntityMap>('/api/title-rules/grant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, value }),
  });
}

export async function revokeUserTitle(userId: string, value: string) {
  return requestJson<{ ok: boolean }>('/api/title-rules/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, value }),
  });
}

/* ═══════════════════════════════════════════════════════════════
   Admin: Task Preset CRUD
   ═══════════════════════════════════════════════════════════════ */

export type TaskPresetRoleItem = string | { role: string; description?: string };

export interface TaskPresetRow {
  id: string;
  tag: string;
  roles: TaskPresetRoleItem[];
}

export async function fetchTaskPresets() {
  return requestJson<TaskPresetRow[]>('/api/task-presets');
}

export async function createTaskPreset(payload: { tag: string; roles: TaskPresetRoleItem[] }) {
  return requestJson<TaskPresetRow>('/api/task-presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateTaskPreset(id: string, payload: { tag?: string; roles?: TaskPresetRoleItem[] }) {
  return requestJson<{ ok: boolean; preset: TaskPresetRow }>(`/api/task-presets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteTaskPreset(id: string) {
  return requestJson<{ ok: boolean }>(`/api/task-presets/${id}`, { method: 'DELETE' });
}

/* ═══════════════════════════════════════════════════════════════
   Event Tasks API (分工认领)
   ═══════════════════════════════════════════════════════════════ */

import type { EventTaskData } from '@/types';

export async function fetchEventTasks(eventId: string) {
  return requestJson<EventTaskData[]>(`/api/events/${eventId}/tasks`);
}

export async function createEventTasks(eventId: string, tasks: { role: string; description?: string }[]) {
  return requestJson<EventTaskData[]>(`/api/events/${eventId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks }),
  });
}

export async function claimEventTask(eventId: string, taskId: string, userId: string) {
  return requestJson<{ ok: boolean; task: EventTaskData }>(`/api/events/${eventId}/tasks/${taskId}/claim`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

export async function unclaimEventTask(eventId: string, taskId: string) {
  return requestJson<{ ok: boolean; task: EventTaskData }>(`/api/events/${eventId}/tasks/${taskId}/unclaim`, {
    method: 'PATCH',
  });
}

export async function volunteerEventTask(eventId: string, userId: string, role: string, description?: string) {
  return requestJson<{ ok: boolean; task: EventTaskData }>(`/api/events/${eventId}/tasks/volunteer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, role, description }),
  });
}

export async function updateEventTask(eventId: string, taskId: string, data: { role?: string; description?: string }) {
  return requestJson<{ ok: boolean; task: EventTaskData }>(`/api/events/${eventId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteEventTask(eventId: string, taskId: string) {
  return requestJson<{ ok: boolean }>(`/api/events/${eventId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

/* ═══════════════════════════════════════════════════════════════
   Admin: Dashboard Stats
   ═══════════════════════════════════════════════════════════════ */

export interface AdminStats {
  totalMembers: number;
  pendingApplicants: number;
  totalEvents: number;
  monthEvents: number;
  totalCards: number;
  monthCards: number;
  activeHosts: number;
  totalMovies: number;
  totalProposals: number;
  // Activity supply
  monthActiveHosts: number;
  waitlistPercent: number;
  distinctTagCount: number;
  topTags: string[];
  // Postcard breakdown
  publicCards: number;
  privateCards: number;
  publicPercent: number;
  // Member activity
  monthParticipants: number;
  monthMovieRecommenders: number;
  newMemberParticipationRate: number;
  // Host funnel
  hostFunnel: {
    activeParticipants3: number;
    firstCoHosts: number;
    soloHosts: number;
    veteranHosts: number;
  };
  // Email stats
  emailStats: {
    active: number;
    weekly: number;
    stopped: number;
    unsubscribed: number;
  };
  // Recent activity
  recentActivity: { text: string; time: string }[];
}

export async function fetchAdminStats() {
  return requestJson<AdminStats>('/api/admin/stats');
}

/* ═══════════════════════════════════════════════════════════════
   Feedback API
   ═══════════════════════════════════════════════════════════════ */

export async function submitFeedback(payload: { name: string; email?: string; message: string; page?: string }) {
  return requestJson<{ ok: boolean }>('/api/email/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/** Admin: send email to a single recipient */
export async function sendAdminEmail(payload: { to: string; subject: string; text: string; html?: string }, userId: string) {
  return requestJson<{ ok: boolean; messageId?: string }>('/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(payload),
  });
}

// ═══════════════════════════════════════════════
//  Newsletter API
// ═══════════════════════════════════════════════

export interface NewsletterRow {
  id: string;
  subject: string;
  body: string;
  status: string;
  recipientCount: number;
  openRate: number;
  clickRate: number;
  recipientGroup: string;
  recipientIds: string[];
  sentAt: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; email: string };
}

export interface SubscriberGroup {
  label: string;
  count: number;
}

export async function fetchNewsletters(status?: string) {
  const params = status ? `?status=${status}` : '';
  return requestJson<NewsletterRow[]>(`/api/newsletters${params}`);
}

export async function fetchNewsletterStats() {
  return requestJson<SubscriberGroup[]>('/api/newsletters/stats');
}

export async function createNewsletter(data: { subject: string; body?: string; authorId: string; recipientGroup?: string; recipientIds?: string[] }) {
  return requestJson<NewsletterRow>('/api/newsletters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateNewsletter(id: string, data: Partial<Pick<NewsletterRow, 'subject' | 'body' | 'recipientGroup' | 'recipientIds' | 'status'>>) {
  return requestJson<NewsletterRow>(`/api/newsletters/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function sendNewsletter(id: string) {
  return requestJson<NewsletterRow>(`/api/newsletters/${id}/send`, {
    method: 'POST',
  });
}

export async function deleteNewsletter(id: string) {
  return requestJson<{ ok: boolean }>(`/api/newsletters/${id}`, {
    method: 'DELETE',
  });
}

// ═══════════════════════════════════════════════
//  Site Config API
// ═══════════════════════════════════════════════

export async function fetchSiteConfigs() {
  return requestJson<Record<string, unknown>>('/api/config');
}

export async function fetchSiteConfig<T = unknown>(key: string) {
  const row = await requestJson<{ key: string; value: T }>(`/api/config/${key}`);
  return row.value;
}

export async function updateSiteConfig(key: string, value: unknown) {
  return requestJson<{ key: string; value: unknown }>(`/api/config/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
}

// ═══════════════════════════════════════════════
//  Email Queue / Bounces / Unsubscribes / Suppressions
// ═══════════════════════════════════════════════

export interface EmailQueueRow {
  id: string;
  userId: string;
  ruleId: string;
  scheduledAt: string;
  status: string;
  payload: unknown;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export async function fetchEmailQueue(status?: string) {
  const params = status ? `?status=${status}` : '';
  return requestJson<EmailQueueRow[]>(`/api/email/queue${params}`);
}

export async function updateEmailQueueStatus(id: string, status: string) {
  return requestJson<EmailQueueRow>(`/api/email/queue/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function deleteEmailQueueItem(id: string) {
  return requestJson<{ ok: boolean }>(`/api/email/queue/${id}`, {
    method: 'DELETE',
  });
}

export interface EmailBounceRow {
  id: string;
  email: string;
  ruleId: string;
  type: string;
  reason: string;
  occurredAt: string;
}

export async function fetchEmailBounces() {
  return requestJson<EmailBounceRow[]>('/api/email/bounces');
}

export interface EmailUnsubscribeRow {
  id: string;
  userId: string | null;
  email: string;
  reason: string;
  comment: string;
  unsubscribedAt: string;
  user: { id: string; name: string; email: string } | null;
}

export async function fetchEmailUnsubscribes() {
  return requestJson<EmailUnsubscribeRow[]>('/api/email/unsubscribes');
}

export interface EmailSuppressionRow {
  id: string;
  email: string;
  reason: string;
  source: string;
  addedAt: string;
}

export async function fetchEmailSuppressions() {
  return requestJson<EmailSuppressionRow[]>('/api/email/suppressions');
}

export async function addEmailSuppression(data: { email: string; reason?: string; source?: string }) {
  return requestJson<EmailSuppressionRow>('/api/email/suppressions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function removeEmailSuppression(id: string) {
  return requestJson<{ ok: boolean }>(`/api/email/suppressions/${id}`, {
    method: 'DELETE',
  });
}

// Global / Digest email config
export interface GlobalEmailConfig {
  systemPaused: boolean;
  fromEmail: string;
  replyTo: string;
  dailySendTime: string;
  timezone: string;
  maxDailyPerUser: number;
  weeklyDegradeThreshold: number;
  stoppedDegradeThreshold: number;
  weeklySendDay: string;
  orgName: string;
  physicalAddress: string;
  unsubscribeText: string;
  unsubscribeUrl: string;
  unsubscribeReasons: string;
  testEmails: string;
}

export async function fetchGlobalEmailConfig() {
  return requestJson<GlobalEmailConfig | null>('/api/email/global-config');
}

export async function updateGlobalEmailConfig(config: GlobalEmailConfig) {
  return requestJson<GlobalEmailConfig>('/api/email/global-config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
}

export interface DigestSourceConfig {
  key: string;
  label: string;
  enabled: boolean;
  sortOrder: number;
  maxItems: number;
}

export interface DigestConfig {
  maxTotalItems: number;
  sendTime: string;
  timezone: string;
  frequency: 'daily' | 'weekdays' | 'custom';
  customDays: boolean[];
  skipIfEmpty: boolean;
  minItems: number;
  personalized: boolean;
  dedupeWindowHours: number;
  subjectTemplate: string;
  headerText: string;
  footerText: string;
  ctaLabel: string;
  ctaUrl: string;
  sources: DigestSourceConfig[];
}

export async function fetchDigestConfig() {
  return requestJson<DigestConfig | null>('/api/email/digest-config');
}

export async function updateDigestConfig(config: DigestConfig) {
  return requestJson<DigestConfig>('/api/email/digest-config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
}

// ═══════════════════════════════════════════════
//  Lottery API (轮值 Host 抽签)
// ═══════════════════════════════════════════════

export interface LotteryDraw {
  id: string;
  weekKey: string;
  weekNumber: number;
  drawnMemberId: string;
  status: 'pending' | 'accepted' | 'completed' | 'skipped';
  eventId: string | null;
  createdAt: string;
  drawnMember: { id: string; name: string; avatar: string };
  event?: { id: string; title: string; startsAt?: string } | null;
}

export async function fetchCurrentLottery() {
  return requestJson<LotteryDraw | { none: true }>('/api/lottery/current');
}

export async function fetchLotteryHistory(take = 20, skip = 0) {
  return requestJson<LotteryDraw[]>(`/api/lottery/history?take=${take}&skip=${skip}`);
}

export async function acceptLottery(lotteryId: string, userId: string) {
  return requestJson<LotteryDraw>(`/api/lottery/${lotteryId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

export async function skipLottery(lotteryId: string, userId: string) {
  return requestJson<{ ok: boolean; newDraw: LotteryDraw | null }>(`/api/lottery/${lotteryId}/skip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

export async function completeLottery(lotteryId: string, eventId: string) {
  return requestJson<LotteryDraw>(`/api/lottery/${lotteryId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId }),
  });
}

export async function updateHostCandidate(userId: string, hostCandidate: boolean) {
  return requestJson<{ id: string; hostCandidate: boolean }>('/api/lottery/host-candidate', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify({ hostCandidate }),
  });
}


