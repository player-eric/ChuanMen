import { lazy, Suspense, useState } from 'react';
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
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { RichTextViewer } from '@/components/RichTextEditor';
const RichTextEditorLazy = lazy(() => import('@/components/RichTextEditor'));

/* ── Mock newsletters ── */
const sentNewsletters = [
  {
    id: 'nl-12',
    subject: '串门周报 #12 — 春季招新 & 本周电影夜',
    sentDate: '2025-02-15',
    recipients: 28,
    openRate: 72,
    clickRate: 34,
    body: '<p>亲爱的串门成员：</p><p>🎉 春季招新正式开始！欢迎推荐你身边有趣的朋友。</p><p>📅 本周活动：</p><ul><li>2/22 周六 7pm 电影夜 · 花样年华（白开水家）</li><li>2/28 周五 8pm 重庆森林 · 私人邀请（Yuan 家）</li></ul><p>📋 社区公约 v2.0 已更新，请查看。</p><p>— Yuan</p>',
  },
  {
    id: 'nl-11',
    subject: '串门周报 #11 — 新年回顾 & Host 培训预告',
    sentDate: '2025-02-08',
    recipients: 26,
    openRate: 68,
    clickRate: 28,
    body: '<p>亲爱的串门成员：</p><p>回顾 1 月：6 场活动、3 位新 Host、45 张感谢卡！</p><p>🏠 Host 培训会将在 3 月 8 日举办，感兴趣请报名。</p><p>📸 感谢大橙子为我们拍了超多好照片。</p><p>— Yuan</p>',
  },
  {
    id: 'nl-10',
    subject: '串门周报 #10 — 圣诞回顾 & 新年计划',
    sentDate: '2025-01-25',
    recipients: 24,
    openRate: 75,
    clickRate: 40,
    body: '<p>亲爱的串门成员：</p><p>圣诞 Party 超成功！12 人、32 张照片、12 张感谢卡。</p><p>📅 1 月活动预告：</p><ul><li>电影夜 x2</li><li>新年 Potluck</li><li>High Point 徒步</li></ul><p>新年快乐！🎆</p><p>— Yuan</p>',
  },
  {
    id: 'nl-9',
    subject: '串门周报 #9 — 感恩节特别篇',
    sentDate: '2025-01-10',
    recipients: 22,
    openRate: 70,
    clickRate: 32,
    body: '<p>感恩节 Potluck 有 14 个人参加，是我们人数最多的一次活动！</p><p>感谢每一位带菜来的朋友。特别感谢白开水准备了 5 道菜。</p><p>— Yuan</p>',
  },
];

const draftNewsletters = [
  {
    id: 'draft-1',
    subject: '串门周报 #13 — 花样年华观影后记',
    lastEdited: '2025-02-20',
    body: '<p>亲爱的串门成员：</p><p>本周六的花样年华电影夜...</p><p>（草稿未完成）</p>',
  },
];

const subscriberGroups = [
  { label: '全部成员', count: 28 },
  { label: '活跃成员', count: 12 },
  { label: 'Host', count: 5 },
  { label: '管理员', count: 2 },
  { label: '新成员（1个月内）', count: 3 },
];

export default function AdminNewslettersPage() {
  const [tab, setTab] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [previewNl, setPreviewNl] = useState<(typeof sentNewsletters)[0] | null>(null);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`已发送 (${sentNewsletters.length})`} />
          <Tab label={`草稿 (${draftNewsletters.length})`} />
          <Tab label="订阅管理" />
        </Tabs>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setComposeOpen(true); setDraftSubject(''); setDraftBody(''); }}>
          写通讯
        </Button>
      </Stack>

      {/* Sent */}
      {tab === 0 && (
        <Stack spacing={2}>
          {sentNewsletters.map((nl) => (
            <Card key={nl.id}>
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={1}>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={700}>{nl.subject}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {nl.sentDate} · {nl.recipients} 收件人
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={`打开 ${nl.openRate}%`} size="small" color="success" variant="outlined" />
                    <Chip label={`点击 ${nl.clickRate}%`} size="small" color="primary" variant="outlined" />
                    <IconButton size="small" onClick={() => setPreviewNl(nl)}>
                      <VisibilityRoundedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => { setDraftSubject(nl.subject + '（副本）'); setDraftBody(nl.body); setComposeOpen(true); }}>
                      <ContentCopyRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Drafts */}
      {tab === 1 && (
        <Stack spacing={2}>
          {draftNewsletters.map((d) => (
            <Card key={d.id}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight={700}>{d.subject}</Typography>
                    <Typography variant="caption" color="text.secondary">最后编辑：{d.lastEdited}</Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => { setDraftSubject(d.subject); setDraftBody(d.body); setComposeOpen(true); }}>
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {draftNewsletters.length === 0 && (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>暂无草稿</Typography>
          )}
        </Stack>
      )}

      {/* Subscriber management */}
      {tab === 2 && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>📊 订阅概览</Typography>
                <Stack spacing={1.5}>
                  {subscriberGroups.map((g) => (
                    <Stack key={g.label} direction="row" justifyContent="space-between" alignItems="center"
                      sx={{ py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                      <Typography variant="body2">{g.label}</Typography>
                      <Chip label={`${g.count} 人`} size="small" />
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>📈 发送统计</Typography>
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">总发送量</Typography>
                    <Typography variant="body2" fontWeight={700}>{sentNewsletters.length} 期</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">平均打开率</Typography>
                    <Typography variant="body2" fontWeight={700} color="success.main">
                      {Math.round(sentNewsletters.reduce((a, b) => a + b.openRate, 0) / sentNewsletters.length)}%
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">平均点击率</Typography>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {Math.round(sentNewsletters.reduce((a, b) => a + b.clickRate, 0) / sentNewsletters.length)}%
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">最新一期</Typography>
                    <Typography variant="body2">{sentNewsletters[0].sentDate}</Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Compose dialog */}
      <Dialog open={composeOpen} onClose={() => setComposeOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>撰写社区通讯</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="主题"
              fullWidth
              size="small"
              value={draftSubject}
              onChange={(e) => setDraftSubject(e.target.value)}
              placeholder="串门周报 #13 — ..."
            />
            <TextField
              label="收件人"
              fullWidth
              size="small"
              defaultValue="全部成员（28 人）"
              select
            >
              {subscriberGroups.map((g) => (
                <option key={g.label} value={g.label}>{g.label}（{g.count} 人）</option>
              ))}
            </TextField>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>正文</Typography>
              <Suspense fallback={<div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>加载编辑器...</div>}>
                <RichTextEditorLazy content={draftBody} onChange={setDraftBody} placeholder="亲爱的串门成员：..." />
              </Suspense>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComposeOpen(false)}>取消</Button>
          <Button variant="outlined">保存草稿</Button>
          <Button variant="contained" startIcon={<SendRoundedIcon />} onClick={() => setComposeOpen(false)}>
            发送
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewNl} onClose={() => setPreviewNl(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{previewNl?.subject}</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <Chip label={`${previewNl?.recipients} 收件人`} size="small" />
              <Chip label={`打开 ${previewNl?.openRate}%`} size="small" color="success" variant="outlined" />
              <Chip label={`点击 ${previewNl?.clickRate}%`} size="small" color="primary" variant="outlined" />
            </Stack>
            <Divider />
            {previewNl?.body && <RichTextViewer html={previewNl.body} />}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewNl(null)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
