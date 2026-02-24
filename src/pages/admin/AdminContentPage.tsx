import { useState } from 'react';
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
import { moviePool, proposals } from '@/mock/data';
import type { MoviePool, Proposal } from '@/types';

/* ── PRD 11.1.3 ── 内容管理：电影管理 + 提案管理 + 评论管理 ── */

const statusColor: Record<string, 'success' | 'default' | 'warning' | 'error'> = {
  pool: 'default',
  screened: 'success',
  discussing: 'warning',
  scheduled: 'success',
  completed: 'default',
  cancelled: 'error',
};
const statusLabel: Record<string, string> = {
  pool: '候选中',
  screened: '已放映',
  discussing: '讨论中',
  scheduled: '已排期',
  completed: '已完成',
  cancelled: '已取消',
};

/* ---------- mock comments ---------- */
interface CommentRow {
  id: string;
  author: string;
  entity: string;
  entityType: 'movie' | 'event' | 'proposal' | 'discussion';
  content: string;
  date: string;
}
const mockComments: CommentRow[] = [
  { id: 'cmt-1', author: '星星', entity: '花样年华', entityType: 'movie', content: '这部电影的色调太美了', date: '2/20' },
  { id: 'cmt-2', author: 'Nicole', entity: '寄生虫之夜', entityType: 'event', content: '结尾的讨论比电影还精彩', date: '2/19' },
  { id: 'cmt-3', author: '白开水', entity: '要不要搞一次读书会？', entityType: 'proposal', content: '我推荐《小王子》', date: '2/18' },
  { id: 'cmt-4', author: 'Tiffy', entity: '花样年华', entityType: 'movie', content: '梁朝伟演技封神', date: '2/17' },
  { id: 'cmt-5', author: '大橙子', entity: 'Central Park 徒步', entityType: 'event', content: '当天天气超好！', date: '2/16' },
  { id: 'cmt-6', author: 'Sean', entity: '惊魂记', entityType: 'movie', content: '希区柯克真的很厉害', date: '2/15' },
  { id: 'cmt-7', author: '小鹿', entity: 'Potluck 主题怎么选？', entityType: 'discussion', content: '韩国料理主题如何？', date: '2/14' },
  { id: 'cmt-8', author: 'Annie', entity: '新年 Potluck', entityType: 'event', content: '大家做的菜都太好吃了', date: '2/13' },
];

export default function AdminContentPage() {
  const [tab, setTab] = useState(0);
  const [movieSearch, setMovieSearch] = useState('');
  const [proposalSearch, setProposalSearch] = useState('');
  const [commentSearch, setCommentSearch] = useState('');

  const [movies, setMovies] = useState<MoviePool[]>(moviePool);
  const [proposalList, setProposalList] = useState<Proposal[]>(proposals);
  const [comments, setComments] = useState<CommentRow[]>(mockComments);

  /* movie edit */
  const [editMovie, setEditMovie] = useState<MoviePool | null>(null);
  const [editMovieTitle, setEditMovieTitle] = useState('');
  const [editMovieStatus, setEditMovieStatus] = useState<'pool' | 'screened'>('pool');
  const openMovieEdit = (m: MoviePool) => {
    setEditMovie(m);
    setEditMovieTitle(m.title);
    setEditMovieStatus(m.status as 'pool' | 'screened');
  };
  const saveMovieEdit = () => {
    setMovies(prev =>
      prev.map(m =>
        m.id === editMovie?.id ? { ...m, title: editMovieTitle, status: editMovieStatus } : m,
      ),
    );
    setEditMovie(null);
  };
  const deleteMovie = (id: string) => setMovies(prev => prev.filter(m => m.id !== id));

  /* proposal edit */
  const [editProposal, setEditProposal] = useState<Proposal | null>(null);
  const [editPropStatus, setEditPropStatus] = useState('discussing');
  const openPropEdit = (p: Proposal) => {
    setEditProposal(p);
    setEditPropStatus((p as any).status ?? 'discussing');
  };
  const savePropEdit = () => {
    setProposalList(prev =>
      prev.map(p =>
        p.id === editProposal?.id ? { ...p, status: editPropStatus as any } : p,
      ),
    );
    setEditProposal(null);
  };
  const deleteProposal = (id: string) => setProposalList(prev => prev.filter(p => p.id !== id));

  /* comment delete */
  const deleteComment = (id: string) => setComments(prev => prev.filter(c => c.id !== id));

  /* ── filtered data ── */
  const filteredMovies = movies.filter(
    m => m.title.includes(movieSearch) || m.by?.includes(movieSearch),
  );
  const filteredProposals = proposalList.filter(
    p => p.title.includes(proposalSearch) || p.name.includes(proposalSearch),
  );
  const filteredComments = comments.filter(
    c => c.author.includes(commentSearch) || c.entity.includes(commentSearch) || c.content.includes(commentSearch),
  );

  const entityTypeLabel: Record<string, string> = {
    movie: '电影',
    event: '活动',
    proposal: '提案',
    discussion: '话题',
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h5" fontWeight={700}>内容管理</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label={`电影 (${movies.length})`} />
        <Tab label={`提案 (${proposalList.length})`} />
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
          <Box
            sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}
          >
            {filteredMovies.map(m => (
              <Card key={m.id} sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography fontWeight={600}>{m.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {m.year} · {m.dir} · 推荐: {m.by}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={1}>
                      <Chip size="small" label={statusLabel[m.status ?? 'pool'] ?? m.status} color={statusColor[m.status ?? 'pool'] ?? 'default'} />
                      <Chip size="small" label={`${m.v} 票`} variant="outlined" />
                    </Stack>
                  </Box>
                  <Stack direction="row">
                    <IconButton size="small" onClick={() => openMovieEdit(m)}><EditRoundedIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => deleteMovie(m.id)}><DeleteRoundedIcon fontSize="small" /></IconButton>
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
          <Box
            sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}
          >
            {filteredProposals.map(p => (
              <Card key={p.id} sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography fontWeight={600}>{p.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      发起人: {p.name} · {p.votes} 票
                    </Typography>
                    <Chip
                      size="small"
                      label={statusLabel[(p as any).status ?? 'discussing']}
                      color={statusColor[(p as any).status ?? 'discussing']}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Stack direction="row">
                    <IconButton size="small" onClick={() => openPropEdit(p)}><EditRoundedIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => deleteProposal(p.id)}><DeleteRoundedIcon fontSize="small" /></IconButton>
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
            placeholder="搜索评论内容 / 作者 / 关联实体"
            value={commentSearch}
            onChange={e => setCommentSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <SearchRoundedIcon sx={{ mr: 1, opacity: 0.5 }} /> } }}
          />
          {filteredComments.map(c => (
            <Card key={c.id} sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={600} variant="body2">{c.author}</Typography>
                    <Chip size="small" label={entityTypeLabel[c.entityType]} />
                    <Typography variant="caption" color="text.secondary">→ {c.entity}</Typography>
                    <Typography variant="caption" color="text.secondary">{c.date}</Typography>
                  </Stack>
                  <Typography variant="body2" mt={0.5}>{c.content}</Typography>
                </Box>
                <IconButton size="small" color="error" onClick={() => deleteComment(c.id)}>
                  <DeleteRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Card>
          ))}
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
              <option value="pool">候选中</option>
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
