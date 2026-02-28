import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert,
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
import { getRecommendationById, deleteRecommendation, updateRecommendation, type RecommendationCategory } from '@/lib/domainApi';
import { RichTextViewer } from '@/components/RichTextEditor';

function isCategory(value: string | undefined): value is RecommendationCategory {
  return value === 'movie' || value === 'book' || value === 'recipe' || value === 'music' || value === 'place';
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

  useEffect(() => {
    if (!recommendationId) return;

    const run = async () => {
      try {
        const data = await getRecommendationById(recommendationId);
        setItem(data);
        setSourceUrl((data as any)?.sourceUrl ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
      }
    };

    void run();
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
