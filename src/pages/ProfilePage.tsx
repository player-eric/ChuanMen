import { useLoaderData } from 'react-router';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import type { ProfilePageData } from '@/types';
import { useAuth } from '@/auth/AuthContext';

export default function ProfilePage() {
  const data = useLoaderData() as ProfilePageData;
  const { user } = useAuth();

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent sx={{ textAlign: 'center' }}>
          <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 1 }}>{user?.name?.[0] ?? 'Y'}</Avatar>
          <Typography variant="h5">{user?.name ?? 'Yuan'}</Typography>
          {user?.location && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>📍 {user.location}</Typography>
          )}
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1, flexWrap: 'wrap' }}>
            <Chip size="small" color="warning" label={`🏠 Host ×${data.contribution?.hostCount ?? 0}`} />
            <Chip size="small" color="primary" label="🎬 选片人" />
            <Chip size="small" color="success" label="🔥 氛围担当" />
          </Stack>
          {user?.bio && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, px: 2 }}>{user.bio}</Typography>
          )}
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

      {/* v2.1 §4.8: fact-based contribution, no scoring/ranking */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>本月贡献</Typography>
          <Grid container spacing={1}>
            {[
              { label: 'Host', value: `${data.contribution?.hostCount ?? 0} 次` },
              { label: '参加活动', value: `${data.contribution?.eventCount ?? 0} 场` },
              { label: '推荐电影', value: `${data.contribution?.movieCount ?? 0} 部` },
              { label: '收到感谢卡', value: `${data.contribution?.cardsReceived ?? 0} 张` },
              { label: '寄出感谢卡', value: `${data.contribution?.cardsSent ?? 0} 张` },
            ].map((item) => (
              <Grid key={item.label} size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  {item.label}：<b>{item.value}</b>
                </Typography>
              </Grid>
            ))}
          </Grid>
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
