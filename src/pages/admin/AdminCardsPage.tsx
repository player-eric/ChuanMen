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

/* ── PRD 11.1.4 ── 感谢卡管理：查看/删除/统计/额度配置 ── */

interface CardItem {
  id: number;
  from: string;
  to: string;
  message: string;
  stamp: string;
  date: string;
  visibility: 'public' | 'private';
  sourceType: 'free' | 'purchased';
  eventName?: string;
  tags: string[];
}

const mockCards: CardItem[] = [
  { id: 1, from: '星星', to: 'Yuan', message: '谢谢你总是那么用心准备活动！', stamp: '🌟', date: '2/20', visibility: 'public', sourceType: 'free', eventName: '寄生虫之夜', tags: ['Host 太用心了'] },
  { id: 2, from: 'Nicole', to: '白开水', message: '你做的菜太好吃了！每次来都有惊喜', stamp: '🍳', date: '2/19', visibility: 'public', sourceType: 'free', eventName: '新年 Potluck', tags: ['好吃！'] },
  { id: 3, from: 'Tiffy', to: '大橙子', message: '和你聊天总是很开心', stamp: '💬', date: '2/18', visibility: 'private', sourceType: 'free', eventName: '茶话会', tags: ['氛围很棒'] },
  { id: 4, from: '白开水', to: '星星', message: '照片拍得太好了！每张都像电影', stamp: '📸', date: '2/17', visibility: 'public', sourceType: 'free', eventName: '寄生虫之夜', tags: ['拍照太好了'] },
  { id: 5, from: 'Sean', to: 'Yuan', message: '第一次来就感觉很放松，谢谢', stamp: '✨', date: '2/16', visibility: 'public', sourceType: 'free', eventName: '电影夜·花样年华', tags: ['第一次来就很放松'] },
  { id: 6, from: '大橙子', to: 'Nicole', message: '周末开心！生日快乐 🎂', stamp: '🎂', date: '2/15', visibility: 'public', sourceType: 'purchased', tags: [] },
  { id: 7, from: 'Annie', to: '白开水', message: '每次都帮忙收拾到最后，太感谢了', stamp: '🧹', date: '2/14', visibility: 'public', sourceType: 'free', eventName: '新年 Potluck', tags: ['每次都帮忙收拾'] },
  { id: 8, from: '小鹿', to: 'Tiffy', message: '你推荐的那本书我看完了，真的很好！', stamp: '📖', date: '2/13', visibility: 'private', sourceType: 'purchased', tags: [] },
];

interface CreditConfig {
  signupCredit: number;
  eventCredit: number;
  hostCredit: number;
  newUserCredit: number;
  purchasePrice: number;
}

export default function AdminCardsPage() {
  const [tab, setTab] = useState(0);
  const [cards, setCards] = useState<CardItem[]>(mockCards);
  const [search, setSearch] = useState('');
  const [previewCard, setPreviewCard] = useState<CardItem | null>(null);

  const [creditConfig, setCreditConfig] = useState<CreditConfig>({
    signupCredit: 4,
    eventCredit: 2,
    hostCredit: 4,
    newUserCredit: 4,
    purchasePrice: 5,
  });

  const deleteCard = (id: number) => setCards(prev => prev.filter(c => c.id !== id));

  const filteredCards = cards.filter(
    c => c.from.includes(search) || c.to.includes(search) || c.message.includes(search),
  );
  const publicCards = filteredCards.filter(c => c.visibility === 'public');
  const privateCards = filteredCards.filter(c => c.visibility === 'private');
  const purchasedCards = filteredCards.filter(c => c.sourceType === 'purchased');

  /* stats */
  const totalCards = cards.length;
  const publicCount = cards.filter(c => c.visibility === 'public').length;
  const privateCount = cards.filter(c => c.visibility === 'private').length;
  const purchasedCount = cards.filter(c => c.sourceType === 'purchased').length;
  const uniqueSenders = new Set(cards.map(c => c.from)).size;
  const uniqueReceivers = new Set(cards.map(c => c.to)).size;

  /* top receivers */
  const receiverCounts: Record<string, number> = {};
  cards.forEach(c => { receiverCounts[c.to] = (receiverCounts[c.to] ?? 0) + 1; });
  const topReceivers = Object.entries(receiverCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  /* top senders */
  const senderCounts: Record<string, number> = {};
  cards.forEach(c => { senderCounts[c.from] = (senderCounts[c.from] ?? 0) + 1; });
  const topSenders = Object.entries(senderCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

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
            <Chip label={`购买 ${purchasedCards.length}`} color="warning" variant="outlined" size="small" />
          </Stack>

          {filteredCards.map(c => (
            <Card key={c.id} sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="body2" fontWeight={600}>{c.stamp} {c.from} → {c.to}</Typography>
                    <Chip size="small" label={c.visibility === 'public' ? '公开' : '🔒 私密'} color={c.visibility === 'public' ? 'success' : 'default'} />
                    {c.sourceType === 'purchased' && <Chip size="small" label="💰 购买" color="warning" />}
                    <Typography variant="caption" color="text.secondary">{c.date}</Typography>
                  </Stack>
                  <Typography variant="body2" mt={0.5} sx={{ opacity: 0.85 }}>"{c.message}"</Typography>
                  {c.eventName && (
                    <Typography variant="caption" color="text.secondary">来自「{c.eventName}」</Typography>
                  )}
                  {c.tags.length > 0 && (
                    <Stack direction="row" spacing={0.5} mt={0.5}>
                      {c.tags.map(t => <Chip key={t} size="small" label={t} variant="outlined" />)}
                    </Stack>
                  )}
                </Box>
                <Stack direction="row">
                  <IconButton size="small" onClick={() => setPreviewCard(c)}>
                    <VisibilityRoundedIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => deleteCard(c.id)}>
                    <DeleteRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Card>
          ))}
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
              { label: '购买卡片', value: purchasedCount },
              { label: '发送者', value: uniqueSenders },
              { label: '收件人', value: uniqueReceivers },
              { label: '购买收入', value: `$${purchasedCount * creditConfig.purchasePrice}` },
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
            <TextField
              label="新人注册赠送"
              type="number"
              value={creditConfig.newUserCredit}
              onChange={e => setCreditConfig(prev => ({ ...prev, newUserCredit: Number(e.target.value) }))}
              slotProps={{ input: { endAdornment: <Typography variant="caption">张</Typography> } }}
            />
            <TextField
              label="参加活动获得"
              type="number"
              value={creditConfig.eventCredit}
              onChange={e => setCreditConfig(prev => ({ ...prev, eventCredit: Number(e.target.value) }))}
              slotProps={{ input: { endAdornment: <Typography variant="caption">张 / 次</Typography> } }}
            />
            <TextField
              label="Host 活动额外获得"
              type="number"
              value={creditConfig.hostCredit}
              onChange={e => setCreditConfig(prev => ({ ...prev, hostCredit: Number(e.target.value) }))}
              slotProps={{ input: { endAdornment: <Typography variant="caption">张 / 次</Typography> } }}
            />
            <TextField
              label="购买单价"
              type="number"
              value={creditConfig.purchasePrice}
              onChange={e => setCreditConfig(prev => ({ ...prev, purchasePrice: Number(e.target.value) }))}
              slotProps={{ input: { endAdornment: <Typography variant="caption">$ / 张</Typography> } }}
            />
            <Button variant="contained" onClick={() => alert('已保存额度配置')}>保存配置</Button>
          </Stack>
        </Card>
      )}

      {/* ── Preview Dialog ── */}
      <Dialog open={!!previewCard} onClose={() => setPreviewCard(null)} maxWidth="xs" fullWidth>
        <DialogTitle>感谢卡详情</DialogTitle>
        <DialogContent>
          {previewCard && (
            <Stack spacing={1.5}>
              <Typography variant="body2"><b>发送者:</b> {previewCard.from}</Typography>
              <Typography variant="body2"><b>收件人:</b> {previewCard.to}</Typography>
              <Typography variant="body2"><b>邮票:</b> {previewCard.stamp}</Typography>
              <Typography variant="body2"><b>可见性:</b> {previewCard.visibility === 'public' ? '公开' : '私密'}</Typography>
              <Typography variant="body2"><b>来源:</b> {previewCard.sourceType === 'free' ? '免费额度' : '购买'}</Typography>
              {previewCard.eventName && <Typography variant="body2"><b>关联活动:</b> {previewCard.eventName}</Typography>}
              <Divider />
              <Typography variant="body1" sx={{ fontStyle: 'italic' }}>"{previewCard.message}"</Typography>
              {previewCard.tags.length > 0 && (
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {previewCard.tags.map(t => <Chip key={t} size="small" label={t} />)}
                </Stack>
              )}
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
