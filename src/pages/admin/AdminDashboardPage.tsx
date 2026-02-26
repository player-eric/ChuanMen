import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import MilitaryTechRoundedIcon from '@mui/icons-material/MilitaryTechRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import { fetchAdminStats, type AdminStats } from '@/lib/domainApi';

/* ── PRD 11.1.8 ── 数据看板 ── */

const tagLabel: Record<string, string> = {
  movie: '电影夜',
  chuanmen: '串门儿',
  holiday: '节日',
  hiking: '徒步',
  outdoor: '户外',
  small_group: '小聚',
  other: '其他',
};

const quickLinks = [
  { label: '成员管理', icon: <PeopleRoundedIcon />, to: '/admin/members' },
  { label: '活动管理', icon: <EventRoundedIcon />, to: '/admin/events' },
  { label: '内容管理', icon: <ArticleRoundedIcon />, to: '/admin/content' },
  { label: '感谢卡管理', icon: <MailRoundedIcon />, to: '/admin/cards' },
  { label: '称号管理', icon: <MilitaryTechRoundedIcon />, to: '/admin/titles' },
  { label: '分工预设', icon: <AssignmentRoundedIcon />, to: '/admin/task-presets' },
  { label: '公告与里程碑', icon: <CampaignRoundedIcon />, to: '/admin/announcements' },
  { label: '社区通讯', icon: <EmailRoundedIcon />, to: '/admin/newsletters' },
  { label: '社群信息编辑', icon: <EditNoteRoundedIcon />, to: '/admin/community-info' },
];

function StatGrid({ title, items }: { title: string; items: { label: string; value: string; sub?: string; color?: string }[] }) {
  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} mb={1.5}>{title}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 2 }}>
        {items.map(s => (
          <Box key={s.label}>
            <Typography variant="h5" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
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

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch(e => console.error('Failed to load stats', e))
      .finally(() => setLoading(false));
  }, []);

  const topStats = stats
    ? [
        { label: '总成员数', value: String(stats.totalMembers), delta: '', color: '#1976d2' },
        { label: '待处理申请', value: String(stats.pendingApplicants), delta: '', color: '#ed6c02' },
        { label: '总活动数', value: String(stats.totalEvents), delta: `本月 ${stats.monthEvents}`, color: '#2e7d32' },
        { label: '本月感谢卡', value: String(stats.monthCards), delta: `总计 ${stats.totalCards}`, color: '#0097a7' },
      ]
    : [];

  const activityStats = stats
    ? [
        { label: '本月活动', value: String(stats.monthEvents) },
        { label: '活跃 Host', value: String(stats.monthActiveHosts), sub: '本月' },
        { label: 'Waitlist 比例', value: `${stats.waitlistPercent}%`, sub: stats.waitlistPercent > 20 ? '供给不足信号' : '供给正常' },
        { label: '活动类型', value: `${stats.distinctTagCount} 种`, sub: stats.topTags.map(t => tagLabel[t] || t).join('·') },
      ]
    : [];

  const cardStats = stats
    ? [
        { label: '感谢卡总量', value: String(stats.totalCards), sub: `本月 +${stats.monthCards}` },
        { label: '公开/私密', value: `${stats.publicCards}/${stats.privateCards}`, sub: `${stats.publicPercent}% 公开` },
      ]
    : [];

  const memberActivity = stats
    ? [
        { label: '本月参加活动', value: `${stats.monthParticipants} 人` },
        { label: '本月 Host', value: `${stats.monthActiveHosts} 人` },
        { label: '本月推荐电影', value: `${stats.monthMovieRecommenders} 人` },
        { label: '新人首次参与率', value: `${stats.newMemberParticipationRate}%` },
      ]
    : [];

  const emailStatsItems = stats
    ? [
        { label: '正常接收', value: String(stats.emailStats.active) },
        { label: '降频 (weekly)', value: String(stats.emailStats.weekly) },
        { label: '已暂停', value: String(stats.emailStats.stopped) },
        { label: '退订', value: String(stats.emailStats.unsubscribed) },
      ]
    : [];

  const hostFunnel = stats
    ? [
        { stage: '活跃参与者（≥3 次）', count: stats.hostFunnel.activeParticipants3 },
        { stage: '首次 Co-Host', count: stats.hostFunnel.firstCoHosts },
        { stage: '独立 Host', count: stats.hostFunnel.soloHosts },
        { stage: 'Host ≥ 5 次', count: stats.hostFunnel.veteranHosts },
      ]
    : [];
  const funnelMax = hostFunnel.length > 0 ? Math.max(hostFunnel[0].count, 1) : 1;

  return (
    <Stack spacing={3}>
      {loading && <Typography>加载中…</Typography>}

      {/* Top Stats */}
      {!loading && stats && (
        <Grid container spacing={2}>
          {topStats.map(s => (
            <Grid key={s.label} size={{ xs: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                  {s.delta && (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <TrendingUpRoundedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">{s.delta}</Typography>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Category Stats */}
      {!loading && stats && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <StatGrid title="📅 活动供给" items={activityStats} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <StatGrid title="✉ 感谢卡" items={cardStats} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <StatGrid title="👥 成员活跃" items={memberActivity} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <StatGrid title="📧 Email 频率" items={emailStatsItems} />
          </Grid>
        </Grid>
      )}

      {/* Host Funnel */}
      {!loading && stats && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={1.5}>🏠 Host 培养漏斗</Typography>
          <Stack spacing={1}>
            {hostFunnel.map((step, i) => (
              <Stack key={step.stage} direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    height: 24,
                    width: `${Math.max(20, (step.count / funnelMax) * 100)}%`,
                    bgcolor: 'primary.main',
                    borderRadius: 1,
                    opacity: 1 - i * 0.15,
                    display: 'flex',
                    alignItems: 'center',
                    px: 1,
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'primary.contrastText', fontWeight: 700 }}>
                    {step.count}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {step.stage}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Card>
      )}

      {/* Quick links */}
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

      {/* Recent activity */}
      {!loading && stats && stats.recentActivity.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>📋 最近动态</Typography>
            <Stack spacing={1.5}>
              {stats.recentActivity.map((action, i) => (
                <Stack key={i} direction="row" justifyContent="space-between" alignItems="center"
                  sx={{ py: 0.5, borderBottom: i < stats.recentActivity.length - 1 ? 1 : 0, borderColor: 'divider' }}>
                  <Typography variant="body2">{action.text}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 2 }}>{formatRelativeTime(action.time)}</Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Data export hint */}
      <Typography variant="caption" color="text.secondary" textAlign="center">
        数据导出功能（CSV）将在后续版本中启用
      </Typography>
    </Stack>
  );
}
