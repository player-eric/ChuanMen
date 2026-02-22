import { useEffect, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { Alert, Box, Button, Card, CardContent, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import type { Proposal } from '@/types';
import { searchProposals } from '@/lib/domainApi';
import { useAuth } from '@/auth/AuthContext';

export default function EventProposalsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const proposals = useLoaderData() as Proposal[];
  const [keyword, setKeyword] = useState('');
  const [searchedItems, setSearchedItems] = useState<Record<string, unknown>[]>([]);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!keyword.trim()) {
        setSearchedItems([]);
        setSearchError('');
        return;
      }
      try {
        const result = await searchProposals(keyword.trim());
        setSearchedItems(result.items);
        setSearchError('');
      } catch (error) {
        setSearchError(error instanceof Error ? error.message : '搜索失败，请稍后重试');
      }
    };

    void run();
  }, [keyword]);

  return (
    <Stack spacing={2}>
      <TextField
        placeholder="搜索想法"
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
      <Box>
        <Button variant="contained" onClick={() => navigate('/events/proposals/new')} disabled={!user}>
          {user ? '添加想法' : '登录后可添加想法'}
        </Button>
      </Box>

      {searchError && <Alert severity="error">{searchError}</Alert>}

      {searchedItems.map((item) => (
        <Card key={String(item._id)}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700}>{String(item.title ?? '')}</Typography>
            <Typography variant="body2" color="text.secondary">{String(item.description ?? '')}</Typography>
          </CardContent>
        </Card>
      ))}

      {!!keyword.trim() && searchedItems.length === 0 && !searchError && (
        <Typography variant="body2" color="text.secondary">没有匹配想法</Typography>
      )}

      {proposals.map((proposal, idx) => (
        <Card key={idx}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700}>{proposal.title}</Typography>
            <Typography variant="caption" color="text.secondary">{proposal.name} · {proposal.time}</Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
              <Typography variant="body2" color="text.secondary">{proposal.interested.length} 人感兴趣</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="outlined" disabled={!user}>🙋 感兴趣 {proposal.votes}</Button>
                <Button size="small" variant="contained" onClick={() => navigate('/events/small-group/new')} disabled={!user}>
                  {user ? '🏠 我来组织' : '登录后可组织'}
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
