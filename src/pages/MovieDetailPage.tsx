import { useLoaderData, useNavigate } from 'react-router';
import { Avatar, AvatarGroup, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import type { MoviePool } from '@/types';
import { upcomingEvents } from '@/mock/data';

export default function MovieDetailPage() {
  const navigate = useNavigate();
  const movie = useLoaderData() as MoviePool | null;

  if (!movie) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">电影不存在</Typography>
          <Button sx={{ mt: 1 }} onClick={() => navigate('/discover')}>返回推荐页</Button>
        </CardContent>
      </Card>
    );
  }

  const relatedEvents = upcomingEvents.filter((event) => event.film === movie.title);

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight={700}>{movie.title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {movie.year} · {movie.dir}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1.5 }}>推荐人：{movie.by}</Typography>
          <Typography variant="body2">总票数：{movie.v}</Typography>
          {movie.status && <Typography variant="body2" color="success.main">状态：{movie.status}</Typography>}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>投票人（示意）</Typography>
          <AvatarGroup max={6}>
            <Avatar>白</Avatar>
            <Avatar>Y</Avatar>
            <Avatar>橙</Avatar>
            <Avatar>星</Avatar>
            <Avatar>T</Avatar>
          </AvatarGroup>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>关联活动</Typography>
          {relatedEvents.length > 0 ? (
            <Stack spacing={0.75}>
              {relatedEvents.map((event) => (
                <Typography key={event.id} variant="body2">📅 {event.date} · {event.title}</Typography>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">暂无关联活动</Typography>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
