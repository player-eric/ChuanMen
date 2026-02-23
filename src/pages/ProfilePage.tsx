import { useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import type { ProfilePageData } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { RichTextViewer } from '@/components/RichTextEditor';
import { PostCard } from '@/components/PostCard';
import { Poster } from '@/components/Poster';
import { useColors } from '@/hooks/useColors';
import { photos } from '@/theme';

const sceneEmoji: Record<string, string> = {
  movieNight: '🎬',
  potluck: '🍳',
  hike: '🥾',
  coffee: '☕',
  sports: '🏸',
};

export default function ProfilePage() {
  const data = useLoaderData() as ProfilePageData;
  const { user } = useAuth();
  const navigate = useNavigate();
  const c = useColors();
  const [timelineExpanded, setTimelineExpanded] = useState(false);

  const hasActivity = data.participationStats.eventCount > 0
    || data.myMovies.length > 0
    || data.recentCards.length > 0;

  const coverUrl = user?.coverImageUrl || photos.cozy;

  return (
    <Stack spacing={2}>
      {/* Cover Image */}
      <Box sx={{ borderRadius: 2, overflow: 'hidden', height: 160 }}>
        <div style={{ width: '100%', height: '100%', background: coverUrl, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      </Box>

      {/* Profile Header */}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ width: 58, height: 58 }}>{user?.name?.[0] ?? 'Y'}</Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6">{user?.name ?? 'Yuan'}</Typography>
              {user?.location && (
                <Typography variant="caption" color="text.secondary">📍 {user.location}</Typography>
              )}
              {data.role && (
                <Typography variant="body2" color="text.secondary">{data.role}</Typography>
              )}
              <Stack direction="row" spacing={0.8} sx={{ mt: 0.8, flexWrap: 'wrap' }}>
                {data.titles.map((title) => (
                  <Chip key={title} size="small" color="warning" label={title} />
                ))}
              </Stack>
            </Box>
          </Stack>
          <Button
            size="small"
            sx={{ mt: 1.5 }}
            onClick={() => navigate('/settings')}
          >
            编辑资料 →
          </Button>
        </CardContent>
      </Card>

      {/* Bio Card */}
      {(user?.bio || user?.selfAsFriend || user?.idealFriend || user?.participationPlan) && (
        <Card>
          <CardContent>
            {user?.bio && (
              <>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>关于我</Typography>
                <RichTextViewer html={user.bio} />
              </>
            )}
            {user?.selfAsFriend && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>作为朋友，我</Typography>
                <RichTextViewer html={user.selfAsFriend} />
              </>
            )}
            {user?.idealFriend && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>我理想中的朋友</Typography>
                <RichTextViewer html={user.idealFriend} />
              </>
            )}
            {user?.participationPlan && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>参与计划</Typography>
                <RichTextViewer html={user.participationPlan} />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State for new members */}
      {!hasActivity && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>欢迎来到串门儿 👋</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.8 }}>
              你的故事从这里开始——<br />
              参加一次活动、推荐一部电影、或者给谁写一张感谢卡，<br />
              这些痕迹都会出现在这里。
            </Typography>
            <Stack direction="row" spacing={1.5} justifyContent="center">
              <Button variant="contained" size="small" onClick={() => navigate('/events')}>查看本周活动 →</Button>
              <Button variant="outlined" size="small" onClick={() => navigate('/discover')}>推荐一部电影 →</Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Participation Stats (Career Total) */}
      {hasActivity && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>参与统计（生涯总计）</Typography>
            <Grid container spacing={1}>
              {[
                { text: `参加 ${data.participationStats.eventCount} 场活动` },
                { text: `做过 ${data.participationStats.hostCount} 次 Host` },
                { text: `推荐 ${data.participationStats.movieCount} 部电影（${data.participationStats.screenedCount} 部被放映）` },
                { text: `提过 ${data.participationStats.proposalCount} 个创意` },
                { text: `投过 ${data.participationStats.voteCount} 次票` },
              ].map((item) => (
                <Grid key={item.text} size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">{item.text}</Typography>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Social Connections */}
      {hasActivity && (data.mostSharedWith || data.closestTaste) && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>社区缘分</Typography>
            <Stack spacing={1.5}>
              {data.mostSharedWith && (
                <CardActionArea
                  onClick={() => navigate(`/members/${encodeURIComponent(data.mostSharedWith!.name)}`)}
                  sx={{ borderRadius: 2 }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 1 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: c.warm + '30', color: c.warm }}>
                      {data.mostSharedWith.name[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>
                        和我经历最多的人：{data.mostSharedWith.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        一起参加了 {data.mostSharedWith.evtCount} 场活动，互寄了 {data.mostSharedWith.cards} 张卡片
                      </Typography>
                    </Box>
                  </Stack>
                </CardActionArea>
              )}
              {data.closestTaste && (
                <CardActionArea
                  onClick={() => navigate(`/members/${encodeURIComponent(data.closestTaste!.name)}`)}
                  sx={{ borderRadius: 2 }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 1 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: c.blue + '30', color: c.blue }}>
                      {data.closestTaste.name[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>
                        品味最接近的人：{data.closestTaste.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        共同喜欢 {data.closestTaste.movies.length} 部电影：{data.closestTaste.movies.join('、')}
                      </Typography>
                    </Box>
                  </Stack>
                </CardActionArea>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Monthly Contribution */}
      {hasActivity && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>本月贡献</Typography>
            <Grid container spacing={1}>
              {[
                { label: 'Host', value: `${data.contribution.hostCount} 次` },
                { label: '参加活动', value: `${data.contribution.eventCount} 场` },
                { label: '推荐电影', value: `${data.contribution.movieCount} 部` },
                { label: '收到感谢卡', value: `${data.contribution.cardsReceived} 张` },
                { label: '寄出感谢卡', value: `${data.contribution.cardsSent} 张` },
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
      )}

      {/* My Movies */}
      {data.myMovies.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.2 }}>
              🎬 我推荐的电影 ({data.myMovies.length})
            </Typography>
            <Stack spacing={1}>
              {data.myMovies.map((movie) => (
                <CardActionArea
                  key={movie.id}
                  onClick={() => navigate(`/discover/movies/${movie.id}`)}
                  sx={{ borderRadius: 2 }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 1 }}>
                    <Poster title={movie.title} w={40} h={56} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>{movie.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {movie.year} · {movie.dir}
                      </Typography>
                      <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.3 }}>
                        <Typography variant="caption" color="text.secondary">{movie.v} 票</Typography>
                        {movie.status && (
                          <Chip
                            size="small"
                            label={movie.status}
                            color={movie.status === '本周放映' ? 'warning' : 'default'}
                            sx={{ height: 20, fontSize: 11 }}
                          />
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                </CardActionArea>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* My Events */}
      {data.myEvents.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.2 }}>
              📅 我参与的活动
            </Typography>
            <Stack spacing={1}>
              {data.myEvents.slice(0, 8).map((event) => (
                <CardActionArea
                  key={event.id}
                  onClick={() => navigate(`/events/${event.id}`)}
                  sx={{ borderRadius: 2 }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap>
                        {sceneEmoji[event.scene] ?? '📅'} {event.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{event.date}</Typography>
                    </Box>
                    {event.role && <Chip size="small" color="warning" label={`🏠 ${event.role}`} />}
                  </Stack>
                </CardActionArea>
              ))}
            </Stack>
            {data.myEvents.length > 8 && (
              <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/events')}>
                查看全部 →
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Received Cards */}
      {data.recentCards.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.2 }}>
              💌 收到的感谢卡 ({data.recentCards.length})
            </Typography>
            <Grid container spacing={1.5}>
              {data.recentCards.slice(0, 3).map((card, index) => (
                <Grid key={index} size={{ xs: 12, sm: 6 }}>
                  <PostCard
                    from={card.from}
                    to={user?.name ?? 'Yuan'}
                    msg={card.msg}
                    stamp={card.stamp}
                    date={card.date}
                    photo={card.photo}
                  />
                </Grid>
              ))}
            </Grid>
            {data.recentCards.length > 3 && (
              <Button size="small" sx={{ mt: 1.5 }} onClick={() => navigate('/cards')}>
                查看全部 →
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Participation Timeline */}
      {data.timeline.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              📖 参与时间线
            </Typography>
            <Box sx={{ position: 'relative', pl: 2.5 }}>
              {/* Timeline line */}
              <Box sx={{
                position: 'absolute',
                left: 6,
                top: 4,
                bottom: 4,
                width: 2,
                bgcolor: c.line,
                borderRadius: 1,
              }} />
              <Stack spacing={1.2}>
                {(timelineExpanded ? data.timeline : data.timeline.slice(0, 10)).map((item, index) => (
                  <Box
                    key={index}
                    sx={{ position: 'relative', cursor: item.link ? 'pointer' : 'default' }}
                    onClick={() => item.link && navigate(item.link)}
                  >
                    {/* Dot */}
                    <Box sx={{
                      position: 'absolute',
                      left: -17,
                      top: 6,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: c.warm,
                    }} />
                    <Stack direction="row" spacing={1} alignItems="baseline">
                      {item.date && (
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36, flexShrink: 0 }}>
                          {item.date}
                        </Typography>
                      )}
                      <Typography variant="body2" color={item.link ? 'text.primary' : 'text.secondary'}>
                        {item.text}
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
            {!timelineExpanded && data.timeline.length > 10 && (
              <Button size="small" sx={{ mt: 1.5 }} onClick={() => setTimelineExpanded(true)}>
                展开更多 →
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
