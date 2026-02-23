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

export interface EventPhoto {
  id: string;
  url: string;
  uploadedBy: string;
  caption?: string;
  createdAt: string;
}

export type EventPhase = 'invite' | 'open' | 'closed' | 'ended' | 'cancelled';

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
  isPrivate?: boolean;
  photoCount?: number;
  commentCount?: number;
  comments?: EventComment[];
  contributors?: ContributionRole[];
  helpRequests?: { text: string; claimedBy?: string }[];
  /** Movie IDs nominated for this event (movie night only) */
  nominations?: number[];
  photos?: EventPhoto[];
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
  id: number;
  name: string;
  title: string;
  description?: string;
  descriptionHtml?: string;
  votes: number;
  interested: string[];
  time: string;
  comments?: FeedComment[];
  likes?: number;
  likedBy?: string[];
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

export interface BookPool {
  id: number;
  title: string;
  year: string;
  author: string;
  v: number;
  status?: string;
  by: string;
}

export interface BookRead {
  title: string;
  year: string;
  author: string;
  date: string;
  host: string;
}

export interface BookDetailData {
  id: number;
  title: string;
  year: string;
  author: string;
  v: number;
  by: string;
  status?: string;
  genre?: string;
  pages?: string;
  rating?: string;
  synopsis?: string;
  voters: string[];
  discussions: { date: string; host: string; eventTitle: string; eventId?: number }[];
  comments: { name: string; text: string; date: string }[];
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

// Feed comment (shared shape with EventComment / MovieDetailData.comments)
export interface FeedComment {
  name: string;
  text: string;
  date: string;
}

// Interaction data attached to every feed card
export interface FeedInteraction {
  likes: number;
  likedBy: string[];
  comments: FeedComment[];
  /** Number of unread/new comments to show badge */
  newComments?: number;
}

// Feed item discriminated union for the timeline
export type FeedItem =
  | { type: 'time'; label: string }
  | { type: 'activity'; name: string; title: string; date: string; location: string; spots: number; people: string[]; film?: string; scene?: string; navTarget?: string } & FeedInteraction
  | { type: 'card'; from: string; to: string; msg: string; photo?: string; navTarget?: string } & FeedInteraction
  | { type: 'movie'; name: string; title: string; year: string; dir: string; votes: number } & FeedInteraction
  | { type: 'milestone'; text: string; emoji: string } & FeedInteraction
  | { type: 'proposal'; name: string; title: string; votes: number; interested: string[] } & FeedInteraction
  | { type: 'compactMovie'; name: string; title: string; year: string; dir: string; votes: number; time: string; navTarget?: string } & FeedInteraction
  | { type: 'compactProposal'; name: string; title: string; votes: number; interested: string[]; time: string; navTarget?: string } & FeedInteraction
  | { type: 'book'; name: string; title: string; year: string; author: string; votes: number } & FeedInteraction
  | { type: 'compactBook'; name: string; title: string; year: string; author: string; votes: number; time: string; navTarget?: string } & FeedInteraction
  | {
      type: 'smallGroup';
      name: string;
      title: string;
      date: string;
      location: string;
      weekNumber: number;
      people: string[];
      capacity: number;
      description?: string;
      isHome?: boolean;
      isPrivate?: boolean;
      navTarget?: string;
    } & FeedInteraction
  | {
      type: 'compactSmallGroup';
      name: string;
      title: string;
      date: string;
      location: string;
      weekNumber: number;
      people: string[];
      capacity: number;
      time: string;
      isPrivate?: boolean;
      navTarget?: string;
    } & FeedInteraction
  | {
      type: 'commentNotice';
      name: string;
      text: string;
      targetTitle: string;
      targetType: string;
      time: string;
      navTarget?: string;
    } & FeedInteraction;

// Extended movie detail for MovieDetailPage
export interface MovieDetailData {
  id: number;
  title: string;
  year: string;
  dir: string;
  v: number;
  by: string;
  status?: string;
  genre?: string;
  duration?: string;
  rating?: string;
  synopsis?: string;
  voters: string[];
  screenings: { date: string; host: string; eventTitle: string; eventId?: number }[];
  comments: { name: string; text: string; date: string }[];
}

// Event comments for EventDetailPage
export interface EventComment {
  name: string;
  text: string;
  date: string;
}

// Contribution roles for EventDetailPage
export interface ContributionRole {
  role: string;
  name: string;
}

export interface FeedPageData {
  members: MemberData[];
  items: FeedItem[];
}

export interface EventsPageData {
  upcoming: EventData[];
  proposals: Proposal[];
  past: PastEvent[];
}

export interface DiscoverPageData {
  pool: MoviePool[];
  screened: MovieScreened[];
  bookPool: BookPool[];
  bookRead: BookRead[];
}

export interface CardsPageData {
  people: { name: string; ctx: string; badge?: string }[];
  quickMessages: string[];
  myCards: CardReceived[];
  sentCards: CardReceived[];
  credits: number;
}

export interface ProfilePageData {
  titles: string[];
  role: string;
  participationStats: {
    eventCount: number;
    hostCount: number;
    movieCount: number;
    screenedCount: number;
    proposalCount: number;
    voteCount: number;
  };
  contribution: {
    hostCount: number;
    eventCount: number;
    movieCount: number;
    cardsSent: number;
    cardsReceived: number;
  };
  myMovies: MoviePool[];
  myEvents: { id: number; title: string; date: string; scene: string; role?: string }[];
  recentCards: CardReceived[];
  timeline: { date: string; type: string; text: string; link?: string }[];
  mostSharedWith: { name: string; evtCount: number; cards: number } | null;
  closestTaste: { name: string; movies: string[] } | null;
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
