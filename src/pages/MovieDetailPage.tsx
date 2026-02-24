import { useEffect, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Alert,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { EventComment } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { posters } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { toggleMovieVote, addComment } from '@/lib/domainApi';
import { RichTextViewer } from '@/components/RichTextEditor';

export default function MovieDetailPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const c = useColors();
  const raw = useLoaderData() as any;
  const [voted, setVoted] = useState(false);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [nominateOpen, setNominateOpen] = useState(false);
  const [flash, setFlash] = useState<{ open: boolean; severity: 'success' | 'error'; message: string }>({ open: false, severity: 'success', message: '' });

  useEffect(() => {
    if (raw && 'comments' in raw && raw.comments) {
      setComments(raw.comments);
    }
  }, [raw]);

  if (!raw) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">电影不存在</Typography>
          <Button sx={{ mt: 1 }} onClick={() => navigate('/discover')}>返回推荐页</Button>
        </CardContent>
      </Card>
    );
  }

  const isDetail = 'voters' in raw || 'votes' in raw;
  const movie = raw as any;
  const title = movie.title;
  const year = movie.year;
  const dir = movie.director ?? (movie as any).dir ?? '';
  const by = movie.recommendedBy?.name ?? (movie as any).by ?? '';
  const status = movie.status;
  const v = movie._count?.votes ?? (movie as any).v ?? 0;

  // Poster gradient data
  const poster = posters[title] || { bg: `linear-gradient(135deg, ${c.s3}, ${c.s2})`, accent: c.text3, sub: '' };

  // Event connections — from API data
  const upcomingFilm = (movie.selectedInEvents ?? []).filter((e: any) => {
    const starts = e.startsAt ? new Date(e.startsAt) : null;
    return starts && starts > new Date() && e.status !== 'cancelled';
  });

  // History from screenedEvents
  const historyItems: { title: string; date: string; host: string; eventId?: string; people?: number }[] = [];
  for (const se of (movie.screenedEvents ?? [])) {
    const evt = se.event ?? se;
    historyItems.push({
      title: evt.title ?? '',
      date: evt.startsAt ? new Date(evt.startsAt).toLocaleDateString('zh-CN') : '',
      host: evt.host?.name ?? '',
      eventId: evt.id,
      people: evt._count?.signups,
    });
  }
  // Also past selectedInEvents
  for (const e of (movie.selectedInEvents ?? [])) {
    const starts = e.startsAt ? new Date(e.startsAt) : null;
    if (starts && starts <= new Date() && !historyItems.some((h) => h.eventId === e.id)) {
      historyItems.push({
        title: e.title ?? '',
        date: starts.toLocaleDateString('zh-CN'),
        host: e.host?.name ?? '',
        eventId: e.id,
        people: e._count?.signups,
      });
    }
  }

  // Nominatable events — for now, empty array since we'd need all upcoming events
  const movieId = movie.id;
  const nominatableEvents: any[] = [];

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      <Stack spacing={2}>
        <Snackbar
          open={flash.open}
          autoHideDuration={3500}
          onClose={() => setFlash((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity={flash.severity}>{flash.message}</Alert>
        </Snackbar>

        {/* 1. Hero Poster Header */}
        <Card sx={{ overflow: 'hidden' }}>
          <Box
            sx={{
              position: 'relative',
              height: 280,
              background: poster.bg,
            }}
          >
            {/* Gradient overlay at bottom */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.7) 100%)',
              }}
            />
            {/* Title & info at bottom */}
            <Box sx={{ position: 'absolute', bottom: 20, left: 20, right: 20, zIndex: 1 }}>
              <Typography
                variant="h4"
                fontWeight={800}
                sx={{
                  color: poster.accent,
                  textShadow: '0 2px 12px rgba(0,0,0,0.6)',
                  lineHeight: 1.2,
                }}
              >
                {title}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255,255,255,0.6)',
                  mt: 0.5,
                  textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                }}
              >
                {year} · {dir}
              </Typography>
              {poster.sub && (
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255,255,255,0.35)', display: 'block', mt: 0.25 }}
                >
                  {poster.sub}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Chips bar below hero */}
          <CardContent sx={{ pt: 1.5, pb: 1.5 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {movie.doubanRating && <Chip size="small" variant="outlined" label={`⭐ ${movie.doubanRating}`} />}
              {status && <Chip size="small" color="success" label={`✓ ${status}`} />}
            </Stack>
          </CardContent>
        </Card>

        {/* 2. Synopsis */}
        {movie.synopsis && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>简介</Typography>
              <RichTextViewer html={movie.synopsis} />
            </CardContent>
          </Card>
        )}

        {/* 3. Recommender — clickable row */}
        <Card>
          <CardActionArea onClick={() => navigate(`/members/${encodeURIComponent(by)}`)}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>推荐人</Typography>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ width: 36, height: 36 }}>{by[0]}</Avatar>
                <Typography variant="body1">{by}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto !important' }}>查看主页 →</Typography>
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>

        {/* 4. Vote + Voters */}
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                投票 ({v + (voted ? 1 : 0)})
              </Typography>
              <Button
                variant={voted ? 'contained' : 'outlined'}
                size="small"
                onClick={async () => {
                  if (!user?.id) return;
                  try {
                    await toggleMovieVote(String(raw.id ?? (raw as any).id), user.id);
                    setVoted(!voted);
                  } catch { /* ignore */ }
                }}
              >
                ▲ {voted ? '已投票' : '我想看'}
              </Button>
            </Stack>
            {(movie.votes ?? []).length > 0 && (
              <AvatarGroup max={10} sx={{ justifyContent: 'flex-start' }}>
                {(movie.votes ?? []).map((vote: any) => {
                  const name = vote.user?.name ?? '?';
                  return (
                  <Avatar
                    key={vote.id ?? name}
                    sx={{ width: 32, height: 32, cursor: 'pointer' }}
                    onClick={() => navigate(`/members/${encodeURIComponent(name)}`)}
                  >
                    {name[0]}
                  </Avatar>
                  );
                })}
              </AvatarGroup>
            )}
          </CardContent>
        </Card>

        {/* 4b. Nominate to upcoming movieNight */}
        {user && nominatableEvents.length > 0 && !status?.includes('已放映') && (
          <Button
            variant="outlined"
            fullWidth
            onClick={() => setNominateOpen(true)}
          >
            🎬 提名到下次电影夜
          </Button>
        )}

        {/* Nominate to event dialog */}
        <Dialog open={nominateOpen} onClose={() => setNominateOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>选择要提名到的电影夜</DialogTitle>
          <DialogContent>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {nominatableEvents.map((evt) => (
                <Card key={evt.id} variant="outlined">
                  <CardActionArea onClick={() => {
                    setNominateOpen(false);
                    setFlash({ open: true, severity: 'success', message: `已提名「${title}」到「${evt.title}」` });
                  }}>
                    <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                      <Typography variant="body2" fontWeight={600}>{evt.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {evt.date} · {evt.host} Host · 还剩 {evt.spots} 位
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNominateOpen(false)}>取消</Button>
          </DialogActions>
        </Dialog>

        {/* 5. Upcoming screenings */}
        {upcomingFilm.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>即将放映</Typography>
              <Stack spacing={1}>
                {upcomingFilm.map((event: any) => (
                  <Card key={event.id} variant="outlined">
                    <CardActionArea onClick={() => navigate(`/events/${event.id}`)}>
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="body2" fontWeight={600}>{event.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {event.startsAt ? new Date(event.startsAt).toLocaleDateString('zh-CN') : ''} · {event.host?.name ?? ''} Host
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* 6. History screenings */}
        {historyItems.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>历史放映</Typography>
              <Stack spacing={1}>
                {historyItems.map((item, i) => (
                  <Card key={i} variant="outlined">
                    <CardActionArea
                      onClick={() => item.eventId && navigate(`/events/${item.eventId}`)}
                      disabled={!item.eventId}
                    >
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="body2" fontWeight={600}>{item.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.date} · {item.host} Host{item.people ? ` · ${item.people} 人` : ''}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* 8. Comments */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              💬 讨论 ({comments.length})
            </Typography>
            {comments.length > 0 && (
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                {comments.map((cm, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                    <Avatar
                      sx={{ width: 28, height: 28, fontSize: 12, cursor: 'pointer', mt: 0.25 }}
                      onClick={() => navigate(`/members/${encodeURIComponent(cm.name)}`)}
                    >
                      {cm.name[0]}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="baseline">
                        <Typography variant="body2" fontWeight={700}>{cm.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{cm.date}</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">{cm.text}</Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            )}
            {user ? (
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Avatar sx={{ width: 28, height: 28, fontSize: 12, mt: 0.5 }}>
                  {user.name?.[0] ?? 'U'}
                </Avatar>
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="说点什么..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && !e.shiftKey && commentText.trim()) {
                      e.preventDefault();
                      const text = commentText.trim();
                      setCommentText('');
                      setComments((prev) => [...prev, { name: user.name ?? '我', text, date: '刚刚' }]);
                      try {
                        await addComment({ entityType: 'movie', entityId: String(raw.id ?? (raw as any).id), authorId: user.id, content: text });
                      } catch { /* optimistic update already done */ }
                    }
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  disabled={!commentText.trim()}
                  onClick={async () => {
                    if (commentText.trim()) {
                      const text = commentText.trim();
                      setCommentText('');
                      setComments((prev) => [...prev, { name: user.name ?? '我', text, date: '刚刚' }]);
                      try {
                        await addComment({ entityType: 'movie', entityId: String(raw.id ?? (raw as any).id), authorId: user.id, content: text });
                      } catch { /* optimistic update already done */ }
                    }
                  }}
                  sx={{ mt: 0.5 }}
                >
                  发送
                </Button>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">登录后可参与讨论</Typography>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
