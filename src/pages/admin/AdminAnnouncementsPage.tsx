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
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded';
import CelebrationRoundedIcon from '@mui/icons-material/CelebrationRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';

/* ── PRD 11.1.9 ── 公告与里程碑管理 ── */

type AnnouncementType = 'announcement' | 'milestone' | 'host_tribute';
const typeLabel: Record<AnnouncementType, string> = {
  announcement: '📢 公告',
  milestone: '🎉 里程碑',
  host_tribute: '🏠 Host 致敬',
};
const typeColor: Record<AnnouncementType, 'primary' | 'warning' | 'success'> = {
  announcement: 'primary',
  milestone: 'warning',
  host_tribute: 'success',
};
const typeIcon: Record<AnnouncementType, React.ReactNode> = {
  announcement: <CampaignRoundedIcon />,
  milestone: <CelebrationRoundedIcon />,
  host_tribute: <EmojiEventsRoundedIcon />,
};

interface Announcement {
  id: number;
  type: AnnouncementType;
  title: string;
  body: string;
  pinned: boolean;
  author: string;
  createdAt: string;
}

const mockAnnouncements: Announcement[] = [
  {
    id: 1,
    type: 'milestone',
    title: '串门第 50 场活动 🎉',
    body: '从去年 10 月到现在，我们一起看了 12 部电影、吃了 8 顿饭、走了 6 次路。一切才刚刚开始！',
    pinned: true,
    author: 'Yuan',
    createdAt: '2026-02-15',
  },
  {
    id: 2,
    type: 'host_tribute',
    title: '1 月 Host 致敬',
    body: '本月 8 位 Host 开放了自己的客厅，感谢 白开水、大橙子、Star、Nicole、Tiffy、Sean、Annie、Michael！',
    pinned: false,
    author: 'Yuan',
    createdAt: '2026-02-01',
  },
  {
    id: 3,
    type: 'announcement',
    title: '串门原则 v2.0 发布',
    body: '我们重新梳理了社群原则，新增了取消政策和隐私保护条款。请大家花 3 分钟看看。',
    pinned: false,
    author: '白开水',
    createdAt: '2026-01-20',
  },
  {
    id: 4,
    type: 'milestone',
    title: '电影池突破 100 部',
    body: '最受欢迎的 3 部：花样年华 (18票)、寄生虫 (15票)、永恒和一日 (12票)。继续推荐！',
    pinned: false,
    author: 'Yuan',
    createdAt: '2026-01-10',
  },
  {
    id: 5,
    type: 'host_tribute',
    title: '12 月 Host 致敬',
    body: '感谢 6 位 Host 在寒冬中温暖了大家：Yuan、白开水、大橙子、Star、Tiffy、Andy。',
    pinned: false,
    author: '大橙子',
    createdAt: '2026-01-01',
  },
];

export default function AdminAnnouncementsPage() {
  const [tab, setTab] = useState(0);
  const [items, setItems] = useState<Announcement[]>(mockAnnouncements);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  /* form state */
  const [formType, setFormType] = useState<AnnouncementType>('announcement');
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formPinned, setFormPinned] = useState(false);

  const resetForm = () => { setFormType('announcement'); setFormTitle(''); setFormBody(''); setFormPinned(false); };

  const openCreate = (type: AnnouncementType) => {
    resetForm();
    setFormType(type);
    setCreateOpen(true);
  };
  const openEdit = (item: Announcement) => {
    setEditItem(item);
    setFormType(item.type);
    setFormTitle(item.title);
    setFormBody(item.body);
    setFormPinned(item.pinned);
  };

  const saveCreate = () => {
    const newItem: Announcement = {
      id: Date.now(),
      type: formType,
      title: formTitle,
      body: formBody,
      pinned: formPinned,
      author: 'Yuan',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setItems(prev => [newItem, ...prev]);
    setCreateOpen(false);
    resetForm();
  };
  const saveEdit = () => {
    if (!editItem) return;
    setItems(prev =>
      prev.map(i =>
        i.id === editItem.id ? { ...i, type: formType, title: formTitle, body: formBody, pinned: formPinned } : i,
      ),
    );
    setEditItem(null);
    resetForm();
  };
  const deleteItem = (id: number) => setItems(prev => prev.filter(i => i.id !== id));
  const togglePin = (id: number) => setItems(prev => prev.map(i => i.id === id ? { ...i, pinned: !i.pinned } : i));

  const filtered = tab === 0 ? items : items.filter(i =>
    tab === 1 ? i.type === 'announcement' : tab === 2 ? i.type === 'milestone' : i.type === 'host_tribute',
  );

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={700}>公告与里程碑</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<CampaignRoundedIcon />} onClick={() => openCreate('announcement')}>
            发布公告
          </Button>
          <Button size="small" startIcon={<CelebrationRoundedIcon />} onClick={() => openCreate('milestone')}>
            发布里程碑
          </Button>
          <Button size="small" startIcon={<EmojiEventsRoundedIcon />} onClick={() => openCreate('host_tribute')}>
            Host 致敬
          </Button>
        </Stack>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label={`全部 (${items.length})`} />
        <Tab label={`公告 (${items.filter(i => i.type === 'announcement').length})`} />
        <Tab label={`里程碑 (${items.filter(i => i.type === 'milestone').length})`} />
        <Tab label={`Host 致敬 (${items.filter(i => i.type === 'host_tribute').length})`} />
      </Tabs>

      <Stack spacing={2}>
        {filtered.map(item => (
          <Card key={item.id} sx={{ p: 2, borderLeft: item.pinned ? '3px solid' : undefined, borderColor: 'warning.main' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                  {typeIcon[item.type]}
                  <Chip size="small" label={typeLabel[item.type]} color={typeColor[item.type]} />
                  {item.pinned && <Chip size="small" label="📌 置顶" color="warning" />}
                  <Typography variant="caption" color="text.secondary">{item.createdAt} · {item.author}</Typography>
                </Stack>
                <Typography fontWeight={600}>{item.title}</Typography>
                <Typography variant="body2" mt={0.5} sx={{ opacity: 0.85 }}>{item.body}</Typography>
              </Box>
              <Stack direction="row">
                <IconButton size="small" onClick={() => togglePin(item.id)} color={item.pinned ? 'warning' : 'default'}>
                  <PushPinRoundedIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => openEdit(item)}>
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => deleteItem(item.id)}>
                  <DeleteRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
            暂无{tab === 1 ? '公告' : tab === 2 ? '里程碑' : tab === 3 ? 'Host 致敬' : '内容'}
          </Typography>
        )}
      </Stack>

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <AddRoundedIcon />
            <span>发布{typeLabel[formType]}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="类型"
              select
              value={formType}
              onChange={e => setFormType(e.target.value as AnnouncementType)}
              fullWidth
              slotProps={{ select: { native: true } }}
            >
              <option value="announcement">📢 公告</option>
              <option value="milestone">🎉 里程碑</option>
              <option value="host_tribute">🏠 Host 致敬</option>
            </TextField>
            <TextField label="标题" value={formTitle} onChange={e => setFormTitle(e.target.value)} fullWidth />
            <TextField label="内容" value={formBody} onChange={e => setFormBody(e.target.value)} fullWidth multiline rows={4} />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Button
                variant={formPinned ? 'contained' : 'outlined'}
                size="small"
                startIcon={<PushPinRoundedIcon />}
                onClick={() => setFormPinned(!formPinned)}
              >
                {formPinned ? '已置顶' : '置顶动态流'}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>取消</Button>
          <Button variant="contained" disabled={!formTitle || !formBody} onClick={saveCreate}>发布</Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editItem} onClose={() => { setEditItem(null); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle>编辑</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="类型"
              select
              value={formType}
              onChange={e => setFormType(e.target.value as AnnouncementType)}
              fullWidth
              slotProps={{ select: { native: true } }}
            >
              <option value="announcement">📢 公告</option>
              <option value="milestone">🎉 里程碑</option>
              <option value="host_tribute">🏠 Host 致敬</option>
            </TextField>
            <TextField label="标题" value={formTitle} onChange={e => setFormTitle(e.target.value)} fullWidth />
            <TextField label="内容" value={formBody} onChange={e => setFormBody(e.target.value)} fullWidth multiline rows={4} />
            <Button
              variant={formPinned ? 'contained' : 'outlined'}
              size="small"
              startIcon={<PushPinRoundedIcon />}
              onClick={() => setFormPinned(!formPinned)}
            >
              {formPinned ? '已置顶' : '置顶动态流'}
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditItem(null); resetForm(); }}>取消</Button>
          <Button variant="contained" disabled={!formTitle || !formBody} onClick={saveEdit}>保存</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
