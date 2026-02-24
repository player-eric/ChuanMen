import { useNavigate } from 'react-router';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
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

/* ── PRD 11.1.8 ── 数据看板 ── */

const topStats = [
  { label: '总成员数', value: '32', delta: '+4 本月', color: '#1976d2' },
  { label: '月活成员', value: '18', delta: '56%', color: '#2e7d32' },
  { label: '周活成员', value: '12', delta: '38%', color: '#0097a7' },
  { label: '待处理申请', value: '3', delta: '最早 3 天前', color: '#ed6c02' },
];

const activityStats = [
  { label: '本月活动', value: '6', sub: '+3 vs 上月' },
  { label: '活跃 Host', value: '5', sub: '本月' },
  { label: 'Waitlist 比例', value: '23%', sub: '供给不足信号' },
  { label: '活动类型', value: '4 种', sub: '电影夜·Potluck·徒步·茶话会' },
];

const cardStats = [
  { label: '感谢卡总量', value: '48', sub: '本月 +12' },
  { label: '公开/私密', value: '35/13', sub: '73% 公开' },
  { label: '购买收入', value: '$25', sub: '本月' },
  { label: '称号触发', value: '3', sub: '本月新增' },
];

const memberActivity = [
  { label: '本月参加活动', value: '18 人' },
  { label: '本月 Host', value: '5 人' },
  { label: '本月推荐电影', value: '7 人' },
  { label: '新人首次参与率', value: '75%' },
];

const hostFunnel = [
  { stage: '活跃参与者（≥3 次）', count: 10 },
  { stage: '首次 Co-Host', count: 4 },
  { stage: '独立 Host', count: 5 },
  { stage: 'Host ≥ 5 次', count: 2 },
];

const emailStats = [
  { label: '打开率', value: '72%', sub: '行业均值 ~20%' },
  { label: '点击率', value: '34%', sub: '行业均值 ~3%' },
  { label: '降频用户', value: '2', sub: 'weekly: 1 · stopped: 1' },
  { label: '退订', value: '0', sub: '本月' },
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

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  return (
    <Stack spacing={3}>
      {/* Top Stats */}
      <Grid container spacing={2}>
        {topStats.map((s) => (
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

      {/* Category Stats */}
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
          <StatGrid title="📧 Email 效果" items={emailStats} />
        </Grid>
      </Grid>

      {/* Host Funnel */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>🏠 Host 培养漏斗</Typography>
        <Stack spacing={1}>
          {hostFunnel.map((step, i) => (
            <Stack key={step.stage} direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  height: 24,
                  width: `${Math.max(20, (step.count / hostFunnel[0].count) * 100)}%`,
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

      {/* Quick links */}
      <Typography variant="subtitle2" fontWeight={700}>快捷入口</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5 }}>
        {quickLinks.map((link) => (
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
      <Card>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>📋 最近动态</Typography>
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

      {/* Data export hint */}
      <Typography variant="caption" color="text.secondary" textAlign="center">
        数据导出功能（CSV）将在后端 API 接入后启用
      </Typography>
    </Stack>
  );
}
