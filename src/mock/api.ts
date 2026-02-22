/**
 * Mock API layer — simulates async backend calls.
 * Used as React Router loaders.
 */
import type {
  EventsPageData, DiscoverPageData, CardsPageData,
  ProfilePageData, MemberDetailData, AboutPageData, FeedPageData,
} from '@/types';
import {
  membersData, upcomingEvents, liveEvents, endedEvents, cancelledEvents,
  proposals, pastEvents,
  moviePool, movieScreened,
  cardPeople, quickMessages, myCards, cardsSent,
  profileStats, recentActivity,
  feedAnnouncements, feedNewRecos, feedNewCards,
  recommendationItems,
} from './data';
import type { RecoItem } from './data';
import { photos } from '@/theme';

/** Simulate network delay */
const delay = (ms = 80) => new Promise<void>((r) => setTimeout(r, ms));

export async function fetchFeedData(): Promise<FeedPageData> {
  await delay();
  return { members: membersData };
}

export async function fetchEventsData(): Promise<EventsPageData> {
  await delay();
  return {
    upcoming: [...upcomingEvents, ...liveEvents, ...endedEvents, ...cancelledEvents],
    proposals,
    past: pastEvents,
  };
}

export async function fetchEventDetail(eventId: number) {
  await delay();
  const all = [...upcomingEvents, ...liveEvents, ...endedEvents, ...cancelledEvents];
  return all.find((event) => event.id === eventId) ?? null;
}

export async function fetchEventProposalsData() {
  await delay();
  return proposals;
}

export async function fetchEventRecordsData() {
  await delay();
  return pastEvents;
}

export async function fetchDiscoverData(): Promise<DiscoverPageData> {
  await delay();
  return { pool: moviePool, screened: movieScreened };
}

export async function fetchMovieDetail(movieId: number) {
  await delay();
  return moviePool.find((movie) => movie.id === movieId) ?? null;
}

export async function fetchCardsData(): Promise<CardsPageData> {
  await delay();
  return { people: cardPeople, quickMessages, myCards, credits: 6 };
}

export async function fetchProfileData(): Promise<ProfilePageData> {
  await delay();
  return {
    stats: profileStats,
    recentCards: myCards.slice(0, 5),
    recentActivity,
    contribution: {
      hostCount: 6,
      eventCount: 18,
      movieCount: 12,
      cardsSent: cardsSent.length,
      cardsReceived: myCards.length,
    },
  };
}

export async function fetchMemberDetail(name: string): Promise<MemberDetailData | null> {
  await delay();
  const member = membersData.find((m) => m.name === name);
  if (!member) return null;
  return { member };
}

export async function fetchMembersData() {
  await delay();
  return { members: membersData };
}

export async function fetchAboutData(): Promise<AboutPageData> {
  await delay();
  return {
    memberCount: membersData.length,
    hostCount: membersData.filter((m) => m.host > 0).length,
    eventCount: pastEvents.length + upcomingEvents.length + liveEvents.length,
    months: 8,
  };
}

/** Feed data helpers — exported for FeedPage to use directly */
export { feedAnnouncements, feedNewRecos, feedNewCards };

/* ═══ Recommendations — mock fallback for CSR / Amplify ═══ */

export async function fetchRecommendations(
  category: string,
  keyword: string,
): Promise<{ items: Record<string, unknown>[] }> {
  await delay();
  let items: RecoItem[] = recommendationItems.filter((r) => r.category === category);
  if (keyword) {
    const q = keyword.toLowerCase();
    items = items.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }
  return { items: items as unknown as Record<string, unknown>[] };
}

export async function fetchRecommendationById(
  id: string,
): Promise<Record<string, unknown> | null> {
  await delay();
  const item = recommendationItems.find((r) => r._id === id) ?? null;
  return item as unknown as Record<string, unknown> | null;
}
