import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
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
import { useAuth } from '@/auth/AuthContext';
import { getRecommendationById, deleteRecommendation, updateRecommendation, toggleRecommendationVote, fetchCommentsApi, addComment, type RecommendationCategory } from '@/lib/domainApi';
import { RichTextViewer } from '@/components/RichTextEditor';
import { firstNonEmoji } from '@/components/Atoms';
import type { EventComment } from '@/types';

function isCategory(value: string | undefined): value is RecommendationCategory {
  return value === 'movie' || value === 'book' || value === 'recipe' || value === 'music' || value === 'place' || value === 'external_event';
}

export default function RecommendationDetailPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [comments, setComments] = useState<EventComment[]>([]);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (!recommendationId) return;

    const run = async () => {
      try {
        const data = await getRecommendationById(recommendationId);
        setItem(data);
        setSourceUrl((data as any)?.sourceUrl ?? '');
        const voters: string[] = ((data as any)?.votes ?? []).map((v: any) => v.userId).filter(Boolean);
        setVoteCount((data as any)?._count?.votes ?? voters.length);
        if (user?.id) setVoted(voters.includes(user.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
      }
    };

    void run();
  }, [recommendationId, user?.id]);

  useEffect(() => {
    if (!recommendationId) return;
    fetchCommentsApi('recommendation', recommendationId).then((list) => {
      if (Array.isArray(list)) {
        setComments(list.map((c: any) => ({
          name: c.author?.name ?? '匿名',
          text: c.content ?? '',
          date: c.createdAt ? new Date(c.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '',
        })));
      }
    }).catch(() => {});
  }, [recommendationId]);

  const canModify = user && item && (
    (item.authorId && item.authorId === user.id) || user.role === 'admin'
  );
  const canDelete = canModify;

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
    try { await toggleRecommendationVote(recommendationId, user.id); } catch { /* optimistic */ }
  };

  const handleAddComment = async (text: string) => {
    if (!user?.id || !recommendationId || !text.trim()) return;
    const trimmed = text.trim();
    setComments((prev) => [...prev, { name: user.name ?? '我', text: trimmed, date: '刚刚' }]);
    setCommentText('');
    try { await addComment({ entityType: 'recommendation', entityId: recommendationId, authorId: user.id, content: trimmed }); } catch { /* optimistic */ }
  };

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!item) {
    return <Typography color="text.secondary">加载中...</Typography>;
  }

  const authorName = (item.author as any)?.name ?? '';

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="h5" fontWeight={700}>{String(item.title ?? '')}</Typography>
            {canDelete && (
              <IconButton size="small" color="error" onClick={() => setConfirmDelete(true)}>
                <DeleteOutlineIcon />
              </IconButton>
            )}
          </Stack>
          {authorName && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>{authorName} 推荐</Typography>
          )}
          <Box sx={{ mt: 1.5 }}>
            <RichTextViewer html={String(item.description ?? '')} />
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
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

      {/* Vote */}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
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
        </CardContent>
      </Card>

      {/* Comments */}
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
                    {firstNonEmoji(cm.name)}
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
                {firstNonEmoji(user.name ?? 'U')}
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
                    handleAddComment(commentText);
                  }
                }}
              />
              <Button
                variant="contained"
                size="small"
                disabled={!commentText.trim()}
                onClick={() => handleAddComment(commentText)}
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

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>确定要删除「{String(item.title ?? '')}」吗？此操作不可撤销。</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>取消</Button>
          <Button color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? '删除中...' : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
