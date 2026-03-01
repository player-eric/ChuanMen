/**
 * Mock API layer — simulates async backend calls.
 * Used as React Router loaders.
 */
import type {
  EventsPageData, DiscoverPageData, CardsPageData,
  ProfilePageData, MemberDetailData, AboutPageData, FeedPageData,
  ProfilePhoto,
} from '@/types';
import {
  membersData, upcomingEvents, endedEvents, cancelledEvents,
  proposals, pastEvents,
  moviePool, movieScreened,
  bookPool, bookRead, bookDetailMap,
  cardPeople, quickMessages, myCards, cardsSent,
  feedAnnouncements, feedNewRecos, feedNewCards,
  recommendationItems,
  feedItems, movieDetailMap,
} from './data';
import type { RecoItem } from './data';
import { photos } from '@/theme';

/** Simulate network delay */
const delay = (ms = 80) => new Promise<void>((r) => setTimeout(r, ms));

export async function fetchFeedData(): Promise<FeedPageData> {
  await delay();
  return { members: membersData, items: feedItems };
}

export async function fetchEventsData(): Promise<EventsPageData> {
  await delay();
  return {
    upcoming: [...upcomingEvents, ...endedEvents, ...cancelledEvents],
    proposals,
    past: pastEvents,
  };
}

export async function fetchEventDetail(eventId: string) {
  await delay();
  const all = [...upcomingEvents, ...endedEvents, ...cancelledEvents];
  return all.find((event) => event.id === eventId) ?? null;
}

export async function fetchEventProposalsData() {
  await delay();
  return proposals;
}

export async function fetchProposalDetail(proposalId: string) {
  await delay();
  return proposals.find((p) => p.id === proposalId) ?? null;
}

export async function fetchEventRecordsData() {
  await delay();
  return pastEvents;
}

export async function fetchDiscoverData(): Promise<DiscoverPageData> {
  await delay();
  return { pool: moviePool, screened: movieScreened, bookPool, bookRead, recipes: [], music: [], places: [], externalEvents: [] };
}

export async function fetchMovieDetail(movieId: string) {
  await delay();
  return movieDetailMap[movieId] ?? moviePool.find((movie) => movie.id === movieId) ?? null;
}

export async function fetchBookDetail(bookId: string) {
  await delay();
  return bookDetailMap[bookId] ?? bookPool.find((book) => book.id === bookId) ?? null;
}

export async function fetchCardsData(): Promise<CardsPageData> {
  await delay();
  return { people: cardPeople, quickMessages, myCards, sentCards: cardsSent, credits: 6 };
}

export async function fetchProfileData(): Promise<ProfilePageData> {
  await delay();

  const userName = 'Yuan';
  const member = membersData.find((m) => m.name === userName);

  // My movies
  const myMovies = moviePool.filter((m) => m.by === userName);
  const screenedCount = myMovies.filter((m) => m.status === '已放映' || m.status === '本周放映').length;

  // My upcoming events — not yet ended/cancelled
  const myUpcoming = upcomingEvents
    .filter((e) => (e.phase === 'open' || e.phase === 'invite' || e.phase === 'closed') && (e.people.includes(userName) || e.host === userName))
    .map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      scene: e.scene,
      role: e.host === userName ? 'Host' : undefined,
    }));

  // My past events — from upcoming (ended) + endedEvents
  const allEvents = [...upcomingEvents, ...endedEvents];
  const myEvents = allEvents
    .filter((e) => (e.phase === 'ended' || !('phase' in e)) && (e.people.includes(userName) || e.host === userName))
    .map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      scene: e.scene,
      role: e.host === userName ? 'Host' : undefined,
    }));

  // Vote count — sum of votes on movies the user recommended
  const voteCount = myMovies.reduce((sum, m) => sum + m.v, 0);

  // Proposal count
  const proposalCount = proposals.filter((p) => p.name === userName).length;

  // Timeline — merge events, movies, cards, proposals
  const timeline: ProfilePageData['timeline'] = [];

  // Events user participated in
  for (const e of allEvents.filter((ev) => ev.people.includes(userName) || ev.host === userName)) {
    const emoji = e.host === userName ? '🏠' : '📅';
    const action = e.host === userName ? `Host 了「${e.title}」` : `参加了「${e.title}」`;
    timeline.push({ date: e.date.split(' ')[0], type: 'event', text: `${emoji} ${action}`, link: `/events/${e.id}` });
  }

  // Movies user recommended
  for (const m of myMovies) {
    timeline.push({ date: '', type: 'movie', text: `🎬 推荐了「${m.title}」`, link: `/discover/movies/${m.id}` });
  }

  // Cards received
  for (const card of myCards.slice(0, 5)) {
    timeline.push({ date: card.date, type: 'card', text: `💌 收到 ${card.from} 的感谢卡` });
  }

  // Cards sent
  for (const card of cardsSent.slice(0, 3)) {
    timeline.push({ date: card.date, type: 'card', text: `✉️ 寄出了一张感谢卡` });
  }

  // Sort by date descending (MM.DD format)
  timeline.sort((a, b) => {
    const toNum = (d: string) => {
      if (!d) return 0;
      const [m, dd] = d.split('.');
      return Number(m) * 100 + Number(dd);
    };
    return toNum(b.date) - toNum(a.date);
  });

  // Gallery photos — aggregate photos from ended events the user participated in
  const galleryPhotos: ProfilePhoto[] = [];
  for (const e of allEvents.filter((ev) => ev.phase === 'ended' && (ev.people.includes(userName) || ev.host === userName))) {
    if (e.photos) {
      for (const p of e.photos) {
        galleryPhotos.push({
          id: p.id,
          url: p.url,
          uploadedBy: p.uploadedBy,
          caption: p.caption,
          createdAt: p.createdAt,
          eventId: e.id,
          eventTitle: e.title,
        });
      }
    }
  }

  // Voted movies — movies the user voted for (from movieDetailMap)
  const votedMovies = moviePool.filter((m) => {
    const detail = movieDetailMap[m.id];
    return detail && detail.voters.includes(userName) && m.by !== userName;
  });

  // Most shared experiences — member with highest evtCount (excluding self)
  const others = membersData.filter((m) => m.name !== userName);
  const sortedByEvents = [...others].sort((a, b) => b.mutual.evtCount - a.mutual.evtCount);
  const mostShared = sortedByEvents[0] ?? null;

  // Closest taste — member with most mutual movies (excluding self)
  const sortedByMovies = [...others].sort((a, b) => b.mutual.movies.length - a.mutual.movies.length);
  const closestTaste = sortedByMovies[0] ?? null;

  // Recent closest — from people who attended events in last 3 months AND share movie taste
  const recentEventPeople = new Set<string>();
  for (const e of allEvents.filter((ev) => ev.phase === 'ended' && (ev.people.includes(userName) || ev.host === userName))) {
    for (const p of e.people) {
      if (p !== userName) recentEventPeople.add(p);
    }
  }
  const recentOthers = others.filter((m) => recentEventPeople.has(m.name));
  const sortedRecentByMovies = [...recentOthers].sort((a, b) => b.mutual.movies.length - a.mutual.movies.length);
  const recentClosest = sortedRecentByMovies[0] ?? null;

  return {
    titles: member?.titles ?? [],
    role: member?.role ?? '',
    participationStats: {
      eventCount: member?.mutual.evtCount ?? 0,
      hostCount: member?.host ?? 0,
      movieCount: myMovies.length,
      screenedCount,
      proposalCount,
      voteCount,
    },
    contribution: {
      hostCount: 6,
      eventCount: 18,
      movieCount: 12,
      cardsSent: cardsSent.length,
      cardsReceived: myCards.length,
    },
    myMovies,
    votedMovies,
    upcomingEvents: myUpcoming,
    myEvents,
    recentCards: myCards.slice(0, 5),
    sentCards: cardsSent,
    galleryPhotos,
    timeline: timeline.slice(0, 15),
    mostSharedWith: mostShared
      ? { name: mostShared.name, evtCount: mostShared.mutual.evtCount, cards: mostShared.mutual.cards }
      : null,
    closestTaste: closestTaste
      ? { name: closestTaste.name, movies: closestTaste.mutual.movies }
      : null,
    recentClosest: recentClosest
      ? { name: recentClosest.name, movies: recentClosest.mutual.movies }
      : null,
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
    eventCount: pastEvents.length + upcomingEvents.length + endedEvents.length,
    months: 8,
    milestones: [],
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
