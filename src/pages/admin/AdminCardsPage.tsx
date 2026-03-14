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
  Divider,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import {
  fetchPostcardsAdminApi,
  adminDeletePostcard,
  fetchSiteConfig,
  updateSiteConfig,
} from '@/lib/domainApi';

/* ── PRD 11.1.4 ── 感谢卡管理：查看/删除/统计/额度配置 ── */

type Row = Record<string, any>;

interface CreditConfig {
  newUserCredit: number;
  eventCredit: number;
  hostCredit: number;
  purchasePrice: number;
}

export default function AdminCardsPage() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [previewCard, setPreviewCard] = useState<Row | null>(null);

  const [creditConfig, setCreditConfig] = useState<CreditConfig>({
    newUserCredit: 4, eventCredit: 2, hostCredit: 4, purchasePrice: 5,
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPostcardsAdminApi();
      setCards(data);
    } catch (e) { console.error('Failed to load cards', e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
    fetchSiteConfig<CreditConfig>('postcardCredits')
      .then(val => { if (val && typeof val === 'object') setCreditConfig(prev => ({ ...prev, ...val })); })
      .catch(() => { /* use defaults */ });
  }, []);

  const handleDelete = async (id: string) => {
    try { await adminDeletePostcard(id); loadData(); } catch (e) { console.error(e); }
  };

  const fromName = (c: Row) => c.from?.name ?? c.fromUser?.name ?? '—';
  const toName = (c: Row) => c.to?.name ?? c.toUser?.name ?? '—';

  const filteredCards = cards.filter(
    c => fromName(c).includes(search) || toName(c).includes(search) || (c.message ?? '').includes(search),
  );
  const publicCards = filteredCards.filter(c => c.visibility === 'public');
  const privateCards = filteredCards.filter(c => c.visibility === 'private');

  /* stats */
  const totalCards = cards.length;
  const publicCount = cards.filter(c => c.visibility === 'public').length;
  const privateCount = cards.filter(c => c.visibility === 'private').length;
  const uniqueSenders = new Set(cards.map(c => c.from?.id ?? c.fromUserId)).size;
  const uniqueReceivers = new Set(cards.map(c => c.to?.id ?? c.toUserId)).size;

  /* top receivers */
  const receiverCounts: Record<string, number> = {};
  cards.forEach(c => { const n = toName(c); receiverCounts[n] = (receiverCounts[n] ?? 0) + 1; });
  const topReceivers = Object.entries(receiverCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  /* top senders */
  const senderCounts: Record<string, number> = {};
  cards.forEach(c => { const n = fromName(c); senderCounts[n] = (senderCounts[n] ?? 0) + 1; });
  const topSenders = Object.entries(senderCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (loading) return <Typography>加载中…</Typography>;

  return (
    <Stack spacing={3}>
      <Typography variant="h5" fontWeight={700}>感谢卡管理</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label={`全部卡片 (${totalCards})`} />
        <Tab label="统计数据" />
        <Tab label="额度配置" />
      </Tabs>

      {/* ━━ 全部卡片 ━━ */}
      {tab === 0 && (
        <Stack spacing={2}>
          <TextField
            size="small"
            placeholder="搜索发送者 / 收件人 / 内容"
            value={search}
            onChange={e => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <SearchRoundedIcon sx={{ mr: 1, opacity: 0.5 }} /> } }}
          />
          <Stack direction="row" spacing={1}>
            <Chip label={`公开 ${publicCards.length}`} color="success" variant="outlined" size="small" />
            <Chip label={`私密 ${privateCards.length}`} variant="outlined" size="small" />
          </Stack>

          {filteredCards.map(c => (
            <Card key={c.id} sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="body2" fontWeight={600}>{c.stamp ?? '✉'} {fromName(c)} → {toName(c)}</Typography>
                    <Chip size="small" label={c.visibility === 'public' ? '公开' : '🔒 私密'} color={c.visibility === 'public' ? 'success' : 'default'} />
                    <Typography variant="caption" color="text.secondary">{c.createdAt ? new Date(c.createdAt).toLocaleDateString('zh-CN') : ''}</Typography>
                  </Stack>
                  <Typography variant="body2" mt={0.5} sx={{ opacity: 0.85 }}>"{c.message}"</Typography>
                  {c.event && (
                    <Typography variant="caption" color="text.secondary">来自「{c.event.title}」</Typography>
                  )}
                  {c.tags && c.tags.length > 0 && (
                    <Stack direction="row" spacing={0.5} mt={0.5}>
                      {c.tags.map((t: any) => <Chip key={typeof t === 'string' ? t : t.id} size="small" label={typeof t === 'string' ? t : t.name} variant="outlined" />)}
                    </Stack>
                  )}
                </Box>
                <Stack direction="row">
                  <IconButton size="small" onClick={() => setPreviewCard(c)}>
                    <VisibilityRoundedIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(c.id)}>
                    <DeleteRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Card>
          ))}
          {filteredCards.length === 0 && <Typography color="text.secondary" textAlign="center" py={3}>暂无卡片</Typography>}
        </Stack>
      )}

      {/* ━━ 统计数据 ━━ */}
      {tab === 1 && (
        <Stack spacing={3}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 2 }}>
            {[
              { label: '总卡片数', value: totalCards, icon: <MailRoundedIcon /> },
              { label: '公开卡片', value: publicCount },
              { label: '私密卡片', value: privateCount },
              { label: '发送者', value: uniqueSenders },
              { label: '收件人', value: uniqueReceivers },
            ].map(s => (
              <Card key={s.label} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Card>
            ))}
          </Box>

          <Divider />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            <Card sx={{ p: 2, flex: 1 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>📬 收卡最多</Typography>
              {topReceivers.map(([name, count]) => (
                <Stack key={name} direction="row" justifyContent="space-between" py={0.5}>
                  <Typography variant="body2">{name}</Typography>
                  <Typography variant="body2" fontWeight={600}>{count} 张</Typography>
                </Stack>
              ))}
            </Card>
            <Card sx={{ p: 2, flex: 1 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>📮 寄卡最多</Typography>
              {topSenders.map(([name, count]) => (
                <Stack key={name} direction="row" justifyContent="space-between" py={0.5}>
                  <Typography variant="body2">{name}</Typography>
                  <Typography variant="body2" fontWeight={600}>{count} 张</Typography>
                </Stack>
              ))}
            </Card>
          </Stack>
        </Stack>
      )}

      {/* ━━ 额度配置 ━━ */}
      {tab === 2 && (
        <Card sx={{ p: 3, maxWidth: 480 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>感谢卡额度规则</Typography>
          <Stack spacing={2}>
            <TextField label="新人注册赠送" type="number" value={creditConfig.newUserCredit} onChange={e => setCreditConfig(prev => ({ ...prev, newUserCredit: Number(e.target.value) }))} slotProps={{ input: { endAdornment: <Typography variant="caption">张</Typography> } }} />
            <TextField label="参加活动获得" type="number" value={creditConfig.eventCredit} onChange={e => setCreditConfig(prev => ({ ...prev, eventCredit: Number(e.target.value) }))} slotProps={{ input: { endAdornment: <Typography variant="caption">张 / 次</Typography> } }} />
            <TextField label="Host 活动额外获得" type="number" value={creditConfig.hostCredit} onChange={e => setCreditConfig(prev => ({ ...prev, hostCredit: Number(e.target.value) }))} slotProps={{ input: { endAdornment: <Typography variant="caption">张 / 次</Typography> } }} />
            <TextField label="购买单价" type="number" value={creditConfig.purchasePrice} onChange={e => setCreditConfig(prev => ({ ...prev, purchasePrice: Number(e.target.value) }))} slotProps={{ input: { endAdornment: <Typography variant="caption">$ / 张</Typography> } }} />
            <Button
              variant="contained"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await updateSiteConfig('postcardCredits', creditConfig);
                  alert('额度配置已保存');
                } catch (e) {
                  console.error(e);
                  alert('保存失败，请重试');
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? '保存中…' : '保存配置'}
            </Button>
          </Stack>
        </Card>
      )}

      {/* ── Preview Dialog ── */}
      <Dialog open={!!previewCard} onClose={() => setPreviewCard(null)} maxWidth="xs" fullWidth>
        <DialogTitle>感谢卡详情</DialogTitle>
        <DialogContent>
          {previewCard && (
            <Stack spacing={1.5}>
              <Typography variant="body2"><b>发送者:</b> {fromName(previewCard)}</Typography>
              <Typography variant="body2"><b>收件人:</b> {toName(previewCard)}</Typography>
              <Typography variant="body2"><b>邮票:</b> {previewCard.stamp ?? '✉'}</Typography>
              <Typography variant="body2"><b>可见性:</b> {previewCard.visibility === 'public' ? '公开' : '私密'}</Typography>
              {previewCard.event && <Typography variant="body2"><b>关联活动:</b> {previewCard.event.title}</Typography>}
              <Divider />
              <Typography variant="body1" sx={{ fontStyle: 'italic' }}>"{previewCard.message}"</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewCard(null)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
