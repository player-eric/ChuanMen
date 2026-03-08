/** Shared TypeScript types (v2.1) */

export interface MemberMutual {
  movies: string[];
  events: string[];
  evtCount: number;
  cards: number;
  recommendations?: Record<string, { id: string; title: string }[]>;
  tasteCount?: number;
}

export interface MemberData {
  name: string;
  email?: string;
  hideEmail?: boolean;
  avatar?: string;
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

export type FoodOption = 'potluck' | 'host_cook' | 'eat_out' | 'none';

export type SignupStatus = 'invited' | 'offered' | 'accepted' | 'waitlist' | 'declined' | 'rejected' | 'cancelled';

export interface SignupInfo {
  userId: string;
  name: string;
  status: SignupStatus;
  offeredAt?: string;
}

export interface EventData {
  id: string;
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
  filmPoster?: string;
  linkedRecommendations?: { id: string; title: string; category: string; coverUrl?: string; description?: string; linkedById?: string; isSelected?: boolean; isNomination?: boolean; globalVotes?: number; attendeeVotes?: number; attendeeTotal?: number; linkedByName?: string; voterIds?: string[] }[];
  recSelectionMode?: string;
  recCategories?: string[];
  recCategoryModes?: Record<string, string>;
  spots: number;
  total: number;
  people: string[];
  phase: EventPhase;
  invitedBy?: string;
  desc: string;
  houseRules?: string;
  isPrivate?: boolean;
  foodOption?: FoodOption;
  restaurantLocation?: string;
  photoCount?: number;
  commentCount?: number;
  comments?: EventComment[];
  tasks?: TaskRole[];
  /** Movie IDs nominated for this event (movie night only) */
  nominations?: string[];
  photos?: EventPhoto[];
  /** Number of people on the waitlist */
  waitlistCount?: number;
  /** Current user's signup status */
  mySignupStatus?: SignupStatus;
  /** Offered timestamp (for countdown) */
  myOfferedAt?: string;
  /** Detailed signup info (for host waitlist management) */
  signupDetails?: SignupInfo[];
  /** Co-host display names */
  coHosts?: string[];
  /** Co-host user IDs */
  coHostIds?: string[];
}

export interface PastEvent {
  id?: string;
  title: string;
  host: string;
  date: string;
  startsAt?: string;
  people: number;
  scene: string;
  film?: string;
  photoCount?: number;
  commentCount?: number;
  likeCount?: number;
}

export interface Proposal {
  id: string;
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
  id: string;
  title: string;
  year: string;
  dir: string;
  v: number;
  voterIds: string[];
  status?: string;
  by: string;
  poster?: string;
}

export interface MovieScreened {
  title: string;
  year: string;
  dir: string;
  date: string;
  host: string;
}

export interface BookPool {
  id: string;
  title: string;
  year: string;
  author: string;
  v: number;
  voterIds: string[];
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
  id: string;
  title: string;
  year: string;
  author: string;
  v: number;
  voterIds: string[];
  by: string;
  status?: string;
  genre?: string;
  pages?: string;
  rating?: string;
  synopsis?: string;
  voters: string[];
  discussions: { date: string; host: string; eventTitle: string; eventId?: string }[];
  comments: { name: string; text: string; date: string }[];
}

export type PostcardSourceType = 'free' | 'purchased';

export interface CardReceived {
  id?: string;
  from: string;
  message: string;
  stamp: string;
  date: string;
  photo?: string;
  visibility: 'public' | 'private';
  sourceType?: PostcardSourceType;
  tags?: string[];
  eventCtx?: string;
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
  | { type: 'activity'; name: string; title: string; date: string; location: string; spots: number; total?: number; people: string[]; film?: string; filmPoster?: string; scene?: string; navTarget?: string; waitlistCount?: number; taskSummary?: { role: string; claimerName?: string }[] } & FeedInteraction
  | { type: 'card'; from: string; to: string; message: string; photo?: string; navTarget?: string } & FeedInteraction
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
    } & FeedInteraction
  | {
      type: 'actionNotice';
      action: 'event_join' | 'photo_upload' | 'movie_nominate' | 'movie_vote'
            | 'book_vote' | 'task_claim' | 'host_help'
            | 'interest_express' | 'film_select'
            | 'mention' | 'event_invite' | 'task_assign'
            | 'postcard_received' | 'waitlist_offered' | 'waitlist_approved'
            | 'proposal_realized';
      name: string;
      targetTitle: string;
      time: string;
      detail?: string;
      photoUrls?: string[];
      navTarget?: string;
    } & FeedInteraction
  | {
      type: 'newMember';
      phase: 'introducing' | 'welcomed';
      id: string;
      name: string;
      bio: string;
      location: string;
      selfAsFriend: string;
      idealFriend: string;
      participationPlan: string;
      announcedAt: string;
      announcedEndAt: string;
      approvedAt?: string;
      avatar?: string;
      likes: number;
      likedBy: string[];
    }
  | {
      type: 'birthday';
      id: string;
      name: string;
      avatar?: string;
      birthday: string;
    } & FeedInteraction
  | {
      type: 'compactRecommendation';
      name: string;
      title: string;
      category: string;
      categoryIcon: string;
      votes: number;
      time: string;
      navTarget?: string;
    } & FeedInteraction
  | {
      type: 'announcement';
      title: string;
      body: string;
      announcementType: string;
      emoji: string;
      authorName: string;
      time: string;
    } & FeedInteraction;

// Extended movie detail for MovieDetailPage
export interface MovieDetailData {
  id: string;
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
  screenings: { date: string; host: string; eventTitle: string; eventId?: string }[];
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

// Unified task role (replaces contributors + helpRequests)
export interface TaskRole {
  role: string;       // 任务描述，如"选片"、"带零食"
  name?: string;      // 负责人名（空=待认领）
}

// Persisted event task from backend
export interface EventTaskData {
  id: string;
  eventId: string;
  role: string;
  description: string;
  claimedById: string | null;
  claimedBy: { id: string; name: string; avatar?: string } | null;
  isCustom: boolean;
  createdAt: string;
}

export interface LotteryDraw {
  id: string;
  weekKey: string;
  weekNumber: number;
  drawnMemberId: string;
  status: 'pending' | 'accepted' | 'completed' | 'skipped';
  eventId: string | null;
  drawnMember: { id: string; name: string; avatar: string };
  event?: { id: string; title: string; startsAt?: string } | null;
}

export interface FeedPageData {
  members: MemberData[];
  items: FeedItem[];
  currentLottery?: LotteryDraw | null;
  lotteryUserStatus?: { hostCandidate: boolean; consecutiveEvents: number } | null;
  postcardCredits?: number;
}

export interface EventsPageData {
  upcoming: EventData[];
  proposals: Proposal[];
  past: PastEvent[];
}

export interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  authorName: string;
  authorId: string;
  coverUrl?: string;
  sourceUrl?: string;
  voteCount: number;
  voterIds: string[];
  category: string;
}

export interface DiscoverPageData {
  pool: MoviePool[];
  screened: MovieScreened[];
  bookPool: BookPool[];
  bookRead: BookRead[];
  recipes: RecommendationItem[];
  music: RecommendationItem[];
  places: RecommendationItem[];
  externalEvents: RecommendationItem[];
}

export interface EligibleEvent {
  eventId: string;
  title: string;
  startsAt: string | null;
  people: { id: string; name: string; avatar?: string | null }[];
}

export interface CardsPageData {
  people: { id?: string; name: string; ctx: string; badge?: string }[];
  eligibleEvents: EligibleEvent[];
  quickMessages: string[];
  myCards: CardReceived[];
  sentCards: CardReceived[];
  credits: number;
}

export interface ProfilePhoto {
  id: string;
  url: string;
  uploadedBy: string;
  caption?: string;
  createdAt: string;
  eventId: string;
  eventTitle: string;
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
  votedMovies: MoviePool[];
  upcomingEvents: { id: string; title: string; date: string; scene: string; role?: string }[];
  myEvents: { id: string; title: string; date: string; scene: string; role?: string }[];
  recentCards: CardReceived[];
  sentCards: CardReceived[];
  galleryPhotos: ProfilePhoto[];
  timeline: { date: string; type: string; text: string; link?: string }[];
  mostSharedWith: { name: string; evtCount: number; cards: number } | null;
  closestTaste: { name: string; movies: string[] } | null;
  recentClosest: { name: string; movies: string[] } | null;
}

export interface MemberDetailData {
  member: MemberData;
}

export interface MilestoneItem {
  id: string;
  title: string;
  body: string;
  type: string;
  createdAt: string;
}

export interface AboutPageData {
  memberCount: number;
  hostCount: number;
  eventCount: number;
  months: number;
  milestones: MilestoneItem[];
}
