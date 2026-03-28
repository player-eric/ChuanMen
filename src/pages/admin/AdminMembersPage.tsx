import { useCallback, useEffect, useState } from 'react';
import { firstNonEmoji } from '@/components/Atoms';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import ConfirmDialog from '@/components/ConfirmDialog';
import { fetchUsersAdmin, adminUpdateUser, adminApproveUser, adminRejectUser, adminAnnounceUser } from '@/lib/domainApi';

/* ── PRD 11.1.1 ── Operational identities  ── */
const OP_IDENTITIES = [
  { key: 'design', label: '🎨 设计总管' },
  { key: 'social', label: '📱 社媒小助手' },
  { key: 'photo', label: '📷 活动摄影师' },
  { key: 'writer', label: '✍️ 内容主笔' },
  { key: 'tech', label: '🔧 技术支持' },
] as const;

const roleColors: Record<string, 'error' | 'primary' | 'success' | 'default'> = {
  admin: 'error',
  host: 'primary',
  member: 'default',
};

const roleName: Record<string, string> = {
  admin: '管理员',
  host: 'Host',
  member: '成员',
};

interface MemberRow {
  id: string;
  name: string;
  email: string;
  role: string;
  userStatus: string;
  city: string;
  state: string;
  zipCode: string;
  bio: string;
  selfAsFriend: string;
  idealFriend: string;
  participationPlan: string;
  referralSource: string;
  wechatId: string;
  createdAt: string;
  opRoles: string[];
  hostCount: number;
  eventCount: number;
  announcedAt: string;
  announcedEndAt: string;
  hostCandidate: boolean;
  lastActiveAt: string | null;
}

function mapUser(u: any): MemberRow {
  return {
    id: u.id,
    name: u.name ?? '',
    email: u.email ?? '',
    role: u.role ?? 'member',
    userStatus: u.userStatus ?? 'applicant',
    city: u.city ?? '',
    state: u.state ?? '',
    zipCode: u.zipCode ?? '',
    bio: u.bio ?? '',
    selfAsFriend: u.selfAsFriend ?? '',
    idealFriend: u.idealFriend ?? '',
    participationPlan: u.participationPlan ?? '',
    referralSource: u.referralSource ?? '',
    wechatId: u.wechatId ?? '',
    createdAt: u.createdAt ?? '',
    opRoles: (u.operatorRoles ?? []).map((r: any) => r.value ?? r.role ?? r),
    hostCount: u._count?.hostedEvents ?? u.hostCount ?? 0,
    eventCount: u._count?.eventSignups ?? u.participationCount ?? 0,
    announcedAt: u.announcedAt ?? '',
    announcedEndAt: u.announcedEndAt ?? '',
    hostCandidate: u.hostCandidate ?? false,
    lastActiveAt: u.lastActiveAt ?? null,
  };
}

function formatLastActive(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}小时前`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return '昨天';
  if (diffDays < 30) return `${diffDays}天前`;
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function AdminMembersPage() {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<MemberRow[]>([]);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('member');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editZipCode, setEditZipCode] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editHostCandidate, setEditHostCandidate] = useState(false);

  // Applicant detail dialog
  const [applicantDialog, setApplicantDialog] = useState<MemberRow | null>(null);

  // Confirmation states
  const [confirmDeny, setConfirmDeny] = useState<MemberRow | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<MemberRow | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<MemberRow | null>(null);
  const [confirmAnnounce, setConfirmAnnounce] = useState<MemberRow | null>(null);
  const [confirmSaveEdit, setConfirmSaveEdit] = useState(false);
  const [confirmAdmin, setConfirmAdmin] = useState<MemberRow | null>(null);

  // Operation in-progress flag
  const [busy, setBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const data = await fetchUsersAdmin();
      setAllUsers((data as any[]).map(mapUser));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Derived lists
  const members = allUsers.filter((m) => m.userStatus === 'approved' || m.userStatus === 'banned');
  const pendingApplicants = allUsers.filter((m) => m.userStatus === 'applicant');
  const announcedUsers = allUsers.filter((m) => m.userStatus === 'announced');

  const filtered = members.filter((m) => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== 'all' && m.role !== roleFilter) return false;
    return true;
  });

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'desc') setSortDir('asc');
      else { setSortKey(null); setSortDir('desc'); }
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case 'name': cmp = a.name.localeCompare(b.name, 'zh'); break;
          case 'role': cmp = a.role.localeCompare(b.role); break;
          case 'host': cmp = a.hostCount - b.hostCount; break;
          case 'event': cmp = a.eventCount - b.eventCount; break;
          case 'active': {
            const ta = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
            const tb = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
            cmp = ta - tb;
            break;
          }
        }
        return sortDir === 'desc' ? -cmp : cmp;
      })
    : filtered;

  // ── Helpers ──
  const updateUserLocal = (id: string, patch: Partial<MemberRow>) => {
    setAllUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const removeUserLocal = (id: string) => {
    setAllUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const openEdit = (m: MemberRow) => {
    setSelectedMember(m);
    setEditName(m.name);
    setEditEmail(m.email);
    setEditRole(m.role);
    setEditCity(m.city);
    setEditState(m.state);
    setEditZipCode(m.zipCode);
    setEditBio(m.bio);
    setEditHostCandidate(m.hostCandidate);
    setEditOpen(true);
  };

  // ── API actions ──
  const handleAnnounce = async (m: MemberRow) => {
    setBusy(true);
    try {
      const res = await adminAnnounceUser(m.id);
      updateUserLocal(m.id, {
        userStatus: 'announced',
        announcedAt: new Date().toISOString(),
        announcedEndAt: res.publicityEndsAt,
      });
    } catch { /* ignore */ }
    setBusy(false);
    setConfirmAnnounce(null);
    setApplicantDialog(null);
  };

  const handleApprove = async (m: MemberRow) => {
    setBusy(true);
    try {
      await adminApproveUser(m.id);
      updateUserLocal(m.id, { userStatus: 'approved' });
    } catch { /* ignore */ }
    setBusy(false);
    setConfirmApprove(null);
    setApplicantDialog(null);
  };

  const handleDeny = async (m: MemberRow) => {
    setBusy(true);
    try {
      await adminRejectUser(m.id);
      updateUserLocal(m.id, { userStatus: 'rejected' });
    } catch { /* ignore */ }
    setBusy(false);
    setConfirmDeny(null);
    setApplicantDialog(null);
  };

  const handleToggleStatus = async (m: MemberRow) => {
    const newStatus = m.userStatus === 'approved' ? 'banned' : 'approved';
    setBusy(true);
    try {
      await adminUpdateUser(m.id, { userStatus: newStatus });
      updateUserLocal(m.id, { userStatus: newStatus });
    } catch { /* ignore */ }
    setBusy(false);
    setConfirmToggle(null);
  };

  const handleToggleAdmin = async (m: MemberRow) => {
    const newRole = m.role === 'admin' ? 'member' : 'admin';
    setBusy(true);
    try {
      await adminUpdateUser(m.id, { role: newRole });
      updateUserLocal(m.id, { role: newRole });
    } catch { /* ignore */ }
    setBusy(false);
    setConfirmAdmin(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedMember) return;
    setBusy(true);
    try {
      await adminUpdateUser(selectedMember.id, {
        name: editName,
        email: editEmail,
        role: editRole,
        city: editCity,
        state: editState,
        zipCode: editZipCode,
        bio: editBio,
        hostCandidate: editHostCandidate,
      });
      updateUserLocal(selectedMember.id, {
        name: editName,
        email: editEmail,
        role: editRole,
        city: editCity,
        state: editState,
        zipCode: editZipCode,
        bio: editBio,
        hostCandidate: editHostCandidate,
      });
    } catch { /* ignore */ }
    setBusy(false);
    setConfirmSaveEdit(false);
    setEditOpen(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label={`成员列表 (${members.length})`} />
        <Tab label={`待审核 (${pendingApplicants.length})`} />
        <Tab label={`介绍中 (${announcedUsers.length})`} />
      </Tabs>

      {tab === 0 && (
        <>
          <Stack direction="row" spacing={2}>
            <TextField
              size="small" placeholder="搜索成员..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small" select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="all">全部角色</MenuItem>
              <MenuItem value="admin">管理员</MenuItem>
              <MenuItem value="host">Host</MenuItem>
              <MenuItem value="member">成员</MenuItem>
            </TextField>
          </Stack>

          <Card>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {/* Header */}
              <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr 1fr 1fr 100px', gap: 1, px: 2, py: 1.5, bgcolor: 'action.hover' }}>
                {([['name', '成员'], [null, '邮箱'], ['role', '角色'], [null, '运营身份'], [null, '状态'], ['host', 'Host'], ['event', '活动'], ['active', '最近活跃']] as const).map(([key, label]) => (
                  <Stack
                    key={label}
                    direction="row" spacing={0.25} alignItems="center"
                    sx={key ? { cursor: 'pointer', userSelect: 'none' } : undefined}
                    onClick={key ? () => toggleSort(key) : undefined}
                  >
                    <Typography variant="caption" fontWeight={700}>{label}</Typography>
                    {key && sortKey === key && sortDir === 'desc' && <ArrowDownwardRoundedIcon sx={{ fontSize: 14 }} />}
                    {key && sortKey === key && sortDir === 'asc' && <ArrowUpwardRoundedIcon sx={{ fontSize: 14 }} />}
                  </Stack>
                ))}
                <Typography variant="caption" fontWeight={700}>操作</Typography>
              </Box>
              <Divider />

              {sorted.length === 0 && (
                <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">暂无成员</Typography>
                </Box>
              )}

              {sorted.map((m, i) => (
                <Box key={m.id}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', md: '2fr 2fr 1fr 1fr 1fr 1fr 1fr 1fr 100px' }, gap: 1, px: 2, py: 1.5, alignItems: 'center' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ width: 32, height: 32 }}>{firstNonEmoji(m.name)}</Avatar>
                      <Box>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Typography variant="body2" fontWeight={600}>{m.name}</Typography>
                          {m.userStatus === 'banned' && (
                            <WarningAmberRoundedIcon sx={{ fontSize: 14, color: 'warning.main' }} titleAccess="已停用" />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: { md: 'none' } }}>{m.email}</Typography>
                      </Box>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>{m.email}</Typography>
                    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                      <Chip label={roleName[m.role] ?? m.role} size="small" color={roleColors[m.role] ?? 'default'} variant="outlined" />
                    </Box>
                    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                      {m.opRoles.length > 0 ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {m.opRoles.map((r) => (
                            <Chip key={r} label={OP_IDENTITIES.find((o) => o.key === r)?.label ?? r} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </Box>
                    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                      <Chip
                        label={m.userStatus === 'approved' ? '活跃' : '停用'}
                        size="small"
                        color={m.userStatus === 'approved' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{m.hostCount}</Typography>
                    <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{m.eventCount}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>{formatLastActive(m.lastActiveAt)}</Typography>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => openEdit(m)}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color={m.userStatus === 'approved' ? 'warning' : 'success'} onClick={() => setConfirmToggle(m)}>
                        {m.userStatus === 'approved' ? <BlockRoundedIcon fontSize="small" /> : <CheckCircleRoundedIcon fontSize="small" />}
                      </IconButton>
                      <IconButton size="small" color={m.role === 'admin' ? 'error' : 'primary'}
                        title={m.role === 'admin' ? '撤销管理员' : '授权管理员'}
                        onClick={() => setConfirmAdmin(m)}>
                        <AdminPanelSettingsRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                  {i < sorted.length - 1 && <Divider />}
                </Box>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {tab === 1 && (
        <Grid container spacing={2}>
          {pendingApplicants.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Card><CardContent><Typography color="text.secondary" textAlign="center">暂无待审核申请</Typography></CardContent></Card>
            </Grid>
          )}
          {pendingApplicants.map((a) => {
            const daysPending = a.createdAt ? Math.floor((Date.now() - new Date(a.createdAt).getTime()) / 86400000) : 0;
            return (
            <Grid key={a.id} size={{ xs: 12, md: 6 }}>
              <Card sx={daysPending >= 7 ? { border: '2px solid', borderColor: 'warning.main' } : undefined}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 36, height: 36 }}>{firstNonEmoji(a.name)}</Avatar>
                        <Box>
                          <Typography fontWeight={700}>{a.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{a.email}</Typography>
                        </Box>
                      </Stack>
                      <Chip label={daysPending >= 7 ? `待审核 · ${daysPending}天` : '待审核'} size="small" color="warning" variant="outlined" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">{a.bio || '未填写自我介绍'}</Typography>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      {(a.city || a.state) && <Typography variant="caption">📍 {[a.city, a.state].filter(Boolean).join(', ')}</Typography>}
                      {a.referralSource && <Typography variant="caption">🤝 来源：{a.referralSource}</Typography>}
                      <Typography variant="caption" color={daysPending >= 7 ? 'warning.main' : undefined}>📅 {new Date(a.createdAt).toLocaleDateString('zh-CN')}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="contained" color="primary" disabled={busy} onClick={() => setConfirmAnnounce(a)}>
                        发起介绍
                      </Button>
                      <Button size="small" variant="outlined" color="success" disabled={busy} onClick={() => setConfirmApprove(a)}>
                        直接通过
                      </Button>
                      <Button size="small" variant="outlined" color="error" disabled={busy} onClick={() => setConfirmDeny(a)}>
                        拒绝
                      </Button>
                      <Button size="small" variant="text" onClick={() => setApplicantDialog(a)}>
                        详情
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            );
          })}
        </Grid>
      )}

      {tab === 2 && (
        <Grid container spacing={2}>
          {announcedUsers.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Card><CardContent><Typography color="text.secondary" textAlign="center">暂无介绍中的申请人</Typography></CardContent></Card>
            </Grid>
          )}
          {announcedUsers.map((a) => {
            const endDate = a.announcedEndAt ? new Date(a.announcedEndAt) : null;
            const now = new Date();
            const isExpired = endDate && endDate <= now;
            const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000)) : 0;
            return (
              <Grid key={a.id} size={{ xs: 12, md: 6 }}>
                <Card sx={isExpired ? { border: '2px solid', borderColor: 'success.main' } : undefined}>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 36, height: 36 }}>{firstNonEmoji(a.name)}</Avatar>
                          <Box>
                            <Typography fontWeight={700}>{a.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{a.email}</Typography>
                          </Box>
                        </Stack>
                        <Chip
                          label={isExpired ? '已到期，即将自动通过' : `介绍中 · 还剩 ${daysLeft} 天`}
                          size="small"
                          color={isExpired ? 'success' : 'info'}
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">{a.bio || '未填写自我介绍'}</Typography>
                      <Stack direction="row" spacing={2} flexWrap="wrap">
                        {(a.city || a.state) && <Typography variant="caption">📍 {[a.city, a.state].filter(Boolean).join(', ')}</Typography>}
                        {a.announcedAt && <Typography variant="caption">📅 介绍开始：{new Date(a.announcedAt).toLocaleDateString('zh-CN')}</Typography>}
                        {endDate && <Typography variant="caption">⏰ 到期：{endDate.toLocaleDateString('zh-CN')}</Typography>}
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="contained" color="success" disabled={busy} onClick={() => setConfirmApprove(a)}>
                          提前通过
                        </Button>
                        <Button size="small" variant="outlined" color="error" disabled={busy} onClick={() => setConfirmDeny(a)}>
                          拒绝
                        </Button>
                        <Button size="small" variant="text" onClick={() => setApplicantDialog(a)}>
                          详情
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Edit member dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑成员 — {selectedMember?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="姓名" value={editName} onChange={(e) => setEditName(e.target.value)} fullWidth size="small" />
            <TextField label="邮箱" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} fullWidth size="small" />
            <TextField label="角色" value={editRole} onChange={(e) => setEditRole(e.target.value)} select fullWidth size="small">
              <MenuItem value="admin">管理员</MenuItem>
              <MenuItem value="host">Host</MenuItem>
              <MenuItem value="member">成员</MenuItem>
            </TextField>
            <Stack direction="row" spacing={1}>
              <TextField label="城市" value={editCity} onChange={(e) => setEditCity(e.target.value)} size="small" sx={{ flex: 2 }} />
              <TextField label="州/省" value={editState} onChange={(e) => setEditState(e.target.value)} size="small" sx={{ flex: 1 }} />
              <TextField label="邮编" value={editZipCode} onChange={(e) => setEditZipCode(e.target.value)} size="small" sx={{ flex: 1 }} />
            </Stack>
            <TextField label="简介" value={editBio} onChange={(e) => setEditBio(e.target.value)} fullWidth size="small" multiline minRows={2} maxRows={6} />
            <FormControlLabel
              control={<Switch checked={editHostCandidate} onChange={(e) => setEditHostCandidate(e.target.checked)} />}
              label="轮值 Host 候选池"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>取消</Button>
          <Button variant="contained" disabled={busy} onClick={() => setConfirmSaveEdit(true)}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* Applicant detail dialog */}
      <Dialog open={!!applicantDialog} onClose={() => setApplicantDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>申请详情 — {applicantDialog?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2"><strong>邮箱：</strong>{applicantDialog?.email}</Typography>
            <Typography variant="body2"><strong>位置：</strong>{[applicantDialog?.city, applicantDialog?.state].filter(Boolean).join(', ') || '未填写'}</Typography>
            {applicantDialog?.wechatId && <Typography variant="body2"><strong>微信：</strong>{applicantDialog.wechatId}</Typography>}
            {applicantDialog?.referralSource && <Typography variant="body2"><strong>来源：</strong>{applicantDialog.referralSource}</Typography>}
            <Typography variant="body2"><strong>申请日期：</strong>{applicantDialog?.createdAt ? new Date(applicantDialog.createdAt).toLocaleDateString('zh-CN') : ''}</Typography>
            <Divider />
            <Typography variant="body2"><strong>自我介绍：</strong></Typography>
            <Typography variant="body2" color="text.secondary">{applicantDialog?.bio || '未填写'}</Typography>
            {applicantDialog?.selfAsFriend && (
              <>
                <Typography variant="body2"><strong>作为朋友：</strong></Typography>
                <Typography variant="body2" color="text.secondary">{applicantDialog.selfAsFriend}</Typography>
              </>
            )}
            {applicantDialog?.idealFriend && (
              <>
                <Typography variant="body2"><strong>理想朋友：</strong></Typography>
                <Typography variant="body2" color="text.secondary">{applicantDialog.idealFriend}</Typography>
              </>
            )}
            {applicantDialog?.participationPlan && (
              <>
                <Typography variant="body2"><strong>参与计划：</strong></Typography>
                <Typography variant="body2" color="text.secondary">{applicantDialog.participationPlan}</Typography>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="error" disabled={busy} onClick={() => { setConfirmDeny(applicantDialog); setApplicantDialog(null); }}>拒绝</Button>
          <Button variant="outlined" color="success" disabled={busy} onClick={() => { setConfirmApprove(applicantDialog); setApplicantDialog(null); }}>直接通过</Button>
          <Button variant="contained" color="primary" disabled={busy} onClick={() => { setConfirmAnnounce(applicantDialog); setApplicantDialog(null); }}>发起介绍</Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm: deny applicant ── */}
      <ConfirmDialog
        open={!!confirmDeny}
        title="确认拒绝申请"
        message={`确定要拒绝「${confirmDeny?.name ?? ''}」的入社申请吗？该申请者将收到拒绝通知邮件，30 天后可重新申请。`}
        confirmLabel="拒绝"
        confirmColor="error"
        onConfirm={() => confirmDeny && handleDeny(confirmDeny)}
        onCancel={() => setConfirmDeny(null)}
      />

      {/* ── Confirm: approve applicant ── */}
      <ConfirmDialog
        open={!!confirmApprove}
        title="确认批准申请"
        message={`确定要批准「${confirmApprove?.name ?? ''}」的入社申请吗？`}
        confirmLabel="批准"
        confirmColor="success"
        onConfirm={() => confirmApprove && handleApprove(confirmApprove)}
        onCancel={() => setConfirmApprove(null)}
      />

      {/* ── Confirm: announce applicant (start introduction) ── */}
      <ConfirmDialog
        open={!!confirmAnnounce}
        title="发起介绍"
        message={`确定要将「${confirmAnnounce?.name ?? ''}」推送到 Feed 进行为期 3 天的介绍吗？介绍期满后将自动通过。`}
        confirmLabel="发起介绍"
        confirmColor="primary"
        onConfirm={() => confirmAnnounce && handleAnnounce(confirmAnnounce)}
        onCancel={() => setConfirmAnnounce(null)}
      />

      {/* ── Confirm: suspend / activate member ── */}
      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.userStatus === 'approved' ? '确认停用成员' : '确认激活成员'}
        message={confirmToggle?.userStatus === 'approved'
          ? `确定要将「${confirmToggle?.name ?? ''}」设为停用状态吗？该成员将暂时无法参加活动。`
          : `确定要重新激活「${confirmToggle?.name ?? ''}」吗？`}
        confirmLabel={confirmToggle?.userStatus === 'approved' ? '停用' : '激活'}
        confirmColor={confirmToggle?.userStatus === 'approved' ? 'warning' : 'success'}
        onConfirm={() => confirmToggle && handleToggleStatus(confirmToggle)}
        onCancel={() => setConfirmToggle(null)}
      />

      {/* ── Confirm: save member edit ── */}
      <ConfirmDialog
        open={confirmSaveEdit}
        title="确认保存修改"
        message={`确定要保存对「${selectedMember?.name ?? ''}」的修改吗？`}
        confirmLabel="保存"
        confirmColor="primary"
        onConfirm={handleSaveEdit}
        onCancel={() => setConfirmSaveEdit(false)}
      />

      {/* ── Confirm: grant/revoke admin ── */}
      <ConfirmDialog
        open={!!confirmAdmin}
        title={confirmAdmin?.role === 'admin' ? '撤销管理员权限' : '授权管理员'}
        message={confirmAdmin?.role === 'admin'
          ? `确定要撤销「${confirmAdmin?.name ?? ''}」的管理员权限吗？`
          : `确定要将「${confirmAdmin?.name ?? ''}」设为管理员吗？该成员将获得后台所有管理权限。`}
        confirmLabel={confirmAdmin?.role === 'admin' ? '撤销' : '授权'}
        confirmColor={confirmAdmin?.role === 'admin' ? 'error' : 'primary'}
        onConfirm={() => confirmAdmin && handleToggleAdmin(confirmAdmin)}
        onCancel={() => setConfirmAdmin(null)}
      />
    </Stack>
  );
}
