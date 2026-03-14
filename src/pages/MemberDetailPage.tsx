import { useState } from 'react';
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
import { photos } from '@/theme';
import { hostMilestoneBadge } from '@/lib/mappings';

const sceneEmoji: Record<string, string> = {
  movieNight: '🎬',
  potluck: '🍳',
  hike: '🥾',
  coffee: '☕',
  sports: '🏸',
};

export default function MemberDetailPage() {
  const raw = useLoaderData() as any;
  const { user } = useAuth();
  const navigate = useNavigate();
  const c = useColors();

  if (!raw?.user) {
    return <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>找不到这个成员</Typography>;
  }

  const member = raw.user;
  const mutual = raw.mutual;
  const tasteCount = mutual?.tasteCount ?? mutual?.movies?.length ?? 0;
  const hasMutual = mutual && (mutual.evtCount > 0 || tasteCount > 0 || mutual.cards > 0);
  const hostCount = raw.stats?.hostCount ?? member.hostCount ?? 0;
  const badgeTier = hostMilestoneBadge(hostCount, raw._badgeTiers);
  const memberBadge = badgeTier?.emoji;
  const isOwnProfile = user?.id === member.id;
  const statsHidden = !isOwnProfile && member.hideStats;
  const activityHidden = !isOwnProfile && member.hideActivity;

  // Map API shape → ProfilePageData (same as ProfilePage)
  const data: ProfilePageData = {
    titles: member.titles ?? [],
    role: member.role ?? '',
    participationStats: raw.stats ?? { eventCount: 0, hostCount: 0, movieCount: 0, screenedCount: 0, proposalCount: 0, voteCount: 0 },
    contribution: raw.stats ?? { hostCount: 0, eventCount: 0, movieCount: 0, cardsSent: 0, cardsReceived: 0 },
    myMovies: (raw.recentMovies ?? []).map((m: any) => ({
      ...m,
      v: m._count?.votes ?? m.v ?? 0,
      dir: m.director ?? m.dir ?? '',
    })),
    votedMovies: (raw.votedMovies ?? []).map((m: any) => ({
      ...m,
      v: m._count?.votes ?? m.v ?? 0,
      dir: m.director ?? m.dir ?? '',
      by: m.recommendedBy?.name ?? m.by ?? '',
    })),
    upcomingEvents: (raw.upcomingEvents ?? []).map((e: any) => ({
      id: e.id,
      title: e.title ?? '',
      date: e.startsAt
        ? new Date(e.startsAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'America/New_York' })
        : e.date ?? '',
      scene: e.tags?.[0] ?? e.scene ?? '',
      role: e.hostId === member.id ? 'Host' : e.role,
    })),
    myEvents: (raw.pastEvents ?? []).map((e: any) => ({
      id: e.id,
      title: e.title ?? '',
      date: e.startsAt
        ? new Date(e.startsAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'America/New_York' })
        : e.date ?? '',
      scene: e.tags?.[0] ?? e.scene ?? '',
      role: e.hostId === member.id ? 'Host' : e.role,
    })),
    recentCards: (raw.postcardsReceived ?? []).map((card: any) => ({
      ...card,
      from: typeof card.from === 'object' ? card.from?.name ?? '' : card.from ?? '',
      to: member.name,
      date: card.date ?? (card.createdAt ? new Date(card.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : ''),
      photo: card.photo ?? card.photoUrl ?? '',
      stamp: card.stamp ?? (card.tags?.map((t: any) => typeof t === 'string' ? t : t.value).join(', ') ?? ''),
    })),
    sentCards: (raw.postcardsSent ?? []).map((card: any) => ({
      ...card,
      from: member.name,
      to: typeof card.to === 'object' ? card.to?.name ?? '' : card.to ?? '',
      date: card.date ?? (card.createdAt ? new Date(card.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : ''),
      photo: card.photo ?? card.photoUrl ?? '',
      stamp: card.stamp ?? (card.tags?.map((t: any) => typeof t === 'string' ? t : t.value).join(', ') ?? ''),
    })),
    galleryPhotos: raw.galleryPhotos ?? [],
    timeline: raw.timeline ?? [],
    mostSharedWith: null,
    closestTaste: null,
    recentClosest: null,
  };

  const [tab, setTab] = useState(0);
  const [eventFilter, setEventFilter] = useState<'all' | 'host'>('all');
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  const rawCover = member.coverImageUrl || photos.cozy;
  const isGradient = rawCover.startsWith('linear-gradient') || rawCover.startsWith('radial-gradient');
  const coverBg = isGradient ? rawCover : `url(${rawCover}) center/cover no-repeat`;

  const allGalleryPhotos = data.galleryPhotos ?? [];
  const galleryPhotos = showAllPhotos ? allGalleryPhotos : allGalleryPhotos.slice(0, 9);

  // Tab labels — add "我们的交集" if there's mutual data
  const tabs = ['活动记忆', '电影', '感谢卡', '关于TA'];
  if (hasMutual) tabs.push('我们的交集');

  return (
    <Stack spacing={0}>
      {/* ══════ Hero Section ══════ */}
      <Box sx={{ position: 'relative', mb: 2 }}>
        <Box sx={{
          height: 180,
          background: coverBg,
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <Box sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '70%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
          }} />

          <Stack
            direction="row"
            spacing={1.5}
            alignItems="flex-end"
            sx={{ position: 'absolute', bottom: 12, left: 16, right: 16 }}
          >
            <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
              <Avatar
                src={member.avatar}
                sx={{ width: 64, height: 64, border: '3px solid rgba(255,255,255,0.8)', fontSize: 24 }}
              >
                {member.name?.[0]}
              </Avatar>
              {memberBadge && (
                <Box sx={{ position: 'absolute', bottom: -2, right: -2, fontSize: 18, lineHeight: 1 }}>{memberBadge}</Box>
              )}
            </Box>
            <Box sx={{ flex: 1, pb: 0.5 }}>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>
                {member.name}
              </Typography>
              {(member.city || member.state) && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  📍 {[member.city, member.state].filter(Boolean).join(', ')}
                </Typography>
              )}
              <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                {memberBadge && (
                  <Chip
                    size="small"
                    label={`${memberBadge} ${badgeTier?.label}`}
                    sx={{
                      height: 22,
                      fontSize: 11,
                      bgcolor: 'rgba(212,165,116,0.3)',
                      color: '#fff',
                      backdropFilter: 'blur(4px)',
                    }}
                  />
                )}
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

      {/* ══════ Stats Card ══════ */}
      {!statsHidden && (
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: '12px !important' }}>
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

          {/* Send card CTA */}
          {user && user.id !== member.id && (
            <>
              <Divider sx={{ mb: 1.5 }} />
              <Button
                variant="contained"
                fullWidth
                onClick={() => navigate('/cards', { state: { recipientName: member.name, recipientId: member.id } })}
              >
                ✉ 寄张感谢卡给 {member.name}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      )}

      {/* ══════ Tabs ══════ */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0, textTransform: 'none', fontSize: 14 } }}
        >
          {tabs.map((label) => <Tab key={label} label={label} />)}
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
          {data.upcomingEvents.length === 0 && allGalleryPhotos.length === 0 && data.myEvents.length === 0 && (
            <EmptyState
              icon="📅"
              title={`${member.name} 还没有参加过活动`}
            />
          )}

          {eventFilter === 'host' && (
            <Chip
              label="只看Host的"
              onDelete={() => setEventFilter('all')}
              color="warning"
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            />
          )}

          {/* Upcoming Events */}
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

          {/* Photo Gallery */}
          {allGalleryPhotos.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                  活动记忆 ({allGalleryPhotos.length})
                </Typography>

                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gridAutoRows: '1fr',
                  gap: 0.5,
                }}>
                  {galleryPhotos.map((photo, idx) => (
                    <Box
                      key={photo.id}
                      onClick={() => setLightboxIndex(idx)}
                      sx={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: 1,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        ...(idx === 0 ? {
                          gridColumn: 'span 2',
                          gridRow: 'span 2',
                        } : {}),
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
                      <Box sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        p: 0.5,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                      }}>
                        <Typography variant="caption" sx={{ color: '#fff', fontSize: 10, lineHeight: 1.2 }} noWrap>
                          {photo.eventTitle}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>

                {!showAllPhotos && allGalleryPhotos.length > 9 && (
                  <Button size="small" sx={{ mt: 1 }} onClick={() => setShowAllPhotos(true)}>
                    查看全部 →
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
        </Stack>
        );
      })()}

      {/* ══════ Tab 1: 电影 ══════ */}
      {tab === 1 && (
        <Stack spacing={2}>
          {data.myMovies.length === 0 && data.votedMovies.length === 0 && (
            <EmptyState
              icon="🎬"
              title={`${member.name} 还没有推荐或投票过电影`}
            />
          )}

          {data.myMovies.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.2 }}>
                  🎬 推荐的电影 ({data.myMovies.length})
                </Typography>
                <Grid container spacing={1.5}>
                  {data.myMovies.map((movie) => (
                    <Grid key={movie.id} size={{ xs: 12, sm: 6 }}>
                      <CardActionArea
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
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}

          {data.votedMovies.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.2 }}>
                  👍 投票的电影 ({data.votedMovies.length})
                </Typography>
                <Grid container spacing={1.5}>
                  {data.votedMovies.map((movie) => (
                    <Grid key={movie.id} size={{ xs: 12, sm: 6 }}>
                      <CardActionArea
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
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {/* ══════ Tab 2: 感谢卡 ══════ */}
      {tab === 2 && (
        <Stack spacing={2}>
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
                        to={member.name}
                        fromAvatar={card.fromAvatar}
                        toAvatar={member.avatar || undefined}
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
                        from={member.name}
                        to={(card as any).to ?? ''}
                        fromAvatar={member.avatar || undefined}
                        toAvatar={(card as any).toAvatar}
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
            <EmptyState
              icon="💌"
              title={`${member.name} 还没有公开的感谢卡`}
            />
          )}
        </Stack>
      )}

      {/* ══════ Tab 3: 关于TA ══════ */}
      {tab === 3 && (
        <Stack spacing={2}>
          {(member.bio || member.selfAsFriend || member.idealFriend || member.participationPlan) ? (
            <Card>
              <CardContent>
                {member.bio && (
                  <>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>关于TA</Typography>
                    <RichTextViewer html={member.bio} />
                  </>
                )}
                {member.selfAsFriend && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>作为朋友</Typography>
                    <RichTextViewer html={member.selfAsFriend} />
                  </>
                )}
                {member.idealFriend && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>理想中的朋友</Typography>
                    <RichTextViewer html={member.idealFriend} />
                  </>
                )}
                {member.participationPlan && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>参与计划</Typography>
                    <RichTextViewer html={member.participationPlan} />
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon="📝"
              title={`${member.name} 还没有填写个人介绍`}
            />
          )}
        </Stack>
      )}

      {/* ══════ Tab 4: 我们的交集 ══════ */}
      {hasMutual && tab === 4 && (() => {
        const catEmoji: Record<string, string> = {
          book: '📚', recipe: '🍜', music: '🎵', place: '📍', external_event: '🎭',
        };
        const catLabel: Record<string, string> = {
          book: '图书', recipe: '食谱', music: '音乐', place: '地点', external_event: '演出',
        };
        const recs = mutual.recommendations ?? {};
        const recCategories = Object.keys(recs).filter((cat) => recs[cat].length > 0);

        return (
        <Stack spacing={2}>
          {/* Mutual stats */}
          <Grid container spacing={1.2}>
            {[
              { label: '📅 一起参加', value: mutual.evtCount },
              { label: '🤝 共同品味', value: tasteCount },
              { label: '💌 互寄卡片', value: mutual.cards },
            ].filter((s) => s.value > 0).map((stat) => (
              <Grid key={stat.label} size={{ xs: 4 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="h5" color="primary.main" fontWeight={800}>{stat.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Mutual events */}
          {mutual.events.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>一起参加的活动</Typography>
                <Stack spacing={0.8}>
                  {mutual.events.map((evt: any) => (
                    <Typography
                      key={evt.id}
                      variant="body2"
                      color="text.secondary"
                      sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                      onClick={() => navigate(`/events/${evt.id}`)}
                    >
                      {sceneEmoji[evt.scene] ?? '📅'} {evt.title}
                    </Typography>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Unified taste card: movies + recommendations by category */}
          {tasteCount > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>共同品味</Typography>
                <Stack spacing={1.5}>
                  {mutual.movies.length > 0 && (
                    <Box>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>🎬 电影 ({mutual.movies.length})</Typography>
                      <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                        {mutual.movies.map((movie: any) => (
                          <Chip
                            key={movie.id}
                            size="small"
                            color="secondary"
                            label={movie.title}
                            onClick={() => navigate(`/discover/movies/${movie.id}`)}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  {recCategories.map((cat) => (
                    <Box key={cat}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                        {catEmoji[cat] ?? '📌'} {catLabel[cat] ?? cat} ({recs[cat].length})
                      </Typography>
                      <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                        {recs[cat].map((item: any) => (
                          <Chip
                            key={item.id}
                            size="small"
                            color="secondary"
                            label={item.title}
                            onClick={() => navigate(`/discover/${cat}/${item.id}`)}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {mutual.cards > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>互寄感谢卡</Typography>
                <Typography variant="body2" color="text.secondary">
                  你们之间互寄了 {mutual.cards} 张感谢卡
                  {/* TODO: 展示最近 2-3 张卡片预览（需要额外后端查询） */}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
        );
      })()}

      {/* ══════ Lightbox Dialog ══════ */}
      <Dialog
        open={lightboxIndex >= 0}
        onClose={() => setLightboxIndex(-1)}
        maxWidth={false}
        fullScreen
        PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.95)' } }}
      >
        {lightboxIndex >= 0 && lightboxIndex < allGalleryPhotos.length && (() => {
          const photo = allGalleryPhotos[lightboxIndex];
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
                {lightboxIndex < allGalleryPhotos.length - 1 && (
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
              </Box>
            </Box>
          );
        })()}
      </Dialog>
    </Stack>
  );
}
