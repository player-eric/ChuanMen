import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert,
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
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { useAuth } from '@/auth/AuthContext';
import { useColors } from '@/hooks/useColors';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { getRecommendationById, deleteRecommendation, updateRecommendation, toggleRecommendationVote, type RecommendationCategory } from '@/lib/domainApi';
import { RichTextViewer } from '@/components/RichTextEditor';
import { firstNonEmoji } from '@/components/Atoms';
import CommentSection from '@/components/CommentSection';

function isCategory(value: string | undefined): value is RecommendationCategory {
  return value === 'movie' || value === 'book' || value === 'recipe' || value === 'music' || value === 'place' || value === 'external_event';
}

export default function RecommendationDetailPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const c = useColors();
  const { category, recommendationId } = useParams();
  const currentCategory = isCategory(category) ? category : 'book';

  const [item, setItem] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingLink, setEditingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [voted, setVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [voters, setVoters] = useState<{ id: string; name: string }[]>([]);
  const [coverUrl, setCoverUrl] = useState('');

  const { pickFile, upload: uploadCover, isUploading: coverUploading } = useMediaUpload({
    category: 'cover',
    ownerId: user?.id,
    onSuccess: async (url) => {
      setCoverUrl(url);
      if (recommendationId && user?.id) {
        try { await updateRecommendation(recommendationId, user.id, { coverUrl: url }); } catch { /* ignore */ }
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

  useEffect(() => {
    if (!recommendationId) return;

    const run = async () => {
      try {
        const data = await getRecommendationById(recommendationId);
        setItem(data);
        setSourceUrl((data as any)?.sourceUrl ?? '');
        setCoverUrl((data as any)?.coverUrl ?? '');
        const voteList: any[] = (data as any)?.votes ?? [];
        const voterList = voteList.map((v: any) => ({
          id: v.userId ?? v.user?.id ?? '',
          name: v.user?.name ?? '?',
        })).filter((v) => v.id);
        setVoters(voterList);
        setVoteCount((data as any)?._count?.votes ?? voterList.length);
        if (user?.id) setVoted(voterList.some((v) => v.id === user.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
      }
    };

    void run();
  }, [recommendationId, user?.id]);

  const canModify = user && item && (
    (item.authorId && item.authorId === user.id) || user.role === 'admin'
  );

  const handleDelete = async () => {
    if (!recommendationId || !user?.id) return;
    setDeleting(true);
    try {
      await deleteRecommendation(recommendationId, user.id);
      navigate('/discover', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleVote = async () => {
    if (!user?.id || !recommendationId) return;
    const newVoted = !voted;
    setVoted(newVoted);
    setVoteCount((c) => c + (newVoted ? 1 : -1));
    if (newVoted) {
      setVoters((prev) => [...prev, { id: user.id, name: user.name }]);
    } else {
      setVoters((prev) => prev.filter((v) => v.id !== user.id));
    }
    try { await toggleRecommendationVote(recommendationId, user.id); } catch { /* optimistic */ }
  };

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!item) {
    return <Typography color="text.secondary">加载中...</Typography>;
  }

  const title = String(item.title ?? '');
  const description = String(item.description ?? '');
  const authorName = (item.author as any)?.name ?? '';
  const tags: string[] = ((item.tags as any[]) ?? []).map((t: any) => t.value ?? t).filter(Boolean);

  // Hero background
  const heroBg = coverUrl
    ? `url(${coverUrl}) center/cover no-repeat`
    : `linear-gradient(135deg, ${c.s3}, ${c.s2})`;

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      <Stack spacing={2}>
        <IconButton onClick={() => navigate('/discover')} size="small" sx={{ alignSelf: 'flex-start' }}><ArrowBackRoundedIcon /></IconButton>

        {/* 1. Hero Header */}
        <Card sx={{ overflow: 'hidden' }}>
          <Box sx={{ position: 'relative', height: 240, overflow: 'hidden', background: coverUrl ? 'none' : heroBg }}>
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
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.7) 100%)' }} />
            {/* Upload cover image button */}
            {canModify && (
              <IconButton
                size="small"
                sx={{ position: 'absolute', top: 12, right: 12, zIndex: 2, color: 'rgba(255,255,255,0.7)', bgcolor: 'rgba(0,0,0,0.3)', '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' } }}
                onClick={pickFile}
                disabled={coverUploading}
              >
                <AddPhotoAlternateIcon fontSize="small" />
              </IconButton>
            )}
            <Box sx={{ position: 'absolute', bottom: 20, left: 20, right: 20, zIndex: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
                <Box>
                  <Typography variant="h4" fontWeight={800} sx={{ color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.6)', lineHeight: 1.2 }}>
                    {title}
                  </Typography>
                  {tags.length > 0 && (
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mt: 0.5, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                      {tags.join(' · ')}
                    </Typography>
                  )}
                </Box>
                {canModify && (
                  <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }} onClick={() => setConfirmDelete(true)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                )}
              </Stack>
            </Box>
          </Box>

          {/* Chips bar */}
          <CardContent sx={{ pt: 1.5, pb: 1.5 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {sourceUrl && !editingLink && (
                <Chip size="small" variant="outlined" label="🔗 查看链接" clickable
                  component="a" href={sourceUrl} target="_blank" rel="noreferrer" />
              )}
              {canModify && !editingLink && (
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
                    if (!user?.id || !recommendationId) return;
                    try {
                      await updateRecommendation(recommendationId, user.id, { sourceUrl: linkDraft });
                      setSourceUrl(linkDraft);
                      setEditingLink(false);
                    } catch { /* ignore */ }
                  }}>保存</Button>
                <Button size="small" onClick={() => setEditingLink(false)}>取消</Button>
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* 2. Description */}
        {description && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>简介</Typography>
              <RichTextViewer html={description} />
            </CardContent>
          </Card>
        )}

        {/* 3. Recommender */}
        {authorName && (
          <Card>
            <CardActionArea onClick={() => navigate(`/members/${encodeURIComponent(authorName)}`)}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>推荐人</Typography>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ width: 36, height: 36 }}>{firstNonEmoji(authorName)}</Avatar>
                  <Typography variant="body1">{authorName}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto !important' }}>查看主页 →</Typography>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        )}

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
                onClick={handleVote}
                disabled={!user}
              >
                ▲ {voted ? '已投票' : '想要'}
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

        {/* 5. Comments */}
        {recommendationId && <CommentSection entityType="recommendation" entityId={recommendationId} />}

        <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>确定要删除「{title}」吗？此操作不可撤销。</DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDelete(false)}>取消</Button>
            <Button color="error" onClick={handleDelete} disabled={deleting}>
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  );
}
