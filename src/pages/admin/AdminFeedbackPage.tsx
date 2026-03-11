import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ReplyRoundedIcon from '@mui/icons-material/ReplyRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import {
  fetchFeedbackListApi,
  updateFeedbackApi,
  replyFeedbackApi,
  deleteFeedbackApi,
} from '@/lib/domainApi';

type Row = Record<string, any>;

const STATUS_TABS = [
  { label: '全部', value: '' },
  { label: '待处理', value: 'pending' },
  { label: '已记录', value: 'noted' },
  { label: '已回复', value: 'replied' },
  { label: '已完成', value: 'done,wontfix' },
];

const CATEGORY_CHIPS = [
  { label: '全部', value: '' },
  { label: '功能建议', value: 'feature' },
  { label: 'Bug反馈', value: 'bug' },
  { label: '活动需求', value: 'activity' },
  { label: '其他', value: 'other' },
];

const categoryColorMap: Record<string, 'primary' | 'error' | 'warning' | 'default'> = {
  feature: 'primary',
  bug: 'error',
  activity: 'warning',
  other: 'default',
};

const categoryLabelMap: Record<string, string> = {
  feature: '功能建议', bug: 'Bug反馈', activity: '活动需求', other: '其他',
};

const statusLabelMap: Record<string, string> = {
  pending: '待处理', noted: '已记录', replied: '已回复', done: '已完成', wontfix: '不处理',
};

const statusColorMap: Record<string, 'warning' | 'info' | 'success' | 'default' | 'error'> = {
  pending: 'warning', noted: 'info', replied: 'success', done: 'success', wontfix: 'error',
};

export default function AdminFeedbackPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyDialog, setReplyDialog] = useState<{ id: string; name: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [noteEditing, setNoteEditing] = useState<{ id: string; note: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { limit: 200 };
      // If filter is a single status, pass to backend; multi-status filtered client-side
      if (statusFilter && !statusFilter.includes(',')) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      const data = await fetchFeedbackListApi(params);
      let filtered = data.items;
      if (statusFilter && statusFilter.includes(',')) {
        const statuses = statusFilter.split(',');
        filtered = data.items.filter((item: any) => statuses.includes(item.status));
      }
      setItems(filtered);
      setTotal(statusFilter.includes(',') ? filtered.length : data.total);
    } catch (e) {
      console.error('Failed to load feedback', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [statusFilter, categoryFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    // Optimistic update
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)));
    try {
      const updated = await updateFeedbackApi(id, { status: newStatus });
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (e) {
      console.error('Failed to update status', e);
      loadData(); // revert on failure
    }
  };

  const handleSaveNote = async (id: string, note: string) => {
    try {
      const updated = await updateFeedbackApi(id, { adminNote: note });
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setNoteEditing(null);
    } catch (e) {
      console.error('Failed to save note', e);
    }
  };

  const handleReply = async () => {
    if (!replyDialog || !replyText.trim()) return;
    setReplySending(true);
    setReplyError(null);
    try {
      await replyFeedbackApi(replyDialog.id, replyText.trim());
      setItems((prev) => prev.map((item) =>
        item.id === replyDialog.id ? { ...item, status: 'replied' } : item,
      ));
      setReplyDialog(null);
      setReplyText('');
    } catch (e: any) {
      console.error('Failed to reply', e);
      setReplyError(e?.message || '发送失败');
    } finally {
      setReplySending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这条反馈？')) return;
    try {
      await deleteFeedbackApi(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((t) => t - 1);
    } catch (e) {
      console.error('Failed to delete', e);
    }
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <Stack spacing={2}>
      <Tabs value={STATUS_TABS.findIndex((t) => t.value === statusFilter)} onChange={(_, i) => setStatusFilter(STATUS_TABS[i].value)}>
        {STATUS_TABS.map((t) => <Tab key={t.value} label={t.label} />)}
      </Tabs>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {CATEGORY_CHIPS.map((c) => (
          <Chip
            key={c.value}
            label={c.label}
            size="small"
            variant={categoryFilter === c.value ? 'filled' : 'outlined'}
            color={categoryFilter === c.value ? 'primary' : 'default'}
            onClick={() => setCategoryFilter(c.value)}
          />
        ))}
        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', alignSelf: 'center' }}>
          共 {total} 条
        </Typography>
      </Stack>

      {loading ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>加载中...</Typography>
      ) : items.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无反馈</Typography>
      ) : (
        <Stack spacing={1}>
          {items.map((item) => {
            const expanded = expandedId === item.id;
            return (
              <Card key={item.id} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ cursor: 'pointer' }} onClick={() => setExpandedId(expanded ? null : item.id)}>
                  <Chip
                    label={categoryLabelMap[item.category] ?? item.category}
                    size="small"
                    color={categoryColorMap[item.category] ?? 'default'}
                    sx={{ minWidth: 64 }}
                  />
                  <Typography variant="body2" fontWeight={600} sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}{item.author?.name && item.author.name !== item.name ? ` (${item.author.name})` : ''}
                  </Typography>
                  <Chip
                    label={statusLabelMap[item.status] ?? item.status}
                    size="small"
                    color={statusColorMap[item.status] ?? 'default'}
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {fmtTime(item.createdAt)}
                  </Typography>
                  {expanded ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
                </Stack>

                {!expanded && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.message}
                  </Typography>
                )}

                <Collapse in={expanded}>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1.5 }}>{item.message}</Typography>

                  {item.email && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Email: {item.email}
                    </Typography>
                  )}
                  {item.page && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      来源: {item.page}
                    </Typography>
                  )}

                  <Divider sx={{ my: 1 }} />

                  {/* Admin note */}
                  {noteEditing?.id === item.id ? (
                    <Stack spacing={1} sx={{ mb: 1.5 }}>
                      <TextField
                        size="small"
                        multiline
                        minRows={2}
                        maxRows={5}
                        fullWidth
                        label="管理员备注"
                        value={noteEditing!.note}
                        onChange={(e) => setNoteEditing({ id: item.id, note: e.target.value })}
                      />
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="contained" onClick={() => handleSaveNote(item.id, noteEditing!.note)}>保存</Button>
                        <Button size="small" onClick={() => setNoteEditing(null)}>取消</Button>
                      </Stack>
                    </Stack>
                  ) : (
                    <Box sx={{ mb: 1.5 }}>
                      {item.adminNote ? (
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', cursor: 'pointer' }} onClick={() => setNoteEditing({ id: item.id, note: item.adminNote ?? '' })}>
                          备注: {item.adminNote}
                        </Typography>
                      ) : (
                        <Button size="small" variant="text" onClick={() => setNoteEditing({ id: item.id, note: '' })}>
                          添加备注
                        </Button>
                      )}
                    </Box>
                  )}

                  {/* Actions */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    <Typography variant="caption" color="text.secondary">状态:</Typography>
                    {['pending', 'noted', 'done', 'wontfix'].map((s) => (
                      <Chip
                        key={s}
                        label={statusLabelMap[s]}
                        size="small"
                        variant={item.status === s ? 'filled' : 'outlined'}
                        color={statusColorMap[s] ?? 'default'}
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(item.id, s); }}
                      />
                    ))}
                    <Box sx={{ flex: 1 }} />
                    {(item.email || item.author) && (
                      <IconButton size="small" color="primary" title="回复" onClick={(e) => { e.stopPropagation(); setReplyDialog({ id: item.id, name: item.name }); }}>
                        <ReplyRoundedIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton size="small" color="error" title="删除" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Collapse>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Reply Dialog */}
      <Dialog open={!!replyDialog} onClose={() => { setReplyDialog(null); setReplyText(''); setReplyError(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>回复 {replyDialog?.name}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            maxRows={8}
            label="回复内容"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            sx={{ mt: 1 }}
          />
          {replyError && <Alert severity="error" sx={{ mt: 1 }}>{replyError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setReplyDialog(null); setReplyText(''); setReplyError(null); }}>取消</Button>
          <Button variant="contained" onClick={handleReply} disabled={replySending || !replyText.trim()}>
            {replySending ? '发送中...' : '发送回复'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
