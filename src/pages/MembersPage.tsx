import { useLoaderData, useNavigate } from 'react-router';
import { Avatar, Card, CardActionArea, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import type { MemberData } from '@/types';

export default function MembersPage() {
  const { members } = useLoaderData() as { members: MemberData[] };
  const navigate = useNavigate();

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {members.length} 位成员 · {members.filter((member) => member.host > 0).length} 位 Host
      </Typography>

      <Grid container spacing={1.5}>
        {members.map((member) => (
          <Grid key={member.name} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardActionArea onClick={() => navigate(`/members/${encodeURIComponent(member.name)}`)}>
                <CardContent>
                  <Stack spacing={1.2} alignItems="center" textAlign="center">
                    <Avatar sx={{ width: 48, height: 48 }}>{member.name[0]}</Avatar>
                    <Typography fontWeight={700}>{member.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{member.role}</Typography>
                    <Stack direction="row" spacing={0.6} flexWrap="wrap" justifyContent="center">
                      {member.titles.map((title) => (
                        <Chip key={title} size="small" color="warning" label={title} />
                      ))}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Host ×{member.host} · 一起 {member.mutual.evtCount} 次
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
