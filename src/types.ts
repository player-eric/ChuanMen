/** Shared TypeScript types (v2.1) */

export interface MemberMutual {
  movies: string[];
  events: string[];
  evtCount: number;
  cards: number;
}

export interface MemberData {
  name: string;
  email?: string;
  hideEmail?: boolean;
  role: string;
  host: number;
  badge?: string;
  titles: string[];
  mutual: MemberMutual;
  bio?: string;
  selfAsFriend?: string;
  idealFriend?: string;
  participationPlan?: string;
  coverImageUrl?: string;
  location?: string;
}

export type EventPhase = 'invite' | 'open' | 'live' | 'ended' | 'cancelled';

export interface EventData {
  id: number;
  title: string;
  host: string;
  date: string;
  endDate?: string;
  inviteDeadline?: string;
  location: string;
  locationPrivate?: string;
  isHomeEvent?: boolean;
  scene: string;
  film?: string;
  spots: number;
  total: number;
  people: string[];
  phase: EventPhase;
  invitedBy?: string;
  desc: string;
  houseRules?: string;
  photoCount?: number;
  commentCount?: number;
}

export interface PastEvent {
  title: string;
  host: string;
  date: string;
  people: number;
  scene: string;
  film?: string;
  photoCount?: number;
  commentCount?: number;
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

export type PostcardSourceType = 'free' | 'purchased';

export interface CardReceived {
  from: string;
  msg: string;
  stamp: string;
  date: string;
  photo?: string;
  priv: boolean;
  sourceType?: PostcardSourceType;
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
  credits: number;
}

export interface ProfilePageData {
  stats: { n: string; l: string }[];
  recentCards: CardReceived[];
  recentActivity: { name: string; date: string; role?: string; emoji: string }[];
  contribution: {
    hostCount: number;
    eventCount: number;
    movieCount: number;
    cardsSent: number;
    cardsReceived: number;
  };
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
