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
import NotFoundPage from '@/pages/NotFoundPage';
import {
  fetchFeedData,
  fetchEventsData,
  fetchEventDetail,
  fetchProposalDetail,
  fetchEventRecordsData,
  fetchDiscoverData,
  fetchMovieDetail,
  fetchBookDetail,
  fetchCardsData,
  fetchProfileData,
  fetchMembersData,
  fetchMemberDetail,
  fetchAboutData,
} from '@/mock/api';

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
      { index: true, element: <FeedPage />, loader: fetchFeedData },
      { path: 'events', element: <EventsPage />, loader: fetchEventsData },
      {
        path: 'events/:eventId',
        element: <EventDetailPage />,
        loader: ({ params }) => fetchEventDetail(Number(params.eventId)),
      },
      { path: 'events/proposals', element: <Navigate to="/events" replace /> },
      { path: 'events/proposals/new', element: <ProposalCreatePage /> },
      {
        path: 'events/proposals/:proposalId',
        element: <ProposalDetailPage />,
        loader: ({ params }) => fetchProposalDetail(Number(params.proposalId)),
      },
      { path: 'events/history', element: <EventRecordsPage />, loader: fetchEventRecordsData },
      { path: 'events/new', element: <EventCreatePage /> },
      { path: 'events/small-group/new', element: <Navigate to="/events/new" replace /> },
      { path: 'discover', element: <DiscoverPage />, loader: fetchDiscoverData },
      {
        path: 'discover/movies/:movieId',
        element: <MovieDetailPage />,
        loader: ({ params }) => fetchMovieDetail(Number(params.movieId)),
      },
      {
        path: 'discover/books/:bookId',
        element: <BookDetailPage />,
        loader: ({ params }) => fetchBookDetail(Number(params.bookId)),
      },
      { path: 'discover/:category', element: <RecommendationListPage /> },
      { path: 'discover/:category/add', element: <RecommendationCreatePage /> },
      { path: 'discover/:category/:recommendationId', element: <RecommendationDetailPage /> },
      { path: 'cards', element: <CardsPage />, loader: fetchCardsData },
      { path: 'profile', element: <ProfilePage />, loader: fetchProfileData },
      { path: 'members', element: <MembersPage />, loader: fetchMembersData },
      {
        path: 'members/:name',
        element: <MemberDetailPage />,
        loader: ({ params }) => fetchMemberDetail(decodeURIComponent(params.name!)),
      },
      { path: 'about', element: <AboutPage />, loader: fetchAboutData },
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
      { path: 'titles', element: <AdminTitlesPage /> },
      { path: 'task-presets', element: <AdminTaskPresetsPage /> },
      { path: 'newsletters', element: <AdminNewslettersPage /> },
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
