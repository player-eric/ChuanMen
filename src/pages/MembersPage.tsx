import { useMemo, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { Avatar, Box, Card, CardActionArea, CardContent, Chip, Grid, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import type { MemberData } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState } from '@/components/EmptyState';
import { photos } from '@/theme';

export default function MembersPage() {
  const { members } = useLoaderData() as { members: MemberData[] };
  const navigate = useNavigate();
  const { user } = useAuth();
  const [keyword, setKeyword] = useState('');

  const filteredMembers = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return members;
    return members.filter((member) => {
      const searchable = `${member.name} ${member.role} ${member.titles.join(' ')} ${member.bio ?? ''} ${member.location ?? ''}`.toLowerCase();
      return searchable.includes(q);
    });
  }, [keyword, members]);

  return (
    <Stack spacing={2}>
      <TextField
        placeholder="搜索成员、称号、角色、城市"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      <Typography variant="body2" color="text.secondary">
        {filteredMembers.length} / {members.length} 位成员 · {members.filter((member) => member.host > 0).length} 位 Host
      </Typography>

      <Grid container spacing={1.5}>
        {filteredMembers.map((member) => (
          <Grid key={member.name} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ overflow: 'hidden' }}>
              <CardActionArea onClick={() => navigate(`/members/${encodeURIComponent(member.name)}`)}>
                {/* Mini cover strip */}
                {(() => {
                  const raw = member.coverImageUrl || photos.cozy;
                  const isGrad = raw.startsWith('linear-gradient') || raw.startsWith('radial-gradient');
                  return (
                    <Box sx={{ height: 56, background: isGrad ? raw : `url(${raw}) center/cover no-repeat` }} />
                  );
                })()}
                <CardContent sx={{ mt: -3.5 }}>
                  <Stack spacing={1.2} alignItems="center" textAlign="center">
                    <Avatar src={member.avatar} sx={{ width: 52, height: 52, border: '2.5px solid', borderColor: 'background.paper', fontSize: 20 }}>{member.name[0]}</Avatar>
                    <Typography fontWeight={700}>{member.name}</Typography>
                    {member.location && (
                      <Typography variant="caption" color="text.secondary">{member.location}</Typography>
                    )}
                    {/* v2.1 §4.9: show email on member wall if not hidden */}
                    {user && member.email && !member.hideEmail && (
                      <Typography variant="caption" color="text.secondary">{member.email}</Typography>
                    )}
                    {member.bio && (
                      <Typography variant="caption" color="text.secondary" sx={{ maxHeight: 40, overflow: 'hidden' }}>
                        {member.bio.length > 50 ? member.bio.slice(0, 50) + '...' : member.bio}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">{member.role}</Typography>
                    <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap justifyContent="center">
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

      {filteredMembers.length === 0 && !keyword.trim() && (
        <EmptyState
          icon="👥"
          title="暂时无法加载成员信息"
          description="请稍后重试"
        />
      )}
      {filteredMembers.length === 0 && keyword.trim() && (
        <Typography variant="body2" color="text.secondary">没有匹配成员，请更换关键词</Typography>
      )}
    </Stack>
  );
}
