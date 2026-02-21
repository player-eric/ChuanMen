/**
 * Mock API layer — simulates async backend calls.
 * Used as React Router loaders.
 */
import type {
  EventsPageData, DiscoverPageData, CardsPageData,
  ProfilePageData, MemberDetailData, AboutPageData, FeedPageData,
} from '@/types';
import {
  membersData, upcomingEvents, proposals, pastEvents,
  moviePool, movieScreened, cardPeople, quickMessages, myCards,
  profileStats, recentActivity,
} from './data';
import { photos } from '@/theme';

/** Simulate network delay */
const delay = (ms = 80) => new Promise<void>((r) => setTimeout(r, ms));

export async function fetchFeedData(): Promise<FeedPageData> {
  await delay();
  return { members: membersData };
}

export async function fetchEventsData(): Promise<EventsPageData> {
  await delay();
  return { upcoming: upcomingEvents, proposals, past: pastEvents };
}

export async function fetchDiscoverData(): Promise<DiscoverPageData> {
  await delay();
  return { pool: moviePool, screened: movieScreened };
}

export async function fetchCardsData(): Promise<CardsPageData> {
  await delay();
  return { people: cardPeople, quickMessages, myCards };
}

export async function fetchProfileData(): Promise<ProfilePageData> {
  await delay();
  return {
    stats: profileStats,
    recentCards: [
      { from: '白开水', msg: '地下室像个小影院', stamp: '🎬', date: '02.08', photo: photos.movieNight, priv: false },
      { from: 'Tiffy', msg: '氛围超棒！', stamp: '🍳', date: '02.01', priv: true },
    ],
    recentActivity,
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
    memberCount: 42,
    hostCount: membersData.filter((m) => m.host > 0).length,
    eventCount: 50,
    months: 8,
  };
}
