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

export type RecommendationCategory = 'movie' | 'book' | 'recipe' | 'music' | 'place';

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
}) {
  return requestJson<EntityMap>('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getEventById(id: string) {
  return requestJson<EntityMap>(`/api/events/${id}`);
}

export async function signupEvent(eventId: string, userId: string) {
  return requestJson<EntityMap>(`/api/events/${eventId}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, status: 'accepted' }),
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

export async function fetchUserByIdApi(id: string) {
  return requestJson<EntityMap>(`/api/users/${id}`);
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
}) {
  return requestJson<{ ok: boolean; id: string }>('/api/users/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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

export async function updateMovie(movieId: string, payload: { title?: string; status?: string; director?: string; synopsis?: string }) {
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

export interface TaskPresetRow {
  id: string;
  tag: string;
  roles: string[];
}

export async function fetchTaskPresets() {
  return requestJson<TaskPresetRow[]>('/api/task-presets');
}

export async function createTaskPreset(payload: { tag: string; roles: string[] }) {
  return requestJson<TaskPresetRow>('/api/task-presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateTaskPreset(id: string, payload: { tag?: string; roles?: string[] }) {
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
}

export async function fetchAdminStats() {
  return requestJson<AdminStats>('/api/admin/stats');
}
