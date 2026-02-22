import { createBrowserRouter } from 'react-router';
import AppLayout from '@/layouts/AppLayout';
import FeedPage from '@/pages/FeedPage';
import EventsPage from '@/pages/EventsPage';
import EventDetailPage from '@/pages/EventDetailPage';
import EventProposalsPage from '@/pages/EventProposalsPage';
import EventRecordsPage from '@/pages/EventRecordsPage';
import DiscoverPage from '@/pages/DiscoverPage';
import MovieDetailPage from '@/pages/MovieDetailPage';
import CardsPage from '@/pages/CardsPage';
import ProfilePage from '@/pages/ProfilePage';
import MembersPage from '@/pages/MembersPage';
import MemberDetailPage from '@/pages/MemberDetailPage';
import AboutPage from '@/pages/AboutPage';
import RegisterPage from '@/pages/RegisterPage';
import LoginPage from '@/pages/LoginPage';
import {
  fetchFeedData,
  fetchEventsData,
  fetchEventDetail,
  fetchEventProposalsData,
  fetchEventRecordsData,
  fetchDiscoverData,
  fetchMovieDetail,
  fetchCardsData,
  fetchProfileData,
  fetchMembersData,
  fetchMemberDetail,
  fetchAboutData,
} from '@/mock/api';

const router = createBrowserRouter([
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
      { path: 'events/proposals', element: <EventProposalsPage />, loader: fetchEventProposalsData },
      { path: 'events/history', element: <EventRecordsPage />, loader: fetchEventRecordsData },
      { path: 'discover', element: <DiscoverPage />, loader: fetchDiscoverData },
      {
        path: 'discover/movies/:movieId',
        element: <MovieDetailPage />,
        loader: ({ params }) => fetchMovieDetail(Number(params.movieId)),
      },
      { path: 'cards', element: <CardsPage />, loader: fetchCardsData },
      { path: 'profile', element: <ProfilePage />, loader: fetchProfileData },
      { path: 'members', element: <MembersPage />, loader: fetchMembersData },
      {
        path: 'members/:name',
        element: <MemberDetailPage />,
        loader: ({ params }) => fetchMemberDetail(decodeURIComponent(params.name!)),
      },
      { path: 'about', element: <AboutPage />, loader: fetchAboutData },
    ],
  },
]);

export default router;
