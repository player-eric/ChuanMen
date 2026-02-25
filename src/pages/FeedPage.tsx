import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLoaderData } from 'react-router';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import type { FeedPageData, FeedItem } from '@/types';
import QuickActionDialog from '@/components/QuickActionDialog';
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
  FeedActionNotice,
} from '@/components/FeedItems';

/* ═══ Mock: current small-group draw ═══ */
const currentDraw = { person: '星星', week: 12 };

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
const PAGE_SIZE = 8;

function FullFeed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items } = useLoaderData() as FeedPageData;
  const [snackMsg, setSnackMsg] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [quickOpen, setQuickOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = visible < items.length;

  const loadMore = useCallback(() => {
    setVisible((v) => Math.min(v + PAGE_SIZE, items.length));
  }, [items.length]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // Reset visible count when items change (e.g. revalidation)
  useEffect(() => { setVisible(PAGE_SIZE); }, [items]);

  const canInteract = Boolean(user);
  const isDrawnPerson = user?.name === currentDraw.person;

  return (
    <Box>
      {isDrawnPerson && (
        <Card sx={{ mb: 2, border: '1px solid', borderColor: 'primary.light', bgcolor: 'primary.50' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>🎲 本周轮到你 Host！</Typography>
            <Typography variant="body2" color="text.secondary">
              约谁、做什么、几个人，你说了算。
            </Typography>
            <Typography variant="body2" color="text.secondary">
              咖啡、散步、看电影都可以，2-6人。
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate('/events/new', { state: { preTag: '小聚' } })}
                sx={{ textTransform: 'none' }}
              >
                🏠 发起小聚
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSnackMsg('已跳过，系统将重新抽签')}
                sx={{ textTransform: 'none' }}
              >
                这周不行
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        {items.slice(0, visible).map((item, idx) => (
          <Grid key={idx} size={gridSizeFor(item.type)} sx={
            (item.type !== 'time' && item.type !== 'milestone')
              ? { display: 'grid', '& > *': { minHeight: 0 } }
              : undefined
          }>
            {renderFeedItem(item)}
          </Grid>
        ))}
      </Grid>

      {/* Sentinel + loading indicator for infinite scroll */}
      <div ref={sentinelRef} />
      {hasMore && (
        <Stack alignItems="center" sx={{ py: 3 }}>
          <CircularProgress size={28} />
        </Stack>
      )}

      <Stack spacing={1} sx={{ position: 'fixed', right: { xs: 16, md: 32 }, bottom: { xs: 84, md: 24 }, alignItems: 'stretch' }}>
        <Button variant="contained" size="small" onClick={() => setQuickOpen(true)} disabled={!canInteract}
          sx={{ borderRadius: 6, textTransform: 'none', px: 2, py: 0.8, fontSize: 13, fontWeight: 600, justifyContent: 'flex-start' }}>
          ✏️ 写点什么
        </Button>
        <Button variant="outlined" size="small" onClick={() => navigate('/events/new')} disabled={!canInteract}
          sx={{ borderRadius: 6, textTransform: 'none', px: 2, py: 0.8, fontSize: 13, fontWeight: 600, justifyContent: 'flex-start', bgcolor: 'background.paper' }}>
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

      <QuickActionDialog open={quickOpen} onClose={() => setQuickOpen(false)} />

      <Snackbar
        open={Boolean(snackMsg)}
        autoHideDuration={3000}
        onClose={() => setSnackMsg('')}
        message={snackMsg}
      />
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
    case 'actionNotice':   return <FeedActionNotice {...props as React.ComponentProps<typeof FeedActionNotice>} />;
  }
}

/* ═══ FeedPage ═══ */
export default function FeedPage() {
  const data = useLoaderData() as FeedPageData;
  // Feed is "empty" when there are no real content items (only milestone placeholder counts as empty)
  const isEmpty = !data.items || data.items.length === 0 || (data.items.length === 1 && data.items[0].type === 'milestone');
  return isEmpty ? <EmptyFeed /> : <FullFeed />;
}
