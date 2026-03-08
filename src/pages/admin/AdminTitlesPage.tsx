import { useEffect, useState } from 'react';
import { firstNonEmoji } from '@/components/Atoms';
import {
  Autocomplete,
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
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  fetchTitleRules,
  createTitleRule,
  updateTitleRule,
  deleteTitleRule,
  fetchTitleHoldersCount,
  fetchMembersWithTitles,
  grantUserTitle,
  revokeUserTitle,
  fetchSiteConfig,
  updateSiteConfig,
  type TitleRuleRow,
} from '@/lib/domainApi';
import { DEFAULT_HOST_BADGE_TIERS, type HostBadgeTier } from '@/lib/mappings';

/* ── PRD 11.1.6 ── 称号管理 ── */

const allStamps = ['🎬', '🍳', '🔥', '🧊', '📸', '☕', '🏸', '❤️', '🧁', '🥾', '⚡', '🎉', '🏠', '💬', '🎸', '🧹'];

type MemberWithTitles = { id: string; name: string; avatar: string; socialTitles: { id: string; value: string }[] };

export default function AdminTitlesPage() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  /* ── Tab 0: Title list state ── */
  const [titles, setTitles] = useState<TitleRuleRow[]>([]);
  const [holdersMap, setHoldersMap] = useState<Record<string, number>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TitleRuleRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TitleRuleRow | null>(null);

  // form fields shared by create & edit
  const [formEmoji, setFormEmoji] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStamp, setFormStamp] = useState('');
  const [formThreshold, setFormThreshold] = useState(3);

  /* ── Tab 1: Grant management state ── */
  const [members, setMembers] = useState<MemberWithTitles[]>([]);
  const [searchName, setSearchName] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberWithTitles | null>(null);
  const [grantTitleValue, setGrantTitleValue] = useState<string | null>(null);

  /* ── Tab 2: Host badge tiers state ── */
  const [badgeTiers, setBadgeTiers] = useState<HostBadgeTier[]>([]);
  const [editBadgeIdx, setEditBadgeIdx] = useState<number | null>(null);
  const [badgeForm, setBadgeForm] = useState<HostBadgeTier>({ min: 1, emoji: '', label: '' });
  const [addBadgeOpen, setAddBadgeOpen] = useState(false);
  const [badgeSaving, setBadgeSaving] = useState(false);

  const filteredMembers = searchName
    ? members.filter(m => m.name.toLowerCase().includes(searchName.toLowerCase()))
    : members;

  const loadData = async () => {
    setLoading(true);
    try {
      const [t, hc, m, bt] = await Promise.all([
        fetchTitleRules(),
        fetchTitleHoldersCount().catch(() => ({} as Record<string, number>)),
        fetchMembersWithTitles().catch(() => [] as MemberWithTitles[]),
        fetchSiteConfig<HostBadgeTier[]>('hostBadgeTiers').catch(() => null),
      ]);
      setTitles(t); setHoldersMap(hc); setMembers(m);
      setBadgeTiers(bt ?? DEFAULT_HOST_BADGE_TIERS);
    } catch (e) { console.error('Failed to load titles', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  /* ── Helpers ── */
  const openCreate = () => {
    setFormEmoji(''); setFormName(''); setFormDesc(''); setFormStamp(''); setFormThreshold(3);
    setCreateOpen(true);
  };

  const openEdit = (t: TitleRuleRow) => {
    setFormEmoji(t.emoji); setFormName(t.name); setFormDesc(t.description);
    setFormStamp(t.stampEmoji); setFormThreshold(t.threshold);
    setEditTarget(t);
  };

  const handleSaveCreate = async () => {
    if (!formEmoji || !formName) return;
    try {
      await createTitleRule({ emoji: formEmoji, name: formName, description: formDesc || `累积获得 ${formThreshold} 次 ${formStamp || formEmoji} 邮票`, stampEmoji: formStamp || formEmoji, threshold: formThreshold });
      setCreateOpen(false); loadData();
    } catch (e) { console.error(e); }
  };

  const handleSaveEdit = async () => {
    if (!editTarget || !formEmoji || !formName) return;
    try {
      await updateTitleRule(editTarget.id, { emoji: formEmoji, name: formName, description: formDesc, stampEmoji: formStamp || formEmoji, threshold: formThreshold });
      setEditTarget(null); loadData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try { await deleteTitleRule(confirmDelete.id); setConfirmDelete(null); loadData(); }
    catch (e) { console.error(e); }
  };

  const handleGrant = async () => {
    if (!selectedMember || !grantTitleValue) return;
    try {
      await grantUserTitle(selectedMember.id, grantTitleValue);
      setSelectedMember(null); setGrantTitleValue(null); loadData();
    } catch (e) { console.error(e); }
  };

  const handleRevoke = async (memberId: string, titleValue: string) => {
    try { await revokeUserTitle(memberId, titleValue); loadData(); }
    catch (e) { console.error(e); }
  };

  /* ── Host badge tier helpers ── */
  const saveBadgeTiers = async (tiers: HostBadgeTier[]) => {
    setBadgeSaving(true);
    try {
      const sorted = [...tiers].sort((a, b) => b.min - a.min);
      await updateSiteConfig('hostBadgeTiers', sorted);
      setBadgeTiers(sorted);
    } catch (e) { console.error(e); }
    finally { setBadgeSaving(false); }
  };

  const handleSaveBadgeEdit = () => {
    if (editBadgeIdx === null || !badgeForm.emoji || !badgeForm.label) return;
    const next = [...badgeTiers];
    next[editBadgeIdx] = { ...badgeForm };
    saveBadgeTiers(next);
    setEditBadgeIdx(null);
  };

  const handleAddBadge = () => {
    if (!badgeForm.emoji || !badgeForm.label || badgeForm.min < 1) return;
    saveBadgeTiers([...badgeTiers, { ...badgeForm }]);
    setAddBadgeOpen(false);
  };

  const handleDeleteBadge = (idx: number) => {
    saveBadgeTiers(badgeTiers.filter((_, i) => i !== idx));
  };

  /* ── Form dialog (shared for create & edit) ── */
  const formDialog = (open: boolean, title: string, onSave: () => void, onClose: () => void) => (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={2}>
            <TextField label="Emoji" value={formEmoji} onChange={e => setFormEmoji(e.target.value)} size="small" sx={{ width: 100 }} placeholder="🎬" />
            <TextField label="称号名称" value={formName} onChange={e => setFormName(e.target.value)} size="small" fullWidth placeholder="选片人" />
          </Stack>
          <TextField label="描述" value={formDesc} onChange={e => setFormDesc(e.target.value)} size="small" fullWidth multiline rows={2} placeholder="累积获得 3 次 🎬 邮票" />
          <Stack direction="row" spacing={2}>
            <TextField label="关联邮票" value={formStamp} onChange={e => setFormStamp(e.target.value)} size="small" sx={{ width: 120 }} select slotProps={{ select: { native: true } }}>
              <option value="">选择</option>
              {allStamps.map(s => <option key={s} value={s}>{s}</option>)}
            </TextField>
            <TextField label="触发次数" type="number" value={formThreshold} onChange={e => setFormThreshold(Number(e.target.value))} size="small" sx={{ width: 120 }} slotProps={{ htmlInput: { min: 1 } }} />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={onSave} disabled={!formEmoji || !formName}>保存</Button>
      </DialogActions>
    </Dialog>
  );

  if (loading) return <Typography>加载中…</Typography>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`称号列表 (${titles.length})`} />
          <Tab label="授予管理" />
          <Tab label="Host 徽章" />
        </Tabs>
        {tab === 0 && (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>新增称号</Button>
        )}
        {tab === 2 && (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setBadgeForm({ min: 1, emoji: '', label: '' }); setAddBadgeOpen(true); }}>新增徽章</Button>
        )}
      </Stack>

      {/* ═══ Tab 0: Title list ═══ */}
      {tab === 0 && (
        <Card>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '60px 2fr 3fr 80px 80px 80px 100px', gap: 1, px: 2, py: 1.5, bgcolor: 'action.hover' }}>
              <Typography variant="caption" fontWeight={700}>Emoji</Typography>
              <Typography variant="caption" fontWeight={700}>名称</Typography>
              <Typography variant="caption" fontWeight={700}>描述</Typography>
              <Typography variant="caption" fontWeight={700}>邮票</Typography>
              <Typography variant="caption" fontWeight={700}>阈值</Typography>
              <Typography variant="caption" fontWeight={700}>持有人</Typography>
              <Typography variant="caption" fontWeight={700}>操作</Typography>
            </Box>
            <Divider />
            {titles.map((t, i) => (
              <Box key={t.id}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', md: '60px 2fr 3fr 80px 80px 80px 100px' }, gap: 1, px: 2, py: 1.5, alignItems: 'center' }}>
                  <Typography fontSize={20}>{t.emoji}</Typography>
                  <Typography variant="body2" fontWeight={600}>{t.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>{t.description}</Typography>
                  <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{t.stampEmoji}</Typography>
                  <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{t.threshold} 次</Typography>
                  <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{holdersMap[t.id] ?? 0} 人</Typography>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => openEdit(t)}><EditRoundedIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => setConfirmDelete(t)}><DeleteRoundedIcon fontSize="small" /></IconButton>
                  </Stack>
                </Box>
                {i < titles.length - 1 && <Divider />}
              </Box>
            ))}
            {titles.length === 0 && <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>暂无称号</Typography>}
          </CardContent>
        </Card>
      )}

      {/* ═══ Tab 1: Grant management ═══ */}
      {tab === 1 && (
        <Stack spacing={2}>
          <TextField label="搜索成员" size="small" fullWidth value={searchName} onChange={e => setSearchName(e.target.value)} placeholder="输入成员名称..." />
          <Card>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '2fr 4fr auto', gap: 1, px: 2, py: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant="caption" fontWeight={700}>成员</Typography>
                <Typography variant="caption" fontWeight={700}>已有称号</Typography>
                <Typography variant="caption" fontWeight={700}>操作</Typography>
              </Box>
              <Divider />
              {filteredMembers.map((m, i) => (
                <Box key={m.id}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 4fr auto' }, gap: 1, px: 2, py: 1.5, alignItems: 'center' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ width: 28, height: 28, fontSize: 13 }} src={m.avatar}>{firstNonEmoji(m.name)}</Avatar>
                      <Typography variant="body2" fontWeight={600}>{m.name}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {m.socialTitles.length > 0 ? m.socialTitles.map(t => (
                        <Chip key={t.id} label={t.value} size="small" onDelete={() => handleRevoke(m.id, t.value)} />
                      )) : (
                        <Typography variant="body2" color="text.secondary">无称号</Typography>
                      )}
                    </Stack>
                    <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => { setSelectedMember(m); setGrantTitleValue(null); }}>
                      授予
                    </Button>
                  </Box>
                  {i < filteredMembers.length - 1 && <Divider />}
                </Box>
              ))}
              {filteredMembers.length === 0 && <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>暂无成员</Typography>}
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* ═══ Tab 2: Host badge tiers ═══ */}
      {tab === 2 && (
        <Card>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '80px 2fr 3fr 100px', gap: 1, px: 2, py: 1.5, bgcolor: 'action.hover' }}>
              <Typography variant="caption" fontWeight={700}>Emoji</Typography>
              <Typography variant="caption" fontWeight={700}>标签</Typography>
              <Typography variant="caption" fontWeight={700}>最低 Host 次数</Typography>
              <Typography variant="caption" fontWeight={700}>操作</Typography>
            </Box>
            <Divider />
            {badgeTiers.map((t, i) => (
              <Box key={i}>
                {editBadgeIdx === i ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '80px 2fr 3fr 100px' }, gap: 1, px: 2, py: 1, alignItems: 'center' }}>
                    <TextField size="small" value={badgeForm.emoji} onChange={e => setBadgeForm(f => ({ ...f, emoji: e.target.value }))} placeholder="👑" sx={{ width: 70 }} />
                    <TextField size="small" value={badgeForm.label} onChange={e => setBadgeForm(f => ({ ...f, label: e.target.value }))} placeholder="Host 传奇" />
                    <TextField size="small" type="number" value={badgeForm.min} onChange={e => setBadgeForm(f => ({ ...f, min: Number(e.target.value) }))} slotProps={{ htmlInput: { min: 1 } }} />
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" variant="contained" onClick={handleSaveBadgeEdit} disabled={badgeSaving}>保存</Button>
                      <Button size="small" onClick={() => setEditBadgeIdx(null)}>取消</Button>
                    </Stack>
                  </Box>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', md: '80px 2fr 3fr 100px' }, gap: 1, px: 2, py: 1.5, alignItems: 'center' }}>
                    <Typography fontSize={20}>{t.emoji}</Typography>
                    <Typography variant="body2" fontWeight={600}>{t.label}</Typography>
                    <Typography variant="body2" color="text.secondary">{t.min} 次及以上</Typography>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => { setEditBadgeIdx(i); setBadgeForm({ ...t }); }}><EditRoundedIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteBadge(i)}><DeleteRoundedIcon fontSize="small" /></IconButton>
                    </Stack>
                  </Box>
                )}
                {i < badgeTiers.length - 1 && <Divider />}
              </Box>
            ))}
            {badgeTiers.length === 0 && <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>暂无徽章配置</Typography>}
          </CardContent>
        </Card>
      )}

      {/* ── Add badge dialog ── */}
      <Dialog open={addBadgeOpen} onClose={() => setAddBadgeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>新增 Host 徽章</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="Emoji" value={badgeForm.emoji} onChange={e => setBadgeForm(f => ({ ...f, emoji: e.target.value }))} size="small" sx={{ width: 100 }} placeholder="🌟" />
              <TextField label="标签" value={badgeForm.label} onChange={e => setBadgeForm(f => ({ ...f, label: e.target.value }))} size="small" fullWidth placeholder="Host 达人" />
            </Stack>
            <TextField label="最低 Host 次数" type="number" value={badgeForm.min} onChange={e => setBadgeForm(f => ({ ...f, min: Number(e.target.value) }))} size="small" slotProps={{ htmlInput: { min: 1 } }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddBadgeOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleAddBadge} disabled={!badgeForm.emoji || !badgeForm.label || badgeForm.min < 1}>添加</Button>
        </DialogActions>
      </Dialog>

      {/* ── Create dialog ── */}
      {formDialog(createOpen, '新增称号', handleSaveCreate, () => setCreateOpen(false))}

      {/* ── Edit dialog ── */}
      {formDialog(!!editTarget, '编辑称号', handleSaveEdit, () => setEditTarget(null))}

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="确认删除称号"
        message={`确定要删除称号「${confirmDelete?.emoji ?? ''} ${confirmDelete?.name ?? ''}」吗？已持有该称号的成员不会自动失去称号，但该称号将不再出现在系统中。`}
        confirmLabel="删除"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* ── Grant dialog ── */}
      <Dialog open={!!selectedMember} onClose={() => setSelectedMember(null)} maxWidth="xs" fullWidth>
        <DialogTitle>授予称号给 {selectedMember?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              选择要授予的称号，点击确认后立即生效。
            </Typography>
            <Autocomplete
              options={titles.map(t => `${t.emoji} ${t.name}`).filter(
                label => !selectedMember?.socialTitles.some(st => st.value === label),
              )}
              value={grantTitleValue}
              onChange={(_, v) => setGrantTitleValue(v)}
              renderInput={params => <TextField {...params} label="选择称号" size="small" />}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedMember(null)}>取消</Button>
          <Button variant="contained" disabled={!grantTitleValue} onClick={handleGrant}>授予</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
