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
import RecommendationListPage from '@/pages/RecommendationListPage';
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
  fetchUserByIdApi,
  fetchAboutStatsApi,
  fetchProposalsApi,
} from '@/lib/domainApi';
import { fetchBookDetail } from '@/mock/api';

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
    addToDate(d, {
      type: 'activity',
      name: e.host?.name ?? '',
      title: e.title,
      date: d,
      location: e.location ?? '',
      spots: (e.capacity ?? 8) - (e.signups?.length ?? 0),
      people: (e.signups ?? []).map((s: any) => s.user?.name).filter(Boolean),
      film: e.selectedMovie?.title,
      scene: e.tags?.[0] ?? '',
      navTarget: `/events/${e.id}`,
    });
  }

  // Postcards → card items
  for (const p of (data.postcards ?? [])) {
    const d = p.createdAt ? new Date(p.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '';
    addToDate(d, {
      type: 'card',
      from: p.from?.name ?? '',
      to: p.to?.name ?? '',
      msg: p.message ?? '',
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

async function eventsLoader() {
  try {
    const [events, proposals, past] = await Promise.all([
      fetchEventsApi(),
      fetchProposalsApi(),
      fetchPastEventsApi(),
    ]);
    return { upcoming: events, proposals, past };
  } catch {
    return { upcoming: [], proposals: [], past: [] };
  }
}

async function eventDetailLoader({ params }: { params: Record<string, string | undefined> }) {
  const id = params.eventId;
  if (!id) return null;
  try {
    return await getEventById(id);
  } catch {
    return null;
  }
}

async function proposalDetailLoader({ params }: { params: Record<string, string | undefined> }) {
  const id = params.proposalId;
  if (!id) return null;
  try {
    return await fetchProposalByIdApi(id);
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

async function discoverLoader() {
  try {
    const [pool, screened] = await Promise.all([
      fetchMoviesApi(),
      fetchScreenedMoviesApi(),
    ]);
    return { pool, screened, bookPool: [], bookRead: [] };
  } catch {
    return { pool: [], screened: [], bookPool: [], bookRead: [] };
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

async function cardsLoader() {
  const userId = getStoredUserId();
  if (!userId) return { myCards: [], sentCards: [], credits: 0, people: [], quickMessages: [] };
  try {
    const data = await fetchPostcardsApi(userId);
    return { myCards: data.received ?? [], sentCards: data.sent ?? [], credits: data.credits ?? 0, people: [], quickMessages: [] };
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

async function membersLoader() {
  try {
    const members = await fetchMembersApi();
    return { members };
  } catch {
    return { members: [] };
  }
}

async function memberDetailLoader({ params }: { params: Record<string, string | undefined> }) {
  const name = params.name ? decodeURIComponent(params.name) : '';
  if (!name) return null;
  // The URL param is a name — we need to find the user by name
  // For now, fetch all members and filter (we could add a search endpoint later)
  try {
    const members = await fetchMembersApi() as any[];
    const member = members.find((m: any) => m.name === name);
    return member ? { member } : null;
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
        loader: ({ params }) => fetchBookDetail(Number(params.bookId)),
      },
      { path: 'discover/:category', element: <RecommendationListPage /> },
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
