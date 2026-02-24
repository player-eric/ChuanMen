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
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import type { ProfilePageData } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { RichTextViewer } from '@/components/RichTextEditor';
import { PostCard } from '@/components/PostCard';
import { Poster } from '@/components/Poster';
import { useColors } from '@/hooks/useColors';
import { photos } from '@/theme';

const sceneEmoji: Record<string, string> = {
  movieNight: '🎬',
  potluck: '🍳',
  hike: '🥾',
  coffee: '☕',
  sports: '🏸',
};

export default function ProfilePage() {
  const data = useLoaderData() as ProfilePageData;
  const { user } = useAuth();
  const navigate = useNavigate();
  const c = useColors();

  const [tab, setTab] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(false);

  const rawCover = user?.coverImageUrl || photos.cozy;
  const isGradient = rawCover.startsWith('linear-gradient') || rawCover.startsWith('radial-gradient');
  const coverBg = isGradient ? rawCover : `url(${rawCover}) center/cover no-repeat`;

  const galleryPhotos = showAllPhotos ? data.galleryPhotos : data.galleryPhotos.slice(0, 9);

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
              {user?.location && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  📍 {user.location}
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
              { value: data.participationStats.eventCount, label: '场活动' },
              { value: data.participationStats.hostCount, label: '次Host' },
              { value: data.participationStats.movieCount, label: '部电影' },
            ].map((stat) => (
              <Box key={stat.label} sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700} color="text.primary">
                  {stat.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.label}
                </Typography>
              </Box>
            ))}
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
                        {data.mostSharedWith.name[0]}
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
                        {data.closestTaste.name[0]}
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
                        {data.recentClosest.name[0]}
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
      {tab === 0 && (
        <Stack spacing={2}>
          {/* Upcoming Events — pinned to top */}
          {data.upcomingEvents.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.2 }}>
                  📅 即将参加
                </Typography>
                <Stack spacing={1}>
                  {data.upcomingEvents.map((event) => (
                    <CardActionArea
                      key={event.id}
                      onClick={() => navigate(`/events/${event.id}`)}
                      sx={{ borderRadius: 2 }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" noWrap>
                            {sceneEmoji[event.scene] ?? '📅'} {event.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{event.date}</Typography>
                        </Box>
                        {event.role && <Chip size="small" color="warning" label={`🏠 ${event.role}`} />}
                      </Stack>
                    </CardActionArea>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Photo Gallery */}
          {data.galleryPhotos.length > 0 && (
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    活动记忆 ({data.galleryPhotos.length})
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => {
                      const recentEnded = data.myEvents[0];
                      if (recentEnded) navigate(`/events/${recentEnded.id}`);
                    }}
                  >
                    添加记录 →
                  </Button>
                </Stack>

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
                      <Box sx={{
                        width: '100%',
                        height: '100%',
                        background: photo.url,
                        filter: 'saturate(0.85) contrast(1.05)',
                      }} />
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

                {!showAllPhotos && data.galleryPhotos.length > 9 && (
                  <Button size="small" sx={{ mt: 1 }} onClick={() => setShowAllPhotos(true)}>
                    查看全部 →
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Past Events */}
          {data.myEvents.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.2 }}>
                  📅 参加过的活动
                </Typography>
                <Stack spacing={1}>
                  {data.myEvents.slice(0, 8).map((event) => (
                    <CardActionArea
                      key={event.id}
                      onClick={() => navigate(`/events/${event.id}`)}
                      sx={{ borderRadius: 2 }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" noWrap>
                            {sceneEmoji[event.scene] ?? '📅'} {event.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{event.date}</Typography>
                        </Box>
                        {event.role && <Chip size="small" color="warning" label={`🏠 ${event.role}`} />}
                      </Stack>
                    </CardActionArea>
                  ))}
                </Stack>
                {data.myEvents.length > 8 && (
                  <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/events')}>
                    查看全部 →
                  </Button>
                )}
              </CardContent>
            </Card>
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
      )}

      {/* ══════ Tab 1: 电影 ══════ */}
      {tab === 1 && (
        <Stack spacing={2}>
          {/* My Recommended Movies */}
          {data.myMovies.length > 0 && (
            <Card>
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
          )}

          {/* Voted Movies */}
          {data.votedMovies.length > 0 && (
            <Card>
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
          )}
        </Stack>
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
                        message={card.message}
                        stamp={card.stamp}
                        date={card.date}
                        photo={card.photo}
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
                        message={card.message}
                        stamp={card.stamp}
                        date={card.date}
                        photo={card.photo}
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
        {lightboxIndex >= 0 && lightboxIndex < data.galleryPhotos.length && (() => {
          const photo = data.galleryPhotos[lightboxIndex];
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
                <Box sx={{
                  width: '100%',
                  maxWidth: 600,
                  aspectRatio: '4/3',
                  borderRadius: 2,
                  background: photo.url,
                  filter: 'saturate(0.85) contrast(1.05)',
                }} />
                {lightboxIndex < data.galleryPhotos.length - 1 && (
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
