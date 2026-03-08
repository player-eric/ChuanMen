import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLoaderData } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Snackbar,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import type { FeedPageData, FeedItem, LotteryDraw } from '@/types';
import { sendPostcard, acceptLottery, skipLottery, updateHostCandidate } from '@/lib/domainApi';
import { Ava } from '@/components/Atoms';
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
  FeedRecommendation,
  FeedBook,
  FeedCompactBook,
  FeedSmallGroup,
  FeedCompactSmallGroup,
  FeedCommentNotice,
  FeedActionNotice,
  FeedNewMember,
  FeedBirthday,
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
          { icon: '🎬', label: '推荐好内容', desc: '电影、书、餐厅…', page: '/discover' },
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
  if (type === 'time' || type === 'milestone' || type === 'announcement' || type === 'newMember') return fullWidth;
  return halfWidth;
}

/* ═══ Quick Postcard Dialog ═══ */
const quickMessages = ['谢谢你的款待！', '一起很开心！', '下次再约！', '认识你真好！'];

function QuickPostcardDialog({
  open, onClose, participants, eventId, eventTitle, onSent,
}: {
  open: boolean;
  onClose: () => void;
  participants: { id: string; name: string }[];
  eventId: string;
  eventTitle: string;
  onSent: (msg: string) => void;
}) {
  const { user } = useAuth();
  const [toId, setToId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) { setToId(''); setMessage(''); }
  }, [open]);

  const handleSend = async () => {
    if (!user?.id || !toId || !message.trim()) return;
    setSending(true);
    try {
      await sendPostcard({
        fromId: user.id,
        toId,
        message: message.trim(),
        eventId,
        eventCtx: eventTitle,
        visibility: 'public',
      });
      onSent('感谢卡已寄出！');
      onClose();
    } catch {
      onSent('发送失败，请重试');
    } finally {
      setSending(false);
    }
  };

  const others = participants.filter((p) => p.id !== user?.id);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>寄感谢卡</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          感谢「{eventTitle}」的小伙伴
        </Typography>

        {/* Step 1: pick recipient */}
        <Typography variant="caption" color="text.secondary">选择收件人</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2, mt: 0.5 }}>
          {others.map((p) => (
            <Chip
              key={p.id}
              avatar={<Ava name={p.name} size={24} />}
              label={p.name}
              onClick={() => setToId(p.id)}
              color={toId === p.id ? 'primary' : 'default'}
              variant={toId === p.id ? 'filled' : 'outlined'}
            />
          ))}
        </Stack>

        {/* Step 2: pick or write message */}
        <Typography variant="caption" color="text.secondary">选择或输入留言</Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5, mb: 1.5 }}>
          {quickMessages.map((m) => (
            <Chip
              key={m}
              label={m}
              size="small"
              onClick={() => setMessage(m)}
              color={message === m ? 'primary' : 'default'}
              variant={message === m ? 'filled' : 'outlined'}
            />
          ))}
        </Stack>
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          placeholder="写点什么..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSend} disabled={!toId || !message.trim() || sending}>
          {sending ? '发送中…' : '寄出'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ═══ Recap Banner for recently ended events ═══ */
function RecapBanner({ items, onSnack }: { items: FeedItem[]; onSnack: (msg: string) => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [quickCardOpen, setQuickCardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem('chuanmen.feed.recapDismissed');
    if (raw) {
      try { setDismissed(new Set(JSON.parse(raw))); } catch {}
    }
  }, []);

  if (!user) return null;

  // Find recently ended activities the user participated in (within 7 days)
  const RECAP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const endedMine = items.filter(
    (it): it is Extract<FeedItem, { type: 'activity' }> => {
      if (it.type !== 'activity') return false;
      const a = it as any;
      if (a.phase !== 'ended') return false;
      if (!Array.isArray(a.signupUserIds) || !a.signupUserIds.includes(user.id)) return false;
      // Only show recap for events that started within the last 7 days
      if (a.startsAt && Date.now() - new Date(a.startsAt).getTime() > RECAP_WINDOW_MS) return false;
      return true;
    },
  );

  // Show the most recent one that hasn't been dismissed
  const target = endedMine.find((e) => !dismissed.has(e.navTarget ?? ''));
  if (!target || !target.navTarget) return null;

  const dismiss = () => {
    const next = new Set(dismissed);
    next.add(target.navTarget!);
    setDismissed(next);
    localStorage.setItem('chuanmen.feed.recapDismissed', JSON.stringify([...next]));
  };

  // Build participants list by zipping signupUserIds and people names
  const signupUserIds: string[] = (target as any).signupUserIds ?? [];
  const peopleNames: string[] = (target.people ?? []).map((p: any) => typeof p === 'string' ? p : p.name);
  const participants = signupUserIds.map((id, i) => ({ id, name: peopleNames[i] ?? '?' }));

  // Extract eventId from navTarget (e.g. "/events/abc123" → "abc123")
  const eventId = target.navTarget.split('/').pop() ?? '';

  return (
    <>
      <Alert
        severity="info"
        sx={{ mb: 2, '& .MuiAlert-message': { width: '100%' } }}
        onClose={dismiss}
      >
        <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
          「{target.title}」已结束
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          留下你的回忆吧！
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button size="small" variant="outlined" onClick={() => navigate(target.navTarget!)}>
            📷 上传照片
          </Button>
          <Button size="small" variant="outlined" onClick={() => navigate(target.navTarget!)}>
            💬 写评论
          </Button>
          <Button size="small" variant="outlined" onClick={() => setQuickCardOpen(true)}>
            ✉ 寄感谢卡
          </Button>
        </Stack>
      </Alert>
      <QuickPostcardDialog
        open={quickCardOpen}
        onClose={() => setQuickCardOpen(false)}
        participants={participants}
        eventId={eventId}
        eventTitle={target.title}
        onSent={(msg) => { onSnack(msg); }}
      />
    </>
  );
}

/* ═══ Welcome Banner for new members ═══ */
function WelcomeBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // useEffect to avoid SSR hydration mismatch (localStorage not available on server)
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!user) return;
    const key = `chuanmen.feed.welcomed.${user.id}`;
    if (!localStorage.getItem(key)) setShow(true);
  }, [user]);

  if (!show || !user) return null;
  const dismiss = () => {
    localStorage.setItem(`chuanmen.feed.welcomed.${user.id}`, '1');
    setShow(false);
  };

  return (
    <Card sx={{ mb: 2, border: '1px solid', borderColor: 'primary.main', opacity: 0.9 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography fontWeight={700}>👋 欢迎来到串门儿！</Typography>
          <Button size="small" onClick={dismiss} sx={{ minWidth: 'auto', p: 0 }}>✕</Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          动态流里会出现社区的活动、推荐和感谢卡。先看看下面这些：
        </Typography>
        <Grid container spacing={1}>
          {[
            { icon: '⚙️', label: '完善资料', page: '/settings' },
            { icon: '📅', label: '看看活动', page: '/events' },
            { icon: '🎬', label: '发现推荐', page: '/discover' },
            { icon: '👥', label: '认识成员', page: '/members' },
          ].map((a, i) => (
            <Grid key={i} size={{ xs: 6 }}>
              <Button variant="outlined" fullWidth size="small"
                onClick={() => navigate(a.page)}
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}>
                {a.icon} {a.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}

/* ═══ Profile Nudge Banner ═══ */
function ProfileNudgeBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user || user.id.startsWith('walkthrough-')) return;
    const key = `chuanmen.feed.profileNudge.${user.id}`;
    const last = localStorage.getItem(key);
    if (last && Date.now() - Number(last) < 7 * 86400000) return;
    const fields = [user.avatar, user.bio, user.location, user.coverImageUrl,
                    user.selfAsFriend, user.idealFriend, user.participationPlan, user.birthday];
    if (fields.filter(Boolean).length < 5) setShow(true);
  }, [user]);

  if (!show || !user) return null;

  const suggestions: [unknown, string][] = [
    [user.avatar, '上传头像'], [user.bio, '写一句自我介绍'],
    [user.location, '填写所在城市'], [user.coverImageUrl, '上传封面图'],
  ];
  const hint = suggestions.find(([v]) => !v)?.[1] ?? '完善资料';

  return (
    <Alert severity="info" sx={{ mb: 2 }} onClose={() => {
      localStorage.setItem(`chuanmen.feed.profileNudge.${user.id}`, String(Date.now()));
      setShow(false);
    }}>
      <Typography variant="body2" fontWeight={700}>
        {hint}，让朋友更容易认识你
      </Typography>
      <Button size="small" onClick={() => navigate('/settings')} sx={{ mt: 0.5 }}>去完善</Button>
    </Alert>
  );
}

/* ═══ Full Feed (Timeline) ═══ */
const PAGE_SIZE = 8;

function FullFeed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, currentLottery, lotteryUserStatus, postcardCredits } = useLoaderData() as FeedPageData;
  const [snackMsg, setSnackMsg] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [quickOpen, setQuickOpen] = useState(false);
  const [lotteryState, setLotteryState] = useState<LotteryDraw | null>(null);
  const [lotteryDismissed, setLotteryDismissed] = useState(false);
  const [candidateBannerDismissed, setCandidateBannerDismissed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Initialize lottery state from loader data
  useEffect(() => {
    if (currentLottery && !('none' in currentLottery)) {
      setLotteryState(currentLottery as LotteryDraw);
    } else {
      setLotteryState(null);
    }
  }, [currentLottery]);

  // Detect postcard credit changes and show toast
  useEffect(() => {
    if (postcardCredits == null || !user?.id) return;
    const key = `chuanmen.credits.${user.id}`;
    const prev = Number(localStorage.getItem(key) ?? '0');
    if (prev > 0 && postcardCredits > prev) {
      const gained = postcardCredits - prev;
      setSnackMsg(`🎉 你获得了 ${gained} 张感谢卡额度！当前共 ${postcardCredits} 张`);
    }
    localStorage.setItem(key, String(postcardCredits));
  }, [postcardCredits, user?.id]);

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDrawnPerson = lotteryState?.drawnMemberId === user?.id && lotteryState?.status === 'pending';

  const handleAcceptLottery = async () => {
    if (!lotteryState || !user) return;
    try {
      await acceptLottery(lotteryState.id, user.id);
      navigate('/events/new', { state: { preTag: '小聚', lotteryId: lotteryState.id } });
    } catch {
      setSnackMsg('操作失败，请重试');
    }
  };

  const handleSkipLottery = async () => {
    if (!lotteryState || !user) return;
    try {
      await skipLottery(lotteryState.id, user.id);
      setLotteryDismissed(true);
      setSnackMsg('已跳过，系统将重新抽签');
    } catch {
      setSnackMsg('操作失败，请重试');
    }
  };

  const handleJoinCandidatePool = async () => {
    if (!user) return;
    try {
      await updateHostCandidate(user.id, true);
      setCandidateBannerDismissed(true);
      setSnackMsg('已加入轮值 Host 候选池');
    } catch {
      setSnackMsg('操作失败，请重试');
    }
  };

  // Show 3-consecutive-events banner
  const showCandidateBanner = !candidateBannerDismissed &&
    lotteryUserStatus &&
    lotteryUserStatus.consecutiveEvents >= 3 &&
    !lotteryUserStatus.hostCandidate;

  return (
    <Box>
      <RecapBanner items={items} onSnack={setSnackMsg} />
      <WelcomeBanner />
      <ProfileNudgeBanner />

      {/* Lottery: drawn person banner */}
      {isDrawnPerson && !lotteryDismissed && (
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
                onClick={handleAcceptLottery}
                sx={{ textTransform: 'none' }}
              >
                🏠 发起小聚
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleSkipLottery}
                sx={{ textTransform: 'none' }}
              >
                这周不行
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* 3-consecutive-events: invite to join candidate pool */}
      {showCandidateBanner && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          onClose={() => setCandidateBannerDismissed(true)}
        >
          <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
            🎉 你已经连续参加了 {lotteryUserStatus!.consecutiveEvents} 次活动！
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            考虑做一次 Host 吗？可以是很简单的小聚，2-6 个人，做点你喜欢的事就好。
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" onClick={handleJoinCandidatePool}>
              加入候选池
            </Button>
            <Button size="small" onClick={() => setCandidateBannerDismissed(true)}>
              暂时不了
            </Button>
          </Stack>
        </Alert>
      )}

      <Grid container spacing={2}>
        {items.slice(0, visible).map((item, idx) => (
          <Grid key={(item as any)._key ?? `fallback-${idx}`} size={gridSizeFor(item.type)} sx={
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

      {/* Mobile: SpeedDial FAB */}
      {isMobile && (
        <SpeedDial
          ariaLabel="快速操作"
          sx={{ position: 'fixed', bottom: 'calc(72px + env(safe-area-inset-bottom))', right: 16, zIndex: 10 }}
          icon={<SpeedDialIcon />}
          FabProps={{ size: 'medium', disabled: !canInteract }}
        >
          <SpeedDialAction icon={<span>👍</span>} tooltipTitle="推荐好内容" tooltipOpen onClick={() => navigate('/discover')} />
          <SpeedDialAction icon={<span>✉️</span>} tooltipTitle="寄感谢卡" tooltipOpen onClick={() => navigate('/cards')} />
          <SpeedDialAction icon={<span>💡</span>} tooltipTitle="提创意" tooltipOpen onClick={() => navigate('/events/proposals/new')} />
          <SpeedDialAction icon={<span>➕</span>} tooltipTitle="发起活动" tooltipOpen onClick={() => navigate('/events/new')} />
          <SpeedDialAction icon={<span>✏️</span>} tooltipTitle="写点什么" tooltipOpen onClick={() => setQuickOpen(true)} />
        </SpeedDial>
      )}

      {/* Desktop: always-expanded pill buttons */}
      {!isMobile && (
        <Stack
          spacing={1}
          sx={{ position: 'fixed', bottom: 24, right: 32, zIndex: 10 }}
        >
          {([
            { label: '写点什么', icon: '✏️', action: () => setQuickOpen(true) },
            { label: '发起活动', icon: '+', action: () => navigate('/events/new') },
            { label: '提创意', icon: '💡', action: () => navigate('/events/proposals/new') },
            { label: '寄感谢卡', icon: '✉️', action: () => navigate('/cards') },
            { label: '推荐好内容', icon: '👍', action: () => navigate('/discover') },
          ] as const).map((item) => (
            <Button
              key={item.label}
              disabled={!canInteract}
              onClick={item.action}
              sx={{
                bgcolor: 'rgba(30,30,30,0.75)',
                color: '#fff',
                border: '1px solid',
                borderColor: 'rgba(212,165,116,0.6)',
                borderRadius: 999,
                px: 2,
                py: 0.5,
                minHeight: 36,
                justifyContent: 'flex-start',
                textTransform: 'none',
                fontSize: 13,
                fontWeight: 500,
                backdropFilter: 'blur(8px)',
                gap: 0.75,
                '&:hover': { bgcolor: 'rgba(50,50,50,0.88)', borderColor: 'rgba(212,165,116,0.85)' },
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>{item.icon}</span>
              {item.label}
            </Button>
          ))}
        </Stack>
      )}

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
    case 'compactRecommendation': return <FeedRecommendation {...props as React.ComponentProps<typeof FeedRecommendation>} />;
    case 'announcement':   return <FeedMilestone {...props as React.ComponentProps<typeof FeedMilestone>} />;
    case 'book':           return <FeedBook {...props as React.ComponentProps<typeof FeedBook>} />;
    case 'compactBook':    return <FeedCompactBook {...props as React.ComponentProps<typeof FeedCompactBook>} />;
    case 'smallGroup':     return <FeedSmallGroup {...props as React.ComponentProps<typeof FeedSmallGroup>} />;
    case 'compactSmallGroup': return <FeedCompactSmallGroup {...props as React.ComponentProps<typeof FeedCompactSmallGroup>} />;
    case 'commentNotice':  return <FeedCommentNotice {...props as React.ComponentProps<typeof FeedCommentNotice>} />;
    case 'actionNotice':   return <FeedActionNotice {...props as React.ComponentProps<typeof FeedActionNotice>} />;
    case 'newMember':      return <FeedNewMember {...props as React.ComponentProps<typeof FeedNewMember>} />;
    case 'birthday':       return <FeedBirthday {...props as React.ComponentProps<typeof FeedBirthday>} />;
  }
}

/* ═══ FeedPage ═══ */
export default function FeedPage() {
  const data = useLoaderData() as FeedPageData;
  // Feed is "empty" when there are no real content items (only milestone placeholder counts as empty)
  const isEmpty = !data.items || data.items.length === 0 || (data.items.length === 1 && data.items[0].type === 'milestone');
  return isEmpty ? <EmptyFeed /> : <FullFeed />;
}
