import { useLoaderData, useNavigate } from 'react-router';
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import type { EventData } from '@/types';

export default function EventDetailPage() {
  const navigate = useNavigate();
  const event = useLoaderData() as EventData | null;

  if (!event) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">活动不存在</Typography>
          <Button sx={{ mt: 1 }} onClick={() => navigate('/events')}>返回活动页</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h5" fontWeight={700}>{event.title}</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip size="small" label={`📅 ${event.date}`} />
              <Chip size="small" label={`📍 ${event.location}`} />
              {event.phase === 'invite' && <Chip size="small" color="warning" label="邀请阶段" />}
            </Stack>
            <Typography variant="body2" color="text.secondary">{event.desc}</Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>参与者</Typography>
            <Typography variant="body2" color={event.spots > 0 ? 'success.main' : 'text.secondary'}>
              {event.spots > 0 ? `还剩 ${event.spots}/${event.total} 位` : '已满 · 可排队'}
            </Typography>
          </Stack>
          <AvatarGroup max={6}>
            {event.people.map((name) => (
              <Avatar key={name}>{name[0]}</Avatar>
            ))}
          </AvatarGroup>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Host</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar>{event.host[0]}</Avatar>
            <Typography>{event.host}</Typography>
          </Stack>
        </CardContent>
      </Card>

      <Box>
        <Button variant="contained" fullWidth>
          {event.phase === 'invite' ? '接受邀请' : '报名参加'}
        </Button>
      </Box>
    </Stack>
  );
}
