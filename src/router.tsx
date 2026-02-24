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

async function feedLoader() {
  try {
    return await fetchFeedApi();
  } catch {
    return { events: [], announcements: [], recommendations: [], members: [], postcards: [], recentMovies: [], recentProposals: [] };
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
  if (!userId) return { received: [], sent: [], credits: 0, people: [], quickMessages: [] };
  try {
    const data = await fetchPostcardsApi(userId);
    return { ...data, people: [], quickMessages: [] };
  } catch {
    return { received: [], sent: [], credits: 0, people: [], quickMessages: [] };
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
