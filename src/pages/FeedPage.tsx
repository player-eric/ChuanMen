import React from 'react';
import { useNavigate, useLoaderData, useOutletContext } from 'react-router';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import type { FeedPageData, FeedItem } from '@/types';
import {
  FeedTime,
  FeedActivity,
  FeedCard,
  FeedMovie,
  FeedMilestone,
  FeedProposal,
  FeedCompactMovie,
  FeedCompactProposal,
  FeedBook,
  FeedCompactBook,
  FeedSmallGroup,
  FeedCompactSmallGroup,
  FeedCommentNotice,
} from '@/components/FeedItems';

/* ═══ Empty Feed ═══ */
function EmptyFeed() {
  const navigate = useNavigate();
  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>👋 欢迎来到串门儿！</Typography>
          <Typography variant="body2" color="text.secondary">
            串门儿是一群住在新泽西的朋友，通过小型聚会认识彼此。先看看最近有什么活动，或者去推荐页选一部想看的电影。
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={1.5}>
        {[
          { icon: '📅', label: '看看活动', desc: '最近有什么好玩的', page: '/events' },
          { icon: '🎬', label: '推荐电影', desc: '投票选下次看什么', page: '/discover' },
          { icon: '📖', label: '了解串门', desc: '我们是谁、怎么玩', page: '/about' },
          { icon: '✉', label: '寄感谢卡', desc: '给朋友说声谢谢', page: '/cards' },
        ].map((a, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6 }}>
            <Card sx={{ cursor: 'pointer' }} onClick={() => navigate(a.page)}>
              <CardContent>
                <Typography variant="h5">{a.icon}</Typography>
                <Typography fontWeight={700}>{a.label}</Typography>
                <Typography variant="body2" color="text.secondary">{a.desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="body2" color="text.secondary" textAlign="center">
        动态流会随着你参加活动慢慢丰富起来 ✨
      </Typography>
    </Stack>
  );
}

/* ═══ Grid size helpers ═══ */
const fullWidth = { xs: 12 } as const;
const halfWidth = { xs: 12, md: 6 } as const;

function gridSizeFor(type: FeedItem['type']) {
  if (type === 'time' || type === 'milestone') return fullWidth;
  return halfWidth;
}

/* ═══ Full Feed (Timeline) ═══ */
function FullFeed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items } = useLoaderData() as FeedPageData;

  const canInteract = Boolean(user);

  return (
    <Box>
      <Grid container spacing={2}>
        {items.map((item, idx) => (
          <Grid key={idx} size={gridSizeFor(item.type)} sx={
            (item.type !== 'time' && item.type !== 'milestone')
              ? { display: 'grid', '& > *': { minHeight: 0 } }
              : undefined
          }>
            {renderFeedItem(item)}
          </Grid>
        ))}
      </Grid>

      <Stack spacing={1} sx={{ position: 'fixed', right: { xs: 16, md: 32 }, bottom: { xs: 84, md: 24 }, alignItems: 'stretch' }}>
        <Button variant="contained" size="small" onClick={() => navigate('/events/new')} disabled={!canInteract}
          sx={{ borderRadius: 6, textTransform: 'none', px: 2, py: 0.8, fontSize: 13, fontWeight: 600, justifyContent: 'flex-start' }}>
          + 发起活动
        </Button>
        <Button variant="outlined" size="small" onClick={() => navigate('/events/proposals/new')} disabled={!canInteract}
          sx={{ borderRadius: 6, textTransform: 'none', px: 2, py: 0.8, fontSize: 13, fontWeight: 600, justifyContent: 'flex-start', bgcolor: 'background.paper' }}>
          💡 提创意
        </Button>
        <Button variant="outlined" size="small" onClick={() => navigate('/cards')} disabled={!canInteract}
          sx={{ borderRadius: 6, textTransform: 'none', px: 2, py: 0.8, fontSize: 13, fontWeight: 600, justifyContent: 'flex-start', bgcolor: 'background.paper' }}>
          ✉ 寄感谢卡
        </Button>
        <Button variant="outlined" size="small" onClick={() => navigate('/discover')} disabled={!canInteract}
          sx={{ borderRadius: 6, textTransform: 'none', px: 2, py: 0.8, fontSize: 13, fontWeight: 600, justifyContent: 'flex-start', bgcolor: 'background.paper' }}>
          👍 推荐电影
        </Button>
      </Stack>
    </Box>
  );
}

/* ═══ Render a single FeedItem ═══ */
function renderFeedItem(item: FeedItem) {
  if (item.type === 'time') return <FeedTime label={item.label} />;
  const { type, ...props } = item;
  switch (type) {
    case 'activity':       return <FeedActivity {...props as React.ComponentProps<typeof FeedActivity>} />;
    case 'card':           return <FeedCard {...props as React.ComponentProps<typeof FeedCard>} />;
    case 'movie':          return <FeedMovie {...props as React.ComponentProps<typeof FeedMovie>} />;
    case 'milestone':      return <FeedMilestone {...props as React.ComponentProps<typeof FeedMilestone>} />;
    case 'proposal':       return <FeedProposal {...props as React.ComponentProps<typeof FeedProposal>} />;
    case 'compactMovie':   return <FeedCompactMovie {...props as React.ComponentProps<typeof FeedCompactMovie>} />;
    case 'compactProposal': return <FeedCompactProposal {...props as React.ComponentProps<typeof FeedCompactProposal>} />;
    case 'book':           return <FeedBook {...props as React.ComponentProps<typeof FeedBook>} />;
    case 'compactBook':    return <FeedCompactBook {...props as React.ComponentProps<typeof FeedCompactBook>} />;
    case 'smallGroup':     return <FeedSmallGroup {...props as React.ComponentProps<typeof FeedSmallGroup>} />;
    case 'compactSmallGroup': return <FeedCompactSmallGroup {...props as React.ComponentProps<typeof FeedCompactSmallGroup>} />;
    case 'commentNotice':  return <FeedCommentNotice {...props as React.ComponentProps<typeof FeedCommentNotice>} />;
  }
}

/* ═══ FeedPage ═══ */
export default function FeedPage() {
  const { isEmpty } = useOutletContext<{ isEmpty: boolean }>();
  return isEmpty ? <EmptyFeed /> : <FullFeed />;
}
