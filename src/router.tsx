import { createBrowserRouter, Navigate } from 'react-router';
import type { RouteObject } from 'react-router';
import AppLayout from '@/layouts/AppLayout';
import FeedPage from '@/pages/FeedPage';
import EventsPage from '@/pages/EventsPage';
import EventDetailPage from '@/pages/EventDetailPage';
import EventRecordsPage from '@/pages/EventRecordsPage';
import DiscoverPage from '@/pages/DiscoverPage';
import MovieDetailPage from '@/pages/MovieDetailPage';
import BookDetailPage from '@/pages/BookDetailPage';
import RecommendationCreatePage from '@/pages/RecommendationCreatePage';
import RecommendationDetailPage from '@/pages/RecommendationDetailPage';
import CardsPage from '@/pages/CardsPage';
import ProfilePage from '@/pages/ProfilePage';
import MembersPage from '@/pages/MembersPage';
import MemberDetailPage from '@/pages/MemberDetailPage';
import AboutPage from '@/pages/AboutPage';
import AboutContentPage from '@/pages/AboutContentPage';
import RegisterPage from '@/pages/RegisterPage';
import LoginPage from '@/pages/LoginPage';
import EventCreatePage from '@/pages/EventCreatePage';
import ProposalCreatePage from '@/pages/ProposalCreatePage';
import ProposalDetailPage from '@/pages/ProposalDetailPage';
import ApplyPage from '@/pages/ApplyPage';
import AnnouncementPage from '@/pages/AnnouncementPage';
import SettingsPage from '@/pages/SettingsPage';
import AdminLayout from '@/layouts/AdminLayout';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminMembersPage from '@/pages/admin/AdminMembersPage';
import AdminEventsPage from '@/pages/admin/AdminEventsPage';
import AdminEmailPage from '@/pages/admin/AdminEmailPage';
import AdminNewslettersPage from '@/pages/admin/AdminNewslettersPage';
import AdminTitlesPage from '@/pages/admin/AdminTitlesPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AdminTaskPresetsPage from '@/pages/admin/AdminTaskPresetsPage';
import AdminContentPage from '@/pages/admin/AdminContentPage';
import AdminCardsPage from '@/pages/admin/AdminCardsPage';
import AdminAnnouncementsPage from '@/pages/admin/AdminAnnouncementsPage';
import AdminCommunityInfoPage from '@/pages/admin/AdminCommunityInfoPage';
import NotFoundPage from '@/pages/NotFoundPage';
import {
  fetchFeedApi,
  fetchEventsApi,
  fetchPastEventsApi,
  getEventById,
  fetchProposalByIdApi,
  fetchMoviesApi,
  fetchScreenedMoviesApi,
  fetchMovieByIdApi,
  fetchPostcardsApi,
  fetchProfileApi,
  fetchMembersApi,
  fetchMemberByNameApi,
  fetchProfileByNameApi,
  fetchUserByIdApi,
  fetchAboutStatsApi,
  fetchProposalsApi,
  fetchRecommendationsApi,
  fetchRecommendationByIdApi,
} from '@/lib/domainApi';
import { eventTagToScene } from '@/lib/mappings';

/* ── Loader helpers (call real backend) ── */

/** Transform raw feed API data into FeedItem[] for the timeline */
function buildFeedItems(data: any): any[] {
  const items: any[] = [];

  // Group by date
  const dateGroups = new Map<string, any[]>();
  const addToDate = (dateStr: string, item: any) => {
    const key = dateStr || 'unknown';
    if (!dateGroups.has(key)) dateGroups.set(key, []);
    dateGroups.get(key)!.push(item);
  };

  // Events → activity items
  for (const e of (data.events ?? [])) {
    const d = e.startsAt ? new Date(e.startsAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '';
    const hostName = e.host?.name ?? '';
    const allSignups = (e.signups ?? []) as any[];
    const feedOccupying = allSignups.filter((s: any) => ['accepted', 'invited', 'offered'].includes(s.status));
    const feedWaitlist = allSignups.filter((s: any) => s.status === 'waitlist');
    const people = feedOccupying.map((s: any) => s.user?.name).filter(Boolean);
    // Host 默认也是参与者之一
    if (hostName && !people.includes(hostName)) {
      people.unshift(hostName);
    }
    addToDate(d, {
      type: 'activity',
      name: hostName,
      title: e.title,
      date: d,
      location: e.location ?? '',
      spots: Math.max(0, (e.capacity ?? 8) - feedOccupying.length),
      people,
      signupUserIds: allSignups.map((s: any) => s.user?.id ?? s.userId).filter(Boolean),
      film: e.screenedMovies?.[0]?.movie?.title,
      scene: eventTagToScene[e.tags?.[0]] ?? e.tags?.[0] ?? '',
      navTarget: `/events/${e.id}`,
      isHomeEvent: e.isHomeEvent ?? false,
      waitlistCount: feedWaitlist.length,
    });
  }

  // Postcards → card items
  for (const p of (data.postcards ?? [])) {
    const d = p.createdAt ? new Date(p.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '';
    addToDate(d, {
      type: 'card',
      from: p.from?.name ?? '',
      to: p.to?.name ?? '',
      message: p.message ?? '',
    });
  }

  // Movies → compactMovie items
  for (const m of (data.recentMovies ?? [])) {
    const d = m.createdAt ? new Date(m.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '';
    const time = m.createdAt ? timeAgo(m.createdAt) : '';
    addToDate(d, {
      type: 'compactMovie',
      name: m.recommendedBy?.name ?? '',
      title: m.title,
      year: String(m.year ?? ''),
      dir: m.director ?? '',
      votes: m._count?.votes ?? 0,
      time,
      navTarget: `/discover/movies/${m.id}`,
    });
  }

  // New members → newMember items (introducing + welcomed)
  for (const m of (data.newMembers ?? [])) {
    const isAnnounced = m.userStatus === 'announced';
    const phase = isAnnounced ? 'introducing' : 'welcomed';
    const dateStr = isAnnounced ? m.announcedAt : m.approvedAt;
    const d = dateStr ? new Date(dateStr).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '';
    addToDate(d, {
      type: 'newMember',
      phase,
      id: m.id,
      name: m.name ?? '',
      bio: m.bio ?? '',
      location: m.location ?? '',
      selfAsFriend: m.selfAsFriend ?? '',
      idealFriend: m.idealFriend ?? '',
      participationPlan: m.participationPlan ?? '',
      announcedAt: m.announcedAt ?? '',
      announcedEndAt: m.announcedEndAt ?? '',
      approvedAt: m.approvedAt,
      avatar: m.avatar,
      likes: m.likes ?? 0,
      likedBy: m.likedBy ?? [],
    });
  }

  // Proposals → compactProposal items
  for (const p of (data.recentProposals ?? [])) {
    const d = p.createdAt ? new Date(p.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '';
    const time = p.createdAt ? timeAgo(p.createdAt) : '';
    addToDate(d, {
      type: 'compactProposal',
      name: p.author?.name ?? '',
      title: p.title,
      votes: p._count?.votes ?? 0,
      interested: [],
      time,
      navTarget: `/events/proposals/${p.id}`,
    });
  }

  // Sort dates descending and build timeline with time separators
  const sortedDates = [...dateGroups.keys()].sort((a, b) => {
    // Parse MM/DD format for sorting
    return b.localeCompare(a);
  });

  for (const dateKey of sortedDates) {
    items.push({ type: 'time', label: dateKey });
    items.push(...dateGroups.get(dateKey)!);
  }

  // If no items, add a milestone
  if (items.length === 0) {
    items.push({ type: 'milestone', text: '欢迎来到串门儿！', emoji: '🎉' });
  }

  return items;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

async function feedLoader() {
  try {
    const data = await fetchFeedApi();
    const items = buildFeedItems(data);
    const members = (data as any).members ?? [];
    return { items, members };
  } catch {
    return { items: [], members: [] };
  }
}

function mapApiEvent(e: any): any {
  const signups = e.signups ?? [];
  const hostName = typeof e.host === 'string' ? e.host : e.host?.name ?? '?';
  const hostId = typeof e.host === 'string' ? e.host : e.host?.id ?? '';

  // Split signups by status
  const occupying = signups.filter((s: any) => ['accepted', 'invited', 'offered'].includes(s.status));
  const waitlistSignups = signups.filter((s: any) => s.status === 'waitlist');

  // People list = only occupying signups (not waitlisted)
  const people = occupying.map((s: any) => s.user?.name ?? s.userName ?? '?');
  // Host 默认也是参与者之一
  if (hostName && hostName !== '?' && !people.includes(hostName)) {
    people.unshift(hostName);
  }

  // Collect signup user IDs for visibility checks (invite phase) — include all non-removed
  const signupUserIds = signups.map((s: any) => s.user?.id ?? s.userId).filter(Boolean);
  if (hostId && !signupUserIds.includes(hostId)) {
    signupUserIds.unshift(hostId);
  }

  // Signup details for host waitlist management
  const signupDetails = signups.map((s: any) => ({
    userId: s.user?.id ?? s.userId,
    name: s.user?.name ?? '?',
    status: s.status,
    offeredAt: s.offeredAt ?? undefined,
  }));

  return {
    id: e.id,
    title: e.title ?? '',
    host: hostName,
    hostId,
    date: e.startsAt ? new Date(e.startsAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }) : '',
    startsAt: e.startsAt,
    endDate: e.endsAt ? new Date(e.endsAt).toLocaleDateString('zh-CN') : undefined,
    location: e.location ?? '',
    isHomeEvent: e.isHomeEvent ?? false,
    scene: e.titleImageUrl || eventTagToScene[e.tags?.[0]] || e.tags?.[0] || '',
    film: e.screenedMovies?.[0]?.movie?.title ?? e.film ?? undefined,
    linkedRecommendations: (e.recommendations ?? []).map((er: any) => ({
      id: er.recommendation?.id,
      title: er.recommendation?.title,
      category: er.recommendation?.category,
      coverUrl: er.recommendation?.coverUrl || undefined,
    })),
    spots: Math.max(0, (e.capacity ?? 0) - occupying.length),
    total: e.capacity ?? 0,
    people,
    signupUserIds,
    signupDetails,
    waitlistCount: waitlistSignups.length,
    phase: e.phase ?? 'open',
    desc: e.description ?? '',
    houseRules: e.houseRules || undefined,
    photoCount: e.recapPhotoUrls?.length || undefined,
    tags: e.tags ?? [],
  };
}

async function eventsLoader() {
  try {
    const [events, proposals, past] = await Promise.all([
      fetchEventsApi(),
      fetchProposalsApi(),
      fetchPastEventsApi(),
    ]);
    return {
      upcoming: (events ?? []).map(mapApiEvent),
      proposals: (proposals ?? []).map((p: any) => ({
        id: p.id,
        name: p.author?.name ?? p.name ?? '?',
        title: p.title ?? '',
        description: p.description ?? '',
        votes: p._count?.votes ?? (Array.isArray(p.votes) ? p.votes.length : p.votes ?? 0),
        interested: Array.isArray(p.votes) ? p.votes.map((v: any) => v.user?.name ?? '?') : p.interested ?? [],
        time: p.createdAt ? timeAgo(String(p.createdAt)) : p.time ?? '',
      })),
      past: (past ?? []).map((e: any) => {
        const signupCount = e._count?.signups ?? e.people ?? 0;
        // Host 默认也是参与者之一 — count +1 if not already included in signups
        const peopleCount = signupCount > 0 ? signupCount + 1 : signupCount;
        return {
        id: e.id,
        title: e.title ?? '',
        host: typeof e.host === 'string' ? e.host : e.host?.name ?? '?',
        date: e.startsAt ? new Date(e.startsAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }) : '',
        people: peopleCount,
        scene: e.titleImageUrl || eventTagToScene[e.tags?.[0]] || e.tags?.[0] || '',
        film: e.screenedMovies?.[0]?.movie?.title ?? e.film ?? undefined,
        photoCount: e.recapPhotoUrls?.length || undefined,
      };
      }),
    };
  } catch {
    return { upcoming: [], proposals: [], past: [] };
  }
}

async function eventDetailLoader({ params }: { params: Record<string, string | undefined> }) {
  const id = params.eventId;
  if (!id) return null;
  try {
    const raw = await getEventById(id);
    if (!raw) return null;
    const base = mapApiEvent(raw);
    // Detail-specific fields
    base.desc = raw.description ?? '';
    // Find invitedBy name from signups (the person who invited the current user — resolved client-side)
    // We pass invitedById per signup so the client can look it up
    const signups = (raw.signups ?? []) as any[];
    const hostName = base.host;
    base.signupInvites = signups
      .filter((s: any) => s.invitedById)
      .map((s: any) => ({ userId: s.user?.id ?? s.userId, invitedById: s.invitedById }));
    base.comments = [];
    base.tasks = [];
    base.nominations = [];
    base.photos = ((raw.recapPhotoUrls ?? []) as string[]).map((url: string, i: number) => ({
      id: `${raw.id}-${i}`,
      url,
      caption: '',
    }));
    return base;
  } catch {
    return null;
  }
}

async function proposalDetailLoader({ params }: { params: Record<string, string | undefined> }) {
  const id = params.proposalId;
  if (!id) return null;
  try {
    const p: any = await fetchProposalByIdApi(id);
    if (!p) return null;
    return {
      id: p.id,
      name: p.author?.name ?? p.name ?? '?',
      title: p.title ?? '',
      description: p.description ?? '',
      descriptionHtml: p.descriptionHtml ?? p.description ?? '',
      votes: p._count?.votes ?? (Array.isArray(p.votes) ? p.votes.length : p.votes ?? 0),
      interested: Array.isArray(p.votes) ? p.votes.map((v: any) => v.user?.name ?? '?') : p.interested ?? [],
      time: p.createdAt ? timeAgo(String(p.createdAt)) : p.time ?? '',
      comments: p.comments ?? [],
      likes: p.likes ?? 0,
      likedBy: p.likedBy ?? [],
    };
  } catch {
    return null;
  }
}

async function eventRecordsLoader() {
  try {
    return await fetchPastEventsApi();
  } catch {
    return [];
  }
}

function mapRecommendation(r: any) {
  return {
    id: r.id,
    title: r.title ?? '',
    description: r.description ?? '',
    authorName: r.author?.name ?? '',
    authorId: r.author?.id ?? r.authorId ?? '',
    coverUrl: r.coverUrl || undefined,
    sourceUrl: r.sourceUrl || undefined,
    voteCount: r._count?.votes ?? r.voteCount ?? 0,
    voterIds: (r.votes ?? []).map((v: any) => v.userId ?? v.user?.id).filter(Boolean),
    category: r.category ?? '',
  };
}

async function discoverLoader() {
  try {
    const [rawPool, rawScreened, rawBooks, rawRecipes, rawMusic, rawPlaces, rawExternalEvents] = await Promise.all([
      fetchMoviesApi(),
      fetchScreenedMoviesApi(),
      fetchRecommendationsApi('book').catch(() => []),
      fetchRecommendationsApi('recipe').catch(() => []),
      fetchRecommendationsApi('music').catch(() => []),
      fetchRecommendationsApi('place').catch(() => []),
      fetchRecommendationsApi('external_event').catch(() => []),
    ]);
    const pool = (rawPool as any[]).map((m: any) => ({
      id: m.id,
      title: m.title ?? '',
      year: String(m.year ?? ''),
      dir: m.director ?? '',
      v: m._count?.votes ?? 0,
      voterIds: (m.votes ?? []).map((v: any) => v.user?.id ?? v.userId).filter(Boolean),
      status: m.status === 'candidate' ? undefined : m.status,
      by: m.recommendedBy?.name ?? '',
      poster: m.poster || undefined,
    }));
    const screened = (rawScreened as any[]).map((s: any) => ({
      title: s.movie?.title ?? s.title ?? '',
      year: String(s.movie?.year ?? s.year ?? ''),
      dir: s.movie?.director ?? s.director ?? '',
      date: s.event?.startsAt ? new Date(s.event.startsAt).toLocaleDateString('zh-CN') : (s.date ?? ''),
      host: s.event?.host?.name ?? s.host ?? '',
    }));
    const bookPool = (rawBooks as any[]).map((b: any) => ({
      id: b.id,
      title: b.title ?? '',
      year: '',
      author: b.author?.name ?? b.description ?? '',
      v: b._count?.votes ?? b.voteCount ?? 0,
      voterIds: (b.votes ?? []).map((v: any) => v.userId ?? v.user?.id).filter(Boolean),
      by: b.author?.name ?? '',
      status: b.status === 'candidate' ? undefined : b.status,
    }));
    return {
      pool, screened, bookPool, bookRead: [],
      recipes: (rawRecipes as any[]).map(mapRecommendation),
      music: (rawMusic as any[]).map(mapRecommendation),
      places: (rawPlaces as any[]).map(mapRecommendation),
      externalEvents: (rawExternalEvents as any[]).map(mapRecommendation),
    };
  } catch {
    return { pool: [], screened: [], bookPool: [], bookRead: [], recipes: [], music: [], places: [], externalEvents: [] };
  }
}

async function movieDetailLoader({ params }: { params: Record<string, string | undefined> }) {
  const id = params.movieId;
  if (!id) return null;
  try {
    return await fetchMovieByIdApi(id);
  } catch {
    return null;
  }
}

async function bookDetailLoader({ params }: { params: Record<string, string | undefined> }) {
  const id = params.bookId;
  if (!id) return null;
  try {
    const rec: any = await fetchRecommendationByIdApi(id);
    if (!rec) return null;
    // Transform Recommendation into BookPool shape expected by BookDetailPage
    return {
      id: rec.id,
      title: rec.title,
      year: (rec.tags ?? []).find((t: any) => /^\d{4}$/.test(t.value))?.value ?? '',
      author: (rec.tags ?? []).find((t: any) => !(/^\d{4}$/.test(t.value)))?.value ?? rec.author?.name ?? '',
      v: rec._count?.votes ?? rec.voteCount ?? 0,
      voterIds: (rec.votes ?? []).map((v: any) => v.userId ?? v.user?.id).filter(Boolean),
      status: rec.status ?? 'candidate',
      by: rec.author?.name ?? '',
      synopsis: rec.description ?? '',
      genre: (rec.tags ?? []).map((t: any) => t.value).join(', '),
      sourceUrl: rec.sourceUrl ?? '',
      authorId: rec.authorId ?? rec.author?.id ?? '',
    };
  } catch {
    return null;
  }
}

function getStoredUserId(): string {
  try {
    const raw = localStorage.getItem('chuanmen.auth.user') ?? sessionStorage.getItem('chuanmen.auth.user');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return parsed?.id ?? '';
  } catch {
    return '';
  }
}

function mapApiCard(c: any): any {
  return {
    id: c.id,
    from: typeof c.from === 'string' ? c.from : c.from?.name ?? '?',
    to: typeof c.to === 'string' ? c.to : c.to?.name ?? '?',
    message: c.message ?? '',
    stamp: c.tags?.[0]?.value ?? c.stamp ?? '',
    date: c.createdAt ? new Date(c.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '',
    photo: c.photoUrl ?? c.photo ?? undefined,
    visibility: c.visibility ?? 'public',
    tags: (c.tags ?? []).map((t: any) => typeof t === 'string' ? t : t.value ?? ''),
    eventCtx: c.eventCtx || c.event?.title || undefined,
  };
}

async function cardsLoader() {
  const userId = getStoredUserId();
  if (!userId) return { myCards: [], sentCards: [], credits: 0, people: [], quickMessages: [] };
  try {
    const data = await fetchPostcardsApi(userId);
    const people = (data.eligible ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      ctx: p.eventCtx ?? '',
    }));
    return {
      myCards: (data.received ?? []).map(mapApiCard),
      sentCards: (data.sent ?? []).map(mapApiCard),
      credits: data.credits ?? 0,
      people,
      quickMessages: ['谢谢你的热情招待！🏠', '和你聊天超开心 😊', '下次一起看电影吧 🎬', '好久不见，想你了 💌'],
    };
  } catch {
    return { myCards: [], sentCards: [], credits: 0, people: [], quickMessages: [] };
  }
}

async function profileLoader() {
  const userId = getStoredUserId();
  if (!userId) return null;
  try {
    return await fetchProfileApi(userId);
  } catch {
    return null;
  }
}

/** Host milestone badge based on host count */
function hostMilestoneBadge(count: number): string | undefined {
  if (count >= 20) return '👑';
  if (count >= 10) return '🔥';
  if (count >= 5) return '⭐';
  if (count >= 1) return '🏠';
  return undefined;
}

function mapApiMember(m: any) {
  const raw = m.mutual ?? {};
  const hostCount = m.host ?? m.hostCount ?? 0;
  return {
    ...m,
    titles: Array.isArray(m.titles)
      ? m.titles
      : Array.isArray(m.socialTitles)
        ? m.socialTitles.map((t: any) => (typeof t === 'string' ? t : t.value))
        : [],
    host: hostCount,
    badge: m.badge ?? hostMilestoneBadge(hostCount),
    mutual: {
      evtCount: raw.evtCount ?? 0,
      cards: raw.cards ?? raw.cardCount ?? 0,
      movies: Array.isArray(raw.movies) ? raw.movies : [],
      events: Array.isArray(raw.events) ? raw.events : [],
      movieCount: raw.movieCount ?? 0,
    },
    role: m.role ?? 'member',
  };
}

async function membersLoader() {
  try {
    const raw = await fetchMembersApi() as any[];
    const members = raw.map(mapApiMember);
    return { members };
  } catch {
    return { members: [] };
  }
}

async function memberDetailLoader({ params }: { params: Record<string, string | undefined> }) {
  const name = params.name ? decodeURIComponent(params.name) : '';
  if (!name) return null;
  // Get viewer ID for mutual computation (from localStorage if available)
  let viewerId: string | undefined;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('chuanmen.auth.user') || sessionStorage.getItem('chuanmen.auth.user');
      if (stored) viewerId = JSON.parse(stored)?.id;
    } catch { /* ignore */ }
  }
  try {
    // Use the same profile API as ProfilePage, but queried by name
    return await fetchProfileByNameApi(name, viewerId);
  } catch {
    return null;
  }
}

async function aboutLoader() {
  try {
    return await fetchAboutStatsApi();
  } catch {
    return { memberCount: 0, hostCount: 0, eventCount: 0, months: 1 };
  }
}

export const appRoutes: RouteObject[] = [
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <FeedPage />, loader: feedLoader },
      { path: 'events', element: <EventsPage />, loader: eventsLoader },
      {
        path: 'events/:eventId',
        element: <EventDetailPage />,
        loader: eventDetailLoader,
      },
      { path: 'events/proposals', element: <Navigate to="/events" replace /> },
      { path: 'events/proposals/new', element: <ProposalCreatePage /> },
      {
        path: 'events/proposals/:proposalId',
        element: <ProposalDetailPage />,
        loader: proposalDetailLoader,
      },
      { path: 'events/history', element: <EventRecordsPage />, loader: eventRecordsLoader },
      { path: 'events/new', element: <EventCreatePage /> },
      { path: 'events/small-group/new', element: <Navigate to="/events/new" replace /> },
      { path: 'discover', element: <DiscoverPage />, loader: discoverLoader },
      {
        path: 'discover/movies/:movieId',
        element: <MovieDetailPage />,
        loader: movieDetailLoader,
      },
      {
        path: 'discover/books/:bookId',
        element: <BookDetailPage />,
        loader: bookDetailLoader,
      },
      { path: 'discover/:category', element: <Navigate to="/discover" replace /> },
      { path: 'discover/:category/add', element: <RecommendationCreatePage /> },
      { path: 'discover/:category/:recommendationId', element: <RecommendationDetailPage /> },
      { path: 'cards', element: <CardsPage />, loader: cardsLoader },
      { path: 'profile', element: <ProfilePage />, loader: profileLoader },
      { path: 'members', element: <MembersPage />, loader: membersLoader },
      {
        path: 'members/:name',
        element: <MemberDetailPage />,
        loader: memberDetailLoader,
      },
      { path: 'about', element: <AboutPage />, loader: aboutLoader },
      { path: 'about/:contentType', element: <AboutContentPage /> },
      { path: 'announcements/:slug', element: <AnnouncementPage /> },
      { path: 'apply', element: <ApplyPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'members', element: <AdminMembersPage /> },
      { path: 'events', element: <AdminEventsPage /> },
      { path: 'content', element: <AdminContentPage /> },
      { path: 'cards', element: <AdminCardsPage /> },
      { path: 'titles', element: <AdminTitlesPage /> },
      { path: 'task-presets', element: <AdminTaskPresetsPage /> },
      { path: 'announcements', element: <AdminAnnouncementsPage /> },
      { path: 'email', element: <AdminEmailPage /> },
      { path: 'newsletters', element: <AdminNewslettersPage /> },
      { path: 'community-info', element: <AdminCommunityInfoPage /> },
      { path: 'settings', element: <AdminSettingsPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

export function createAppRouter(hydrationData?: any) {
  return createBrowserRouter(appRoutes, {
    hydrationData,
  });
}

export default createAppRouter;
