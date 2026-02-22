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
import { feedAnnouncements, feedNewRecos, feedNewCards } from '@/mock/api';

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
      {/* Announcements / banners */}
      {feedAnnouncements.map((item, idx) => (
        <Card key={idx}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>{item.title}</Typography>
                <Typography variant="body2" color="text.secondary">{item.body}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">{item.date}</Typography>
            </Stack>
          </CardContent>
        </Card>
      ))}

      {/* Next event + recent card */}
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
              {feedNewCards.map((card, i) => (
                <Typography key={i} variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {card.from}：{card.msg}
                </Typography>
              ))}
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/cards')}>去感谢卡页</Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Live events indicator */}
      <Card sx={{ border: 2, borderColor: 'success.main' }}>
        <CardActionArea onClick={() => navigate('/events')}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>● 正在进行：日料之夜 · 手卷寿司</Typography>
                <Typography variant="body2" color="text.secondary">Yuan Host · 6 人参加</Typography>
              </Box>
              <Chip size="small" color="success" label="进行中" />
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>

      {/* New recommendations */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>📝 新推荐</Typography>
          <Stack spacing={1}>
            {feedNewRecos.map((reco) => (
              <Box key={reco.id} sx={{ p: 1.2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight={700}>{reco.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{reco.from} · {reco.date}</Typography>
                  </Box>
                  <Chip label={reco.type === 'movie' ? '🎬' : reco.type === 'restaurant' ? '🍽️' : '📍'} size="small" />
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
        <CardActions>
          <Button size="small" onClick={() => navigate('/discover')}>查看所有推荐</Button>
        </CardActions>
      </Card>

      {/* Popular proposals teaser */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>💡 热门想法</Typography>
          <Stack spacing={1}>
            {[
              { name: 'Derek', title: '春天 kayaking，Raritan River', votes: 9 },
              { name: '小鱼', title: '有人想打羽毛球吗', votes: 8 },
              { name: '奶茶', title: '奶茶 tasting 大会！带大家试喝新品', votes: 7 },
            ].map((p, i) => (
              <Stack key={i} direction="row" justifyContent="space-between" alignItems="center"
                sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                <Box>
                  <Typography variant="body2" fontWeight={700}>{p.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{p.name}</Typography>
                </Box>
                <Chip label={`🙋 ${p.votes}`} size="small" variant="outlined" />
              </Stack>
            ))}
          </Stack>
        </CardContent>
        <CardActions>
          <Button size="small" onClick={() => navigate('/events/proposals')}>查看全部想法</Button>
        </CardActions>
      </Card>
    </Stack>
  );
}

/* ═══ FeedPage ═══ */
export default function FeedPage() {
  const { isEmpty } = useOutletContext<{ isEmpty: boolean }>();
  return isEmpty ? <EmptyFeed /> : <FullFeed />;
}
