import { useLoaderData } from 'react-router';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import type { ProfilePageData } from '@/types';

export default function ProfilePage() {
  const data = useLoaderData() as ProfilePageData;

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent sx={{ textAlign: 'center' }}>
          <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 1 }}>Y</Avatar>
          <Typography variant="h5">Yuan</Typography>
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1, flexWrap: 'wrap' }}>
            <Chip size="small" color="warning" label="🏠 Host ×3" />
            <Chip size="small" color="primary" label="🎬 选片人" />
            <Chip size="small" color="success" label="🔥 氛围担当" />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>加入串门儿 142 天</Typography>
        </CardContent>
      </Card>

      <Grid container spacing={1.2}>
        {data.stats.map((stat, index) => (
          <Grid key={index} size={{ xs: 6, sm: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary.main" fontWeight={800}>{stat.n}</Typography>
                <Typography variant="caption" color="text.secondary">{stat.l}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>贡献记录</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            本月 Host 1 次 · 收到 5 张感谢卡 · 推荐 3 部电影
          </Typography>
          <LinearProgress variant="determinate" value={85} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            贡献度 85% · 超过 90% 的成员
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.2 }}>收到的感谢卡</Typography>
          <Stack spacing={1}>
            {data.recentCards.map((card, index) => (
              <Box key={index} sx={{ p: 1.2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="start">
                  <Box>
                    <Typography variant="caption" color="text.secondary">FROM: {card.from}</Typography>
                    <Typography variant="body2">{card.msg}</Typography>
                  </Box>
                  <Chip size="small" label={`${card.stamp} ${card.date}`} />
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.2 }}>最近参加</Typography>
          <Stack spacing={1}>
            {data.recentActivity.map((activity, index) => (
              <Stack key={index} direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2">{activity.emoji} {activity.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{activity.date}</Typography>
                </Box>
                {activity.role && <Chip size="small" color="warning" label={`🏠 ${activity.role}`} />}
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
