import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Autocomplete,
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
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import { RichTextViewer } from '@/components/RichTextEditor';
import {
  fetchMembersApi,
  fetchNewsletters,
  fetchNewsletterStats,
  createNewsletter,
  updateNewsletter,
  sendNewsletter,
  deleteNewsletter,
  type NewsletterRow,
  type SubscriberGroup,
} from '@/lib/domainApi';
import { useAuth } from '@/auth/AuthContext';
import { firstNonEmoji } from '@/components/Atoms';
const RichTextEditorLazy = lazy(() => import('@/components/RichTextEditor'));

export default function AdminNewslettersPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [previewNl, setPreviewNl] = useState<NewsletterRow | null>(null);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // API data
  const [sentNewsletters, setSentNewsletters] = useState<NewsletterRow[]>([]);
  const [draftNewsletters, setDraftNewsletters] = useState<NewsletterRow[]>([]);
  const [subscriberGroups, setSubscriberGroups] = useState<SubscriberGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [all, stats] = await Promise.all([fetchNewsletters(), fetchNewsletterStats()]);
      setSentNewsletters(all.filter((n) => n.status === 'sent'));
      setDraftNewsletters(all.filter((n) => n.status === 'draft'));
      setSubscriberGroups(stats);
    } catch (e) {
      console.error('Failed to load newsletters:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  /* ── Recipient mode: 'group' or 'individual' ── */
  const [recipientMode, setRecipientMode] = useState<'group' | 'individual'>('group');
  const [selectedGroup, setSelectedGroup] = useState('全部成员');
  const [selectedMembers, setSelectedMembers] = useState<{ id: string; name: string; email?: string }[]>([]);

  /* ── Load members when compose opens ── */
  const [allMembers, setAllMembers] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    if (composeOpen && allMembers.length === 0 && !membersLoading) {
      setMembersLoading(true);
      fetchMembersApi()
        .then((list) => {
          const mapped = (list ?? []).map((m: any) => ({
            id: m.id,
            name: m.name ?? m.nickname ?? '',
            email: m.email ?? '',
          }));
          setAllMembers(mapped);
        })
        .catch(() => {})
        .finally(() => setMembersLoading(false));
    }
  }, [composeOpen]);

  const recipientSummary = useMemo(() => {
    if (recipientMode === 'group') {
      const g = subscriberGroups.find((g) => g.label === selectedGroup);
      return g ? `${g.label}（${g.count} 人）` : selectedGroup;
    }
    return selectedMembers.length > 0
      ? `已选 ${selectedMembers.length} 人：${selectedMembers.map((m) => m.name).join('、')}`
      : '未选择成员';
  }, [recipientMode, selectedGroup, selectedMembers]);
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`已发送 (${sentNewsletters.length})`} />
          <Tab label={`草稿 (${draftNewsletters.length})`} />
          <Tab label="订阅管理" />
        </Tabs>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setComposeOpen(true); setEditingId(null); setDraftSubject(''); setDraftBody(''); setRecipientMode('group'); setSelectedGroup('全部成员'); setSelectedMembers([]); }}>
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
                      {nl.sentAt?.slice(0, 10)} · {nl.recipientCount} 收件人
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={`打开 ${nl.openRate}%`} size="small" color="success" variant="outlined" />
                    <Chip label={`点击 ${nl.clickRate}%`} size="small" color="primary" variant="outlined" />
                    <IconButton size="small" onClick={() => setPreviewNl(nl)}>
                      <VisibilityRoundedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => { setEditingId(null); setDraftSubject(nl.subject + '（副本）'); setDraftBody(nl.body); setRecipientMode('group'); setSelectedGroup(nl.recipientGroup); setComposeOpen(true); }}>
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
                    <Typography variant="caption" color="text.secondary">最后编辑：{d.updatedAt?.slice(0, 10)}</Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => { setEditingId(d.id); setDraftSubject(d.subject); setDraftBody(d.body); setRecipientMode(d.recipientIds.length > 0 ? 'individual' : 'group'); setSelectedGroup(d.recipientGroup); setComposeOpen(true); }}>
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={async () => { await deleteNewsletter(d.id); loadData(); }}>
                      <DeleteRoundedIcon fontSize="small" />
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
                      {sentNewsletters.length > 0 ? Math.round(sentNewsletters.reduce((a, b) => a + b.openRate, 0) / sentNewsletters.length) : 0}%
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">平均点击率</Typography>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {sentNewsletters.length > 0 ? Math.round(sentNewsletters.reduce((a, b) => a + b.clickRate, 0) / sentNewsletters.length) : 0}%
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">最新一期</Typography>
                    <Typography variant="body2">{sentNewsletters.length > 0 ? sentNewsletters[0].sentAt?.slice(0, 10) : '—'}</Typography>
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

            {/* Recipient mode toggle */}
            <Box>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Chip
                  icon={<GroupRoundedIcon />}
                  label="按分组"
                  variant={recipientMode === 'group' ? 'filled' : 'outlined'}
                  color={recipientMode === 'group' ? 'primary' : 'default'}
                  onClick={() => setRecipientMode('group')}
                />
                <Chip
                  icon={<PersonAddRoundedIcon />}
                  label="选成员"
                  variant={recipientMode === 'individual' ? 'filled' : 'outlined'}
                  color={recipientMode === 'individual' ? 'primary' : 'default'}
                  onClick={() => setRecipientMode('individual')}
                />
                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 1 }}>
                  {recipientSummary}
                </Typography>
              </Stack>

              {recipientMode === 'group' ? (
                <TextField
                  label="收件分组"
                  fullWidth
                  size="small"
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  select
                  SelectProps={{ native: true }}
                >
                  {subscriberGroups.map((g) => (
                    <option key={g.label} value={g.label}>{g.label}（{g.count} 人）</option>
                  ))}
                </TextField>
              ) : (
                <Autocomplete
                  multiple
                  options={allMembers}
                  value={selectedMembers}
                  onChange={(_, newVal) => setSelectedMembers(newVal)}
                  getOptionLabel={(opt) => opt.name}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  loading={membersLoading}
                  loadingText="加载中..."
                  noOptionsText="无匹配成员"
                  filterOptions={(options, { inputValue }) => {
                    const q = inputValue.toLowerCase();
                    return options.filter(
                      (o) => o.name.toLowerCase().includes(q) || (o.email ?? '').toLowerCase().includes(q),
                    );
                  }}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 26, height: 26, fontSize: 12 }}>{firstNonEmoji(option.name)}</Avatar>
                        <Box>
                          <Typography variant="body2">{option.name}</Typography>
                          {option.email && (
                            <Typography variant="caption" color="text.secondary">{option.email}</Typography>
                          )}
                        </Box>
                      </Stack>
                    </li>
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((m, i) => (
                      <Chip
                        {...getTagProps({ index: i })}
                        key={m.id}
                        avatar={<Avatar sx={{ width: 22, height: 22, fontSize: 10 }}>{firstNonEmoji(m.name)}</Avatar>}
                        label={m.name}
                        size="small"
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="搜索并选择成员"
                      size="small"
                      placeholder="输入姓名或邮箱搜索..."
                    />
                  )}
                />
              )}
            </Box>

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
          <Button variant="outlined" onClick={async () => {
            if (!user?.id || !draftSubject.trim()) return;
            try {
              const ids = recipientMode === 'individual' ? selectedMembers.map((m) => m.id) : [];
              if (editingId) {
                await updateNewsletter(editingId, { subject: draftSubject, body: draftBody, recipientGroup: selectedGroup, recipientIds: ids });
              } else {
                await createNewsletter({ subject: draftSubject, body: draftBody, authorId: user.id, recipientGroup: selectedGroup, recipientIds: ids });
              }
              setComposeOpen(false);
              loadData();
            } catch (e) { console.error(e); }
          }}>保存草稿</Button>
          <Button variant="contained" startIcon={<SendRoundedIcon />} onClick={async () => {
            if (!user?.id || !draftSubject.trim()) return;
            try {
              const ids = recipientMode === 'individual' ? selectedMembers.map((m) => m.id) : [];
              let nlId = editingId;
              if (nlId) {
                await updateNewsletter(nlId, { subject: draftSubject, body: draftBody, recipientGroup: selectedGroup, recipientIds: ids });
              } else {
                const created = await createNewsletter({ subject: draftSubject, body: draftBody, authorId: user.id, recipientGroup: selectedGroup, recipientIds: ids });
                nlId = created.id;
              }
              await sendNewsletter(nlId!);
              setComposeOpen(false);
              loadData();
            } catch (e) { console.error(e); }
          }}>
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
              <Chip label={`${previewNl?.recipientCount} 收件人`} size="small" />
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
