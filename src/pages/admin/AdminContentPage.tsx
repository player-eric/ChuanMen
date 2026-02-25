import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  fetchMoviesApi,
  fetchProposalsApi,
  fetchCommentsAdminApi,
  updateMovie,
  deleteMovie as deleteMovieApi,
  updateProposal,
  deleteProposal as deleteProposalApi,
  deleteComment as deleteCommentApi,
} from '@/lib/domainApi';

/* ── PRD 11.1.3 ── 内容管理：电影管理 + 提案管理 + 评论管理 ── */

type Row = Record<string, any>;

const statusColor: Record<string, 'success' | 'default' | 'warning' | 'error'> = {
  candidate: 'default', pool: 'default', screened: 'success',
  discussing: 'warning', scheduled: 'success', completed: 'default', cancelled: 'error',
};
const statusLabel: Record<string, string> = {
  candidate: '候选中', pool: '候选中', screened: '已放映',
  discussing: '讨论中', scheduled: '已排期', completed: '已完成', cancelled: '已取消',
};

export default function AdminContentPage() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [movieSearch, setMovieSearch] = useState('');
  const [proposalSearch, setProposalSearch] = useState('');
  const [commentSearch, setCommentSearch] = useState('');

  const [movies, setMovies] = useState<Row[]>([]);
  const [proposals, setProposals] = useState<Row[]>([]);
  const [comments, setComments] = useState<Row[]>([]);

  /* movie edit */
  const [editMovie, setEditMovie] = useState<Row | null>(null);
  const [editMovieTitle, setEditMovieTitle] = useState('');
  const [editMovieStatus, setEditMovieStatus] = useState<'candidate' | 'screened'>('candidate');

  /* proposal edit */
  const [editProposal, setEditProposal] = useState<Row | null>(null);
  const [editPropStatus, setEditPropStatus] = useState('discussing');

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, p, c] = await Promise.all([
        fetchMoviesApi(),
        fetchProposalsApi(),
        fetchCommentsAdminApi().catch(() => [] as Row[]),
      ]);
      setMovies(m); setProposals(p); setComments(c);
    } catch (e) { console.error('Failed to load content', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  /* movie ops */
  const openMovieEdit = (m: Row) => {
    setEditMovie(m);
    setEditMovieTitle(m.title);
    setEditMovieStatus(m.status === 'screened' ? 'screened' : 'candidate');
  };
  const saveMovieEdit = async () => {
    if (!editMovie) return;
    try {
      await updateMovie(editMovie.id, { title: editMovieTitle, status: editMovieStatus });
      setEditMovie(null); loadData();
    } catch (e) { console.error(e); }
  };
  const handleDeleteMovie = async (id: string) => {
    try { await deleteMovieApi(id); loadData(); } catch (e) { console.error(e); }
  };

  /* proposal ops */
  const openPropEdit = (p: Row) => {
    setEditProposal(p);
    setEditPropStatus(p.status ?? 'discussing');
  };
  const savePropEdit = async () => {
    if (!editProposal) return;
    try {
      await updateProposal(editProposal.id, { status: editPropStatus });
      setEditProposal(null); loadData();
    } catch (e) { console.error(e); }
  };
  const handleDeleteProposal = async (id: string) => {
    try { await deleteProposalApi(id); loadData(); } catch (e) { console.error(e); }
  };

  /* comment delete */
  const handleDeleteComment = async (id: string) => {
    try { await deleteCommentApi(id); loadData(); } catch (e) { console.error(e); }
  };

  /* filtered data */
  const filteredMovies = movies.filter(
    m => (m.title ?? '').includes(movieSearch) || (m.recommendedBy?.name ?? '').includes(movieSearch),
  );
  const filteredProposals = proposals.filter(
    p => (p.title ?? '').includes(proposalSearch) || (p.author?.name ?? '').includes(proposalSearch),
  );
  const filteredComments = comments.filter(
    c => (c.author?.name ?? '').includes(commentSearch) || (c.body ?? '').includes(commentSearch),
  );

  if (loading) return <Typography>加载中…</Typography>;

  return (
    <Stack spacing={3}>
      <Typography variant="h5" fontWeight={700}>内容管理</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label={`电影 (${movies.length})`} />
        <Tab label={`提案 (${proposals.length})`} />
        <Tab label={`评论 (${comments.length})`} />
      </Tabs>

      {/* ━━ 电影管理 ━━ */}
      {tab === 0 && (
        <Stack spacing={2}>
          <TextField
            size="small"
            placeholder="搜索电影名称 / 推荐人"
            value={movieSearch}
            onChange={e => setMovieSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <SearchRoundedIcon sx={{ mr: 1, opacity: 0.5 }} /> } }}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
            {filteredMovies.map(m => (
              <Card key={m.id} sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography fontWeight={600}>{m.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {m.year} · {m.director} · 推荐: {m.recommendedBy?.name ?? '—'}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={1}>
                      <Chip size="small" label={statusLabel[m.status ?? 'candidate'] ?? m.status} color={statusColor[m.status ?? 'candidate'] ?? 'default'} />
                      <Chip size="small" label={`${m._count?.votes ?? 0} 票`} variant="outlined" />
                    </Stack>
                  </Box>
                  <Stack direction="row">
                    <IconButton size="small" onClick={() => openMovieEdit(m)}><EditRoundedIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteMovie(m.id)}><DeleteRoundedIcon fontSize="small" /></IconButton>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Box>
        </Stack>
      )}

      {/* ━━ 提案管理 ━━ */}
      {tab === 1 && (
        <Stack spacing={2}>
          <TextField
            size="small"
            placeholder="搜索提案标题 / 发起人"
            value={proposalSearch}
            onChange={e => setProposalSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <SearchRoundedIcon sx={{ mr: 1, opacity: 0.5 }} /> } }}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
            {filteredProposals.map(p => (
              <Card key={p.id} sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography fontWeight={600}>{p.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      发起人: {p.author?.name ?? '—'} · {p._count?.votes ?? 0} 票
                    </Typography>
                    <Chip
                      size="small"
                      label={statusLabel[p.status ?? 'discussing'] ?? p.status}
                      color={statusColor[p.status ?? 'discussing'] ?? 'default'}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Stack direction="row">
                    <IconButton size="small" onClick={() => openPropEdit(p)}><EditRoundedIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteProposal(p.id)}><DeleteRoundedIcon fontSize="small" /></IconButton>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Box>
        </Stack>
      )}

      {/* ━━ 评论管理 ━━ */}
      {tab === 2 && (
        <Stack spacing={2}>
          <TextField
            size="small"
            placeholder="搜索评论内容 / 作者"
            value={commentSearch}
            onChange={e => setCommentSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <SearchRoundedIcon sx={{ mr: 1, opacity: 0.5 }} /> } }}
          />
          {filteredComments.map(c => (
            <Card key={c.id} sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={600} variant="body2">{c.author?.name ?? '—'}</Typography>
                    <Chip size="small" label={c.entityType ?? 'comment'} />
                    <Typography variant="caption" color="text.secondary">{c.createdAt ? new Date(c.createdAt).toLocaleDateString('zh-CN') : ''}</Typography>
                  </Stack>
                  <Typography variant="body2" mt={0.5}>{c.body}</Typography>
                </Box>
                <IconButton size="small" color="error" onClick={() => handleDeleteComment(c.id)}>
                  <DeleteRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Card>
          ))}
          {filteredComments.length === 0 && <Typography color="text.secondary" textAlign="center" py={3}>暂无评论</Typography>}
        </Stack>
      )}

      {/* ── Movie edit dialog ── */}
      <Dialog open={!!editMovie} onClose={() => setEditMovie(null)} maxWidth="xs" fullWidth>
        <DialogTitle>编辑电影</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="片名" value={editMovieTitle} onChange={e => setEditMovieTitle(e.target.value)} fullWidth />
            <TextField
              label="状态"
              select
              value={editMovieStatus}
              onChange={e => setEditMovieStatus(e.target.value as any)}
              fullWidth
              slotProps={{ select: { native: true } }}
            >
              <option value="candidate">候选中</option>
              <option value="screened">已放映</option>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditMovie(null)}>取消</Button>
          <Button variant="contained" onClick={saveMovieEdit}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* ── Proposal edit dialog ── */}
      <Dialog open={!!editProposal} onClose={() => setEditProposal(null)} maxWidth="xs" fullWidth>
        <DialogTitle>编辑提案状态</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2" color="text.secondary">{editProposal?.title}</Typography>
            <TextField
              label="状态"
              select
              value={editPropStatus}
              onChange={e => setEditPropStatus(e.target.value)}
              fullWidth
              slotProps={{ select: { native: true } }}
            >
              <option value="discussing">讨论中</option>
              <option value="scheduled">已排期</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProposal(null)}>取消</Button>
          <Button variant="contained" onClick={savePropEdit}>保存</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
