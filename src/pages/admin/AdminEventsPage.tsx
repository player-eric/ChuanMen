import { useState } from 'react';
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
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import ConfirmDialog from '@/components/ConfirmDialog';

/* ── Mock events for admin (PRD 11.1.2) ── */
const upcomingEvents = [
  { id: 'adm-evt-1', title: '电影夜 · 花样年华', host: '白开水', date: '02.22 周六 7pm', location: '白开水家', spots: 6, total: 10, phase: 'open' as const, scene: 'movie', pinned: true, hiddenMembers: [] as string[] },
  { id: 'adm-evt-2', title: '重庆森林 · 私人邀请', host: 'Yuan', date: '02.28 周五 8pm', location: 'Yuan 家', spots: 2, total: 6, phase: 'invite' as const, scene: 'movie', pinned: false, hiddenMembers: ['星星'] },
  { id: 'adm-evt-3', title: '周末 Potluck', host: 'Tiffy', date: '03.01 周六 12pm', location: 'Tiffy 家', spots: 4, total: 8, phase: 'open' as const, scene: 'chuanmen', pinned: false, hiddenMembers: [] as string[] },
  { id: 'adm-evt-4', title: '春天 Kayaking', host: 'Derek', date: '03.08 周六 10am', location: 'Raritan River', spots: 3, total: 8, phase: 'invite' as const, scene: 'outdoor', pinned: false, hiddenMembers: ['Mia', '星星'] },
  { id: 'adm-evt-5', title: '烘焙下午茶', host: 'Tiffy', date: '03.15 周六 2pm', location: 'Tiffy 家', spots: 0, total: 6, phase: 'open' as const, scene: 'chuanmen', pinned: false, hiddenMembers: [] as string[] },
];

const pastEvents = [
  { id: 'adm-evt-101', title: '电影夜 · 寄生虫', host: '白开水', date: '02.08', attendees: 8, photos: 12, cards: 5 },
  { id: 'adm-evt-102', title: '新年饭局 Potluck', host: 'Yuan', date: '01.25', attendees: 10, photos: 18, cards: 8 },
  { id: 'adm-evt-103', title: '电影夜 · 千与千寻', host: 'Yuan', date: '01.18', attendees: 7, photos: 6, cards: 3 },
  { id: 'adm-evt-104', title: 'High Point 徒步', host: '大橙子', date: '01.12', attendees: 6, photos: 24, cards: 4 },
  { id: 'adm-evt-105', title: 'Potluck · 上海小笼', host: 'Tiffy', date: '01.05', attendees: 8, photos: 15, cards: 7 },
  { id: 'adm-evt-106', title: '圣诞 Party', host: 'Yuan', date: '12.24', attendees: 12, photos: 32, cards: 12 },
];

const cancelledEvents = [
  { id: 'adm-evt-201', title: '滑雪 · Mountain Creek', host: 'Derek', date: '02.18', reason: '暴风雪预警，安全起见取消', refundStatus: '无需退款' },
];

const phaseColors: Record<string, 'primary' | 'success' | 'warning' | 'default'> = {
  invite: 'warning',
  open: 'success',
  closed: 'primary',
};

export default function AdminEventsPage() {
  const [tab, setTab] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<(typeof upcomingEvents)[0] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<(typeof upcomingEvents)[0] | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<(typeof upcomingEvents)[0] | null>(null);
  const [confirmPin, setConfirmPin] = useState<(typeof upcomingEvents)[0] | null>(null);
  const [hiddenListEvent, setHiddenListEvent] = useState<(typeof upcomingEvents)[0] | null>(null);

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`即将到来 (${upcomingEvents.length})`} />
          <Tab label={`已结束 (${pastEvents.length})`} />
          <Tab label={`已取消 (${cancelledEvents.length})`} />
        </Tabs>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>
          创建活动
        </Button>
      </Stack>

      {/* Upcoming */}
      {tab === 0 && (
        <Card>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '3fr 1.5fr 2fr 1fr 1fr 1fr 120px', gap: 1, px: 2, py: 1.5, bgcolor: 'action.hover' }}>
              <Typography variant="caption" fontWeight={700}>活动名称</Typography>
              <Typography variant="caption" fontWeight={700}>Host</Typography>
              <Typography variant="caption" fontWeight={700}>时间 / 地点</Typography>
              <Typography variant="caption" fontWeight={700}>人数</Typography>
              <Typography variant="caption" fontWeight={700}>阶段</Typography>
              <Typography variant="caption" fontWeight={700}>隐藏</Typography>
              <Typography variant="caption" fontWeight={700}>操作</Typography>
            </Box>
            <Divider />
            {upcomingEvents.map((evt, i) => (
              <Box key={evt.id}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', md: '3fr 1.5fr 2fr 1fr 1fr 1fr 120px' }, gap: 1, px: 2, py: 1.5, alignItems: 'center' }}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {evt.pinned && <PushPinRoundedIcon sx={{ fontSize: 14, color: 'primary.main' }} />}
                    <Typography variant="body2" fontWeight={600}>{evt.title}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>{evt.host[0]}</Avatar>
                    <Typography variant="body2">{evt.host}</Typography>
                  </Stack>
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Typography variant="body2">{evt.date}</Typography>
                    <Typography variant="caption" color="text.secondary">{evt.location}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{`${evt.spots}/${evt.total}`}</Typography>
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Chip label={evt.phase === 'invite' ? '邀请中' : '公开'} size="small" color={phaseColors[evt.phase]} variant="outlined" />
                  </Box>
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                    {evt.hiddenMembers.length > 0 ? (
                      <Chip
                        label={`${evt.hiddenMembers.length} 人`}
                        size="small"
                        color="warning"
                        variant="outlined"
                        icon={<VisibilityOffRoundedIcon sx={{ fontSize: 14 }} />}
                        onClick={() => setHiddenListEvent(evt)}
                        sx={{ cursor: 'pointer' }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">—</Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" title={evt.pinned ? '取消置顶' : '置顶'} onClick={() => setConfirmPin(evt)}>
                      <PushPinRoundedIcon fontSize="small" sx={{ color: evt.pinned ? 'primary.main' : 'action.disabled' }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => setDetailEvent(evt)}><VisibilityRoundedIcon fontSize="small" /></IconButton>
                    <IconButton size="small"><EditRoundedIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => setConfirmDelete(evt)}><DeleteRoundedIcon fontSize="small" /></IconButton>
                  </Stack>
                </Box>
                {i < upcomingEvents.length - 1 && <Divider />}
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Past */}
      {tab === 1 && (
        <Card>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '3fr 1.5fr 1fr 1fr 1fr 1fr', gap: 1, px: 2, py: 1.5, bgcolor: 'action.hover' }}>
              <Typography variant="caption" fontWeight={700}>活动名称</Typography>
              <Typography variant="caption" fontWeight={700}>Host</Typography>
              <Typography variant="caption" fontWeight={700}>日期</Typography>
              <Typography variant="caption" fontWeight={700}>参加人数</Typography>
              <Typography variant="caption" fontWeight={700}>照片</Typography>
              <Typography variant="caption" fontWeight={700}>感谢卡</Typography>
            </Box>
            <Divider />
            {pastEvents.map((evt, i) => (
              <Box key={evt.id}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 1.5fr 1fr 1fr 1fr 1fr' }, gap: 1, px: 2, py: 1.5, alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight={600}>{evt.title}</Typography>
                  <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{evt.host}</Typography>
                  <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{evt.date}</Typography>
                  <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{evt.attendees} 人</Typography>
                  <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{evt.photos} 张</Typography>
                  <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{evt.cards} 张</Typography>
                </Box>
                {i < pastEvents.length - 1 && <Divider />}
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cancelled */}
      {tab === 2 && (
        <Grid container spacing={2}>
          {cancelledEvents.map((evt) => (
            <Grid key={evt.id} size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography fontWeight={700}>{evt.title}</Typography>
                  <Typography variant="body2" color="text.secondary">Host: {evt.host} · {evt.date}</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>取消原因：{evt.reason}</Typography>
                  <Chip label={evt.refundStatus} size="small" sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create event dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建新活动</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="活动名称" fullWidth size="small" placeholder="例：电影夜 · 花样年华" />
            <TextField label="日期时间" fullWidth size="small" placeholder="03.15 周六 7pm" />
            <TextField label="地点" fullWidth size="small" placeholder="白开水家" />
            <TextField label="活动类型" select fullWidth size="small" defaultValue="movie">
              <MenuItem value="movie">电影夜</MenuItem>
              <MenuItem value="chuanmen">茶话会/分享会</MenuItem>
              <MenuItem value="outdoor">户外</MenuItem>
              <MenuItem value="hiking">徒步</MenuItem>
              <MenuItem value="other">其他</MenuItem>
            </TextField>
            <TextField label="最大人数" type="number" fullWidth size="small" defaultValue={8} />
            <TextField label="活动描述" multiline rows={3} fullWidth size="small" />
            <TextField label="House Rules" multiline rows={2} fullWidth size="small" placeholder="请换鞋入内 · 10pm 前结束" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => setCreateOpen(false)}>发布</Button>
        </DialogActions>
      </Dialog>

      {/* Event detail dialog */}
      <Dialog open={!!detailEvent} onClose={() => setDetailEvent(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{detailEvent?.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Typography variant="body2"><strong>Host：</strong>{detailEvent?.host}</Typography>
            <Typography variant="body2"><strong>时间：</strong>{detailEvent?.date}</Typography>
            <Typography variant="body2"><strong>地点：</strong>{detailEvent?.location}</Typography>
            <Typography variant="body2"><strong>人数：</strong>{detailEvent ? `${detailEvent.spots}/${detailEvent.total}` : ''}</Typography>
            <Typography variant="body2"><strong>阶段：</strong>{detailEvent?.phase === 'invite' ? '私人邀请中' : '公开报名中'}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailEvent(null)}>关闭</Button>
          <Button variant="outlined" color="error" onClick={() => { setConfirmCancel(detailEvent); }}>取消活动</Button>
          <Button variant="contained">编辑活动</Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm: delete event ── */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="确认删除活动"
        message={`确定要删除「${confirmDelete?.title ?? ''}」吗？删除后所有报名信息将丢失，此操作不可撤回。`}
        confirmLabel="删除"
        confirmColor="error"
        onConfirm={() => setConfirmDelete(null)}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* ── Confirm: cancel event ── */}
      <ConfirmDialog
        open={!!confirmCancel}
        title="确认取消活动"
        message={`确定要取消「${confirmCancel?.title ?? ''}」吗？已报名的成员将收到通知。`}
        confirmLabel="取消活动"
        confirmColor="warning"
        onConfirm={() => { setConfirmCancel(null); setDetailEvent(null); }}
        onCancel={() => setConfirmCancel(null)}
      />

      {/* ── Confirm: pin/unpin event ── */}
      <ConfirmDialog
        open={!!confirmPin}
        title={confirmPin?.pinned ? '取消置顶' : '置顶活动'}
        message={confirmPin?.pinned
          ? `确定要取消「${confirmPin?.title ?? ''}」的置顶吗？`
          : `确定要将「${confirmPin?.title ?? ''}」置顶到活动列表顶部吗？`}
        confirmLabel={confirmPin?.pinned ? '取消置顶' : '置顶'}
        confirmColor="primary"
        onConfirm={() => setConfirmPin(null)}
        onCancel={() => setConfirmPin(null)}
      />

      {/* ── Hidden members list dialog ── */}
      <Dialog open={!!hiddenListEvent} onClose={() => setHiddenListEvent(null)} maxWidth="xs" fullWidth>
        <DialogTitle>被 Host 隐藏的成员 — {hiddenListEvent?.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {hiddenListEvent?.hiddenMembers.map((name) => (
              <Stack key={name} direction="row" spacing={1} alignItems="center" sx={{ py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                <Avatar sx={{ width: 28, height: 28 }}>{name[0]}</Avatar>
                <Typography variant="body2">{name}</Typography>
                <Chip label="Host 隐藏" size="small" color="warning" variant="outlined" sx={{ ml: 'auto' }} />
              </Stack>
            ))}
            {hiddenListEvent?.hiddenMembers.length === 0 && (
              <Typography variant="body2" color="text.secondary">无隐藏成员</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHiddenListEvent(null)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
