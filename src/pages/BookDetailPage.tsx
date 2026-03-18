import { useEffect, useState } from 'react';
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
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import type { BookDetailData, BookPool } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { posters } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { toggleRecommendationVote, updateRecommendation, deleteRecommendation } from '@/lib/domainApi';
import { RichTextViewer } from '@/components/RichTextEditor';
import { firstNonEmoji, AvaStack } from '@/components/Atoms';
import CommentSection from '@/components/CommentSection';

export default function BookDetailPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const c = useColors();
  const raw = useLoaderData() as BookDetailData | BookPool | null;
  const [voted, setVoted] = useState(() => {
    if (!user?.id || !raw) return false;
    const voters = (raw as any).voterIds ?? (raw as any).voters ?? [];
    return Array.isArray(voters) && voters.includes(user.id);
  });
  const [editingLink, setEditingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string>(() => (raw as any)?.coverUrl ?? '');
  const [expandVoters, setExpandVoters] = useState(false);

  const bookIdForUpload = raw && 'id' in raw ? String((raw as any).id) : '';
  const { pickFile: pickCover, upload: uploadCover, isUploading: coverUploading } = useMediaUpload({
    category: 'cover',
    ownerId: user?.id,
    onSuccess: async (url) => {
      setCoverUrl(url);
      if (bookIdForUpload && user?.id) {
        try { await updateRecommendation(bookIdForUpload, user.id, { coverUrl: url }); } catch { /* ignore */ }
      }
    },
  });

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
      if (file && !coverUploading) {
        e.preventDefault();
        setCoverUrl(URL.createObjectURL(file));
        uploadCover(file);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [coverUploading, uploadCover]);

  if (!raw) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">书籍不存在</Typography>
          <Button sx={{ mt: 1 }} onClick={() => navigate('/discover')}>返回推荐页</Button>
        </CardContent>
      </Card>
    );
  }

  const isDetail = 'voters' in raw;
  const book = raw as BookDetailData;
  const basic = raw as BookPool;
  const title = isDetail ? book.title : basic.title;
  const year = isDetail ? book.year : basic.year;
  const author = isDetail ? book.author : basic.author;
  const by = isDetail ? book.by : basic.by;
  const status = isDetail ? book.status : basic.status;
  const v = isDetail ? book.v : basic.v;
  const authorId = (raw as any).authorId ?? '';
  const bookId = (raw as any).id ?? '';

  const canEditLink = user && (
    (authorId && authorId === user.id) || user.role === 'admin'
  );

  useEffect(() => {
    setSourceUrl((raw as any).sourceUrl ?? '');
  }, [raw]);

  // Poster: prefer cover image, fall back to gradient
  const posterGradient = posters[title] || { bg: `linear-gradient(135deg, ${c.s3}, ${c.s2})`, accent: c.text3, sub: '' };
  const poster = {
    ...posterGradient,
    bg: coverUrl ? `url(${coverUrl}) center/cover no-repeat` : posterGradient.bg,
  };

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      <Stack spacing={2}>
        <IconButton onClick={() => navigate('/discover')} size="small" sx={{ alignSelf: 'flex-start' }}><ArrowBackRoundedIcon /></IconButton>
        {/* 1. Hero Poster Header */}
        <Card sx={{ overflow: 'hidden' }}>
          <Box
            sx={{
              position: 'relative',
              height: 280,
              overflow: 'hidden',
              background: coverUrl ? 'none' : poster.bg,
            }}
          >
            {/* Blurred background layer */}
            {coverUrl && (
              <Box
                component="img"
                src={coverUrl}
                sx={{ position: 'absolute', inset: -20, width: 'calc(100% + 40px)', height: 'calc(100% + 40px)', objectFit: 'cover', filter: 'blur(20px) brightness(0.5)' }}
              />
            )}
            {/* Sharp cover — fully visible, no cropping */}
            {coverUrl && (
              <Box
                component="img"
                src={coverUrl}
                sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
              />
            )}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.7) 100%)',
              }}
            />
            {canEditLink && (
              <IconButton
                size="small"
                sx={{ position: 'absolute', top: 12, right: 12, zIndex: 2, color: 'rgba(255,255,255,0.7)', bgcolor: 'rgba(0,0,0,0.3)', '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' } }}
                onClick={pickCover}
                disabled={coverUploading}
              >
                <AddPhotoAlternateIcon fontSize="small" />
              </IconButton>
            )}
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
                {year} · {author}
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
              {isDetail && book.genre && <Chip size="small" variant="outlined" label={book.genre} />}
              {isDetail && book.pages && <Chip size="small" variant="outlined" label={book.pages} />}
              {isDetail && book.rating && <Chip size="small" variant="outlined" label={`⭐ ${book.rating}`} />}
              {status && <Chip size="small" color="success" label={`✓ ${status}`} />}
              {sourceUrl && !editingLink && (
                <Chip size="small" variant="outlined" label="🔗 查看链接" clickable
                  component="a" href={sourceUrl} target="_blank" rel="noreferrer" />
              )}
              {canEditLink && !editingLink && (
                <Chip size="small" variant="outlined"
                  label={sourceUrl ? '编辑链接' : '+ 添加链接'}
                  onClick={() => { setLinkDraft(sourceUrl); setEditingLink(true); }}
                />
              )}
            </Stack>
            {editingLink && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <TextField size="small" fullWidth placeholder="https://..." value={linkDraft}
                  onChange={(e) => setLinkDraft(e.target.value)} />
                <Button size="small" variant="contained" disabled={linkDraft === sourceUrl}
                  onClick={async () => {
                    if (!user?.id || !bookId) return;
                    try {
                      await updateRecommendation(bookId, user.id, { sourceUrl: linkDraft });
                      setSourceUrl(linkDraft);
                      setEditingLink(false);
                    } catch { /* ignore */ }
                  }}>保存</Button>
                <Button size="small" onClick={() => setEditingLink(false)}>取消</Button>
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* 2. Synopsis */}
        {isDetail && book.synopsis && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>简介</Typography>
              <RichTextViewer html={book.synopsis} />
            </CardContent>
          </Card>
        )}

        {/* 3. Recommender */}
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
                  setVoted(!voted);
                  if (user?.id && bookId) {
                    try { await toggleRecommendationVote(bookId, user.id); } catch { /* optimistic */ }
                  }
                }}
              >
                ▲ {voted ? '已投票' : '我想读'}
              </Button>
            </Stack>
            {isDetail && book.voters.length > 0 && (
              <Box sx={{ cursor: book.voters.length > 5 ? 'pointer' : undefined }} onClick={book.voters.length > 5 ? () => setExpandVoters((v) => !v) : undefined}>
                <AvaStack
                  names={book.voters}
                  tooltips={book.voters}
                  size={32}
                  max={expandVoters ? book.voters.length : 5}
                  onClickItem={(i) => navigate(`/members/${encodeURIComponent(book.voters[i])}`)}
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* 5. Reading history (discussions) */}
        {isDetail && book.discussions.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>阅读记录</Typography>
              <Stack spacing={1}>
                {book.discussions.map((item, i) => (
                  <Card key={i} variant="outlined">
                    <CardActionArea
                      onClick={() => item.eventId && navigate(`/events/${item.eventId}`)}
                      disabled={!item.eventId}
                    >
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="body2" fontWeight={600}>{item.eventTitle}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.date} · {item.host} Host
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* 6. Comments */}
        {bookId && <CommentSection entityType="recommendation" entityId={String(bookId)} />}

        <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>确定要删除「{title}」吗？此操作不可撤销。</DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDelete(false)}>取消</Button>
            <Button color="error" onClick={async () => {
              if (!user?.id || !bookId) return;
              setDeleting(true);
              try {
                await deleteRecommendation(bookId, user.id);
                navigate('/discover', { replace: true });
              } catch {
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
