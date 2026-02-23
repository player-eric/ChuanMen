import { useEffect, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { Alert, Box, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import type { Proposal } from '@/types';
import { searchProposals } from '@/lib/domainApi';
import { useAuth } from '@/auth/AuthContext';
import { useColors } from '@/hooks/useColors';
import { Ava, AvaStack, Card, Btn } from '@/components/Atoms';
import { FeedActions } from '@/components/FeedItems';

export default function EventProposalsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const c = useColors();
  const proposals = useLoaderData() as Proposal[];
  const [keyword, setKeyword] = useState('');
  const [searchedItems, setSearchedItems] = useState<Record<string, unknown>[]>([]);
  const [searchError, setSearchError] = useState('');
  const [interested, setInterested] = useState<Record<number, boolean>>({});

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

  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <Stack spacing={2}>
      <TextField
        placeholder="搜索创意"
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
        <Btn filled onClick={() => navigate('/events/proposals/new')} disabled={!user}>
          {user ? '添加创意' : '登录后可添加创意'}
        </Btn>
      </Box>

      {searchError && <Alert severity="error">{searchError}</Alert>}

      {searchedItems.map((item) => (
        <Card key={String(item._id)}>
          <div style={{ padding: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{String(item.title ?? '')}</div>
            <div style={{ fontSize: 14, color: c.text2, marginTop: 4 }}>{String(item.description ?? '')}</div>
          </div>
        </Card>
      ))}

      {!!keyword.trim() && searchedItems.length === 0 && !searchError && (
        <Typography variant="body2" color="text.secondary">没有匹配创意</Typography>
      )}

      {proposals.map((proposal) => {
        const v = interested[proposal.id] ?? false;
        return (
          <Card key={proposal.id}>
            <div style={{ padding: 14 }}>
              {/* Author header */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <Ava name={proposal.name} size={32} onTap={() => goMember(proposal.name)} />
                <div>
                  <div style={{ fontSize: 14 }}>
                    <b onClick={() => goMember(proposal.name)} style={{ cursor: 'pointer' }}>{proposal.name}</b> 提了一个活动创意
                  </div>
                  <div style={{ fontSize: 12, color: c.text3 }}>{proposal.time}</div>
                </div>
              </div>

              {/* Title — clickable to detail */}
              <div
                style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, cursor: 'pointer' }}
                onClick={() => navigate(`/events/proposals/${proposal.id}`)}
              >{'💡'} {proposal.title}</div>

              {/* Interested people */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
                <AvaStack names={proposal.interested} size={18} />
                <span style={{ fontSize: 12, color: c.text3 }}>{proposal.interested.length} 人感兴趣</span>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => user && setInterested((prev) => ({ ...prev, [proposal.id]: !prev[proposal.id] }))}
                  style={{
                    padding: '6px 16px', borderRadius: 6,
                    background: v ? c.blue + '15' : c.s2,
                    border: `1px solid ${v ? c.blue + '40' : c.line}`,
                    color: !user ? c.text3 : v ? c.blue : c.text2,
                    fontSize: 14, fontWeight: 600, cursor: user ? 'pointer' : 'default',
                    opacity: user ? 1 : 0.5,
                  }}
                >
                  {v ? '✓ 我也感兴趣' : '我感兴趣'} · {proposal.votes + (v ? 1 : 0)}
                </button>
                <button
                  onClick={() => user && navigate('/events/new', { state: { fromProposal: { title: proposal.title, descriptionHtml: proposal.descriptionHtml ?? '' } } })}
                  style={{
                    padding: '6px 16px', borderRadius: 6,
                    background: c.warm,
                    border: 'none',
                    color: c.bg,
                    fontSize: 14, fontWeight: 600, cursor: user ? 'pointer' : 'default',
                    opacity: user ? 1 : 0.5,
                  }}
                >
                  🏠 我来组织
                </button>
              </div>
            </div>

            {/* Reuse feed's like + comment bar */}
            <FeedActions
              likes={proposal.likes ?? 0}
              likedBy={proposal.likedBy ?? []}
              comments={proposal.comments ?? []}
            />
          </Card>
        );
      })}
    </Stack>
  );
}
