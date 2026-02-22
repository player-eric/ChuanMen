import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { createSmallGroupEvent } from '@/lib/domainApi';

export default function SmallGroupCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('本周小局');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [capacity, setCapacity] = useState(6);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [navigate, user]);

  if (!user) {
    return null;
  }

  const onSubmit = async () => {
    if (!user?.id) {
      setError('请先登录后再发起小局');
      return;
    }
    if (!title.trim() || !location.trim() || !startsAt) {
      setError('请填写完整信息');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const event = await createSmallGroupEvent({
        title: title.trim(),
        hostId: user.id,
        location: location.trim(),
        startsAt: new Date(startsAt).toISOString(),
        capacity,
        description: description.trim(),
      });
      navigate(`/events/${String(event._id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '发起失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={700}>发起小局</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="标题" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          <TextField label="地点" value={location} onChange={(e) => setLocation(e.target.value)} fullWidth />
          <TextField
            label="开始时间"
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            fullWidth
          />
          <TextField
            label="人数上限"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Math.max(2, Math.min(10, Number(e.target.value) || 6)))}
            fullWidth
          />
          <TextField
            label="活动说明"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          <Box>
            <Button variant="contained" onClick={onSubmit} disabled={submitting}>
              {submitting ? '提交中...' : '发布小局'}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
