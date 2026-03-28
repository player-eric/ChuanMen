import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import {
  Autocomplete,
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
import EditIcon from '@mui/icons-material/Edit';
import type { BookDetailData, BookPool } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { posters } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { toggleRecommendationVote, updateRecommendation, deleteRecommendation, fetchMembersApi } from '@/lib/domainApi';
import { RichTextViewer, type RichTextEditorHandle } from '@/components/RichTextEditor';
import { Ava, firstNonEmoji, AvaStack } from '@/components/Atoms';
import { ImageUpload } from '@/components/ImageUpload';
import CommentSection from '@/components/CommentSection';

const RichTextEditorLazy = lazy(() => import('@/components/RichTextEditor'));

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
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const descEditorRef = useRef<RichTextEditorHandle>(null);
  const [bookTitle, setBookTitle] = useState<string>((raw as any)?.title ?? '');
  const [bookSynopsis, setBookSynopsis] = useState<string>((raw as any)?.synopsis ?? '');
  const [bookBy, setBookBy] = useState<string>((raw as any)?.by ?? '');

  // Admin: change author
  const isAdmin = user?.role === 'admin';
  const [members, setMembers] = useState<{ id: string; name: string; avatar: string | null }[]>([]);
  const [editAuthor, setEditAuthor] = useState<{ id: string; name: string; avatar: string | null } | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetchMembersApi().then((list) => {
      const mapped = (list as { id: string; name: string; avatar?: string | null }[]).map((m) => ({
        id: m.id, name: m.name, avatar: m.avatar ?? null,
      }));
      setMembers(mapped);
    });
  }, [isAdmin]);

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
  const title = bookTitle || (isDetail ? book.title : basic.title);
  const year = isDetail ? book.year : basic.year;
  const author = isDetail ? book.author : basic.author;
  const by = bookBy || (isDetail ? book.by : basic.by);
  const byAvatar = isDetail ? book.byAvatar : undefined;
  const status = isDetail ? book.status : basic.status;
  const serverV = isDetail ? book.v : basic.v;
  const authorId = (raw as any).authorId ?? '';
  const bookId = (raw as any).id ?? '';
  const [voteCount, setVoteCount] = useState(serverV);

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
                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }} onClick={() => {
                    setEditTitle(title);
                    setEditDesc(bookSynopsis);
                    setEditCoverUrl(coverUrl);
                    if (isAdmin) {
                      setEditAuthor(members.find((m) => m.id === authorId) ?? null);
                    }
                    setEditing(true);
                  }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }} onClick={() => setConfirmDelete(true)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
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
                <Ava name={by} src={byAvatar} size={36} />
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
                投票 ({voteCount})
              </Typography>
              <Button
                variant={voted ? 'contained' : 'outlined'}
                size="small"
                onClick={async () => {
                  const newVoted = !voted;
                  setVoted(newVoted);
                  setVoteCount((c) => c + (newVoted ? 1 : -1));
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
                  tooltips={book.voters.map((v) => typeof v === 'string' ? v : v.name)}
                  size={32}
                  max={expandVoters ? book.voters.length : 5}
                  onClickItem={(i) => { const v = book.voters[i]; navigate(`/members/${encodeURIComponent(typeof v === 'string' ? v : v.name)}`); }}
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

        <Dialog open={editing} onClose={() => setEditing(false)} fullWidth maxWidth="md" fullScreen={window.innerWidth < 600}>
          <DialogTitle>编辑图书</DialogTitle>
          <DialogContent>
            {isAdmin && (
              <Autocomplete
                options={members}
                value={editAuthor}
                onChange={(_, v) => setEditAuthor(v)}
                getOptionLabel={(o) => o.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Ava name={option.name} src={option.avatar ?? undefined} size={24} />
                      <span>{option.name}</span>
                    </Stack>
                  </li>
                )}
                renderInput={(params) => <TextField {...params} label="推荐人" />}
                sx={{ mt: 1, mb: 2 }}
              />
            )}
            <TextField label="标题" fullWidth value={editTitle} onChange={(e) => setEditTitle(e.target.value)} sx={{ mt: isAdmin ? 0 : 1, mb: 2 }} />
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>封面（可选）</Typography>
              <ImageUpload
                value={editCoverUrl}
                onChange={setEditCoverUrl}
                category="recommendation"
                ownerId={user?.id ?? ''}
                width="100%"
                height={160}
                shape="rect"
                maxSize={10 * 1024 * 1024}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>简介</Typography>
            <Suspense fallback={<Typography color="text.secondary">加载编辑器...</Typography>}>
              <RichTextEditorLazy content={editDesc} onChange={setEditDesc} editorRef={descEditorRef} />
            </Suspense>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(false)}>取消</Button>
            <Button variant="contained" disabled={editSaving || !editTitle.trim()} onClick={async () => {
              if (!user?.id || !bookId) return;
              setEditSaving(true);
              const html = descEditorRef.current?.getHTML() ?? editDesc;
              const patch: Parameters<typeof updateRecommendation>[2] = {
                title: editTitle,
                description: html,
                coverUrl: editCoverUrl || undefined,
                ...(isAdmin && editAuthor ? { authorId: editAuthor.id } : {}),
              };
              try {
                await updateRecommendation(bookId, user.id, patch);
                setBookTitle(editTitle);
                setBookSynopsis(html);
                setCoverUrl(editCoverUrl);
                if (editAuthor) setBookBy(editAuthor.name);
                setEditing(false);
              } catch { /* ignore */ }
              setEditSaving(false);
            }}>{editSaving ? '保存中...' : '保存'}</Button>
          </DialogActions>
        </Dialog>

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
