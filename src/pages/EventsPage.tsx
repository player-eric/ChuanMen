import { useEffect, useMemo, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Grid,
  InputAdornment,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import type { EventsPageData } from '@/types';
import { searchProposals, toggleProposalVote } from '@/lib/domainApi';
import { useAuth } from '@/auth/AuthContext';
import { useColors } from '@/hooks/useColors';
import { Ava, AvaStack } from '@/components/Atoms';
import { EmptyState } from '@/components/EmptyState';
import { FeedActions, FeedActivity } from '@/components/FeedItems';

export default function EventsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const c = useColors();
  const data = useLoaderData() as EventsPageData & { coAttendees?: { userId: string; name: string; count: number }[] };
  const [tab, setTab] = useState<'upcoming' | 'ideas' | 'past'>('upcoming');

  // Build co-attendee map for social hints
  const coAttendeeMap = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const c of (data.coAttendees ?? [])) {
      map.set(c.userId, { name: c.name, count: c.count });
    }
    return map;
  }, [data.coAttendees]);
  const [snackMsg, setSnackMsg] = useState('');
  const canInteract = Boolean(user);

  // Proposal search state
  const [keyword, setKeyword] = useState('');
  const [searchedItems, setSearchedItems] = useState<Record<string, unknown>[]>([]);
  const [searchError, setSearchError] = useState('');
  const [interested, setInterested] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (tab !== 'ideas') return;
    const run = async () => {
      if (!keyword.trim()) {
        setSearchedItems([]);
        setSearchError('');
        return;
      }
      try {
        const result = await searchProposals(keyword.trim());
        setSearchedItems(result.items);
        setSearchError('');
      } catch (error) {
        setSearchError(error instanceof Error ? error.message : '搜索失败，请稍后重试');
      }
    };
    void run();
  }, [keyword, tab]);

  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  /* Split events by phase, filtering invite-phase by user visibility */
  const now = new Date();
  const isPastDate = (e: any) => {
    const t = e.startsAt ?? e.date;
    return t && new Date(t).getTime() + 4 * 3600_000 < now.getTime(); // 4h grace like agent
  };
  const allUpcoming = data.upcoming.filter((e: any) =>
    (e.phase === 'invite' || e.phase === 'open' || e.phase === 'closed' || e.phase === 'cancelled') && !isPastDate(e)
  );
  const upcomingEvents = allUpcoming.filter((e: any) => {
    if (e.phase === 'invite') {
      if (!user) return false;
      // Visible to host or anyone in signupUserIds (invited users)
      return e.hostId === user.id || (e.signupUserIds ?? []).includes(user.id);
    }
    return true;
  });
  // Events that are ended OR have passed their start time (agent hasn't auto-ended yet)
  const endedFromUpcoming = data.upcoming.filter((e: any) => e.phase === 'ended' || isPastDate(e));

  // Merge ended events from upcoming + past, deduplicate by id, sort by time descending
  const allPastEvents = useMemo(() => {
    const seen = new Set<string>();
    const fromUpcoming = endedFromUpcoming.map((evt: any) => {
      if (evt.id) seen.add(evt.id);
      return { source: 'upcoming' as const, sortKey: evt.startsAt ?? evt.date ?? '', evt };
    });
    const fromPast = data.past
      .filter((evt) => !evt.id || !seen.has(evt.id))
      .map((evt) => ({ source: 'past' as const, sortKey: evt.startsAt ?? evt.date ?? '', evt }));
    return [...fromUpcoming, ...fromPast].sort((a, b) => (b.sortKey > a.sortKey ? 1 : b.sortKey < a.sortKey ? -1 : 0));
  }, [endedFromUpcoming, data.past]);

  // Smart sorting for upcoming events
  const [sortMode, setSortMode] = useState<'smart' | 'time'>('smart');

  const sortedUpcoming = useMemo(() => {
    if (sortMode === 'time' || !user?.id) return upcomingEvents;
    return [...upcomingEvents].sort((a: any, b: any) => {
      const score = (evt: any) => {
        let s = 0;
        for (const uid of (evt.signupUserIds ?? [])) {
          if (uid !== user?.id && coAttendeeMap.has(uid)) s += 10;
        }
        if (evt.spots > 0) s += 5;
        if (evt.phase === 'cancelled') s -= 50;
        return s;
      };
      return score(b) - score(a) || new Date(a.startsAt ?? a.date).getTime() - new Date(b.startsAt ?? b.date).getTime();
    });
  }, [upcomingEvents, sortMode, user?.id, coAttendeeMap]);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
        <Tab value="upcoming" label={`即将到来 (${upcomingEvents.length})`} />
        <Tab value="ideas" label={`创意孵化中 (${data.proposals.length})`} />
        <Tab value="past" label={`过往活动 (${allPastEvents.length})`} />
      </Tabs>

      {tab === 'upcoming' && (
        <Stack spacing={2}>
          {upcomingEvents.length === 0 ? (
            <EmptyState
              icon="📅"
              title="暂时没有活动，快来组织一场吧！"
              description="浏览创意孵化中的点子，或者直接发起一个新活动。"
              action={canInteract
                ? { label: '发起活动', to: '/events/new' }
                : { label: '浏览创意', onClick: () => setTab('ideas') }
              }
            />
          ) : (
            <>
              {user && upcomingEvents.length > 1 && (
                <Stack direction="row" spacing={0.75} sx={{ mb: -0.5 }}>
                  <Chip label="智能排序" size="small"
                    color={sortMode === 'smart' ? 'primary' : 'default'}
                    variant={sortMode === 'smart' ? 'filled' : 'outlined'}
                    onClick={() => setSortMode('smart')} />
                  <Chip label="按时间" size="small"
                    color={sortMode === 'time' ? 'primary' : 'default'}
                    variant={sortMode === 'time' ? 'filled' : 'outlined'}
                    onClick={() => setSortMode('time')} />
                </Stack>
              )}
            <Grid container spacing={2}>
              {sortedUpcoming.map((evt: any) => (
                <Grid key={evt.id} size={{ xs: 12, md: 6 }}>
                  <FeedActivity
                    mode="list"
                    name={evt.host}
                    hostAvatar={evt.hostAvatar}
                    title={evt.title}
                    date={evt.date}
                    location={evt.city}
                    spots={evt.spots}
                    total={evt.total}
                    people={evt.people}
                    signupUserIds={evt.signupUserIds}
                    film={evt.film}
                    filmPoster={evt.filmPoster}
                    scene={evt.scene}
                    navTarget={`/events/${evt.id}`}
                    phase={evt.phase}
                    isHomeEvent={evt.isHomeEvent}
                    isPrivate={evt.isPrivate}
                    houseRules={evt.houseRules}
                    hostId={evt.hostId}
                    waitlistCount={evt.waitlistCount}
                    commentCount={evt.commentCount}
                    socialHint={user?.id ? (() => {
                      let best: { name: string; count: number } | undefined;
                      for (const uid of (evt.signupUserIds ?? [])) {
                        if (uid === user.id) continue;
                        const entry = coAttendeeMap.get(uid);
                        if (entry && (!best || entry.count > best.count)) best = entry;
                      }
                      return best;
                    })() : undefined}
                    taskSummary={evt.taskSummary}
                    likes={evt.likeCount ?? 0} likedBy={[]} comments={[]}
                  />
                </Grid>
              ))}
            </Grid>
            </>
          )}
        </Stack>
      )}

      {tab === 'ideas' && (
        <Stack spacing={2}>
          <TextField
            placeholder="搜索创意"
            size="small"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ textAlign: 'right' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<LightbulbOutlinedIcon />}
              onClick={() => navigate('/events/proposals/new')}
              disabled={!canInteract}
            >
              添加创意
            </Button>
          </Box>

          {searchError && <Alert severity="error">{searchError}</Alert>}

          {searchedItems.map((item) => (
            <Card key={String(item._id)} sx={{ borderRadius: 2, cursor: 'pointer' }}
              onClick={() => navigate(`/events/proposals/${item._id}`)}>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{String(item.title ?? '')}</div>
                <div style={{ fontSize: 14, color: c.text2, marginTop: 4 }}>{String(item.description ?? '')}</div>
              </div>
            </Card>
          ))}

          {!!keyword.trim() && searchedItems.length === 0 && !searchError && (
            <Typography variant="body2" color="text.secondary">没有匹配创意</Typography>
          )}

          {!keyword.trim() && data.proposals.length === 0 && (
            <EmptyState
              icon="💡"
              title="还没有人提创意，成为第一个！"
              description="分享你想组织的活动创意，看看有没有人感兴趣。"
              action={canInteract ? { label: '提创意', to: '/events/proposals/new' } : undefined}
            />
          )}

          {data.proposals.map((proposal) => {
            const v = interested[proposal.id] ?? false;
            return (
              <Card key={proposal.id} sx={{ borderRadius: 2, cursor: 'pointer' }}
                onClick={() => navigate(`/events/proposals/${proposal.id}`)}>
                <div style={{ padding: '10px 14px' }}>
                  {/* Author + time */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                    <Ava name={proposal.name} size={24} onTap={() => goMember(proposal.name)} />
                    <b onClick={(e) => { e.stopPropagation(); goMember(proposal.name); }} style={{ cursor: 'pointer', fontSize: 13 }}>{proposal.name}</b>
                    <span style={{ fontSize: 12, color: c.text3 }}>· {proposal.time}</span>
                  </div>

                  {/* Title */}
                  <div
                    style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}
                  >{'💡'} {proposal.title}</div>

                  {/* Interested people + action buttons on one row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <AvaStack names={proposal.interested} size={18} />
                      <span style={{ fontSize: 12, color: c.text3 }}>{proposal.interested.length} 人感兴趣</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!user?.id) return;
                          setInterested((prev) => ({ ...prev, [proposal.id]: !prev[proposal.id] }));
                          try { await toggleProposalVote(String(proposal.id), user.id); } catch { /* optimistic */ }
                        }}
                        style={{
                          padding: '4px 12px', borderRadius: 6,
                          background: v ? c.blue + '15' : c.s2,
                          border: `1px solid ${v ? c.blue + '40' : c.line}`,
                          color: !user ? c.text3 : v ? c.blue : c.text2,
                          fontSize: 13, fontWeight: 600, cursor: user ? 'pointer' : 'default',
                          opacity: user ? 1 : 0.5,
                        }}
                      >
                        {v ? '✓ 感兴趣' : '感兴趣'} · {proposal.votes + (v ? 1 : 0)}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); user && navigate('/events/new', { state: { fromProposal: { id: String(proposal.id), title: proposal.title, descriptionHtml: proposal.descriptionHtml ?? '' } } }); }}
                        style={{
                          padding: '4px 12px', borderRadius: 6,
                          background: c.warm,
                          border: 'none',
                          color: c.bg,
                          fontSize: 13, fontWeight: 600, cursor: user ? 'pointer' : 'default',
                          opacity: user ? 1 : 0.5,
                        }}
                      >
                        我来组织
                      </button>
                    </div>
                  </div>
                </div>

                {/* Like + comment bar */}
                <FeedActions
                  likes={proposal.likes ?? 0}
                  likedBy={proposal.likedBy ?? []}
                  comments={proposal.comments ?? []}
                  entityType="proposal"
                  entityId={String(proposal.id)}
                />
              </Card>
            );
          })}
        </Stack>
      )}

      {tab === 'past' && (
        <Stack spacing={2}>
          {allPastEvents.length === 0 && (
            <EmptyState
              icon="📷"
              title="还没有过往活动记录"
              description="活动结束后，记录会出现在这里。"
            />
          )}
          <Grid container spacing={2}>
            {allPastEvents.map((item, idx) => {
              const evt = item.evt as any;
              if (item.source === 'upcoming') {
                return (
                  <Grid key={evt.id} size={{ xs: 12, md: 6 }}>
                    <FeedActivity
                      mode="list"
                      name={evt.host}
                      title={evt.title}
                      date={evt.date}
                      location={evt.city}
                      spots={evt.spots}
                      people={evt.people}
                      film={evt.film}
                      filmPoster={evt.filmPoster}
                      scene={evt.scene}
                      navTarget={`/events/${evt.id}`}
                      phase="ended"
                      isPrivate={evt.isPrivate}
                      photoCount={evt.photoCount}
                      commentCount={evt.commentCount}
                      likes={evt.likeCount ?? 0} likedBy={[]} comments={[]}
                    />
                  </Grid>
                );
              }
              return (
                <Grid key={evt.id ?? `past-${idx}`} size={{ xs: 12, md: 6 }}>
                  <FeedActivity
                    mode="list"
                    name={evt.host}
                    title={evt.title}
                    date={evt.date}
                    location=""
                    spots={0}
                    people={[]}
                    film={evt.film}
                    scene={evt.scene}
                    navTarget={evt.id ? `/events/${evt.id}` : undefined}
                    phase="ended"
                    photoCount={evt.photoCount}
                    commentCount={evt.commentCount}
                    likes={evt.likeCount ?? 0} likedBy={[]} comments={[]}
                  />
                </Grid>
              );
            })}
          </Grid>
        </Stack>
      )}

      <Stack spacing={1} sx={{ position: 'fixed', right: { xs: 16, md: 32 }, bottom: { xs: 84, md: 24 }, alignItems: 'stretch' }}>
        <Button variant="contained" size="small" onClick={() => navigate('/events/new')} disabled={!canInteract}
          sx={{ borderRadius: 6, textTransform: 'none', px: 2, py: 0.8, fontSize: 13, fontWeight: 600, justifyContent: 'flex-start' }}>
          + 发起活动
        </Button>
        <Button variant="outlined" size="small" onClick={() => navigate('/events/proposals/new')} disabled={!canInteract}
          sx={{ borderRadius: 6, textTransform: 'none', px: 2, py: 0.8, fontSize: 13, fontWeight: 600, justifyContent: 'flex-start', bgcolor: 'background.paper', borderColor: 'divider', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          💡 提创意
        </Button>
      </Stack>

      <Snackbar
        open={Boolean(snackMsg)}
        autoHideDuration={3000}
        onClose={() => setSnackMsg('')}
        message={snackMsg}
      />
    </Box>
  );
}
