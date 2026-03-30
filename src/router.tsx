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
import AdminEmailPage from '@/pages/admin/AdminEmailPage';
import AdminNewslettersPage from '@/pages/admin/AdminNewslettersPage';
import AdminTitlesPage from '@/pages/admin/AdminTitlesPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AdminTaskPresetsPage from '@/pages/admin/AdminTaskPresetsPage';
import AdminContentPage from '@/pages/admin/AdminContentPage';
import AdminCardsPage from '@/pages/admin/AdminCardsPage';
import AdminAnnouncementsPage from '@/pages/admin/AdminAnnouncementsPage';
import AdminCommunityInfoPage from '@/pages/admin/AdminCommunityInfoPage';
import AdminDailyQuestionsPage from '@/pages/admin/AdminDailyQuestionsPage';
import AdminFeedbackPage from '@/pages/admin/AdminFeedbackPage';
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
  fetchMemberByNameApi,
  fetchProfileByNameApi,
  fetchUserByIdApi,
  fetchAboutStatsApi,
  fetchProposalsApi,
  fetchRecommendationsApi,
  fetchRecommendationByIdApi,
  fetchAnnouncementsApi,
  fetchCoAttendees,
  fetchSiteConfig,
} from '@/lib/domainApi';
import { eventTagToScene, hostMilestoneBadge, type HostBadgeTier } from '@/lib/mappings';
import { mapUser, mapPeople } from '@/lib/mappers';

/* ── Loader helpers (call real backend) ── */

/** Personal notification action types (shown in top bar, not in timeline) */
const PERSONAL_ACTIONS = new Set([
  'mention', 'event_invite', 'task_assign',
  'postcard_received', 'waitlist_offered', 'waitlist_approved',
  'proposal_realized',
  'application_received', 'application_approved',
  'comment_reply',
]);

/** Transform raw feed API data into FeedItem[] for the timeline */
function buildFeedItems(data: any, myVotedIds?: { movieIds: string[]; proposalIds: string[]; recommendationIds: string[] }): { items: any[]; personalNotifications: any[] } {
  const votedMovies = new Set(myVotedIds?.movieIds ?? []);
  const votedProposals = new Set(myVotedIds?.proposalIds ?? []);
  const votedRecs = new Set(myVotedIds?.recommendationIds ?? []);
  const items: any[] = [];
  const personalNotifications: any[] = [];

  // Group by date — use YYYY/MM/DD sort key, display MM/DD label
  const dateGroups = new Map<string, any[]>();
  const dateLabelMap = new Map<string, string>(); // sortKey → display label
  const addToDate = (sortKey: string, label: string, item: any, tsIso?: string) => {
    const key = sortKey || 'unknown';
    if (!dateGroups.has(key)) dateGroups.set(key, []);
    item._ts = tsIso ? new Date(tsIso).getTime() : 0;
    dateGroups.get(key)!.push(item);
    if (!dateLabelMap.has(key)) dateLabelMap.set(key, label);
  };

  /** Return [sortKey, displayLabel] from a date string */
  const dateParts = (isoStr: string | undefined): [string, string] => {
    if (!isoStr) return ['', ''];
    const dt = new Date(isoStr);
    const sort = dt.toISOString().slice(0, 10); // YYYY-MM-DD
    const label = dt.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    return [sort, label];
  };

  /** Pick the more recent of createdAt and latestCommentAt for feed sorting */
  const activityDate = (item: { createdAt?: string; latestCommentAt?: string }): string | undefined => {
    if (!item.latestCommentAt) return item.createdAt;
    if (!item.createdAt) return item.latestCommentAt;
    return item.latestCommentAt > item.createdAt ? item.latestCommentAt : item.createdAt;
  };

  // Events → activity items (grouped by real activity time)
  for (const e of (data.events ?? [])) {
    const [sortKey, sortLabel] = dateParts(e.activityAt ?? e.createdAt);
    const fmt = (iso: string) => { const dt = new Date(iso); return dt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' }); };
    const datePart = e.startsAt ? new Date(e.startsAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', timeZone: 'America/New_York' }) : '';
    const timePart = e.startsAt ? fmt(e.startsAt) : '';
    const endTimePart = e.endsAt ? fmt(e.endsAt) : '';
    const d = timePart ? `${datePart} ${timePart}${endTimePart ? '-' + endTimePart : ''}` : datePart;
    const hostName = e.host?.name ?? '';
    const allSignups = (e.signups ?? []) as any[];
    const feedOccupying = allSignups.filter((s: any) => ['accepted', 'invited', 'offered'].includes(s.status));
    const feedWaitlist = allSignups.filter((s: any) => s.status === 'waitlist');
    const feedCoHosts: { name: string; avatar?: string }[] = mapPeople(e.coHosts ?? []);
    // People displayed: host + co-hosts + accepted/offered (invited hidden)
    const feedAccepted = allSignups.filter((s: any) => ['accepted', 'offered'].includes(s.status));
    const people: { name: string; avatar?: string }[] = mapPeople(feedAccepted);
    // Host 默认也是参与者之一
    const hostAvatar = mapUser(e.host).avatar;
    if (hostName && !people.some(p => p.name === hostName)) {
      people.unshift({ name: hostName, avatar: hostAvatar });
    }
    for (const ch of feedCoHosts) {
      if (ch.name && !people.some(p => p.name === ch.name)) people.push(ch);
    }
    // Build task summary for feed card
    const feedTasks = ((e as any).tasks ?? []).map((t: any) => ({
      role: t.role,
      claimerName: t.claimedBy?.name ?? undefined,
    }));
    const feedHostSlots = 1 + feedCoHosts.length;
    addToDate(sortKey, sortLabel, {
      _key: `activity-${e.id}`,
      type: 'activity',
      name: hostName,
      hostAvatar: hostAvatar,
      title: e.title,
      date: d,
      time: e.activityAt ? timeAgo(e.activityAt) : (e.createdAt ? timeAgo(e.createdAt) : ''),
      activityHint: e.activityHint as string | undefined,
      activityHintUser: e.activityHintUser as string | undefined,
      activityHintComment: e.activityHintComment as string | undefined,
      hostId: e.host?.id ?? '',
      location: e.city || e.location || '',
      spots: Math.max(0, (e.capacity ?? 8) - feedHostSlots - feedOccupying.length),
      total: e.capacity ?? 8,
      people,
      signupUserIds: allSignups.filter((s: any) => s.status === 'accepted').map((s: any) => s.user?.id ?? s.userId).filter(Boolean),
      pendingUserIds: allSignups.filter((s: any) => s.status === 'pending').map((s: any) => s.user?.id ?? s.userId).filter(Boolean),
      waitlistUserIds: allSignups.filter((s: any) => s.status === 'waitlist' || s.status === 'offered').map((s: any) => s.user?.id ?? s.userId).filter(Boolean),
      film: e.screenedMovies?.[0]?.movie?.title,
      filmPoster: e.screenedMovies?.[0]?.movie?.poster || undefined,
      scene: e.titleImageUrl || eventTagToScene[e.tags?.[0]] || e.tags?.[0] || '',
      navTarget: `/events/${e.id}`,
      phase: e.phase ?? 'open',
      startsAt: e.startsAt ?? '',
      isHomeEvent: e.isHomeEvent ?? false,
      isPrivate: e.isPrivate ?? false,
      waitlistCount: feedWaitlist.length,
      signupMode: e.signupMode || 'direct',
      likes: e.likes ?? 0,
      likedBy: e.likedBy ?? [],
      comments: [],
      commentCount: e.commentCount ?? 0,
      newComments: e.newCommentCount ?? 0,
      photoCount: e.photoCount ?? 0,
      taskSummary: feedTasks.length > 0 ? feedTasks : undefined,
    }, e.activityAt ?? e.createdAt);
  }

  // Postcards → card items
  for (const p of (data.postcards ?? [])) {
    const ad = activityDate(p);
    const [sk, d] = dateParts(ad);
    addToDate(sk, d, {
      _key: `card-${p.id}`,
      type: 'card',
      from: p.from?.name ?? '',
      to: p.to?.name ?? '',
      fromAvatar: p.from?.avatar || undefined,
      toAvatar: p.to?.avatar || undefined,
      message: p.message ?? '',
      photo: p.photoUrl || undefined,
      stamp: (p.tags as any[])?.[0]?.value ?? undefined,
      time: p.createdAt ? timeAgo(p.createdAt) : '',
      visibility: p.visibility ?? 'public',
      likes: p.likes ?? 0,
      likedBy: p.likedBy ?? [],
      comments: [],
      commentCount: p.commentCount ?? 0,
      newComments: p.newCommentCount ?? 0,
      cardId: p.id,
    }, ad);
  }

  // Movies → compactMovie items
  for (const m of (data.recentMovies ?? [])) {
    const ad = activityDate(m);
    const [sk, d] = dateParts(ad);
    const time = m.createdAt ? timeAgo(m.createdAt) : '';
    addToDate(sk, d, {
      _key: `movie-${m.id}`,
      type: 'compactMovie',
      entityId: m.id,
      name: mapUser(m.recommendedBy).name,
      avatar: mapUser(m.recommendedBy).avatar,
      title: m.title,
      year: String(m.year ?? ''),
      dir: m.director ?? '',
      poster: m.poster || undefined,
      votes: m._count?.votes ?? 0,
      voted: votedMovies.has(m.id),
      time,
      navTarget: `/discover/movies/${m.id}`,
      likes: m.likes ?? 0,
      likedBy: m.likedBy ?? [],
      comments: [],
      commentCount: m.commentCount ?? 0,
      newComments: m.newCommentCount ?? 0,
    }, ad);
  }

  // New members → newMember items (introducing + welcomed)
  for (const m of (data.newMembers ?? [])) {
    const isAnnounced = m.userStatus === 'announced';
    const phase = isAnnounced ? 'introducing' : 'welcomed';
    const dateStr = isAnnounced ? m.announcedAt : m.approvedAt;
    const ad = m.latestCommentAt && m.latestCommentAt > (dateStr ?? '') ? m.latestCommentAt : dateStr;
    const [sk, d] = dateParts(ad);
    addToDate(sk, d, {
      _key: `newMember-${m.id}`,
      type: 'newMember',
      phase,
      id: m.id,
      name: m.name ?? '',
      bio: m.bio ?? '',
      location: [m.city, m.state].filter(Boolean).join(', ') || '',
      selfAsFriend: m.selfAsFriend ?? '',
      idealFriend: m.idealFriend ?? '',
      participationPlan: m.participationPlan ?? '',
      announcedAt: m.announcedAt ?? '',
      announcedEndAt: m.announcedEndAt ?? '',
      approvedAt: m.approvedAt,
      avatar: m.avatar,
      likes: m.likes ?? 0,
      likedBy: m.likedBy ?? [],
      comments: [],
      commentCount: m.commentCount ?? 0,
      newComments: m.newCommentCount ?? 0,
    }, ad);
  }

  // Birthday users → collected separately to pin at top
  const birthdayItems: any[] = [];
  for (const bu of (data.birthdayUsers ?? [])) {
    birthdayItems.push({
      _key: `birthday-${bu.id}`,
      type: 'birthday',
      id: bu.id,
      name: bu.name,
      avatar: bu.avatar,
      birthday: bu.birthday,
      likes: 0,
      likedBy: [],
      comments: [],
      commentCount: 0,
      newComments: 0,
    });
  }

  // Recommendations → compactRecommendation items
  const categoryIcons: Record<string, string> = {
    book: '📖', recipe: '🍽️', place: '📍', music: '🎵', external_event: '🎭', movie: '🎬',
  };
  for (const r of (data.recommendations ?? [])) {
    const ad = activityDate(r);
    const [sk, d] = dateParts(ad);
    const time = r.createdAt ? timeAgo(r.createdAt) : '';
    const cat = r.category ?? 'book';
    addToDate(sk, d, {
      _key: `rec-${r.id}`,
      type: 'compactRecommendation',
      entityId: r.id,
      name: mapUser(r.author).name,
      avatar: mapUser(r.author).avatar,
      title: r.title,
      category: cat,
      categoryIcon: categoryIcons[cat] ?? '📖',
      coverUrl: r.coverUrl || undefined,
      votes: r._count?.votes ?? r.voteCount ?? 0,
      voted: votedRecs.has(r.id),
      time,
      navTarget: `/discover/${cat}/${r.id}`,
      likes: r.likes ?? 0,
      likedBy: r.likedBy ?? [],
      comments: [],
      commentCount: r.commentCount ?? 0,
      newComments: r.newCommentCount ?? 0,
    }, ad);
  }

  // Announcements → milestone items
  for (const a of (data.announcements ?? [])) {
    const [sk, d] = dateParts(a.createdAt);
    const emojiMap: Record<string, string> = { milestone: '🎉', host_tribute: '🏆', announcement: '📣' };
    addToDate(sk, d, {
      _key: `announce-${a.id}`,
      type: 'milestone',
      text: a.title ?? '',
      body: a.body ?? '',
      url: a.url ?? '',
      emoji: emojiMap[a.type] ?? '📣',
      likes: a.likes ?? 0,
      likedBy: a.likedBy ?? [],
      comments: [],
      commentCount: a.commentCount ?? 0,
      newComments: a.newCommentCount ?? 0,
    }, a.createdAt);
  }

  // Personal notifications → top bar (personal) or timeline (community)
  for (const n of (data.notifications ?? [])) {
    if (PERSONAL_ACTIONS.has(n.action)) {
      personalNotifications.push({
        _key: `notice-${n.action}-${n.navTarget ?? ''}-${n.createdAt ?? ''}`,
        action: n.action,
        name: n.name ?? '',
        targetTitle: n.targetTitle ?? '',
        detail: n.detail,
        time: n.createdAt ? timeAgo(n.createdAt) : '',
        navTarget: n.navTarget,
        createdAt: n.createdAt,
      });
    } else {
      const [sk, d] = dateParts(n.createdAt);
      addToDate(sk, d, {
        _key: `notice-${n.action}-${n.navTarget ?? ''}-${n.createdAt ?? ''}`,
        type: 'actionNotice',
        action: n.action,
        name: n.name ?? '',
        targetTitle: n.targetTitle ?? '',
        detail: n.detail,
        time: n.createdAt ? timeAgo(n.createdAt) : '',
        navTarget: n.navTarget,
        likes: 0,
        likedBy: [],
        comments: [],
        commentCount: 0,
      }, n.createdAt);
    }
  }

  // Proposals → compactProposal items
  for (const p of (data.recentProposals ?? [])) {
    const ad = activityDate(p);
    const [sk, d] = dateParts(ad);
    const time = p.createdAt ? timeAgo(p.createdAt) : '';
    addToDate(sk, d, {
      _key: `proposal-${p.id}`,
      type: 'compactProposal',
      entityId: p.id,
      name: mapUser(p.author).name,
      avatar: mapUser(p.author).avatar,
      title: p.title,
      votes: p._count?.votes ?? 0,
      voted: votedProposals.has(p.id),
      interested: Array.isArray(p.votes) ? mapPeople(p.votes) : [],
      time,
      navTarget: `/events/proposals/${p.id}`,
      likes: p.likes ?? 0,
      likedBy: p.likedBy ?? [],
      comments: [],
      commentCount: p.commentCount ?? 0,
    }, ad);
  }

  // Sort dates descending (YYYY-MM-DD keys sort correctly)
  const sortedDates = [...dateGroups.keys()].sort((a, b) => b.localeCompare(a));

  // Pin birthday items at top
  if (birthdayItems.length > 0) {
    const todayLabel = new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    items.push({ _key: 'time-birthday', type: 'time', label: todayLabel });
    items.push(...birthdayItems);
  }

  for (const dateKey of sortedDates) {
    items.push({ _key: `time-${dateKey}`, type: 'time', label: dateLabelMap.get(dateKey) ?? dateKey });
    const group = dateGroups.get(dateKey)!;
    group.sort((a, b) => (b._ts || 0) - (a._ts || 0));
    items.push(...group);
  }

  // If no items, add a milestone
  if (items.length === 0) {
    items.push({ _key: 'welcome', type: 'milestone', text: '欢迎来到串门儿！', emoji: '🎉' });
  }

  // Sort personal notifications by time (most recent first)
  personalNotifications.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

  return { items, personalNotifications };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

async function feedLoader() {
  try {
    const userId = getStoredUserId();
    const [data, coAttendees] = await Promise.all([
      fetchFeedApi(userId || undefined),
      userId ? fetchCoAttendees(userId).catch(() => []) : Promise.resolve([]),
    ]);
    const { items, personalNotifications } = buildFeedItems(data, (data as any).myVotedIds);
    let members = ((data as any).members ?? []).map((m: any) => ({
      ...m,
      lastActiveLabel: m.lastActiveAt ? timeAgo(m.lastActiveAt) : '',
      recentlyActive: m.recentlyActive ?? false,
    }));

    // Inject socialHint into activity items
    if (userId && coAttendees.length > 0) {
      const coMap = new Map(coAttendees.map((c) => [c.userId, { name: c.name, count: c.count }]));
      for (const item of items) {
        if (item.type === 'activity') {
          item.socialHint = computeSocialHint(item.signupUserIds, coMap, userId);
        }
      }
    }

    // Extract lottery data from feed response
    const currentLottery = (data as any).currentLottery ?? null;
    const lotteryUserStatus = (data as any).lotteryUserStatus ?? null;
    const postcardCredits = (data as any).postcardCredits ?? undefined;
    const dailyQuestion = (data as any).dailyQuestion ?? null;
    const demandSignal = (data as any).demandSignal ?? undefined;

    return { items, members, currentLottery, lotteryUserStatus, postcardCredits, notifications: personalNotifications, dailyQuestion, demandSignal };
  } catch {
    return { items: [], members: [] };
  }
}

function mapApiEvent(e: any): any {
  const signups = e.signups ?? [];
  const hostName = typeof e.host === 'string' ? e.host : e.host?.name ?? '?';
  const hostId = typeof e.host === 'string' ? e.host : e.host?.id ?? '';

  // Co-hosts
  const coHostNames: string[] = (e.coHosts ?? []).map((ch: any) => ch.user?.name).filter(Boolean);
  const coHostIds: string[] = (e.coHosts ?? []).map((ch: any) => ch.user?.id ?? ch.userId).filter(Boolean);

  // Split signups by status
  const occupying = signups.filter((s: any) => ['accepted', 'invited', 'offered'].includes(s.status));
  const waitlistSignups = signups.filter((s: any) => s.status === 'waitlist');
  const pendingSignups = signups.filter((s: any) => s.status === 'pending');

  // People displayed: host + co-hosts + accepted/offered only (invited hidden from display)
  const accepted = signups.filter((s: any) => ['accepted', 'offered'].includes(s.status));
  const people: { name: string; avatar?: string }[] = accepted.map((s: any) => {
    const u = mapUser(s.user);
    return { name: u.name !== '?' ? u.name : (s.userName ?? '?'), avatar: u.avatar };
  });
  // Host 默认也是参与者之一
  const hostAvatar = typeof e.host === 'string' ? undefined : mapUser(e.host).avatar;
  if (hostName && hostName !== '?' && !people.some(p => p.name === hostName)) {
    people.unshift({ name: hostName, avatar: hostAvatar });
  }
  // Add co-hosts to people list
  for (const ch of (e.coHosts ?? []) as any[]) {
    const chUser = mapUser(ch.user);
    if (chUser.name !== '?' && !people.some((p: any) => p.name === chUser.name)) people.push({ name: chUser.name, avatar: chUser.avatar });
  }

  // Collect signup user IDs for visibility checks (invite phase) — include all non-removed
  // Pending users are included for visibility but tracked separately
  const signupUserIds = signups.filter((s: any) => s.status !== 'pending').map((s: any) => s.user?.id ?? s.userId).filter(Boolean);
  const acceptedSignupUserIds = signups.filter((s: any) => s.status === 'accepted').map((s: any) => s.user?.id ?? s.userId).filter(Boolean);
  const pendingUserIds = pendingSignups.map((s: any) => s.user?.id ?? s.userId).filter(Boolean);
  if (hostId && !signupUserIds.includes(hostId)) {
    signupUserIds.unshift(hostId);
  }
  for (const id of coHostIds) {
    if (id && !signupUserIds.includes(id)) signupUserIds.push(id);
  }

  // Signup details for host waitlist/application management
  const signupDetails = signups.map((s: any) => ({
    userId: s.user?.id ?? s.userId,
    name: s.user?.name ?? '?',
    avatar: s.user?.avatar ?? undefined,
    status: s.status,
    offeredAt: s.offeredAt ?? undefined,
    note: s.note || undefined,
    intendedTaskId: s.intendedTaskId || undefined,
  }));

  return {
    id: e.id,
    title: e.title ?? '',
    host: hostName,
    hostAvatar,
    hostId,
    date: e.startsAt ? new Date(e.startsAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'America/New_York' }) + ' ' + new Date(e.startsAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' }) + (e.endsAt ? '-' + new Date(e.endsAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' }) : '') : '',
    startsAt: e.startsAt,
    endDate: e.endsAt ? new Date(e.endsAt).toLocaleDateString('zh-CN', { timeZone: 'America/New_York' }) : undefined,
    city: e.city || '',
    state: e.state || undefined,
    zipCode: e.zipCode || undefined,
    address: e.address || undefined,
    location: e.location || undefined,
    isHomeEvent: e.isHomeEvent ?? false,
    scene: e.titleImageUrl || eventTagToScene[e.tags?.[0]] || e.tags?.[0] || '',
    film: e.screenedMovies?.[0]?.movie?.title ?? e.film ?? undefined,
    filmPoster: e.screenedMovies?.[0]?.movie?.poster || undefined,
    linkedRecommendations: [
      ...(e.recommendations ?? []).map((er: any) => ({
        id: er.recommendation?.id,
        title: er.recommendation?.title,
        category: er.recommendation?.category,
        coverUrl: er.recommendation?.coverUrl || undefined,
        description: er.recommendation?.description || undefined,
        linkedById: er.linkedById || er.linkedBy?.id || undefined,
        linkedByName: er.linkedBy?.name || undefined,
        isSelected: er.isSelected ?? false,
        isNomination: er.isNomination ?? false,
        globalVotes: er.globalVotes ?? er.recommendation?.voteCount ?? 0,
        attendeeVotes: er.attendeeVotes ?? 0,
        attendeeTotal: er.attendeeTotal ?? 0,
        voterIds: er.voterIds ?? [],
      })),
      ...(e.screenedMovies ?? []).map((sm: any) => ({
        id: sm.movie?.id,
        title: sm.movie?.title,
        category: 'movie',
        coverUrl: sm.movie?.poster || undefined,
        description: [sm.movie?.year, sm.movie?.director ? `导演: ${sm.movie.director}` : ''].filter(Boolean).join(' · ') || undefined,
        linkedById: undefined,
        linkedByName: undefined,
        isSelected: false,
        isNomination: true,
        globalVotes: sm.globalVotes ?? sm.movie?.voteCount ?? sm.movie?._count?.votes ?? 0,
        attendeeVotes: sm.attendeeVotes ?? 0,
        attendeeTotal: sm.attendeeTotal ?? 0,
        voterIds: sm.voterIds ?? [],
        _fromMovieTable: true,
      })),
    ],
    recSelectionMode: e.recSelectionMode ?? 'nominate',
    recCategories: (e.recCategories ?? []).map((entry: string) => entry.includes(':') ? entry.split(':')[0] : entry),
    recCategoryModes: Object.fromEntries(
      (e.recCategories ?? []).map((entry: string) => {
        const [cat, mode] = entry.includes(':') ? entry.split(':') : [entry, e.recSelectionMode ?? 'nominate'];
        return [cat, mode];
      }),
    ),
    spots: Math.max(0, (e.capacity ?? 0) - (1 + coHostNames.length) - occupying.length),
    total: e.capacity ?? 0,
    people,
    signupUserIds,
    acceptedSignupUserIds,
    pendingUserIds,
    signupDetails,
    coHosts: coHostNames,
    coHostIds,
    waitlistCount: waitlistSignups.length,
    pendingCount: pendingSignups.length,
    phase: e.phase ?? 'open',
    desc: e.description ?? '',
    houseRules: e.houseRules || undefined,
    photoCount: e.recapPhotoUrls?.length || undefined,
    commentCount: e.commentCount ?? 0,
    isPrivate: e.isPrivate ?? false,
    signupMode: e.signupMode || 'direct',
    foodOption: e.foodOption || undefined,
    restaurantLocation: e.restaurantLocation || undefined,
    likeCount: e.likeCount ?? 0,
    tags: e.tags ?? [],
    taskSummary: ((e.tasks ?? []) as any[]).map((t: any) => ({
      role: t.role,
      claimerName: t.claimedBy?.name ?? undefined,
    })),
  };
}

async function eventsLoader() {
  try {
    const userId = getStoredUserId();
    const [events, proposals, past, coAttendees] = await Promise.all([
      fetchEventsApi(),
      fetchProposalsApi(),
      fetchPastEventsApi(),
      userId ? fetchCoAttendees(userId).catch(() => []) : Promise.resolve([]),
    ]);
    return {
      coAttendees: coAttendees as { userId: string; name: string; count: number }[],
      upcoming: (events ?? []).map(mapApiEvent),
      proposals: (proposals ?? []).map((p: any) => {
        // Derive effective status: if DB says discussing but has linked events, treat as scheduled
        const hasEvents = (p._count?.events ?? 0) > 0;
        const effectiveStatus = (p.status === 'discussing' && hasEvents) ? 'scheduled' : (p.status ?? 'discussing');
        return {
          id: p.id,
          name: mapUser(p.author).name !== '?' ? mapUser(p.author).name : (p.name ?? '?'),
          avatar: mapUser(p.author).avatar,
          title: p.title ?? '',
          description: p.description ?? '',
          status: effectiveStatus,
          votes: p._count?.votes ?? (Array.isArray(p.votes) ? p.votes.length : p.votes ?? 0),
          interested: Array.isArray(p.votes) ? mapPeople(p.votes) : p.interested ?? [],
          time: p.createdAt ? timeAgo(String(p.createdAt)) : p.time ?? '',
        };
      }),
      past: (past ?? []).map((e: any) => {
        const signupCount = e._count?.signups ?? e.people ?? 0;
        const pastCoHostCount = (e.coHosts ?? []).length;
        // Host + co-hosts + signups
        const peopleCount = signupCount > 0 ? signupCount + 1 + pastCoHostCount : signupCount;
        return {
        id: e.id,
        title: e.title ?? '',
        host: typeof e.host === 'string' ? e.host : e.host?.name ?? '?',
        date: e.startsAt ? new Date(e.startsAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'America/New_York' }) : '',
        startsAt: e.startsAt ?? '',
        people: peopleCount,
        scene: e.titleImageUrl || eventTagToScene[e.tags?.[0]] || e.tags?.[0] || '',
        film: e.screenedMovies?.[0]?.movie?.title ?? e.film ?? undefined,
        photoCount: e.recapPhotoUrls?.length || undefined,
        commentCount: e.commentCount ?? 0,
        likeCount: e.likeCount ?? 0,
      };
      }),
    };
  } catch {
    return { upcoming: [], proposals: [], past: [] };
  }
}

async function eventDetailLoader({ params }: { params: Record<string, string | undefined> }) {
  const id = params.eventId;
  if (!id) return null;
  try {
    const raw = await getEventById(id);
    if (!raw) return null;
    const base = mapApiEvent(raw);
    // Detail-specific fields
    base.desc = raw.description ?? '';
    // Find invitedBy name from signups (the person who invited the current user — resolved client-side)
    // We pass invitedById per signup so the client can look it up
    const signups = (raw.signups ?? []) as any[];
    const hostName = base.host;
    base.signupInvites = signups
      .filter((s: any) => s.invitedById)
      .map((s: any) => ({ userId: s.user?.id ?? s.userId, invitedById: s.invitedById }));
    base.comments = [];
    // Load tasks from backend EventTask records
    base.tasks = ((raw as any).tasks ?? []).map((t: any) => ({
      id: t.id,
      role: t.role,
      description: t.description ?? '',
      name: t.claimedBy?.name ?? undefined,
      claimedById: t.claimedById ?? undefined,
      claimedBy: t.claimedBy ?? undefined,
      isCustom: t.isCustom ?? false,
    }));
    base.nominations = [];
    base.photos = ((raw.recapPhotoUrls ?? []) as string[]).map((url: string, i: number) => ({
      id: `${raw.id}-${i}`,
      url,
      caption: '',
    }));
    return base;
  } catch {
    return null;
  }
}

async function proposalDetailLoader({ params }: { params: Record<string, string | undefined> }) {
  const id = params.proposalId;
  if (!id) return null;
  try {
    const p: any = await fetchProposalByIdApi(id);
    if (!p) return null;
    return {
      id: p.id,
      name: mapUser(p.author).name !== '?' ? mapUser(p.author).name : (p.name ?? '?'),
      authorId: mapUser(p.author).id || (p.authorId ?? ''),
      authorAvatar: mapUser(p.author).avatar ?? '',
      title: p.title ?? '',
      description: p.description ?? '',
      descriptionHtml: p.descriptionHtml ?? p.description ?? '',
      status: p.status ?? 'discussing',
      votes: p._count?.votes ?? (Array.isArray(p.votes) ? p.votes.length : p.votes ?? 0),
      interested: Array.isArray(p.votes)
        ? mapPeople(p.votes)
        : p.interested ?? [],
      time: p.createdAt ? timeAgo(String(p.createdAt)) : p.time ?? '',
      comments: p.comments ?? [],
      likes: p.likes ?? 0,
      likedBy: p.likedBy ?? [],
    };
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

function mapRecommendation(r: any) {
  return {
    id: r.id,
    title: r.title ?? '',
    description: r.description ?? '',
    authorName: mapUser(r.author).name !== '?' ? mapUser(r.author).name : '',
    authorId: mapUser(r.author).id || (r.authorId ?? ''),
    coverUrl: r.coverUrl || undefined,
    sourceUrl: r.sourceUrl || undefined,
    eventDate: r.eventDate || undefined,
    eventEndDate: r.eventEndDate || undefined,
    voteCount: r._count?.votes ?? r.voteCount ?? 0,
    voterIds: (r.votes ?? []).map((v: any) => v.userId ?? v.user?.id).filter(Boolean),
    category: r.category ?? '',
    commentCount: r.commentCount ?? 0,
  };
}

async function discoverLoader() {
  try {
    const [rawPool, rawScreened, rawBooks, rawRecipes, rawMusic, rawPlaces, rawExternalEvents] = await Promise.all([
      fetchMoviesApi(),
      fetchScreenedMoviesApi(),
      fetchRecommendationsApi('book').catch(() => []),
      fetchRecommendationsApi('recipe').catch(() => []),
      fetchRecommendationsApi('music').catch(() => []),
      fetchRecommendationsApi('place').catch(() => []),
      fetchRecommendationsApi('external_event').catch(() => []),
    ]);
    const pool = (rawPool as any[]).map((m: any) => ({
      id: m.id,
      title: m.title ?? '',
      year: String(m.year ?? ''),
      dir: m.director ?? '',
      v: m._count?.votes ?? 0,
      voterIds: (m.votes ?? []).map((v: any) => v.user?.id ?? v.userId).filter(Boolean),
      status: m.status === 'candidate' ? undefined : m.status,
      by: mapUser(m.recommendedBy).name !== '?' ? mapUser(m.recommendedBy).name : '',
      poster: m.poster || undefined,
      commentCount: m.commentCount ?? 0,
    }));
    const screened = (rawScreened as any[]).map((s: any) => {
      const ev = s.screenedEvents?.[0]?.event;
      return {
        id: s.id,
        title: s.title ?? '',
        year: String(s.year ?? ''),
        dir: s.director ?? '',
        v: s._count?.votes ?? 0,
        voterIds: (s.votes ?? []).map((v: any) => v.user?.id ?? v.userId).filter(Boolean),
        by: mapUser(s.recommendedBy).name !== '?' ? mapUser(s.recommendedBy).name : '',
        date: ev?.startsAt ? new Date(ev.startsAt).toLocaleDateString('zh-CN', { timeZone: 'America/New_York' }) : '',
        host: ev?.host?.name ?? '',
        poster: s.poster || undefined,
        commentCount: s.commentCount ?? 0,
      };
    });
    const bookPool = (rawBooks as any[]).map((b: any) => ({
      id: b.id,
      title: b.title ?? '',
      year: '',
      author: b.author?.name ?? b.description ?? '',
      v: b._count?.votes ?? b.voteCount ?? 0,
      voterIds: (b.votes ?? []).map((v: any) => v.userId ?? v.user?.id).filter(Boolean),
      by: mapUser(b.author).name !== '?' ? mapUser(b.author).name : '',
      status: b.status === 'candidate' ? undefined : b.status,
      coverUrl: b.coverUrl || undefined,
      commentCount: b.commentCount ?? 0,
    }));
    return {
      pool, screened, bookPool, bookRead: [],
      recipes: (rawRecipes as any[]).map(mapRecommendation),
      music: (rawMusic as any[]).map(mapRecommendation),
      places: (rawPlaces as any[]).map(mapRecommendation),
      externalEvents: (rawExternalEvents as any[]).map(mapRecommendation),
    };
  } catch {
    return { pool: [], screened: [], bookPool: [], bookRead: [], recipes: [], music: [], places: [], externalEvents: [] };
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

async function bookDetailLoader({ params }: { params: Record<string, string | undefined> }) {
  const id = params.bookId;
  if (!id) return null;
  try {
    const rec: any = await fetchRecommendationByIdApi(id);
    if (!rec) return null;
    // Transform Recommendation into BookPool shape expected by BookDetailPage
    return {
      id: rec.id,
      title: rec.title,
      year: (rec.tags ?? []).find((t: any) => /^\d{4}$/.test(t.value))?.value ?? '',
      author: (rec.tags ?? []).find((t: any) => !(/^\d{4}$/.test(t.value)))?.value ?? rec.author?.name ?? '',
      v: rec._count?.votes ?? rec.voteCount ?? 0,
      voterIds: (rec.votes ?? []).map((v: any) => v.userId ?? v.user?.id).filter(Boolean),
      voters: mapPeople(rec.votes ?? []),
      status: rec.status ?? 'candidate',
      by: mapUser(rec.author).name !== '?' ? mapUser(rec.author).name : '',
      byAvatar: rec.author?.avatar ?? undefined,
      synopsis: rec.description ?? '',
      genre: (rec.tags ?? []).map((t: any) => t.value).join(', '),
      sourceUrl: rec.sourceUrl ?? '',
      coverUrl: rec.coverUrl ?? '',
      authorId: rec.authorId ?? rec.author?.id ?? '',
      discussions: [],
      comments: [],
    };
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

/** Pick the best co-attendee who is also signed up for an event */
function computeSocialHint(
  signupUserIds: string[] | undefined,
  coAttendeeMap: Map<string, { name: string; count: number }>,
  myUserId: string,
): { name: string; count: number } | undefined {
  if (!signupUserIds || coAttendeeMap.size === 0) return undefined;
  let best: { name: string; count: number } | undefined;
  for (const uid of signupUserIds) {
    if (uid === myUserId) continue;
    const entry = coAttendeeMap.get(uid);
    if (entry && (!best || entry.count > best.count)) {
      best = entry;
    }
  }
  return best;
}

function mapApiCard(c: any): any {
  return {
    id: c.id,
    from: typeof c.from === 'string' ? c.from : c.from?.name ?? '?',
    to: typeof c.to === 'string' ? c.to : c.to?.name ?? '?',
    fromAvatar: (typeof c.from === 'object' ? c.from?.avatar : undefined) || undefined,
    toAvatar: (typeof c.to === 'object' ? c.to?.avatar : undefined) || undefined,
    message: c.message ?? '',
    stamp: c.tags?.[0]?.value ?? c.stamp ?? '',
    date: c.createdAt ? new Date(c.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '',
    photo: c.photoUrl ?? c.photo ?? undefined,
    visibility: c.visibility ?? 'public',
    tags: (c.tags ?? []).map((t: any) => typeof t === 'string' ? t : t.value ?? ''),
    eventCtx: c.eventCtx || c.event?.title || undefined,
  };
}

async function cardsLoader() {
  const userId = getStoredUserId();
  if (!userId) return { myCards: [], sentCards: [], credits: 0, people: [], eligibleEvents: [], quickMessages: [] };
  try {
    const data = await fetchPostcardsApi(userId);
    // eligible is now an array of events with people
    const eligibleEvents = (data.eligible ?? []).map((evt: any) => ({
      eventId: evt.eventId,
      title: evt.title,
      startsAt: evt.startsAt,
      people: evt.people ?? [],
    }));
    // Flatten for backward compat (deduplicated, most recent event first)
    const seen = new Set<string>();
    const people: { id: string; name: string; ctx: string }[] = [];
    for (const evt of eligibleEvents) {
      const dateStr = evt.startsAt
        ? new Date(evt.startsAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', timeZone: 'America/New_York' })
        : '';
      for (const p of evt.people) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        people.push({ id: p.id, name: p.name, ctx: dateStr ? `${dateStr} ${evt.title}` : evt.title });
      }
    }
    return {
      myCards: (data.received ?? []).map(mapApiCard),
      sentCards: (data.sent ?? []).map(mapApiCard),
      credits: data.credits ?? 0,
      people,
      eligibleEvents,
      quickMessages: ['谢谢你的热情招待！🏠', '和你聊天超开心 😊', '下次一起看电影吧 🎬', '好久不见，想你了 💌'],
    };
  } catch {
    return { myCards: [], sentCards: [], credits: 0, people: [], eligibleEvents: [], quickMessages: [] };
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

/** Host milestone badge — delegates to shared mappings.ts */

/** Check if a birthday falls within ±3 days of today */
function isBirthdayWeek(birthday: string): boolean {
  const bd = new Date(birthday);
  const today = new Date();
  const todayMonth = today.getUTCMonth() + 1;
  const todayDay = today.getUTCDate();
  const bdMonth = bd.getUTCMonth() + 1;
  const bdDay = bd.getUTCDate();
  const todayDOY = todayMonth * 31 + todayDay;
  const bdDOY = bdMonth * 31 + bdDay;
  const diff = Math.abs(todayDOY - bdDOY);
  const wrapDiff = 12 * 31 - diff;
  return Math.min(diff, wrapDiff) <= 3;
}

function mapApiMember(m: any, badgeTiers?: HostBadgeTier[]) {
  const raw = m.mutual ?? {};
  const hostCount = ((m._count?.hostedEvents ?? 0) + (m._count?.coHostedEvents ?? 0)) || (m.host ?? m.hostCount ?? 0);
  // Birthday badge overrides host milestone badge during birthday week
  const birthdayStr = m.birthday ? (typeof m.birthday === 'string' ? m.birthday : new Date(m.birthday).toISOString()) : '';
  const hasBirthdayBadge = birthdayStr && !m.hideBirthday && isBirthdayWeek(birthdayStr);
  const tier = hostMilestoneBadge(hostCount, badgeTiers);
  return {
    ...m,
    titles: Array.isArray(m.titles)
      ? m.titles
      : Array.isArray(m.socialTitles)
        ? m.socialTitles.map((t: any) => (typeof t === 'string' ? t : t.value))
        : [],
    host: hostCount,
    badge: hasBirthdayBadge ? '🎂' : (m.badge ?? tier?.emoji),
    badgeLabel: tier?.label,
    mutual: {
      evtCount: raw.evtCount ?? 0,
      cards: raw.cards ?? raw.cardCount ?? 0,
      movies: Array.isArray(raw.movies) ? raw.movies : [],
      events: Array.isArray(raw.events) ? raw.events : [],
      movieCount: raw.movieCount ?? 0,
      recommendations: raw.recommendations ?? undefined,
      tasteCount: raw.tasteCount ?? undefined,
    },
    role: m.role ?? 'member',
  };
}

/** Fetch host badge tiers from SiteConfig (with fallback to defaults) */
async function fetchBadgeTiers(): Promise<HostBadgeTier[] | undefined> {
  try {
    return await fetchSiteConfig<HostBadgeTier[]>('hostBadgeTiers');
  } catch {
    return undefined;
  }
}

async function membersLoader() {
  try {
    const [raw, tiers] = await Promise.all([
      fetchMembersApi() as Promise<any[]>,
      fetchBadgeTiers(),
    ]);
    const members = raw.map(m => mapApiMember(m, tiers));
    return { members };
  } catch {
    return { members: [] };
  }
}

async function memberDetailLoader({ params }: { params: Record<string, string | undefined> }) {
  const name = params.name ? decodeURIComponent(params.name) : '';
  if (!name) return null;
  // Get viewer ID for mutual computation (from localStorage if available)
  let viewerId: string | undefined;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('chuanmen.auth.user') || sessionStorage.getItem('chuanmen.auth.user');
      if (stored) viewerId = JSON.parse(stored)?.id;
    } catch { /* ignore */ }
  }
  try {
    const [profile, tiers] = await Promise.all([
      fetchProfileByNameApi(name, viewerId),
      fetchBadgeTiers(),
    ]);
    return { ...profile as any, _badgeTiers: tiers };
  } catch {
    return null;
  }
}

async function aboutLoader() {
  try {
    const [stats, announcements] = await Promise.all([
      fetchAboutStatsApi(),
      fetchAnnouncementsApi().catch(() => []),
    ]);
    const milestones = (announcements as any[])
      .filter((a: any) => a.type === 'milestone' || a.type === 'host_tribute')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((a: any) => ({ id: a.id, title: a.title, body: a.body ?? '', type: a.type, createdAt: a.createdAt }));
    return { ...stats, milestones };
  } catch {
    return { memberCount: 0, hostCount: 0, eventCount: 0, months: 1, milestones: [] };
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
        loader: bookDetailLoader,
      },
      { path: 'discover/:category', element: <Navigate to="/discover" replace /> },
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
      { path: 'daily-questions', element: <AdminDailyQuestionsPage /> },
      { path: 'announcements', element: <AdminAnnouncementsPage /> },
      { path: 'email', element: <AdminEmailPage /> },
      { path: 'newsletters', element: <AdminNewslettersPage /> },
      { path: 'feedback', element: <AdminFeedbackPage /> },
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
