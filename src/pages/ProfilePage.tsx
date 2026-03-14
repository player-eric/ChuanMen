import { useState, useMemo, useEffect } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  Divider,
  Grid,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import type { ProfilePageData } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { RichTextViewer } from '@/components/RichTextEditor';
import { PostCard } from '@/components/PostCard';
import { Poster } from '@/components/Poster';
import { EmptyState } from '@/components/EmptyState';
import { useColors } from '@/hooks/useColors';
import { fetchProfileApi } from '@/lib/domainApi';
import { photos } from '@/theme';
import { firstNonEmoji } from '@/components/Atoms';

const sceneEmoji: Record<string, string> = {
  movieNight: '🎬',
  potluck: '🍳',
  hike: '🥾',
  coffee: '☕',
  sports: '🏸',
};

export default function ProfilePage() {
  const loaderData = useLoaderData() as any;
  const { user } = useAuth();
  const navigate = useNavigate();
  const c = useColors();

  // SSR can't read localStorage → loader returns null. Fetch client-side as fallback.
  const [clientData, setClientData] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  useEffect(() => {
    if (loaderData || clientData) return;
    if (!user?.id) return;
    setFetchError(null);
    fetchProfileApi(user.id)
      .then(setClientData)
      .catch((err) => {
        console.error('ProfilePage fetch failed:', err, 'userId:', user.id);
        setFetchError(err?.message ?? '未知错误');
      });
  }, [loaderData, clientData, user?.id]);

  const raw = loaderData || clientData;

  if (!raw) {
    if (user?.id && fetchError === null) {
      // Still loading client-side
      return (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <Typography variant="body2" color="text.secondary">加载中...</Typography>
        </Stack>
      );
    }
    return (
      <Stack spacing={2} alignItems="center" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h6" fontWeight={700}>无法加载个人页面</Typography>
        <Typography variant="body2" color="text.secondary">{fetchError || '可能需要重新登录'}</Typography>
        <Button variant="contained" onClick={() => navigate('/login')}>重新登录</Button>
        <Button variant="outlined" onClick={() => navigate('/')}>返回首页</Button>
      </Stack>
    );
  }

  // Map API shape → ProfilePageData
  const data: ProfilePageData = {
    titles: raw.user?.titles ?? raw.titles ?? [],
    role: raw.user?.role ?? raw.role ?? '',
    participationStats: raw.stats ?? raw.participationStats ?? { eventCount: 0, hostCount: 0, movieCount: 0, screenedCount: 0, proposalCount: 0, voteCount: 0 },
    contribution: raw.stats ?? raw.contribution ?? { hostCount: 0, eventCount: 0, movieCount: 0, cardsSent: 0, cardsReceived: 0 },
    myMovies: raw.recentMovies ?? raw.myMovies ?? [],
    votedMovies: raw.votedMovies ?? [],
    upcomingEvents: (raw.upcomingEvents ?? []).map((e: any) => ({
      id: e.id,
      title: e.title ?? '',
      date: e.startsAt
        ? new Date(e.startsAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'UTC' })
        : e.date ?? '',
      scene: e.tags?.[0] ?? e.scene ?? '',
      role: e.hostId === user?.id ? 'Host' : e.role,
    })),
    myEvents: (raw.pastEvents ?? raw.myEvents ?? []).map((e: any) => ({
      id: e.id,
      title: e.title ?? '',
      date: e.startsAt
        ? new Date(e.startsAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'UTC' })
        : e.date ?? '',
      scene: e.tags?.[0] ?? e.scene ?? '',
      role: e.hostId === user?.id ? 'Host' : e.role,
    })),
    recentCards: (raw.postcardsReceived ?? raw.recentCards ?? []).map((c: any) => ({
      ...c,
      from: typeof c.from === 'object' ? c.from?.name ?? '' : c.from ?? '',
      to: typeof c.to === 'object' ? c.to?.name ?? '' : c.to ?? '',
      date: c.date ?? (c.createdAt ? new Date(c.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : ''),
      photo: c.photo ?? c.photoUrl ?? '',
      stamp: c.stamp ?? (c.tags?.map((t: any) => typeof t === 'string' ? t : t.value).join(', ') ?? ''),
    })),
    sentCards: (raw.postcardsSent ?? raw.sentCards ?? []).map((c: any) => ({
      ...c,
      from: typeof c.from === 'object' ? c.from?.name ?? '' : c.from ?? '',
      to: typeof c.to === 'object' ? c.to?.name ?? '' : c.to ?? '',
      date: c.date ?? (c.createdAt ? new Date(c.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : ''),
      photo: c.photo ?? c.photoUrl ?? '',
      stamp: c.stamp ?? (c.tags?.map((t: any) => typeof t === 'string' ? t : t.value).join(', ') ?? ''),
    })),
    galleryPhotos: raw.galleryPhotos ?? [],
    timeline: raw.timeline ?? [],
    mostSharedWith: raw.mostSharedWith ?? null,
    closestTaste: raw.closestTaste ?? null,
    recentClosest: raw.recentClosest ?? null,
  };

  const [tab, setTab] = useState(0);
  const [eventFilter, setEventFilter] = useState<'all' | 'host'>('all');
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [visibleGroupCount, setVisibleGroupCount] = useState(3);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [timelineExpanded, setTimelineExpanded] = useState(false);

  const rawCover = user?.coverImageUrl || photos.cozy;
  const isGradient = rawCover.startsWith('linear-gradient') || rawCover.startsWith('radial-gradient');
  const coverBg = isGradient ? rawCover : `url(${rawCover}) center/cover no-repeat`;

  const allGalleryPhotos = data.galleryPhotos ?? [];

  const photoGroups = useMemo(() => {
    const groupMap = new Map<string, { eventId: string; eventTitle: string; latestAt: string; photos: typeof allGalleryPhotos }>();
    for (const photo of allGalleryPhotos) {
      const key = photo.eventId ?? 'unknown';
      const existing = groupMap.get(key);
      if (!existing) {
        groupMap.set(key, { eventId: key, eventTitle: photo.eventTitle ?? '', latestAt: photo.createdAt ?? '', photos: [photo] });
      } else {
        existing.photos.push(photo);
        if ((photo.createdAt ?? '') > existing.latestAt) existing.latestAt = photo.createdAt ?? '';
      }
    }
    return Array.from(groupMap.values()).sort((a, b) => (b.latestAt > a.latestAt ? 1 : -1));
  }, [allGalleryPhotos]);

  // Build a flat index map for lightbox: globalIndex → photo
  const flatPhotosFromGroups = useMemo(() => {
    const visibleGroups = photoGroups.slice(0, visibleGroupCount);
    const result: typeof allGalleryPhotos = [];
    for (const group of visibleGroups) {
      if (!collapsedGroups.has(group.eventId)) {
        result.push(...group.photos);
      }
    }
    return result;
  }, [photoGroups, visibleGroupCount, collapsedGroups]);

  return (
    <Stack spacing={0}>
      {/* ══════ Hero Section ══════ */}
      <Box sx={{ position: 'relative', mb: 2 }}>
        {/* Cover Image */}
        <Box sx={{
          height: 180,
          background: coverBg,
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Gradient overlay */}
          <Box sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '70%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
          }} />

          {/* Edit button */}
          <IconButton
            onClick={() => navigate('/settings')}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: '#fff',
              bgcolor: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(4px)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
            }}
            size="small"
          >
            <EditIcon fontSize="small" />
          </IconButton>

          {/* Avatar + Name overlay */}
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="flex-end"
            sx={{ position: 'absolute', bottom: 12, left: 16, right: 16 }}
          >
            <Avatar
              src={user?.avatar}
              sx={{ width: 64, height: 64, border: '3px solid rgba(255,255,255,0.8)', fontSize: 24 }}
            >
              {user?.name?.[0] ?? 'Y'}
            </Avatar>
            <Box sx={{ flex: 1, pb: 0.5 }}>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>
                {user?.name ?? 'Yuan'}
              </Typography>
              {(user?.city || user?.state) && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  📍 {[user.city, user.state].filter(Boolean).join(', ')}
                </Typography>
              )}
              <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                {data.titles.map((title) => (
                  <Chip
                    key={title}
                    size="small"
                    label={title}
                    sx={{
                      height: 22,
                      fontSize: 11,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: '#fff',
                      backdropFilter: 'blur(4px)',
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* ══════ Stats + Social Card ══════ */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: '12px !important' }}>
          {/* Stats Row */}
          <Stack
            direction="row"
            justifyContent="space-around"
            sx={{ mb: 1.5 }}
          >
            {[
              { value: data.participationStats.eventCount, label: '场活动', action: () => { setTab(0); setEventFilter('all'); } },
              { value: data.participationStats.hostCount, label: '次Host', action: () => { setTab(0); setEventFilter('host'); } },
              { value: data.participationStats.movieCount, label: '部电影', action: () => { setTab(1); } },
            ].map((stat) => {
              const active =
                (stat.label === '场活动' && tab === 0 && eventFilter === 'all') ||
                (stat.label === '次Host' && tab === 0 && eventFilter === 'host') ||
                (stat.label === '部电影' && tab === 1);
              return (
                <Box
                  key={stat.label}
                  onClick={stat.action}
                  sx={{
                    textAlign: 'center',
                    cursor: 'pointer',
                    px: 1.5,
                    py: 0.5,
                    '&:hover .kpi-value': { color: c.warm },
                  }}
                >
                  <Typography className="kpi-value" variant="h5" fontWeight={700} sx={{ color: active ? c.warm : 'text.primary', transition: 'color 0.2s' }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Box>
              );
            })}
          </Stack>

          {/* Social Connections */}
          {(data.mostSharedWith || data.closestTaste || data.recentClosest) && (
            <>
              <Divider sx={{ mb: 1.5 }} />
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>社区缘分</Typography>
              <Stack spacing={1}>
                {data.mostSharedWith && (
                  <CardActionArea
                    onClick={() => navigate(`/members/${encodeURIComponent(data.mostSharedWith!.name)}`)}
                    sx={{ borderRadius: 2 }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 0.8 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: c.warm + '30', color: c.warm, fontSize: 14 }}>
                        {firstNonEmoji(data.mostSharedWith.name)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          和我经历最多：{data.mostSharedWith.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {data.mostSharedWith.evtCount} 场活动 · {data.mostSharedWith.cards} 张卡片
                        </Typography>
                      </Box>
                    </Stack>
                  </CardActionArea>
                )}
                {data.closestTaste && (
                  <CardActionArea
                    onClick={() => navigate(`/members/${encodeURIComponent(data.closestTaste!.name)}`)}
                    sx={{ borderRadius: 2 }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 0.8 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: c.blue + '30', color: c.blue, fontSize: 14 }}>
                        {firstNonEmoji(data.closestTaste.name)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          品味最接近：{data.closestTaste.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          共同喜欢 {data.closestTaste.movies.length} 部电影：{data.closestTaste.movies.join('、')}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardActionArea>
                )}
                {data.recentClosest && data.recentClosest.name !== data.closestTaste?.name && (
                  <CardActionArea
                    onClick={() => navigate(`/members/${encodeURIComponent(data.recentClosest!.name)}`)}
                    sx={{ borderRadius: 2 }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 0.8 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: '#9c27b0' + '30', color: '#9c27b0', fontSize: 14 }}>
                        {firstNonEmoji(data.recentClosest.name)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          最近见过且品味最接近：{data.recentClosest.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          共同喜欢 {data.recentClosest.movies.length} 部电影
                        </Typography>
                      </Box>
                    </Stack>
                  </CardActionArea>
                )}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* ══════ Tabs ══════ */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0, textTransform: 'none', fontSize: 14 } }}
        >
          <Tab label="活动记忆" />
          <Tab label="电影" />
          <Tab label="感谢卡" />
          <Tab label="关于我" />
        </Tabs>
      </Box>

      {/* ══════ Tab 0: 活动记忆 ══════ */}
      {tab === 0 && (() => {
        const filteredUpcoming = eventFilter === 'host'
          ? data.upcomingEvents.filter((e) => e.role === 'Host')
          : data.upcomingEvents;
        const filteredPast = eventFilter === 'host'
          ? data.myEvents.filter((e) => e.role === 'Host')
          : data.myEvents;

        return (
        <Stack spacing={2}>
          {data.upcomingEvents.length === 0 && allGalleryPhotos.length === 0 && data.myEvents.length === 0 && data.timeline.length === 0 && (
            <EmptyState
              icon="📅"
              title="还没有参加过活动，去看看有什么活动吧！"
              action={{ label: '浏览活动', to: '/events' }}
            />
          )}

          {/* Filter chip */}
          {eventFilter === 'host' && (
            <Chip
              label="只看我Host的"
              onDelete={() => setEventFilter('all')}
              color="warning"
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            />
          )}

          {/* Upcoming Events — pinned to top */}
          {filteredUpcoming.length > 0 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.2 }}>
                📅 即将参加
              </Typography>
              <Grid container spacing={1.5}>
                {filteredUpcoming.map((event) => (
                  <Grid key={event.id} size={{ xs: 12, sm: 6 }}>
                    <Card variant="outlined">
                      <CardActionArea onClick={() => navigate(`/events/${event.id}`)}>
                        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {sceneEmoji[event.scene] ?? '📅'} {event.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">{event.date}</Typography>
                            </Box>
                            {event.role === 'Host' && <Chip size="small" color="warning" label="🏠 Host" />}
                          </Stack>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Photo Gallery — grouped by event */}
          {allGalleryPhotos.length > 0 && (
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    活动记忆 ({allGalleryPhotos.length})
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => {
                      const recentEnded = data.myEvents[0];
                      navigate(recentEnded ? `/events/${recentEnded.id}` : '/events');
                    }}
                  >
                    添加记录 →
                  </Button>
                </Stack>

                <Stack spacing={2}>
                  {photoGroups.slice(0, visibleGroupCount).map((group) => {
                    const isCollapsed = collapsedGroups.has(group.eventId);
                    return (
                      <Box key={group.eventId}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          onClick={() => setCollapsedGroups((prev) => {
                            const next = new Set(prev);
                            if (next.has(group.eventId)) next.delete(group.eventId);
                            else next.add(group.eventId);
                            return next;
                          })}
                          sx={{ cursor: 'pointer', mb: isCollapsed ? 0 : 1, py: 0.5 }}
                        >
                          <Typography variant="body2" fontWeight={600}>
                            {group.eventTitle} ({group.photos.length})
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {isCollapsed ? '展开 ▸' : '收起 ▾'}
                          </Typography>
                        </Stack>
                        {!isCollapsed && (
                          <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 0.5,
                          }}>
                            {group.photos.map((photo) => {
                              const globalIdx = flatPhotosFromGroups.indexOf(photo);
                              return (
                                <Box
                                  key={photo.id}
                                  onClick={() => setLightboxIndex(globalIdx)}
                                  sx={{
                                    position: 'relative',
                                    aspectRatio: '1',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Box
                                    component="img"
                                    src={photo.url}
                                    alt={photo.eventTitle}
                                    sx={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      display: 'block',
                                      filter: 'saturate(0.85) contrast(1.05)',
                                    }}
                                  />
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Stack>

                {visibleGroupCount < photoGroups.length && (
                  <Button size="small" sx={{ mt: 1.5 }} onClick={() => setVisibleGroupCount((n) => n + 5)}>
                    查看更多活动 →
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Past Events */}
          {filteredPast.length > 0 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.2 }}>
                📅 参加过的活动
              </Typography>
              <Grid container spacing={1.5}>
                {filteredPast.slice(0, 8).map((event) => (
                  <Grid key={event.id} size={{ xs: 12, sm: 6 }}>
                    <Card variant="outlined">
                      <CardActionArea onClick={() => navigate(`/events/${event.id}`)}>
                        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {sceneEmoji[event.scene] ?? '📅'} {event.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">{event.date}</Typography>
                            </Box>
                            {event.role === 'Host' && <Chip size="small" color="warning" label="🏠 Host" />}
                          </Stack>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              {filteredPast.length > 8 && (
                <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/events')}>
                  查看全部 →
                </Button>
              )}
            </Box>
          )}

          {/* Timeline */}
          {data.timeline.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                  📖 参与时间线
                </Typography>
                <Box sx={{ position: 'relative', pl: 2.5 }}>
                  <Box sx={{
                    position: 'absolute',
                    left: 6,
                    top: 4,
                    bottom: 4,
                    width: 2,
                    bgcolor: c.line,
                    borderRadius: 1,
                  }} />
                  <Stack spacing={1.2}>
                    {(timelineExpanded ? data.timeline : data.timeline.slice(0, 10)).map((item, index) => (
                      <Box
                        key={index}
                        sx={{ position: 'relative', cursor: item.link ? 'pointer' : 'default' }}
                        onClick={() => item.link && navigate(item.link)}
                      >
                        <Box sx={{
                          position: 'absolute',
                          left: -17,
                          top: 6,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: c.warm,
                        }} />
                        <Stack direction="row" spacing={1} alignItems="baseline">
                          {item.date && (
                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36, flexShrink: 0 }}>
                              {item.date}
                            </Typography>
                          )}
                          <Typography variant="body2" color={item.link ? 'text.primary' : 'text.secondary'}>
                            {item.text}
                          </Typography>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Box>
                {!timelineExpanded && data.timeline.length > 10 && (
                  <Button size="small" sx={{ mt: 1.5 }} onClick={() => setTimelineExpanded(true)}>
                    展开更多 →
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </Stack>
        );
      })()}

      {/* ══════ Tab 1: 电影 ══════ */}
      {tab === 1 && (
        <>
          {data.myMovies.length === 0 && data.votedMovies.length === 0 && (
            <EmptyState
              icon="🎬"
              title="还没有推荐或投票过电影"
              description="去推荐页看看有什么好电影吧！"
              action={{ label: '去发现', to: '/discover' }}
            />
          )}

          {(data.myMovies.length > 0 || data.votedMovies.length > 0) && (
            <Grid container spacing={2}>
              {/* My Recommended Movies */}
              {data.myMovies.length > 0 && (
                <Grid size={{ xs: 12, md: data.votedMovies.length > 0 ? 6 : 12 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.2 }}>
                        🎬 我推荐的电影 ({data.myMovies.length})
                      </Typography>
                      <Stack spacing={1}>
                        {data.myMovies.map((movie) => (
                          <CardActionArea
                            key={movie.id}
                            onClick={() => navigate(`/discover/movies/${movie.id}`)}
                            sx={{ borderRadius: 2 }}
                          >
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 1 }}>
                              <Poster title={movie.title} w={40} h={56} />
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={700} noWrap>{movie.title}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {movie.year} · {movie.dir}
                                </Typography>
                                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.3 }}>
                                  <Typography variant="caption" color="text.secondary">{movie.v} 票</Typography>
                                  {movie.status && (
                                    <Chip
                                      size="small"
                                      label={movie.status}
                                      color={movie.status === '本周放映' ? 'warning' : 'default'}
                                      sx={{ height: 20, fontSize: 11 }}
                                    />
                                  )}
                                </Stack>
                              </Box>
                            </Stack>
                          </CardActionArea>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Voted Movies */}
              {data.votedMovies.length > 0 && (
                <Grid size={{ xs: 12, md: data.myMovies.length > 0 ? 6 : 12 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.2 }}>
                        👍 我投票的电影 ({data.votedMovies.length})
                      </Typography>
                      <Stack spacing={1}>
                        {data.votedMovies.map((movie) => (
                          <CardActionArea
                            key={movie.id}
                            onClick={() => navigate(`/discover/movies/${movie.id}`)}
                            sx={{ borderRadius: 2 }}
                          >
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 1 }}>
                              <Poster title={movie.title} w={40} h={56} />
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={700} noWrap>{movie.title}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {movie.year} · {movie.dir} · 推荐人: {movie.by}
                                </Typography>
                                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.3 }}>
                                  <Typography variant="caption" color="text.secondary">{movie.v} 票</Typography>
                                  {movie.status && (
                                    <Chip
                                      size="small"
                                      label={movie.status}
                                      color={movie.status === '本周放映' ? 'warning' : 'default'}
                                      sx={{ height: 20, fontSize: 11 }}
                                    />
                                  )}
                                </Stack>
                              </Box>
                            </Stack>
                          </CardActionArea>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </>
      )}

      {/* ══════ Tab 2: 感谢卡 ══════ */}
      {tab === 2 && (
        <Stack spacing={2}>
          {/* Received Cards */}
          {data.recentCards.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.2 }}>
                  💌 收到的感谢卡 ({data.recentCards.length})
                </Typography>
                <Grid container spacing={1.5}>
                  {data.recentCards.map((card, index) => (
                    <Grid key={index} size={{ xs: 12, sm: 6 }}>
                      <PostCard
                        from={card.from}
                        to={user?.name ?? 'Yuan'}
                        fromAvatar={card.fromAvatar}
                        toAvatar={user?.avatar || undefined}
                        message={card.message}
                        stamp={card.stamp}
                        date={card.date}
                        photo={card.photo}
                        layout="horizontal"
                        eventCtx={card.eventCtx}
                      />
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Sent Cards */}
          {data.sentCards.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.2 }}>
                  ✉️ 寄出的感谢卡 ({data.sentCards.length})
                </Typography>
                <Grid container spacing={1.5}>
                  {data.sentCards.map((card, index) => (
                    <Grid key={index} size={{ xs: 12, sm: 6 }}>
                      <PostCard
                        from={user?.name ?? 'Yuan'}
                        to={card.from === (user?.name ?? 'Yuan') ? '' : card.from}
                        fromAvatar={user?.avatar || undefined}
                        toAvatar={card.fromAvatar}
                        message={card.message}
                        stamp={card.stamp}
                        date={card.date}
                        photo={card.photo}
                        layout="horizontal"
                        eventCtx={card.eventCtx}
                      />
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}

          {data.recentCards.length === 0 && data.sentCards.length === 0 && (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  还没有感谢卡，去给朋友写一张吧！
                </Typography>
                <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/cards')}>
                  写感谢卡 →
                </Button>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {/* ══════ Tab 3: 关于我 ══════ */}
      {tab === 3 && (
        <Stack spacing={2}>
          {(user?.bio || user?.selfAsFriend || user?.idealFriend || user?.participationPlan) ? (
            <Card>
              <CardContent>
                {user?.bio && (
                  <>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>关于我</Typography>
                    <RichTextViewer html={user.bio} />
                  </>
                )}
                {user?.selfAsFriend && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>作为朋友，我</Typography>
                    <RichTextViewer html={user.selfAsFriend} />
                  </>
                )}
                {user?.idealFriend && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>我理想中的朋友</Typography>
                    <RichTextViewer html={user.idealFriend} />
                  </>
                )}
                {user?.participationPlan && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>参与计划</Typography>
                    <RichTextViewer html={user.participationPlan} />
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  还没有填写个人介绍
                </Typography>
                <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/settings')}>
                  去填写 →
                </Button>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {/* ══════ Lightbox Dialog ══════ */}
      <Dialog
        open={lightboxIndex >= 0}
        onClose={() => setLightboxIndex(-1)}
        maxWidth={false}
        fullScreen
        PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.95)' } }}
      >
        {lightboxIndex >= 0 && lightboxIndex < flatPhotosFromGroups.length && (() => {
          const photo = flatPhotosFromGroups[lightboxIndex];
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
                <IconButton onClick={() => setLightboxIndex(-1)} sx={{ color: '#fff' }}>
                  <CloseIcon />
                </IconButton>
              </Box>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', px: 6 }}>
                {lightboxIndex > 0 && (
                  <IconButton
                    onClick={() => setLightboxIndex((i) => i - 1)}
                    sx={{ position: 'absolute', left: 8, color: '#fff' }}
                  >
                    <ArrowBackIosNewIcon />
                  </IconButton>
                )}
                <Box
                  component="img"
                  src={photo.url}
                  alt={photo.caption || '照片'}
                  sx={{
                    maxWidth: '90%',
                    maxHeight: 'calc(100vh - 160px)',
                    borderRadius: 2,
                    objectFit: 'contain',
                    filter: 'saturate(0.85) contrast(1.05)',
                  }}
                />
                {lightboxIndex < flatPhotosFromGroups.length - 1 && (
                  <IconButton
                    onClick={() => setLightboxIndex((i) => i + 1)}
                    sx={{ position: 'absolute', right: 8, color: '#fff' }}
                  >
                    <ArrowForwardIosIcon />
                  </IconButton>
                )}
              </Box>
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#fff' }}>
                  {photo.eventTitle}
                </Typography>
                {photo.caption && (
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {photo.caption} · {photo.uploadedBy}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })()}
      </Dialog>
    </Stack>
  );
}
