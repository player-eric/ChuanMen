import { useEffect, useState } from 'react';
import { firstNonEmoji } from '@/components/Atoms';
import {
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
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  fetchEventsApi,
  fetchPastEventsApi,
  fetchCancelledEventsApi,
  createEvent,
  updateEvent,
  deleteEvent,
} from '@/lib/domainApi';
import { useAuth } from '@/auth/AuthContext';

/* ── Admin Events Page  (PRD 11.1.2) ── */
type EventRow = Record<string, any>;

const phaseColors: Record<string, 'primary' | 'success' | 'warning' | 'default'> = {
  invite: 'warning', open: 'success', closed: 'primary', ended: 'default',
};

export default function AdminEventsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<EventRow[]>([]);
  const [past, setPast] = useState<EventRow[]>([]);
  const [cancelled, setCancelled] = useState<EventRow[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<EventRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EventRow | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<EventRow | null>(null);
  const [confirmPin, setConfirmPin] = useState<EventRow | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formType, setFormType] = useState('movie');
  const [formCapacity, setFormCapacity] = useState(8);
  const [formDesc, setFormDesc] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [up, pa, ca] = await Promise.all([
        fetchEventsApi(), fetchPastEventsApi(),
        fetchCancelledEventsApi().catch(() => [] as EventRow[]),
      ]);
      setUpcoming(up); setPast(pa); setCancelled(ca);
    } catch (e) { console.error('Failed to load events', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    if (!formTitle || !formDate || !user?.id) return;
    try {
      await createEvent({ title: formTitle, hostId: user.id, city: formCity, startsAt: new Date(formDate).toISOString(), capacity: formCapacity, description: formDesc, tags: [formType as any] });
      setCreateOpen(false); setFormTitle(''); setFormDate(''); setFormCity(''); setFormDesc('');
      loadData();
    } catch (e) { console.error('Create event failed', e); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try { await deleteEvent(confirmDelete.id); setConfirmDelete(null); setDetailEvent(null); loadData(); }
    catch (e) { console.error('Delete event failed', e); }
  };

  const handleCancel = async () => {
    if (!confirmCancel) return;
    try { await updateEvent(confirmCancel.id, { status: 'cancelled' } as any); setConfirmCancel(null); setDetailEvent(null); loadData(); }
    catch (e) { console.error('Cancel event failed', e); }
  };

  const handlePin = async () => {
    if (!confirmPin) return;
    try { await updateEvent(confirmPin.id, { pinned: !confirmPin.pinned } as any); setConfirmPin(null); loadData(); }
    catch (e) { console.error('Pin/unpin event failed', e); }
  };

  if (loading) return <Typography>加载中…</Typography>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`即将到来 (${upcoming.length})`} />
          <Tab label={`已结束 (${past.length})`} />
          <Tab label={`已取消 (${cancelled.length})`} />
        </Tabs>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>创建活动</Button>
      </Stack>

      {tab === 0 && (
        <Card>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '3fr 1.5fr 2fr 1fr 1fr 120px', gap: 1, px: 2, py: 1.5, bgcolor: 'action.hover' }}>
              <Typography variant="caption" fontWeight={700}>活动名称</Typography>
              <Typography variant="caption" fontWeight={700}>Host</Typography>
              <Typography variant="caption" fontWeight={700}>时间 / 地点</Typography>
              <Typography variant="caption" fontWeight={700}>人数</Typography>
              <Typography variant="caption" fontWeight={700}>阶段</Typography>
              <Typography variant="caption" fontWeight={700}>操作</Typography>
            </Box>
            <Divider />
            {upcoming.map((evt, i) => {
              const hostName = evt.host?.name ?? '—';
              const signupCount = evt._count?.signups ?? evt.signups?.length ?? 0;
              const dateStr = evt.startsAt ? new Date(evt.startsAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', weekday: 'short', timeZone: 'UTC' }) : '';
              return (
                <Box key={evt.id}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', md: '3fr 1.5fr 2fr 1fr 1fr 120px' }, gap: 1, px: 2, py: 1.5, alignItems: 'center' }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {evt.pinned && <PushPinRoundedIcon sx={{ fontSize: 14, color: 'primary.main' }} />}
                      <Typography variant="body2" fontWeight={600}>{evt.title}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: 12 }} src={evt.host?.avatar}>{firstNonEmoji(hostName)}</Avatar>
                      <Typography variant="body2">{hostName}</Typography>
                    </Stack>
                    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                      <Typography variant="body2">{dateStr}</Typography>
                      <Typography variant="caption" color="text.secondary">{evt.city || evt.location}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{`${signupCount}/${evt.capacity}`}</Typography>
                    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                      <Chip label={evt.phase === 'invite' ? '邀请中' : evt.phase === 'open' ? '公开' : evt.phase} size="small" color={phaseColors[evt.phase] ?? 'default'} variant="outlined" />
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" title={evt.pinned ? '取消置顶' : '置顶'} onClick={() => setConfirmPin(evt)}>
                        <PushPinRoundedIcon fontSize="small" sx={{ color: evt.pinned ? 'primary.main' : 'action.disabled' }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => setDetailEvent(evt)}><VisibilityRoundedIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => setConfirmDelete(evt)}><DeleteRoundedIcon fontSize="small" /></IconButton>
                    </Stack>
                  </Box>
                  {i < upcoming.length - 1 && <Divider />}
                </Box>
              );
            })}
            {upcoming.length === 0 && <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>暂无即将到来的活动</Typography>}
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Card>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '3fr 1.5fr 1fr 1fr', gap: 1, px: 2, py: 1.5, bgcolor: 'action.hover' }}>
              <Typography variant="caption" fontWeight={700}>活动名称</Typography>
              <Typography variant="caption" fontWeight={700}>Host</Typography>
              <Typography variant="caption" fontWeight={700}>日期</Typography>
              <Typography variant="caption" fontWeight={700}>参加人数</Typography>
            </Box>
            <Divider />
            {past.map((evt, i) => (
              <Box key={evt.id}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 1.5fr 1fr 1fr' }, gap: 1, px: 2, py: 1.5, alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight={600}>{evt.title}</Typography>
                  <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{evt.host?.name ?? '—'}</Typography>
                  <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{evt.startsAt ? new Date(evt.startsAt).toLocaleDateString('zh-CN', { timeZone: 'UTC' }) : ''}</Typography>
                  <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{evt._count?.signups ?? 0} 人</Typography>
                </Box>
                {i < past.length - 1 && <Divider />}
              </Box>
            ))}
            {past.length === 0 && <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>暂无已结束活动</Typography>}
          </CardContent>
        </Card>
      )}

      {tab === 2 && (
        <Grid container spacing={2}>
          {cancelled.map((evt) => (
            <Grid key={evt.id} size={{ xs: 12, md: 6 }}>
              <Card><CardContent>
                <Typography fontWeight={700}>{evt.title}</Typography>
                <Typography variant="body2" color="text.secondary">Host: {evt.host?.name ?? '—'} · {evt.startsAt ? new Date(evt.startsAt).toLocaleDateString('zh-CN', { timeZone: 'UTC' }) : ''}</Typography>
              </CardContent></Card>
            </Grid>
          ))}
          {cancelled.length === 0 && <Grid size={12}><Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>暂无已取消活动</Typography></Grid>}
        </Grid>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建新活动</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="活动名称" fullWidth size="small" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
            <TextField label="日期时间" fullWidth size="small" type="datetime-local" value={formDate} onChange={e => setFormDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="城市" fullWidth size="small" value={formCity} onChange={e => setFormCity(e.target.value)} />
            <TextField label="活动类型" select fullWidth size="small" value={formType} onChange={e => setFormType(e.target.value)}>
              <MenuItem value="movie">电影夜</MenuItem>
              <MenuItem value="chuanmen">茶话会/分享会</MenuItem>
              <MenuItem value="outdoor">户外</MenuItem>
              <MenuItem value="hiking">徒步</MenuItem>
              <MenuItem value="other">其他</MenuItem>
            </TextField>
            <TextField label="最大人数" type="number" fullWidth size="small" value={formCapacity} onChange={e => setFormCapacity(Number(e.target.value))} />
            <TextField label="活动描述" multiline rows={3} fullWidth size="small" value={formDesc} onChange={e => setFormDesc(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!formTitle || !formDate}>发布</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!detailEvent} onClose={() => setDetailEvent(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{detailEvent?.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Typography variant="body2"><strong>Host：</strong>{detailEvent?.host?.name ?? '—'}</Typography>
            <Typography variant="body2"><strong>时间：</strong>{detailEvent?.startsAt ? new Date(detailEvent.startsAt).toLocaleString('zh-CN', { timeZone: 'UTC' }) : ''}</Typography>
            <Typography variant="body2"><strong>城市：</strong>{detailEvent?.city || detailEvent?.location}</Typography>
            <Typography variant="body2"><strong>人数：</strong>{detailEvent ? `${detailEvent._count?.signups ?? 0}/${detailEvent.capacity}` : ''}</Typography>
            <Typography variant="body2"><strong>阶段：</strong>{detailEvent?.phase === 'invite' ? '私人邀请中' : '公开报名中'}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailEvent(null)}>关闭</Button>
          <Button variant="outlined" color="error" onClick={() => setConfirmCancel(detailEvent)}>取消活动</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!confirmDelete} title="确认删除活动" message={`确定要删除「${confirmDelete?.title ?? ''}」吗？此操作不可撤回。`} confirmLabel="删除" confirmColor="error" onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
      <ConfirmDialog open={!!confirmCancel} title="确认取消活动" message={`确定要取消「${confirmCancel?.title ?? ''}」吗？已报名的成员将收到通知。`} confirmLabel="取消活动" confirmColor="warning" onConfirm={handleCancel} onCancel={() => setConfirmCancel(null)} />
      <ConfirmDialog open={!!confirmPin} title={confirmPin?.pinned ? '取消置顶' : '置顶活动'} message={confirmPin?.pinned ? `确定要取消「${confirmPin?.title ?? ''}」的置顶吗？` : `确定要将「${confirmPin?.title ?? ''}」置顶到活动列表顶部吗？`} confirmLabel={confirmPin?.pinned ? '取消置顶' : '置顶'} confirmColor="primary" onConfirm={handlePin} onCancel={() => setConfirmPin(null)} />
    </Stack>
  );
}
