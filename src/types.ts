/** Shared TypeScript types */

export interface MemberMutual {
  movies: string[];
  events: string[];
  evtCount: number;
  cards: number;
}

export interface MemberData {
  name: string;
  role: string;
  host: number;
  badge?: string;
  titles: string[];
  mutual: MemberMutual;
}

export interface EventData {
  id: number;
  title: string;
  host: string;
  date: string;
  location: string;
  scene: string;
  film?: string;
  spots: number;
  total: number;
  people: string[];
  phase: 'open' | 'invite';
  invitedBy?: string;
  desc: string;
}

export interface PastEvent {
  title: string;
  host: string;
  date: string;
  people: number;
  scene: string;
  film?: string;
}

export interface Proposal {
  name: string;
  title: string;
  votes: number;
  interested: string[];
  time: string;
}

export interface MoviePool {
  id: number;
  title: string;
  year: string;
  dir: string;
  v: number;
  status?: string;
  by: string;
}

export interface MovieScreened {
  title: string;
  year: string;
  dir: string;
  date: string;
  host: string;
}

export interface CardReceived {
  from: string;
  msg: string;
  stamp: string;
  date: string;
  photo?: string;
  priv: boolean;
}

export interface Collaborator {
  name: string;
  role: string;
}

export interface FeedPageData {
  members: MemberData[];
}

export interface EventsPageData {
  upcoming: EventData[];
  proposals: Proposal[];
  past: PastEvent[];
}

export interface DiscoverPageData {
  pool: MoviePool[];
  screened: MovieScreened[];
}

export interface CardsPageData {
  people: { name: string; ctx: string; badge?: string }[];
  quickMessages: string[];
  myCards: CardReceived[];
}

export interface ProfilePageData {
  stats: { n: string; l: string }[];
  recentCards: CardReceived[];
  recentActivity: { name: string; date: string; role?: string; emoji: string }[];
}

export interface MemberDetailData {
  member: MemberData;
}

export interface AboutPageData {
  memberCount: number;
  hostCount: number;
  eventCount: number;
  months: number;
}
