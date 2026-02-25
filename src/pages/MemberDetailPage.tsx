import { useLoaderData, useNavigate } from 'react-router';
import { Avatar, Box, Button, Card, CardContent, Chip, Divider, Grid, Stack, Typography } from '@mui/material';
import type { MemberDetailData } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { RichTextViewer } from '@/components/RichTextEditor';

export default function MemberDetailPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const data = useLoaderData() as MemberDetailData | null;

  if (!data?.member) {
    return <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>找不到这个成员</Typography>;
  }

  const member = data.member;

  return (
    <Stack spacing={2}>
      {/* Cover image */}
      {member.coverImageUrl && (
        <Box sx={{ borderRadius: 2, overflow: 'hidden', height: 160 }}>
          <img src={member.coverImageUrl} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Box>
      )}

      <Card>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar src={member.avatar} sx={{ width: 58, height: 58 }}>{member.name[0]}</Avatar>
            <Box>
              <Typography variant="h6">{member.name}</Typography>
              {member.location && (
                <Typography variant="caption" color="text.secondary">📍 {member.location}</Typography>
              )}
              <Typography variant="body2" color="text.secondary">{member.role}</Typography>
              {/* v2.1: show email if not hidden, only visible to logged-in users */}
              {user && member.email && !member.hideEmail && (
                <Typography variant="caption" color="text.secondary">{member.email}</Typography>
              )}
              <Stack direction="row" spacing={0.8} sx={{ mt: 0.8 }}>
                {member.titles.map((title) => <Chip key={title} size="small" color="warning" label={title} />)}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* v2.1 §4.9: Bio & self-description fields */}
      {(member.bio || member.selfAsFriend || member.idealFriend || member.participationPlan) && (
        <Card>
          <CardContent>
            {member.bio && (
              <>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>关于我</Typography>
                <RichTextViewer html={member.bio} />
              </>
            )}
            {member.selfAsFriend && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>作为朋友，我</Typography>
                <RichTextViewer html={member.selfAsFriend} />
              </>
            )}
            {member.idealFriend && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>我理想中的朋友</Typography>
                <RichTextViewer html={member.idealFriend} />
              </>
            )}
            {member.participationPlan && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>参与计划</Typography>
                <RichTextViewer html={member.participationPlan} />
              </>
            )}
          </CardContent>
        </Card>
      )}

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

          <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/cards', { state: { recipientName: member.name, recipientId: (member as any).id } })} disabled={!user}>
            {user ? '✉ 寄张感谢卡' : '登录后可寄感谢卡'}
          </Button>
        </CardContent>
      </Card>
    </Stack>
  );
}
