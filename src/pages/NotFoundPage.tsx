import { useNavigate } from 'react-router';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, bgcolor: 'background.default' }}>
      <Card sx={{ width: '100%', maxWidth: 560 }}>
        <CardContent>
          <Stack spacing={2.5} alignItems="center" textAlign="center">
            <Typography variant="h2" fontWeight={800} color="primary.main">404</Typography>
            <Typography variant="h5" fontWeight={700}>页面走丢了</Typography>
            <Typography variant="body2" color="text.secondary">
              你访问的页面不存在，可能已经被移动，或者链接地址有误。
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button variant="contained" onClick={() => navigate('/')}>回到首页</Button>
              <Button variant="outlined" onClick={() => navigate('/events')}>去看活动</Button>
              <Button variant="outlined" onClick={() => navigate('/discover')}>去看推荐</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
