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
  IconButton,
  Snackbar,
  Alert,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { useAuth } from '@/auth/AuthContext';
import { posters } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { toggleMovieVote, updateMovie, deleteMovie } from '@/lib/domainApi';
import { RichTextViewer } from '@/components/RichTextEditor';
import { firstNonEmoji } from '@/components/Atoms';
import CommentSection from '@/components/CommentSection';

export default function MovieDetailPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const c = useColors();
  const raw = useLoaderData() as any;

  // Determine if current user already voted (from server data)
  const serverVoted = (() => {
    if (!user?.id || !raw) return false;
    const voters: any[] = raw.votes ?? [];
    return voters.some((v: any) => v.user?.id === user.id || v.userId === user.id);
  })();

  const [voted, setVoted] = useState(serverVoted);
  const [voters, setVoters] = useState<{ id: string; name: string }[]>(
    (raw?.votes ?? []).map((v: any) => ({ id: v.user?.id ?? v.userId ?? '', name: v.user?.name ?? '?' })),
  );
  const [nominateOpen, setNominateOpen] = useState(false);
  const [flash, setFlash] = useState<{ open: boolean; severity: 'success' | 'error'; message: string }>({ open: false, severity: 'success', message: '' });
  const [editingLink, setEditingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [movieLink, setMovieLink] = useState<string>(raw?.doubanUrl ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [posterState, setPosterState] = useState<string>(raw?.poster ?? '');

  const { pickFile: pickPoster, isUploading: posterUploading } = useMediaUpload({
    category: 'cover',
    ownerId: user?.id,
    onSuccess: async (url) => {
      setPosterState(url);
      if (raw?.id) {
        try { await updateMovie(String(raw.id), { poster: url }); } catch { /* ignore */ }
      }
    },
  });

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

  const recommenderId = movie.recommendedById ?? movie.recommendedBy?.id ?? '';
  const canEditLink = user && (
    (recommenderId && recommenderId === user.id) || user.role === 'admin'
  );

  // Poster: prefer uploaded/TMDB image, fall back to gradient
  const posterUrl = posterState || (movie.poster as string | undefined);
  const posterGradient = posters[title] || { bg: `linear-gradient(135deg, ${c.s3}, ${c.s2})`, accent: c.text3, sub: '' };
  const poster = {
    ...posterGradient,
    bg: posterUrl ? `url(${posterUrl}) center/cover no-repeat` : posterGradient.bg,
  };

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
        <IconButton onClick={() => navigate('/discover')} size="small" sx={{ alignSelf: 'flex-start' }}><ArrowBackRoundedIcon /> </IconButton>
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
            {/* Upload poster button */}
            {canEditLink && (
              <IconButton
                size="small"
                sx={{ position: 'absolute', top: 12, right: 12, zIndex: 2, color: 'rgba(255,255,255,0.7)', bgcolor: 'rgba(0,0,0,0.3)', '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' } }}
                onClick={pickPoster}
                disabled={posterUploading}
              >
                <AddPhotoAlternateIcon fontSize="small" />
              </IconButton>
            )}
            {/* Title & info at bottom */}
            <Box sx={{ position: 'absolute', bottom: 20, left: 20, right: 20, zIndex: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
              <Box>
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
                {year}  {dir}
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
              {canEditLink && (
                <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }} onClick={() => setConfirmDelete(true)}>
                  <DeleteOutlineIcon />
                </IconButton>
              )}
              </Stack>
            </Box>
          </Box>

          {/* Chips bar below hero */}
          <CardContent sx={{ pt: 1.5, pb: 1.5 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {movie.doubanRating && <Chip size="small" variant="outlined" label={`⭐ ${movie.doubanRating}`} />}
              {status && <Chip size="small" color="success" label={`✓ ${status}`} />}
              {movieLink && !editingLink && (
                <Chip size="small" variant="outlined" label="🔗 查看链接" clickable
                  component="a" href={movieLink} target="_blank" rel="noreferrer" />
              )}
              {canEditLink && !editingLink && (
                <Chip size="small" variant="outlined"
                  label={movieLink ? '编辑链接' : '+ 添加链接'}
                  onClick={() => { setLinkDraft(movieLink); setEditingLink(true); }}
                />
              )}
            </Stack>
            {editingLink && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <TextField size="small" fullWidth placeholder="https://..." value={linkDraft}
                  onChange={(e) => setLinkDraft(e.target.value)} />
                <Button size="small" variant="contained" disabled={linkDraft === movieLink}
                  onClick={async () => {
                    if (!movie.id) return;
                    try {
                      await updateMovie(String(movie.id), { doubanUrl: linkDraft });
                      setMovieLink(linkDraft);
                      setEditingLink(false);
                    } catch { /* ignore */ }
                  }}>保存</Button>
                <Button size="small" onClick={() => setEditingLink(false)}>取消</Button>
              </Stack>
            )}
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
                <Avatar sx={{ width: 36, height: 36 }}>{firstNonEmoji(by)}</Avatar>
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
                投票 ({voters.length})
              </Typography>
              <Button
                variant={voted ? 'contained' : 'outlined'}
                size="small"
                onClick={async () => {
                  if (!user?.id) return;
                  const wasVoted = voted;
                  // Optimistic update
                  setVoted(!wasVoted);
                  if (wasVoted) {
                    setVoters((prev) => prev.filter((v) => v.id !== user.id));
                  } else {
                    setVoters((prev) => [...prev, { id: user.id, name: user.name }]);
                  }
                  try {
                    await toggleMovieVote(String(raw.id ?? (raw as any).id), user.id);
                  } catch {
                    // Revert on error
                    setVoted(wasVoted);
                    if (wasVoted) {
                      setVoters((prev) => [...prev, { id: user.id, name: user.name }]);
                    } else {
                      setVoters((prev) => prev.filter((v) => v.id !== user.id));
                    }
                    setFlash({ open: true, severity: 'error', message: '投票失败，请重新登录后再试' });
                  }
                }}
              >
                ▲ {voted ? '已投票' : '我想看'}
              </Button>
            </Stack>
            {voters.length > 0 && (
              <AvatarGroup max={10} sx={{ justifyContent: 'flex-start' }}>
                {voters.map((voter) => (
                  <Avatar
                    key={voter.id}
                    sx={{ width: 32, height: 32, cursor: 'pointer' }}
                    onClick={() => navigate(`/members/${encodeURIComponent(voter.name)}`)}
                  >
                    {firstNonEmoji(voter.name)}
                  </Avatar>
                ))}
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
        {raw?.id && <CommentSection entityType="movie" entityId={String(raw.id)} />}

        <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>确定要删除「{title}」吗？此操作不可撤销。</DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDelete(false)}>取消</Button>
            <Button color="error" onClick={async () => {
              setDeleting(true);
              try {
                await deleteMovie(String(movie.id));
                navigate('/discover', { replace: true });
              } catch {
                setFlash({ open: true, severity: 'error', message: '删除失败' });
                setDeleting(false);
                setConfirmDelete(false);
              }
            }} disabled={deleting}>
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  );
}
