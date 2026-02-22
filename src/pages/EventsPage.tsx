import { useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  Grid,
  SpeedDial,
  SpeedDialAction,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import type { EventData, EventsPageData } from '@/types';

function EventDetailDialog({ evt, open, onClose }: { evt: EventData | null; open: boolean; onClose: () => void }) {
  if (!evt) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{evt.title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip size="small" label={`📅 ${evt.date}`} />
            <Chip size="small" label={`📍 ${evt.location}`} />
            {evt.phase === 'invite' && <Chip size="small" color="warning" label="邀请阶段" />}
          </Stack>
          <Typography variant="body2" color="text.secondary">{evt.desc}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar>{evt.host[0]}</Avatar>
            <Typography variant="body2">Host：{evt.host}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <AvatarGroup max={5}>
              {evt.people.map((name) => (
                <Avatar key={name}>{name[0]}</Avatar>
              ))}
            </AvatarGroup>
            <Typography variant="body2" color={evt.spots > 0 ? 'success.main' : 'text.secondary'}>
              {evt.spots > 0 ? `还剩 ${evt.spots}/${evt.total} 位` : '已满，可排队'}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
        <Button variant="contained">{evt.phase === 'invite' ? '接受邀请' : '报名参加'}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function EventsPage() {
  const navigate = useNavigate();
  const data = useLoaderData() as EventsPageData;
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selected, setSelected] = useState<EventData | null>(null);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="upcoming" label={`即将到来 (${data.upcoming.length})`} />
        <Tab value="past" label="过往活动" />
      </Tabs>

      {tab === 'upcoming' && (
        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Typography variant="h6">🎲 本周小局</Typography>
                <Typography variant="caption" color="text.secondary">每周抽签 · 第 12 期</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                星星本周轮值做东，可以发起一个 2-6 人的小聚：咖啡、散步、电影都可以。
              </Typography>
            </CardContent>
            <CardActions>
              <Button variant="contained" startIcon={<HomeOutlinedIcon />} onClick={() => navigate('/events/small-group/new')}>发起小局</Button>
              <Button onClick={() => navigate('/events/history')}>查看历史</Button>
            </CardActions>
          </Card>

          <Grid container spacing={2}>
            {data.upcoming.map((evt) => (
              <Grid key={evt.id} size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">{evt.title}</Typography>
                        {evt.phase === 'invite' && <Chip size="small" color="warning" label="邀请" />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">{evt.date} · {evt.location}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 26, height: 26 }}>{evt.host[0]}</Avatar>
                        <Typography variant="body2" color="text.secondary">{evt.host} Host</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <AvatarGroup max={4}>
                          {evt.people.map((name) => (
                            <Avatar key={name}>{name[0]}</Avatar>
                          ))}
                        </AvatarGroup>
                        <Typography variant="body2" color={evt.spots > 0 ? 'success.main' : 'text.secondary'}>
                          还剩 {evt.spots} 位
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => navigate(`/events/${evt.id}`)}>查看详情</Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle1">💡 大家的想法</Typography>
                <Button size="small" onClick={() => navigate('/events/proposals')}>查看全部</Button>
              </Stack>
              <Stack spacing={1.2}>
                {data.proposals.map((proposal, idx) => (
                  <Box key={idx} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                    <Typography fontWeight={700}>{proposal.title}</Typography>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">{proposal.name} · {proposal.time}</Typography>
                      <Button size="small" variant="outlined" onClick={() => navigate('/events/proposals')}>🙋 {proposal.votes}</Button>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}

      {tab === 'past' && (
        <Stack spacing={2}>
          <Box sx={{ textAlign: 'right' }}>
            <Button size="small" onClick={() => navigate('/events/history')}>进入活动记录页</Button>
          </Box>
          <Grid container spacing={2}>
          {data.past.map((evt, idx) => (
            <Grid key={idx} size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1">{evt.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{evt.date} · {evt.host} Host · {evt.people} 人</Typography>
                  {evt.film && <Chip sx={{ mt: 1 }} size="small" label={`🎬 ${evt.film}`} />}
                </CardContent>
              </Card>
            </Grid>
          ))}
          </Grid>
        </Stack>
      )}

      <Box sx={{ position: 'fixed', right: { xs: 16, md: 32 }, bottom: { xs: 84, md: 24 } }}>
        <SpeedDial icon={<AddRoundedIcon />} ariaLabel="create event" direction="up">
          <SpeedDialAction icon={<HomeOutlinedIcon />} tooltipTitle="发起小局" onClick={() => navigate('/events/small-group/new')} />
          <SpeedDialAction icon={<LightbulbOutlinedIcon />} tooltipTitle="提一个想法" onClick={() => navigate('/events/proposals/new')} />
        </SpeedDial>
      </Box>

      <Fab color="primary" sx={{ display: 'none' }}>
        <AddRoundedIcon />
      </Fab>

      <EventDetailDialog evt={selected} open={Boolean(selected)} onClose={() => setSelected(null)} />
    </Box>
  );
}
