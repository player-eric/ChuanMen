import { useEffect, useState } from 'react';
import { useLoaderData, useNavigate, useParams } from 'react-router';
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Alert,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import type { EventData } from '@/types';
import { getEventById, signupEvent } from '@/lib/domainApi';
import { useAuth } from '@/auth/AuthContext';

export default function EventDetailPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { user } = useAuth();
  const loadedEvent = useLoaderData() as EventData | null;
  const [event, setEvent] = useState<EventData | null>(loadedEvent);
  const [flash, setFlash] = useState<{
    open: boolean;
    severity: 'success' | 'error';
    message: string;
  }>({
    open: false,
    severity: 'success',
    message: '',
  });

  useEffect(() => {
    const run = async () => {
      if (!eventId || loadedEvent) {
        return;
      }
      try {
        const item = await getEventById(eventId);
        setEvent({
          id: 0,
          title: String(item.title ?? ''),
          host: 'Host',
          date: new Date(String(item.startsAt ?? new Date().toISOString())).toLocaleString('zh-CN'),
          location: String(item.location ?? ''),
          scene: 'small-group',
          film: undefined,
          spots: Math.max(0, Number(item.capacity ?? 0)),
          total: Number(item.capacity ?? 0),
          people: [],
          phase: String(item.phase ?? 'open') === 'invite' ? 'invite' : 'open',
          desc: String(item.description ?? ''),
        });
      } catch {
        setEvent(null);
      }
    };

    void run();
  }, [eventId, loadedEvent]);

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

  const onSignup = async () => {
    if (!eventId || eventId.length !== 24) {
      navigate('/events');
      return;
    }
    if (!user?.id) {
      setFlash({ open: true, severity: 'error', message: '请先登录后再报名' });
      return;
    }
    try {
      await signupEvent(eventId, user.id);
      setFlash({ open: true, severity: 'success', message: '报名参加成功' });
    } catch (error) {
      setFlash({
        open: true,
        severity: 'error',
        message: error instanceof Error ? error.message : '报名失败，请稍后重试',
      });
    }
  };

  return (
    <Stack spacing={2}>
      <Snackbar
        open={flash.open}
        autoHideDuration={3500}
        onClose={() => setFlash((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={flash.severity}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => setFlash((prev) => ({ ...prev, open: false }))}
            >
              取消
            </Button>
          }
        >
          {flash.message}
        </Alert>
      </Snackbar>
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
        <Button variant="contained" fullWidth onClick={onSignup} disabled={!user}>
          {!user ? '登录后可报名' : event.phase === 'invite' ? '接受邀请' : '报名参加'}
        </Button>
      </Box>
    </Stack>
  );
}
