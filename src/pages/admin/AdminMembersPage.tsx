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
  InputAdornment,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import ConfirmDialog from '@/components/ConfirmDialog';

/* ── PRD 11.1.1 ── Mock data ── */

/** Operational identities per PRD */
const OP_IDENTITIES = [
  { key: 'design', label: '🎨 设计总管' },
  { key: 'social', label: '📱 社媒小助手' },
  { key: 'photo', label: '📷 活动摄影师' },
  { key: 'writer', label: '✍️ 内容主笔' },
  { key: 'tech', label: '🔧 技术支持' },
] as const;

// NOTE: `status` in mock data is static. When connected to API, compute from userStatus + lastActiveAt.
const allMembers = [
  { name: 'Yuan', email: 'cm@gmail.com', role: 'admin', status: 'active', joinDate: '2024-03', host: 6, events: 24, location: 'Edison, NJ', opRoles: ['tech'] as string[], warning: null as string | null },
  { name: '白开水', email: 'bks@example.com', role: 'host', status: 'active', joinDate: '2024-03', host: 8, events: 18, location: 'Edison, NJ', opRoles: [], warning: null },
  { name: '大橙子', email: 'dachengzi@example.com', role: 'admin', status: 'active', joinDate: '2024-04', host: 5, events: 14, location: 'Jersey City, NJ', opRoles: ['design'], warning: null },
  { name: '星星', email: 'star@example.com', role: 'member', status: 'active', joinDate: '2024-06', host: 0, events: 8, location: 'Princeton, NJ', opRoles: [], warning: '被 2 位 Host 隐藏' },
  { name: 'Tiffy', email: 'tiffy@example.com', role: 'host', status: 'active', joinDate: '2024-05', host: 3, events: 10, location: 'Edison, NJ', opRoles: ['photo'], warning: null },
  { name: '小鱼', email: 'xiaoyu@example.com', role: 'member', status: 'active', joinDate: '2024-09', host: 0, events: 5, location: 'New Brunswick, NJ', opRoles: [], warning: null },
  { name: 'Leo', email: 'leo@example.com', role: 'member', status: 'active', joinDate: '2024-08', host: 1, events: 6, location: 'Hoboken, NJ', opRoles: [], warning: null },
  { name: 'Mia', email: 'mia@example.com', role: 'member', status: 'active', joinDate: '2025-01', host: 0, events: 1, location: 'Edison, NJ', opRoles: [], warning: '被 3 位 Host 隐藏' },
  { name: '阿德', email: 'ade@example.com', role: 'member', status: 'active', joinDate: '2024-10', host: 2, events: 5, location: 'Montclair, NJ', opRoles: [], warning: null },
  { name: '奶茶', email: 'naicha@example.com', role: 'member', status: 'active', joinDate: '2024-11', host: 0, events: 3, location: 'Edison, NJ', opRoles: ['social'], warning: null },
  { name: 'Derek', email: 'derek@example.com', role: 'member', status: 'active', joinDate: '2024-12', host: 2, events: 7, location: 'Bridgewater, NJ', opRoles: ['writer'], warning: null },
  { name: '小樱', email: 'xiaoying@example.com', role: 'member', status: 'dormant', joinDate: '2024-07', host: 0, events: 2, location: 'Princeton, NJ', opRoles: [], warning: null },
];

const pendingApplicants = [
  { name: '张三', email: 'zhangsan@example.com', appliedDate: '2025-02-19', referrer: '白开水', location: 'Edison, NJ', bio: '在 Rutgers 读计算机PhD，喜欢做饭和桌游。听白开水说这个社区很温暖，想来试试。' },
  { name: 'Emily', email: 'emily@example.com', appliedDate: '2025-02-17', referrer: 'Tiffy', location: 'New Brunswick, NJ', bio: '刚从纽约搬到新泽西，在一家设计公司工作。想认识在本地的朋友。' },
  { name: '阿杰', email: 'ajie@example.com', appliedDate: '2025-02-15', referrer: '大橙子', location: 'Princeton, NJ', bio: '独立游戏开发者，喜欢电影和户外。一直想找一个真实社交的社区。' },
];

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

export default function AdminMembersPage() {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editOpen, setEditOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<(typeof allMembers)[0] | null>(null);
  const [applicantDialog, setApplicantDialog] = useState<(typeof pendingApplicants)[0] | null>(null);

  // Confirmation states
  const [confirmDeny, setConfirmDeny] = useState<(typeof pendingApplicants)[0] | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<(typeof allMembers)[0] | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<(typeof pendingApplicants)[0] | null>(null);
  const [confirmSaveEdit, setConfirmSaveEdit] = useState(false);
  const [confirmAdmin, setConfirmAdmin] = useState<(typeof allMembers)[0] | null>(null);

  const filtered = allMembers.filter((m) => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== 'all' && m.role !== roleFilter) return false;
    return true;
  });

  return (
    <Stack spacing={2}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label={`成员列表 (${allMembers.length})`} />
        <Tab label={`待审核 (${pendingApplicants.length})`} />
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
              <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr 1fr 100px', gap: 1, px: 2, py: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant="caption" fontWeight={700}>成员</Typography>
                <Typography variant="caption" fontWeight={700}>邮箱</Typography>
                <Typography variant="caption" fontWeight={700}>角色</Typography>
                <Typography variant="caption" fontWeight={700}>运营身份</Typography>
                <Typography variant="caption" fontWeight={700}>状态</Typography>
                <Typography variant="caption" fontWeight={700}>Host</Typography>
                <Typography variant="caption" fontWeight={700}>活动</Typography>
                <Typography variant="caption" fontWeight={700}>操作</Typography>
              </Box>
              <Divider />

              {filtered.map((m, i) => (
                <Box key={m.email}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', md: '2fr 2fr 1fr 1fr 1fr 1fr 1fr 100px' }, gap: 1, px: 2, py: 1.5, alignItems: 'center' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ width: 32, height: 32 }}>{m.name[0]}</Avatar>
                      <Box>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Typography variant="body2" fontWeight={600}>{m.name}</Typography>
                          {m.warning && (
                            <WarningAmberRoundedIcon sx={{ fontSize: 14, color: 'warning.main' }} titleAccess={m.warning} />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: { md: 'none' } }}>{m.email}</Typography>
                      </Box>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>{m.email}</Typography>
                    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                      <Chip label={roleName[m.role]} size="small" color={roleColors[m.role]} variant="outlined" />
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
                      <Chip label={m.status === 'active' ? '活跃' : '休眠'} size="small" color={m.status === 'active' ? 'success' : 'default'} variant="outlined" />
                    </Box>
                    <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{m.host}</Typography>
                    <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{m.events}</Typography>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => { setSelectedMember(m); setEditOpen(true); }}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color={m.status === 'active' ? 'warning' : 'success'} onClick={() => setConfirmToggle(m)}>
                        {m.status === 'active' ? <BlockRoundedIcon fontSize="small" /> : <CheckCircleRoundedIcon fontSize="small" />}
                      </IconButton>
                      <IconButton size="small" color={m.role === 'admin' ? 'error' : 'primary'}
                        title={m.role === 'admin' ? '撤销管理员' : '授权管理员'}
                        onClick={() => setConfirmAdmin(m)}>
                        <AdminPanelSettingsRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                  {i < filtered.length - 1 && <Divider />}
                </Box>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {tab === 1 && (
        <Grid container spacing={2}>
          {pendingApplicants.map((a) => (
            <Grid key={a.email} size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 36, height: 36 }}>{a.name[0]}</Avatar>
                        <Box>
                          <Typography fontWeight={700}>{a.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{a.email}</Typography>
                        </Box>
                      </Stack>
                      <Chip label="待审核" size="small" color="warning" variant="outlined" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">{a.bio}</Typography>
                    <Stack direction="row" spacing={2}>
                      <Typography variant="caption">📍 {a.location}</Typography>
                      <Typography variant="caption">🤝 推荐人：{a.referrer}</Typography>
                      <Typography variant="caption">📅 {a.appliedDate}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="contained" color="success" onClick={() => setApplicantDialog(a)}>
                        通过
                      </Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => setConfirmDeny(a)}>
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
          ))}
        </Grid>
      )}

      {/* Edit member dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑成员 — {selectedMember?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="姓名" defaultValue={selectedMember?.name} fullWidth size="small" />
            <TextField label="邮箱" defaultValue={selectedMember?.email} fullWidth size="small" />
            <TextField label="角色" defaultValue={selectedMember?.role} select fullWidth size="small">
              <MenuItem value="admin">管理员</MenuItem>
              <MenuItem value="host">Host</MenuItem>
              <MenuItem value="member">成员</MenuItem>
            </TextField>
            <TextField
              label="运营身份"
              defaultValue={selectedMember?.opRoles?.[0] ?? ''}
              select
              fullWidth
              size="small"
              helperText="接 API 后支持多选（DB 为多对多关系）"
            >
              <MenuItem value="">无</MenuItem>
              {OP_IDENTITIES.map((o) => (
                <MenuItem key={o.key} value={o.key}>{o.label}</MenuItem>
              ))}
            </TextField>
            <TextField label="位置" defaultValue={selectedMember?.location} fullWidth size="small" />
            {selectedMember?.warning && (
              <Box sx={{ p: 1.5, bgcolor: 'warning.main', borderRadius: 1, opacity: 0.15 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <WarningAmberRoundedIcon color="warning" fontSize="small" />
                  <Typography variant="body2" color="warning.dark" fontWeight={600}>
                    ⚠ 问题标记：{selectedMember.warning}
                  </Typography>
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => setConfirmSaveEdit(true)}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* Applicant detail dialog */}
      <Dialog open={!!applicantDialog} onClose={() => setApplicantDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>申请详情 — {applicantDialog?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2"><strong>邮箱：</strong>{applicantDialog?.email}</Typography>
            <Typography variant="body2"><strong>位置：</strong>{applicantDialog?.location}</Typography>
            <Typography variant="body2"><strong>推荐人：</strong>{applicantDialog?.referrer}</Typography>
            <Typography variant="body2"><strong>申请日期：</strong>{applicantDialog?.appliedDate}</Typography>
            <Divider />
            <Typography variant="body2"><strong>自我介绍：</strong></Typography>
            <Typography variant="body2" color="text.secondary">{applicantDialog?.bio}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="error" onClick={() => { setConfirmDeny(applicantDialog); }}>拒绝</Button>
          <Button variant="contained" color="success" onClick={() => { setConfirmApprove(applicantDialog); }}>批准</Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm: deny applicant ── */}
      <ConfirmDialog
        open={!!confirmDeny}
        title="确认拒绝申请"
        message={`确定要拒绝「${confirmDeny?.name ?? ''}」的入社申请吗？此操作不可撤回。`}
        confirmLabel="拒绝"
        confirmColor="error"
        onConfirm={() => { setConfirmDeny(null); setApplicantDialog(null); }}
        onCancel={() => setConfirmDeny(null)}
      />

      {/* ── Confirm: approve applicant ── */}
      <ConfirmDialog
        open={!!confirmApprove}
        title="确认批准申请"
        message={`确定要批准「${confirmApprove?.name ?? ''}」的入社申请吗？`}
        confirmLabel="批准"
        confirmColor="success"
        onConfirm={() => { setConfirmApprove(null); setApplicantDialog(null); }}
        onCancel={() => setConfirmApprove(null)}
      />

      {/* ── Confirm: suspend / activate member ── */}
      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.status === 'active' ? '确认停用成员' : '确认激活成员'}
        message={confirmToggle?.status === 'active'
          ? `确定要将「${confirmToggle?.name ?? ''}」设为休眠状态吗？该成员将暂时无法参加活动。`
          : `确定要重新激活「${confirmToggle?.name ?? ''}」吗？`}
        confirmLabel={confirmToggle?.status === 'active' ? '停用' : '激活'}
        confirmColor={confirmToggle?.status === 'active' ? 'warning' : 'success'}
        onConfirm={() => setConfirmToggle(null)}
        onCancel={() => setConfirmToggle(null)}
      />

      {/* ── Confirm: save member edit ── */}
      <ConfirmDialog
        open={confirmSaveEdit}
        title="确认保存修改"
        message={`确定要保存对「${selectedMember?.name ?? ''}」的修改吗？`}
        confirmLabel="保存"
        confirmColor="primary"
        onConfirm={() => { setConfirmSaveEdit(false); setEditOpen(false); }}
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
        onConfirm={() => setConfirmAdmin(null)}
        onCancel={() => setConfirmAdmin(null)}
      />
    </Stack>
  );
}
