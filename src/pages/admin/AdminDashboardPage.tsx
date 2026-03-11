import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Collapse,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import MilitaryTechRoundedIcon from '@mui/icons-material/MilitaryTechRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { fetchAdminStats, type AdminStats, type MiniMember } from '@/lib/domainApi';
import { Ava } from '@/components/Atoms';

const quickLinks = [
  { label: '成员管理', icon: <PeopleRoundedIcon />, to: '/admin/members' },
  { label: '活动管理', icon: <EventRoundedIcon />, to: '/admin/events' },
  { label: '内容管理', icon: <ArticleRoundedIcon />, to: '/admin/content' },
  { label: '感谢卡管理', icon: <MailRoundedIcon />, to: '/admin/cards' },
  { label: '称号管理', icon: <MilitaryTechRoundedIcon />, to: '/admin/titles' },
  { label: '分工预设', icon: <AssignmentRoundedIcon />, to: '/admin/task-presets' },
  { label: '公告与里程碑', icon: <CampaignRoundedIcon />, to: '/admin/announcements' },
  { label: '邮件管理', icon: <MarkEmailReadRoundedIcon />, to: '/admin/email' },
  { label: '社区通讯', icon: <EmailRoundedIcon />, to: '/admin/newsletters' },
  { label: '社群信息编辑', icon: <EditNoteRoundedIcon />, to: '/admin/community-info' },
];

// ── Helpers ──

function Trend({ value, prev, suffix = '%' }: { value: number; prev: number; suffix?: string }) {
  const diff = value - prev;
  if (diff === 0) return null;
  const up = diff > 0;
  return (
    <Stack direction="row" spacing={0.3} alignItems="center" sx={{ color: up ? 'success.main' : 'error.main' }}>
      {up ? <TrendingUpRoundedIcon sx={{ fontSize: 14 }} /> : <TrendingDownRoundedIcon sx={{ fontSize: 14 }} />}
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {up ? '+' : ''}{diff}{suffix} vs 上月
      </Typography>
    </Stack>
  );
}

function MemberChips({ members, label }: { members: MiniMember[]; label?: string }) {
  if (members.length === 0) return null;
  return (
    <Box sx={{ mt: 0.5 }}>
      {label && <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>{label}</Typography>}
      <Stack direction="row" flexWrap="wrap" gap={0.5}>
        {members.map(m => (
          <Chip key={m.id} size="small" avatar={<Ava name={m.name} src={m.avatar ?? undefined} size={20} />}
            label={m.name} variant="outlined" sx={{ height: 26 }} />
        ))}
      </Stack>
    </Box>
  );
}

function FunnelBar({ label, count, max, sub, labelWidth = 56 }: { label: string; count: number; max: number; sub?: string; labelWidth?: number }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ height: 22 }}>
      <Typography variant="caption" color="text.secondary" sx={{ width: labelWidth, textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      <Box sx={{
        height: 16, width: `${Math.max(12, (count / Math.max(max, 1)) * 100)}%`,
        bgcolor: 'primary.main', borderRadius: 0.5,
        display: 'flex', alignItems: 'center', px: 0.75, minWidth: 28,
      }}>
        <Typography sx={{ fontSize: 11, color: 'primary.contrastText', fontWeight: 700 }}>{count}</Typography>
      </Box>
      {sub && <Typography sx={{ fontSize: 11 }} color="text.secondary">{sub}</Typography>}
    </Stack>
  );
}

/** Pure-CSS sparkline bar chart for DAU trend */
function DauChart({ data, selectedDate, onBarClick }: {
  data: { date: string; count: number }[];
  selectedDate?: string;
  onBarClick?: (date: string) => void;
}) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        每日活跃（14 天）
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 80 }}>
        {data.map(d => {
          const selected = selectedDate === d.date;
          return (
          <Box key={d.date} onClick={() => onBarClick?.(d.date)}
            sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
            <Typography sx={{ fontSize: 10, fontWeight: 600, mb: 0.25, color: selected ? 'primary.main' : 'text.primary' }}>
              {d.count || ''}
            </Typography>
            <Box sx={{
              width: '100%', maxWidth: 28,
              height: Math.max(4, (d.count / max) * 56),
              bgcolor: 'primary.main', borderRadius: 0.5, opacity: selected ? 1 : 0.55,
              transition: '0.15s',
            }} />
            <Typography sx={{ fontSize: 9, mt: 0.25, color: selected ? 'primary.main' : 'text.secondary', fontWeight: selected ? 700 : 400 }}>
              {d.date.slice(3)}
            </Typography>
          </Box>
          );
        })}
      </Box>
    </Card>
  );
}

function StatGrid({ title, items }: { title: string; items: { label: string; value: string; sub?: string }[] }) {
  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} mb={1.5}>{title}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 2 }}>
        {items.map(s => (
          <Box key={s.label}>
            <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            {s.sub && <Typography variant="caption" display="block" sx={{ opacity: 0.6 }}>{s.sub}</Typography>}
          </Box>
        ))}
      </Box>
    </Card>
  );
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return `${Math.floor(days / 7)} 周前`;
}

// ── Main Page ──

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandAway, setExpandAway] = useState(false);
  const [expandNew, setExpandNew] = useState(false);
  // Filter for right-side member table: 'all' | 'active' | 'occasional' | 'away' | 'MM-DD' (date)
  const [memberFilter, setMemberFilter] = useState<string>('all');

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch(e => console.error('Failed to load stats', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Typography>加载中…</Typography>;
  if (!stats) return <Typography color="error">加载失败</Typography>;

  const { activity, onboarding, memberDistribution, hostEvolution, leaderboard, eventMetrics } = stats;

  // ── KPI Cards ──
  const kpiCards = [
    {
      label: '活动参与率',
      value: `${activity.participationRate}%`,
      sub: <Trend value={activity.participationRate} prev={activity.prevParticipationRate} />,
      color: '#2e7d32',
    },
    {
      label: '回头率',
      value: `${activity.returnRate}%`,
      sub: <Typography variant="caption" color="text.secondary">连续活跃</Typography>,
      color: '#1976d2',
    },
    {
      label: 'DAU / MAU',
      value: `${activity.dau} / ${activity.mau}`,
      sub: <Typography variant="caption" color="text.secondary">
        占总成员 {activity.totalApproved > 0 ? Math.round((activity.mau / activity.totalApproved) * 100) : 0}%
      </Typography>,
      color: '#7b1fa2',
    },
    {
      label: stats.pendingApplicants > 0 ? '待处理' : '总成员',
      value: String(stats.pendingApplicants > 0 ? stats.pendingApplicants : stats.totalMembers),
      sub: stats.pendingApplicants > 0
        ? <Typography variant="caption" sx={{ color: '#ed6c02', fontWeight: 600 }}>待审核申请</Typography>
        : <Typography variant="caption" color="text.secondary">已批准成员</Typography>,
      color: stats.pendingApplicants > 0 ? '#ed6c02' : '#0097a7',
    },
  ];

  // Onboarding funnel
  const funnelSteps = [
    { label: '申请', count: onboarding.applied },
    { label: '批准', count: onboarding.approved, sub: onboarding.avgApprovalDays > 0 ? `均 ${onboarding.avgApprovalDays}天` : undefined },
    { label: '登录', count: onboarding.loggedIn },
    { label: '报名', count: onboarding.signedUp },
    { label: '参加', count: onboarding.attended },
    { label: '互动', count: onboarding.interacted },
  ];
  const funnelMax = Math.max(...funnelSteps.map(s => s.count), 1);

  // Host funnel
  const hostFunnel = [
    { stage: '活跃参与者（3+次）', count: stats.hostFunnel.activeParticipants3 },
    { stage: 'Co-Host', count: stats.hostFunnel.firstCoHosts },
    { stage: '独立 Host', count: stats.hostFunnel.soloHosts },
    { stage: 'Host 5+次', count: stats.hostFunnel.veteranHosts },
  ];
  const hostMax = Math.max(...hostFunnel.map(s => s.count), 1);

  // Activity stats (trimmed)
  const activityStats = [
    { label: '本月活动', value: String(stats.monthEvents), sub: `上月 ${eventMetrics.prevMonthEvents}` },
    { label: '场均参与', value: String(eventMetrics.avgAttendance), sub: '人' },
    { label: 'Waitlist', value: `${stats.waitlistPercent}%`, sub: stats.waitlistPercent > 20 ? '供需信号' : '正常' },
    { label: '感谢卡', value: String(stats.monthCards), sub: `${stats.publicPercent}% 公开` },
  ];

  const emailStatsItems = [
    { label: '正常接收', value: String(stats.emailStats.active) },
    { label: '降频', value: String(stats.emailStats.weekly) },
    { label: '已暂停', value: String(stats.emailStats.stopped) },
    { label: '退订', value: String(stats.emailStats.unsubscribed) },
  ];

  return (
    <Stack spacing={2.5}>
      {/* ── KPI Cards ── */}
      <Grid container spacing={2}>
        {kpiCards.map(s => (
          <Grid key={s.label} size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                <Typography variant="h4" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                {s.sub}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── DAU Trend (left) + Recently Active Members (right) ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={2}>
            <DauChart data={stats.dauTrend}
              selectedDate={memberFilter.includes('-') ? memberFilter : undefined}
              onBarClick={(date) => setMemberFilter(prev => prev === date ? 'all' : date)} />
            {/* Member distribution summary */}
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>成员概览</Typography>
              <Stack spacing={0.5}>
                {[
                  { key: 'all', label: '总成员', value: stats.totalMembers, color: 'text.primary' },
                  { key: 'active', label: '7天内活跃', value: stats.memberDistribution.active, color: 'success.main' },
                  { key: 'occasional', label: '偶尔（7-30天）', value: stats.memberDistribution.occasional, color: 'info.main' },
                  { key: 'away', label: '暂别（30天+）', value: stats.memberDistribution.away.length, color: 'text.secondary' },
                ].map(row => (
                  <Stack key={row.key} direction="row" justifyContent="space-between"
                    onClick={() => setMemberFilter(prev => prev === row.key ? 'all' : row.key)}
                    sx={{
                      cursor: 'pointer', borderRadius: 0.5, px: 0.5, mx: -0.5,
                      bgcolor: memberFilter === row.key && row.key !== 'all' ? 'action.selected' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}>
                    <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ color: row.color }}>{row.value}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Card>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2" fontWeight={700}>最近活跃成员</Typography>
              {memberFilter !== 'all' && (
                <Chip size="small" label={memberFilter.includes('-') ? memberFilter : { active: '7天内', occasional: '7-30天', away: '30天+' }[memberFilter]}
                  onDelete={() => setMemberFilter('all')} sx={{ height: 22, fontSize: 11 }} />
              )}
            </Stack>
            <TableContainer sx={{ maxHeight: 260, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>成员</TableCell>
                    <TableCell align="right">最近活跃</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.recentlyActiveMembers.filter(m => {
                    if (memberFilter === 'all') return true;
                    if (!m.lastActiveAt) return memberFilter === 'away';
                    const ago = Date.now() - new Date(m.lastActiveAt).getTime();
                    const d7 = 7 * 86400000, d30 = 30 * 86400000;
                    if (memberFilter === 'active') return ago <= d7;
                    if (memberFilter === 'occasional') return ago > d7 && ago <= d30;
                    if (memberFilter === 'away') return ago > d30;
                    // Date filter (MM-DD): match lastActiveAt date
                    const mDate = m.lastActiveAt.slice(5, 10); // "MM-DD"
                    return mDate === memberFilter;
                  }).map(m => (
                    <TableRow key={m.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Ava name={m.name} src={m.avatar ?? undefined} size={28} />
                          <Typography variant="body2" fontWeight={600}>{m.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color="text.secondary">
                          {m.lastActiveAt ? formatRelativeTime(m.lastActiveAt) : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>

      {/* ── Quick Links ── */}
      <Typography variant="subtitle2" fontWeight={700}>快捷入口</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5 }}>
        {quickLinks.map(link => (
          <Card key={link.label}>
            <CardActionArea onClick={() => navigate(link.to)} sx={{ p: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                {link.icon}
                <Typography variant="body2" fontWeight={600}>{link.label}</Typography>
              </Stack>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      {/* ── Recent Activity ── */}
      {stats.recentActivity.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>最近动态</Typography>
            <Stack spacing={1}>
              {stats.recentActivity.map((action, i) => (
                <Stack key={i} direction="row" justifyContent="space-between" alignItems="center"
                  sx={{ py: 0.25, borderBottom: i < stats.recentActivity.length - 1 ? 1 : 0, borderColor: 'divider' }}>
                  <Typography variant="body2">{action.text}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 2 }}>{formatRelativeTime(action.time)}</Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* ── Activity & Email ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatGrid title="活动与内容" items={activityStats} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatGrid title="Email 频率" items={emailStatsItems} />
        </Grid>
      </Grid>

      {/* ── Onboarding + Member Distribution ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>新人漏斗（60 天）</Typography>
            <Stack spacing={0.25}>
              {funnelSteps.map(step => (
                <FunnelBar key={step.label} label={step.label} count={step.count} max={funnelMax} sub={step.sub} />
              ))}
            </Stack>
            {onboarding.stuckAfterApproval.length > 0 && (
              <MemberChips members={onboarding.stuckAfterApproval} label="批准后未登录：" />
            )}
            {onboarding.stuckAfterLogin.length > 0 && (
              <MemberChips members={onboarding.stuckAfterLogin} label="登录后未报名：" />
            )}
            {onboarding.stuckAfterSignup.length > 0 && (
              <MemberChips members={onboarding.stuckAfterSignup} label="报名后未参加：" />
            )}
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>成员活跃分布</Typography>
            <Stack spacing={0.75}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50', flexShrink: 0 }} />
                <Typography variant="body2">活跃（7天内）</Typography>
                <Typography variant="body2" fontWeight={700}>{memberDistribution.active}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2196f3', flexShrink: 0 }} />
                <Typography variant="body2">偶尔（7-30天）</Typography>
                <Typography variant="body2" fontWeight={700}>{memberDistribution.occasional}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ cursor: 'pointer' }}
                onClick={() => setExpandAway(v => !v)}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#bdbdbd', flexShrink: 0 }} />
                <Typography variant="body2">暂别（30天+）</Typography>
                <Typography variant="body2" fontWeight={700}>{memberDistribution.away.length}</Typography>
                <ExpandMoreRoundedIcon sx={{ fontSize: 14, transform: expandAway ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
              </Stack>
              <Collapse in={expandAway}>
                <MemberChips members={memberDistribution.away} />
              </Collapse>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ cursor: 'pointer' }}
                onClick={() => setExpandNew(v => !v)}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ff9800', flexShrink: 0 }} />
                <Typography variant="body2">新成员（60天内）</Typography>
                <Typography variant="body2" fontWeight={700}>{memberDistribution.newMembers.length}</Typography>
                <ExpandMoreRoundedIcon sx={{ fontSize: 14, transform: expandNew ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
              </Stack>
              <Collapse in={expandNew}>
                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                  {memberDistribution.newMembers.map(m => (
                    <Chip key={m.id} size="small"
                      avatar={<Ava name={m.name} src={m.avatar ?? undefined} size={20} />}
                      label={`${m.name} · ${m.funnelStage}`} variant="outlined" sx={{ height: 26 }} />
                  ))}
                </Stack>
              </Collapse>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* ── Host Evolution + Leaderboard ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Host 进化追踪</Typography>
            <Stack spacing={0.25}>
              {hostFunnel.map(step => (
                <FunnelBar key={step.stage} label={step.stage} count={step.count} max={hostMax} labelWidth={100} />
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              本月 <strong>{hostEvolution.uniqueHostsThisMonth}</strong> 位 Host
              {hostEvolution.uniqueHostsPrevMonth > 0 && ` (上月 ${hostEvolution.uniqueHostsPrevMonth})`}
            </Typography>
            {hostEvolution.firstTimeHosts.length > 0 && (
              <MemberChips members={hostEvolution.firstTimeHosts} label="新晋 Host：" />
            )}
            {hostEvolution.readyToHost.length > 0 && (
              <MemberChips members={hostEvolution.readyToHost} label="准备好了（3+次，未Host）：" />
            )}
          </Card>
        </Grid>
        {leaderboard.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>贡献者 Top 10（本月）</Typography>
              <Stack spacing={0.5}>
                {leaderboard.map((entry, i) => (
                  <Stack key={entry.id} direction="row" spacing={1} alignItems="center"
                    sx={{ py: 0.25, borderBottom: i < leaderboard.length - 1 ? 1 : 0, borderColor: 'divider' }}>
                    <Typography variant="body2" fontWeight={700} sx={{ width: 18, textAlign: 'center', color: i < 3 ? 'primary.main' : 'text.secondary' }}>
                      {i + 1}
                    </Typography>
                    <Ava name={entry.name} src={entry.avatar ?? undefined} size={24} />
                    <Typography variant="body2" fontWeight={600} sx={{ minWidth: 50 }}>{entry.name}</Typography>
                    <Typography variant="body2" fontWeight={700} color="primary.main">{entry.score}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                      {[
                        entry.breakdown.events > 0 && `${entry.breakdown.events}活动`,
                        entry.breakdown.hosted > 0 && `${entry.breakdown.hosted}Host`,
                        entry.breakdown.postcards > 0 && `${entry.breakdown.postcards}卡`,
                        entry.breakdown.comments > 0 && `${entry.breakdown.comments}评论`,
                        entry.breakdown.recommendations > 0 && `${entry.breakdown.recommendations}推荐`,
                      ].filter(Boolean).join(' · ')}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Card>
          </Grid>
        )}
      </Grid>
    </Stack>
  );
}
