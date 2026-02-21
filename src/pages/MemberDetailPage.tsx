import { useLoaderData } from 'react-router';
import { Avatar, Box, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import type { MemberDetailData } from '@/types';

export default function MemberDetailPage() {
  const data = useLoaderData() as MemberDetailData | null;

  if (!data?.member) {
    return <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>找不到这个成员</Typography>;
  }

  const member = data.member;

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ width: 58, height: 58 }}>{member.name[0]}</Avatar>
            <Box>
              <Typography variant="h6">{member.name}</Typography>
              <Typography variant="body2" color="text.secondary">{member.role}</Typography>
              <Stack direction="row" spacing={0.8} sx={{ mt: 0.8 }}>
                {member.titles.map((title) => <Chip key={title} size="small" color="warning" label={title} />)}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={1.2}>
        {[
          { label: '一起参加', value: member.mutual.evtCount },
          { label: '共同投片', value: member.mutual.movies.length },
          { label: '互寄卡片', value: member.mutual.cards },
          { label: 'Host 次数', value: member.host },
        ].map((item) => (
          <Grid key={item.label} size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary.main" fontWeight={800}>{item.value}</Typography>
                <Typography variant="caption" color="text.secondary">{item.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>共同品味</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {member.mutual.movies.length > 0
              ? member.mutual.movies.map((movie) => <Chip key={movie} size="small" label={movie} />)
              : <Typography variant="body2" color="text.secondary">暂无共同影片</Typography>}
          </Stack>

          <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 2, mb: 1 }}>一起参加的活动</Typography>
          <Stack spacing={0.8}>
            {member.mutual.events.length > 0
              ? member.mutual.events.map((eventName) => (
                <Typography key={eventName} variant="body2" color="text.secondary">• {eventName}</Typography>
              ))
              : <Typography variant="body2" color="text.secondary">暂无共同活动</Typography>}
          </Stack>

          <Button variant="contained" sx={{ mt: 2 }}>✉ 寄张感谢卡</Button>
        </CardContent>
      </Card>
    </Stack>
  );
}
