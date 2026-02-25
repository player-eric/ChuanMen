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
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded';
import CelebrationRoundedIcon from '@mui/icons-material/CelebrationRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import {
  fetchAnnouncementsAdminApi,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '@/lib/domainApi';
import { useAuth } from '@/auth/AuthContext';

/* ── PRD 11.1.9 ── 公告与里程碑管理 ── */

type AnnouncementType = 'announcement' | 'milestone' | 'host_tribute';
type Row = Record<string, any>;

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

export default function AdminAnnouncementsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Row[]>([]);
  const [editItem, setEditItem] = useState<Row | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  /* form state */
  const [formType, setFormType] = useState<AnnouncementType>('announcement');
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formPinned, setFormPinned] = useState(false);

  const resetForm = () => { setFormType('announcement'); setFormTitle(''); setFormBody(''); setFormPinned(false); };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAnnouncementsAdminApi();
      setItems(data);
    } catch (e) { console.error('Failed to load announcements', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const openCreate = (type: AnnouncementType) => {
    resetForm();
    setFormType(type);
    setCreateOpen(true);
  };
  const openEdit = (item: Row) => {
    setEditItem(item);
    setFormType((item.type as AnnouncementType) ?? 'announcement');
    setFormTitle(item.title ?? '');
    setFormBody(item.body ?? '');
    setFormPinned(item.pinned ?? false);
  };

  const saveCreate = async () => {
    if (!formTitle || !formBody || !user?.id) return;
    try {
      await createAnnouncement({ title: formTitle, body: formBody, type: formType, pinned: formPinned, authorId: user.id });
      setCreateOpen(false); resetForm(); loadData();
    } catch (e) { console.error(e); }
  };

  const saveEdit = async () => {
    if (!editItem) return;
    try {
      await updateAnnouncement(editItem.id, { title: formTitle, body: formBody, type: formType, pinned: formPinned });
      setEditItem(null); resetForm(); loadData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteAnnouncement(id); loadData(); } catch (e) { console.error(e); }
  };

  const handleTogglePin = async (item: Row) => {
    try { await updateAnnouncement(item.id, { pinned: !item.pinned }); loadData(); } catch (e) { console.error(e); }
  };

  const filtered = tab === 0 ? items : items.filter(i =>
    tab === 1 ? i.type === 'announcement' : tab === 2 ? i.type === 'milestone' : i.type === 'host_tribute',
  );

  if (loading) return <Typography>加载中…</Typography>;

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={700}>公告与里程碑</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<CampaignRoundedIcon />} onClick={() => openCreate('announcement')}>发布公告</Button>
          <Button size="small" startIcon={<CelebrationRoundedIcon />} onClick={() => openCreate('milestone')}>发布里程碑</Button>
          <Button size="small" startIcon={<EmojiEventsRoundedIcon />} onClick={() => openCreate('host_tribute')}>Host 致敬</Button>
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
                  {typeIcon[(item.type as AnnouncementType) ?? 'announcement']}
                  <Chip size="small" label={typeLabel[(item.type as AnnouncementType) ?? 'announcement']} color={typeColor[(item.type as AnnouncementType) ?? 'announcement']} />
                  {item.pinned && <Chip size="small" label="📌 置顶" color="warning" />}
                  <Typography variant="caption" color="text.secondary">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('zh-CN') : ''} · {item.author?.name ?? '—'}
                  </Typography>
                </Stack>
                <Typography fontWeight={600}>{item.title}</Typography>
                <Typography variant="body2" mt={0.5} sx={{ opacity: 0.85 }}>{item.body}</Typography>
              </Box>
              <Stack direction="row">
                <IconButton size="small" onClick={() => handleTogglePin(item)} color={item.pinned ? 'warning' : 'default'}>
                  <PushPinRoundedIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => openEdit(item)}>
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
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
            <TextField label="类型" select value={formType} onChange={e => setFormType(e.target.value as AnnouncementType)} fullWidth slotProps={{ select: { native: true } }}>
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
          <Button onClick={() => setCreateOpen(false)}>取消</Button>
          <Button variant="contained" disabled={!formTitle || !formBody} onClick={saveCreate}>发布</Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editItem} onClose={() => { setEditItem(null); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle>编辑</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="类型" select value={formType} onChange={e => setFormType(e.target.value as AnnouncementType)} fullWidth slotProps={{ select: { native: true } }}>
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
