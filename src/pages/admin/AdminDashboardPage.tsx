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

const stats = [
  { label: '活跃成员', value: '12', delta: '+2 本月', color: '#1976d2' },
  { label: '本月活动', value: '6', delta: '+3 vs 上月', color: '#2e7d32' },
  { label: '待处理申请', value: '3', delta: '最早 3 天前', color: '#ed6c02' },
  { label: '通讯订阅', value: '28', delta: '打开率 72%', color: '#9c27b0' },
];

const recentActions = [
  { text: 'Derek 提交了入社申请', time: '2 小时前', type: 'apply' },
  { text: '白开水 创建了活动「电影夜 · 花样年华」', time: '5 小时前', type: 'event' },
  { text: '星星 投票了 3 部电影', time: '1 天前', type: 'vote' },
  { text: '社区通讯 #12 已发送（28 人）', time: '2 天前', type: 'newsletter' },
  { text: 'Tiffy 被批准为 Host', time: '3 天前', type: 'member' },
  { text: '奶茶 提交了入社申请', time: '4 天前', type: 'apply' },
  { text: '阿德 创建了活动「录音棚体验日」', time: '5 天前', type: 'event' },
  { text: '社区公约 v2.0 发布', time: '1 周前', type: 'system' },
];

const quickLinks = [
  { label: '成员管理', icon: <PeopleRoundedIcon />, to: '/admin/members' },
  { label: '活动管理', icon: <EventRoundedIcon />, to: '/admin/events' },
  { label: '发送通讯', icon: <EmailRoundedIcon />, to: '/admin/newsletters' },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  return (
    <Stack spacing={3}>
      {/* Stats */}
      <Grid container spacing={2}>
        {stats.map((s) => (
          <Grid key={s.label} size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                <Typography variant="h4" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TrendingUpRoundedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">{s.delta}</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick links */}
      <Grid container spacing={2}>
        {quickLinks.map((link) => (
          <Grid key={link.label} size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardActionArea onClick={() => navigate(link.to)}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    {link.icon}
                    <Typography fontWeight={700}>{link.label}</Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent activity */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>📋 最近动态</Typography>
          <Stack spacing={1.5}>
            {recentActions.map((action, i) => (
              <Stack key={i} direction="row" justifyContent="space-between" alignItems="center"
                sx={{ py: 0.5, borderBottom: i < recentActions.length - 1 ? 1 : 0, borderColor: 'divider' }}>
                <Typography variant="body2">{action.text}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 2 }}>{action.time}</Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
