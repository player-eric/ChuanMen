import { useNavigate, useOutletContext } from 'react-router';
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';

/* ═══ Empty Feed ═══ */
function EmptyFeed() {
  const navigate = useNavigate();
  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>👋 欢迎来到串门儿！</Typography>
          <Typography variant="body2" color="text.secondary">
            串门儿是一群住在新泽西的朋友，通过小型聚会认识彼此。先看看最近有什么活动，或者去推荐页选一部想看的电影。
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={1.5}>
        {[
          { icon: '📅', label: '看看活动', desc: '最近有什么好玩的', page: '/events' },
          { icon: '🎬', label: '推荐电影', desc: '投票选下次看什么', page: '/discover' },
          { icon: '📖', label: '了解串门', desc: '我们是谁、怎么玩', page: '/about' },
          { icon: '✉', label: '寄感谢卡', desc: '给朋友说声谢谢', page: '/cards' },
        ].map((a, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6 }}>
            <Card sx={{ cursor: 'pointer' }} onClick={() => navigate(a.page)}>
              <CardContent>
                <Typography variant="h5">{a.icon}</Typography>
                <Typography fontWeight={700}>{a.label}</Typography>
                <Typography variant="body2" color="text.secondary">{a.desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="body2" color="text.secondary" textAlign="center">
        动态流会随着你参加活动慢慢丰富起来 ✨
      </Typography>
    </Stack>
  );
}

/* ═══ Full Feed ═══ */
function FullFeed() {
  const navigate = useNavigate();

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>📢 你投的「花样年华」被选中了</Typography>
              <Typography variant="body2" color="text.secondary">这周六在白开水家放映，要不要来？</Typography>
            </Box>
            <Button variant="contained" size="small" onClick={() => navigate('/events')}>看看</Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700}>🎉 串门第 50 场活动！</Typography>
          <Typography variant="body2" color="text.secondary">从去年 10 月到现在，一起看了 32 部电影，吃了 18 顿饭，走了 6 次路。</Typography>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardActionArea onClick={() => navigate('/events/1')}>
              <CardContent>
                <Typography variant="h6">周六电影夜 · 花样年华</Typography>
                <Typography variant="body2" color="text.secondary">2.22 周六 7pm · 白开水家</Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                  <AvatarGroup max={5}>
                    {['白开水', 'Yuan', '大橙子', '星星', 'Tiffy'].map((name) => (
                      <Avatar key={name}>{name[0]}</Avatar>
                    ))}
                  </AvatarGroup>
                  <Chip color="success" size="small" label="还剩 4 位" />
                </Stack>
              </CardContent>
            </CardActionArea>
            <CardActions>
              <Button size="small" onClick={() => navigate('/events/1')}>查看活动详情</Button>
            </CardActions>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700}>✉ 新感谢卡</Typography>
              <Typography variant="body2" color="text.secondary">Yuan 给白开水：谢谢你每次都把地下室收拾得像个小影院。</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/cards')}>去感谢卡页</Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>🎬 新片推荐</Typography>
          <Stack spacing={1}>
            {[
              { name: '大橙子', title: '重庆森林', year: '1994', dir: '王家卫', votes: 7 },
              { name: 'Yuan', title: '永恒和一日', year: '1998', dir: '安哲罗普洛斯', votes: 4 },
            ].map((movie) => (
              <Box key={movie.title} sx={{ p: 1.2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight={700}>{movie.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{movie.year} · {movie.dir} · {movie.name} 推荐</Typography>
                  </Box>
                  <Chip label={`▲ ${movie.votes}`} size="small" />
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

/* ═══ FeedPage ═══ */
export default function FeedPage() {
  const { isEmpty } = useOutletContext<{ isEmpty: boolean }>();
  return isEmpty ? <EmptyFeed /> : <FullFeed />;
}
