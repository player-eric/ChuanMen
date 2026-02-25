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

  const detailStats = stats
    ? [
        { label: '活跃 Host', value: String(stats.activeHosts) },
        { label: '电影总数', value: String(stats.totalMovies) },
        { label: '提案总数', value: String(stats.totalProposals) },
        { label: '本月活动', value: String(stats.monthEvents) },
      ]
    : [];

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

      {/* Detail row */}
      {!loading && stats && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={1.5}>📊 详细数据</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 2 }}>
            {detailStats.map(s => (
              <Box key={s.label}>
                <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Box>
            ))}
          </Box>
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

      {/* Data export hint */}
      <Typography variant="caption" color="text.secondary" textAlign="center">
        数据导出功能（CSV）将在后续版本中启用
      </Typography>
    </Stack>
  );
}
