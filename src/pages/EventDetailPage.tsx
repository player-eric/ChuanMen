import { useEffect, useRef, useState } from 'react';
import { useLoaderData, useNavigate, useParams } from 'react-router';
import { firstNonEmoji } from '@/components/Atoms';
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import type { EventComment, EventData, EventPhoto, FoodOption, SignupStatus, TaskRole } from '@/types';
import { getEventById, signupEvent, cancelSignup, inviteToEvent, uploadMedia, addEventRecapPhoto, removeEventRecapPhoto, deleteMediaAsset, addComment as addCommentApi, fetchCommentsApi, fetchMembersApi, fetchMoviesApi, updateEvent, removeParticipant, acceptOffer, declineOffer, hostApproveWaitlist, hostRejectWaitlist } from '@/lib/domainApi';
import { useAuth } from '@/auth/AuthContext';
import { ScenePhoto } from '@/components/ScenePhoto';
import { Poster } from '@/components/Poster';
import { RichTextViewer } from '@/components/RichTextEditor';
import { useTaskPresets } from '@/hooks/useTaskPresets';
import { eventTagToChinese } from '@/lib/mappings';

const foodLabel: Record<FoodOption, string> = {
  potluck: 'Potluck · 每人带一道菜',
  host_cook: 'Host 准备',
  eat_out: '出去吃',
  none: '',
};

const phaseLabel: Record<string, { label: string; color: 'warning' | 'success' | 'primary' | 'default' }> = {
  invite: { label: '邀请阶段', color: 'warning' },
  open: { label: '报名中', color: 'success' },
  closed: { label: '报名结束', color: 'primary' },
  ended: { label: '已结束', color: 'default' },
  cancelled: { label: '已取消', color: 'default' },
};

/** Offer response UI with 24h countdown */
function OfferResponseUI({ eventId, userId, offeredAt, onDone }: {
  eventId: string;
  userId: string;
  offeredAt: number;
  onDone: (accepted: boolean) => Promise<void>;
}) {
  const deadline = offeredAt + 24 * 60 * 60 * 1000;
  const [remaining, setRemaining] = useState(Math.max(0, deadline - Date.now()));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(Math.max(0, deadline - Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  const hours = Math.floor(remaining / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <Card variant="outlined" sx={{ borderColor: 'warning.main', borderWidth: 2 }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
          有名额了！
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          24小时内确认是否参加
        </Typography>
        <Typography variant="body2" color="warning.main" sx={{ mb: 1.5, fontWeight: 700 }}>
          {remaining > 0
            ? `剩余 ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
            : '已过期'}
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            color="success"
            disabled={loading || remaining <= 0}
            onClick={async () => {
              setLoading(true);
              try {
                await acceptOffer(eventId, userId);
                await onDone(true);
              } catch { /* handled by parent */ }
              setLoading(false);
            }}
          >
            确认参加
          </Button>
          <Button
            variant="outlined"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                await declineOffer(eventId, userId);
                await onDone(false);
              } catch { /* handled by parent */ }
              setLoading(false);
            }}
          >
            放弃名额
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function EventDetailPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { user } = useAuth();
  const taskPresets = useTaskPresets();
  const loadedEvent = useLoaderData() as EventData | null;
  const [event, setEvent] = useState<EventData | null>(loadedEvent);
  const [myStatus, setMyStatus] = useState<SignupStatus | null>(null);

  // Derive signedUp from myStatus for backward compatibility
  const signedUp = myStatus === 'accepted' || myStatus === 'invited';

  // Re-check signup status when user becomes available (auth loads from localStorage after hydration)
  useEffect(() => {
    if (user?.id && loadedEvent) {
      const details = (loadedEvent as any).signupDetails ?? [];
      const mySignup = details.find((s: any) => s.userId === user.id);
      if (mySignup) {
        setMyStatus(mySignup.status as SignupStatus);
      } else if (Array.isArray((loadedEvent as any).signupUserIds) && (loadedEvent as any).signupUserIds.includes(user.id)) {
        setMyStatus('accepted');
      }
    }
  }, [user?.id, loadedEvent]);

  const [comments, setComments] = useState<EventComment[]>([]);
  const [commentText, setCommentText] = useState('');

  // Load comments from API
  useEffect(() => {
    if (!eventId) return;
    fetchCommentsApi('event', eventId).then((list) => {
      if (Array.isArray(list)) {
        setComments(list.map((c: any) => ({ name: c.author?.name ?? '匿名', text: c.content ?? '', date: c.createdAt ? new Date(c.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '' })));
      }
    }).catch(() => {});
  }, [eventId]);
  const [inviteDeclined, setInviteDeclined] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskRole[]>(loadedEvent?.tasks ?? []);
  const [taskEditing, setTaskEditing] = useState(false);
  const [nominateOpen, setNominateOpen] = useState(false);
  const [nominateSearch, setNominateSearch] = useState('');
  const [photos, setPhotos] = useState<EventPhoto[]>(loadedEvent?.photos ?? []);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPreviews, setUploadPreviews] = useState<{ file: File; preview: string; caption: string }[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // Host invite dialog
  const [hostInviteOpen, setHostInviteOpen] = useState(false);
  const [hostInviteSearch, setHostInviteSearch] = useState('');
  const [hostInvitedPeople, setHostInvitedPeople] = useState<string[]>([]);
  // Edit event dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCapacity, setEditCapacity] = useState(0);
  const [editStartsAt, setEditStartsAt] = useState('');
  const [editEndsAt, setEditEndsAt] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [flash, setFlash] = useState<{
    open: boolean;
    severity: 'success' | 'error';
    message: string;
  }>({
    open: false,
    severity: 'success',
    message: '',
  });

  // API-loaded data for movies & members
  const [allMovies, setAllMovies] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    fetchMoviesApi().then((m: any[]) => setAllMovies(m)).catch(() => {});
    fetchMembersApi().then((m: any[]) => setAllMembers(m)).catch(() => {});
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!eventId || loadedEvent) {
        return;
      }
      try {
        const item = await getEventById(eventId);
        const hostName = typeof (item as any).host === 'string' ? (item as any).host : (item as any).host?.name ?? 'Host';
        const signups = ((item as any).signups ?? []) as any[];
        const people = signups.map((s: any) => s.user?.name ?? s.userName ?? '?');
        // Host 默认也是参与者之一
        if (hostName && hostName !== '?' && !people.includes(hostName)) {
          people.unshift(hostName);
        }
        setEvent({
          id: '',
          title: String(item.title ?? ''),
          host: hostName,
          date: new Date(String(item.startsAt ?? new Date().toISOString())).toLocaleString('zh-CN'),
          location: String(item.location ?? ''),
          scene: 'small-group',
          film: undefined,
          spots: Math.max(0, Number(item.capacity ?? 0) - people.length),
          total: Number(item.capacity ?? 0),
          people,
          phase: String(item.phase ?? 'open') === 'invite' ? 'invite' : 'open',
          desc: String(item.description ?? ''),
        });
      } catch {
        setEvent(null);
      }
    };

    void run();
  }, [eventId, loadedEvent]);

  // Resolve invitedBy from signupInvites data
  const resolvedInvitedBy = (() => {
    if (event?.invitedBy) return event.invitedBy;
    if (!user?.id || !loadedEvent) return undefined;
    const invites = (loadedEvent as any).signupInvites ?? [];
    const myInvite = invites.find((i: any) => i.userId === user.id);
    if (!myInvite) return undefined;
    // invitedById is usually the host
    if (myInvite.invitedById === (loadedEvent as any).hostId) return event?.host;
    // Look up the name from event people
    return event?.host; // fallback to host name
  })();

  if (!event) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">活动不存在</Typography>
          <Button sx={{ mt: 1 }} onClick={() => navigate('/events')}>返回活动页</Button>
        </CardContent>
      </Card>
    );
  }

  // Access control: invite-phase events are only visible to host and invited users
  if (event.phase === 'invite') {
    const signupUserIds: string[] = (loadedEvent as any)?.signupUserIds ?? [];
    const hostId: string = (loadedEvent as any)?.hostId ?? '';
    const canView = user && (user.id === hostId || signupUserIds.includes(user.id) || user.role === 'admin');
    if (!canView) {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>此活动为私人邀请</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              你暂无权限查看此活动，请等待 Host 邀请。
            </Typography>
            <Button variant="outlined" onClick={() => navigate('/events')}>返回活动页</Button>
          </CardContent>
        </Card>
      );
    }
  }

  const onSignup = async () => {
    // If already signed up or waitlisted, show cancel dialog
    if (myStatus === 'accepted' || myStatus === 'invited' || myStatus === 'waitlist') {
      if (event.phase === 'ended') return;
      setCancelDialogOpen(true);
      return;
    }

    if (!eventId) {
      setMyStatus('accepted');
      return;
    }
    if (!user?.id) {
      setFlash({ open: true, severity: 'error', message: '请先登录后再报名' });
      return;
    }
    try {
      const result = await signupEvent(eventId, user.id);
      if (result.wasWaitlisted) {
        setMyStatus('waitlist');
        setFlash({ open: true, severity: 'success', message: '已加入等位名单' });
      } else {
        setMyStatus('accepted');
        setFlash({ open: true, severity: 'success', message: event.phase === 'ended' ? '已添加参与记录' : '报名参加成功' });
      }
      await refreshEvent();
    } catch (error) {
      setFlash({
        open: true,
        severity: 'error',
        message: error instanceof Error ? error.message : '报名失败，请稍后重试',
      });
    }
  };

  /** Re-fetch event data from the API to update participants / spots */
  const refreshEvent = async () => {
    if (!eventId) return;
    try {
      const raw = await getEventById(eventId);
      if (!raw) return;
      const signups = (raw as any).signups ?? [];
      const occupying = signups.filter((s: any) => ['accepted', 'invited', 'offered'].includes(s.status));
      const waitlistSignups = signups.filter((s: any) => s.status === 'waitlist');
      const people = occupying.map((s: any) => s.user?.name ?? s.userName ?? '?');
      const hostName = typeof (raw as any).host === 'string' ? (raw as any).host : (raw as any).host?.name ?? '?';
      if (hostName && hostName !== '?' && !people.includes(hostName)) {
        people.unshift(hostName);
      }
      const signupDetails = signups.map((s: any) => ({
        userId: s.user?.id ?? s.userId,
        name: s.user?.name ?? '?',
        status: s.status,
        offeredAt: s.offeredAt ?? undefined,
      }));
      setEvent((prev) => prev ? {
        ...prev,
        people,
        host: hostName,
        spots: Math.max(0, (prev.total ?? 0) - occupying.length),
        waitlistCount: waitlistSignups.length,
        signupDetails,
      } : prev);
      // Update myStatus
      if (user?.id) {
        const mySignup = signups.find((s: any) => (s.user?.id ?? s.userId) === user.id);
        if (mySignup) {
          setMyStatus(mySignup.status as SignupStatus);
        } else {
          setMyStatus(null);
        }
      }
    } catch { /* ignore */ }
  };

  const phase = phaseLabel[event.phase] ?? phaseLabel.open;
  const isHost = user?.name === event.host;
  const hostId: string = (loadedEvent as any)?.hostId ?? '';

  /** Convert a photo URL to a CSS background value — handles both gradient strings and real URLs */
  const photoBg = (url: string) =>
    url.startsWith('linear-gradient') || url.startsWith('radial-gradient')
      ? url
      : `url(${url}) center/cover no-repeat`;

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      <Stack spacing={2}>
        <Snackbar
          open={flash.open}
          autoHideDuration={3500}
          onClose={() => setFlash((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            severity={flash.severity}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setFlash((prev) => ({ ...prev, open: false }))}
              >
                取消
              </Button>
            }
          >
            {flash.message}
          </Alert>
        </Snackbar>

        {/* Invite banner */}
        {resolvedInvitedBy && !signedUp && !inviteDeclined && (
          <Alert
            severity="info"
            sx={{ '& .MuiAlert-message': { width: '100%' } }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={1}>
              <Typography variant="body2">{resolvedInvitedBy} 邀请你参加这场活动</Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={async () => {
                    if (eventId && user?.id) {
                      try {
                        await signupEvent(eventId, user.id);
                        setMyStatus('accepted');
                        setFlash({ open: true, severity: 'success', message: '已接受邀请' });
                        await refreshEvent();
                      } catch {
                        setFlash({ open: true, severity: 'error', message: '接受邀请失败，请稍后重试' });
                      }
                    } else {
                      setMyStatus('accepted');
                    }
                  }}
                >
                  接受邀请
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setInviteDeclined(true)}
                >
                  婉拒
                </Button>
              </Stack>
            </Stack>
          </Alert>
        )}
        {inviteDeclined && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            你已婉拒了这次邀请
          </Typography>
        )}

        {/* 1. Scene photo header */}
        <Card sx={{ overflow: 'hidden' }}>
          <Box sx={{ position: 'relative' }}>
            <ScenePhoto scene={event.scene} h={200} style={{ borderRadius: 0 }}>
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }} />
              <Box sx={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  {event.title}
                </Typography>
              </Box>
              {event.film && (
                <Box sx={{ position: 'absolute', bottom: 12, right: 16 }}>
                  <Poster title={event.film} w={40} h={56} />
                </Box>
              )}
            </ScenePhoto>
          </Box>

          <CardContent>
            {/* 2. Phase badge */}
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap">
              <Chip size="small" color={phase.color} label={phase.label} />
              {event.isHomeEvent && <Chip size="small" variant="outlined" label="🏠 在家" />}
            </Stack>

            {/* Host management bar */}
            {isHost && event.phase !== 'cancelled' && (
              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => {
                    setEditTitle(event.title);
                    setEditDesc(event.desc);
                    setEditLocation(event.location);
                    setEditCapacity(event.total);
                    setEditStartsAt((loadedEvent as any)?.startsAt ? new Date((loadedEvent as any).startsAt).toISOString().slice(0, 16) : '');
                    setEditEndsAt((loadedEvent as any)?.endsAt ? new Date((loadedEvent as any).endsAt).toISOString().slice(0, 16) : '');
                    setEditOpen(true);
                  }}
                >
                  编辑
                </Button>
                {event.phase === 'invite' && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    onClick={async () => {
                      if (!eventId) return;
                      try {
                        await updateEvent(eventId, { phase: 'open' });
                        setEvent((prev) => prev ? { ...prev, phase: 'open' } : prev);
                        setFlash({ open: true, severity: 'success', message: '已公开报名' });
                      } catch { setFlash({ open: true, severity: 'error', message: '操作失败' }); }
                    }}
                  >
                    公开报名
                  </Button>
                )}
                {event.phase === 'open' && (
                  <>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={async () => {
                        if (!eventId) return;
                        try {
                          await updateEvent(eventId, { phase: 'closed' });
                          setEvent((prev) => prev ? { ...prev, phase: 'closed' } : prev);
                          setFlash({ open: true, severity: 'success', message: '已关闭报名' });
                        } catch { setFlash({ open: true, severity: 'error', message: '操作失败' }); }
                      }}
                    >
                      关闭报名
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={async () => {
                        if (!eventId) return;
                        try {
                          await updateEvent(eventId, { phase: 'ended' });
                          setEvent((prev) => prev ? { ...prev, phase: 'ended' } : prev);
                          setFlash({ open: true, severity: 'success', message: '活动已结束' });
                        } catch { setFlash({ open: true, severity: 'error', message: '操作失败' }); }
                      }}
                    >
                      结束活动
                    </Button>
                  </>
                )}
                {event.phase === 'closed' && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={async () => {
                      if (!eventId) return;
                      try {
                        await updateEvent(eventId, { phase: 'ended' });
                        setEvent((prev) => prev ? { ...prev, phase: 'ended' } : prev);
                        setFlash({ open: true, severity: 'success', message: '活动已结束' });
                      } catch { setFlash({ open: true, severity: 'error', message: '操作失败' }); }
                    }}
                  >
                    结束活动
                  </Button>
                )}
              </Stack>
            )}

            {/* 3. Description */}
            <Box sx={{ mb: 2 }}>
              <RichTextViewer html={event.desc} />
            </Box>

            {/* 4. Date & location */}
            <Stack spacing={0.75} sx={{ mb: 2 }}>
              <Typography variant="body2">📅 {event.date}{event.endDate ? ` — ${event.endDate}` : ''}</Typography>
              <Typography variant="body2">📍 {event.location}</Typography>
              {event.isHomeEvent && !signedUp && (
                <Typography variant="caption" color="text.secondary">
                  🔒 报名后可见完整地址
                </Typography>
              )}
              {event.isHomeEvent && signedUp && event.locationPrivate && (
                <Typography variant="caption" color="success.main">
                  📍 {event.locationPrivate}
                </Typography>
              )}
              {event.inviteDeadline && (
                <Typography variant="caption" color="warning.main">
                  ⏰ 邀请截止：{event.inviteDeadline}
                </Typography>
              )}
            </Stack>

            {/* 5. Food arrangement */}
            {event.foodOption && event.foodOption !== 'none' && (
              <Stack spacing={0.5} sx={{ mb: 2 }}>
                <Typography variant="body2">
                  🍽️ {foodLabel[event.foodOption]}
                </Typography>
                {event.foodOption === 'eat_out' && event.restaurantLocation && (
                  <Typography variant="body2" color="text.secondary">
                    📍 {event.restaurantLocation}
                  </Typography>
                )}
              </Stack>
            )}

            {/* 6. House rules */}
            {event.houseRules && (
              <Card variant="outlined" sx={{ mb: 2, bgcolor: 'action.hover' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" fontWeight={700} sx={{ mb: 0.5, display: 'block' }}>
                    🏠 House Rules
                  </Typography>
                  <RichTextViewer html={event.houseRules} />
                </CardContent>
              </Card>
            )}

            {/* 6. Movie card */}
            {event.film && (
              <Card variant="outlined" sx={{ mb: 2, cursor: 'pointer' }}>
                <CardActionArea onClick={() => {
                  const m = allMovies.find((p: any) => p.title === event.film);
                  navigate(m ? `/discover/movies/${m.id}` : '/discover');
                }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Poster title={event.film} w={40} h={56} />
                      <Box>
                        <Typography variant="body2" fontWeight={700}>🎬 放映：{event.film}</Typography>
                        <Typography variant="caption" color="text.secondary">点击查看电影详情</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* 7. Movie nominations — show for all movieNight events */}
        {event.scene === 'movieNight' && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                🎬 候选电影{(event.nominations?.length ?? 0) > 0 ? ` (${event.nominations!.length})` : ''}
              </Typography>
              {(event.nominations?.length ?? 0) > 0 ? (
                <Stack spacing={1.5}>
                  {event.nominations!.map((movieId) => {
                    const detail = allMovies.find((m: any) => m.id === movieId);
                    const pool = detail;
                    if (!detail) return null;
                    const title = detail.title;
                    const dir = detail.director;
                    const year = detail.year;
                    const totalVotes = detail._count?.votes ?? 0;
                    const voters = (detail.votes ?? []).map((v: any) => v.user?.name).filter(Boolean);
                    const attendeeVotes = voters.filter((name: string) => event.people.includes(name)).length;
                    const isSelected = event.film === title;
                    const isHost = user?.name === event.host;
                    const canSelect = isHost && (event.phase === 'invite' || event.phase === 'open') && !isSelected;
                    return (
                      <Card key={movieId} variant="outlined" sx={isSelected ? { borderColor: 'success.main', borderWidth: 2 } : undefined}>
                        <CardActionArea onClick={() => navigate(`/discover/movies/${movieId}`)}>
                          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Poster title={title} w={36} h={50} />
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <Typography variant="body2" fontWeight={700}>{title}</Typography>
                                  {isSelected && <Chip size="small" color="success" label="✓ 已选" />}
                                </Stack>
                                <Typography variant="caption" color="text.secondary">
                                  {year} · {dir}
                                </Typography>
                                <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    社区 {totalVotes} 票
                                  </Typography>
                                  <Typography variant="caption" fontWeight={700} color="primary">
                                    本场 {attendeeVotes} 票
                                  </Typography>
                                </Stack>
                              </Box>
                              {/* Host 选片 button */}
                              {canSelect && (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="success"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEvent({ ...event, film: title });
                                    setFlash({ open: true, severity: 'success', message: `已选定「${title}」为本场放映` });
                                  }}
                                  sx={{ whiteSpace: 'nowrap', minWidth: 'auto' }}
                                >
                                  选为本场
                                </Button>
                              )}
                            </Stack>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    );
                  })}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  还没有提名，快来推荐一部电影吧
                </Typography>
              )}
              {/* Nominate button — only for signed-up users, non-ended events */}
              {signedUp && event.phase !== 'ended' && event.phase !== 'cancelled' && (
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  sx={{ mt: 1.5 }}
                  onClick={() => setNominateOpen(true)}
                >
                  🎬 提名一部电影
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Nominate dialog */}
        <Dialog open={nominateOpen} onClose={() => { setNominateOpen(false); setNominateSearch(''); }} maxWidth="xs" fullWidth>
          <DialogTitle>提名候选电影</DialogTitle>
          <DialogContent>
            <TextField
              size="small"
              fullWidth
              placeholder="搜电影名、导演..."
              value={nominateSearch}
              onChange={(e) => setNominateSearch(e.target.value)}
              autoFocus
              sx={{ mb: 1.5, mt: 0.5 }}
            />
            {(() => {
              const nq = nominateSearch.toLowerCase();
              const filtered = allMovies.filter((m: any) => {
                if (m.status === 'screened') return false;
                if ((event.nominations ?? []).includes(m.id)) return false;
                if (nq && !m.title.toLowerCase().includes(nq) && !(m.director ?? '').toLowerCase().includes(nq) && !(m.recommendedBy?.name ?? '').toLowerCase().includes(nq)) return false;
                return true;
              });
              return filtered.length > 0 ? (
                <Stack spacing={1}>
                  {filtered.map((m) => (
                    <Card key={m.id} variant="outlined">
                      <CardActionArea onClick={() => {
                        if (event) {
                          setEvent({ ...event, nominations: [...(event.nominations ?? []), m.id] });
                        }
                        setNominateOpen(false);
                        setNominateSearch('');
                        setFlash({ open: true, severity: 'success', message: `已提名「${m.title}」` });
                      }}>
                        <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Poster title={m.title} w={28} h={40} />
                            <Box>
                              <Typography variant="body2" fontWeight={600}>{m.title}</Typography>
                              <Typography variant="caption" color="text.secondary">{m.year} · {m.director} · {m._count?.votes ?? 0} 票</Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Stack spacing={1.5} alignItems="center" sx={{ py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {nominateSearch ? `没有找到「${nominateSearch}」` : '没有更多候选电影'}
                  </Typography>
                  {nominateSearch && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        setNominateOpen(false);
                        setNominateSearch('');
                        navigate('/discover/movie/add');
                      }}
                    >
                      添加到候选池
                    </Button>
                  )}
                </Stack>
              );
            })()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setNominateOpen(false); setNominateSearch(''); }}>取消</Button>
          </DialogActions>
        </Dialog>

        {/* 8. Participants */}
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>参与者</Typography>
              {event.phase !== 'ended' && event.phase !== 'cancelled' && (
                <Typography variant="body2" color={event.spots > 0 ? 'success.main' : 'text.secondary'}>
                  {event.spots > 0
                    ? `还剩 ${event.spots}/${event.total} 位`
                    : (event.waitlistCount ?? 0) > 0
                      ? `已满 · ${event.waitlistCount}人等位`
                      : '已满'}
                </Typography>
              )}
              {event.phase === 'ended' && (
                <Typography variant="body2" color="text.secondary">
                  共 {event.people.length} 人参与
                </Typography>
              )}
            </Stack>
            {isHost ? (
              /* Host view: list with remove buttons */
              <Stack spacing={0.5}>
                {event.people.map((name) => {
                  const memberId = allMembers.find((m) => m.name === name)?.id;
                  return (
                    <Stack key={name} direction="row" alignItems="center" spacing={1}>
                      <Avatar
                        sx={{ cursor: 'pointer', width: 34, height: 34, ...(name === event.host ? { border: '2px solid', borderColor: 'primary.main' } : {}) }}
                        onClick={() => navigate(`/members/${encodeURIComponent(name)}`)}
                      >
                        {firstNonEmoji(name)}
                      </Avatar>
                      <Typography variant="body2" sx={{ flex: 1 }}>{name}</Typography>
                      {name === event.host && <Chip size="small" label="Host" variant="outlined" />}
                      {name !== event.host && memberId && (
                        <IconButton
                          size="small"
                          onClick={async () => {
                            if (!eventId || !user?.id) return;
                            try {
                              await removeParticipant(eventId, memberId, user.id);
                              setFlash({ open: true, severity: 'success', message: `已移除 ${name}` });
                              await refreshEvent();
                            } catch {
                              setFlash({ open: true, severity: 'error', message: '移除失败' });
                            }
                          }}
                          sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  );
                })}
                {event.phase !== 'cancelled' && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setHostInviteOpen(true)}
                    sx={{ mt: 1, alignSelf: 'flex-start' }}
                  >
                    {event.phase === 'ended' ? '添加参与者' : '邀请成员'}
                  </Button>
                )}
              </Stack>
            ) : (
              /* Normal view: avatar group */
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <AvatarGroup max={8}>
                    {event.people.map((name) => (
                      <Avatar
                        key={name}
                        sx={{ cursor: 'pointer', width: 34, height: 34, ...(name === event.host ? { border: '2px solid', borderColor: 'primary.main' } : {}) }}
                        onClick={() => navigate(`/members/${encodeURIComponent(name)}`)}
                      >
                        {firstNonEmoji(name)}
                      </Avatar>
                    ))}
                  </AvatarGroup>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  🏠 {event.host} · Host
                </Typography>
              </Stack>
            )}
            {event.phase === 'ended' && user && (
              <Button
                variant="contained"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => navigate('/cards')}
              >
                ✉ 给 Ta 们寄张感谢卡
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Host waitlist management panel */}
        {isHost && event.phase !== 'ended' && event.phase !== 'cancelled' && (() => {
          const waitlistPeople = (event.signupDetails ?? []).filter((s) => s.status === 'waitlist');
          const offeredPeople = (event.signupDetails ?? []).filter((s) => s.status === 'offered');
          if (waitlistPeople.length === 0 && offeredPeople.length === 0) return null;
          return (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  等位名单 ({waitlistPeople.length + offeredPeople.length}人)
                </Typography>
                <Stack spacing={1}>
                  {offeredPeople.map((s) => {
                    const remaining = s.offeredAt
                      ? Math.max(0, new Date(s.offeredAt).getTime() + 24 * 60 * 60 * 1000 - Date.now())
                      : 0;
                    const hours = Math.floor(remaining / 3600000);
                    const mins = Math.floor((remaining % 3600000) / 60000);
                    return (
                      <Stack key={s.userId} direction="row" alignItems="center" spacing={1}>
                        <Avatar sx={{ width: 30, height: 30 }}>{firstNonEmoji(s.name)}</Avatar>
                        <Typography variant="body2" sx={{ flex: 1 }}>{s.name}</Typography>
                        <Chip size="small" color="warning" label={`已递补 · 剩余${hours}:${String(mins).padStart(2, '0')}`} />
                      </Stack>
                    );
                  })}
                  {waitlistPeople.map((s) => (
                    <Stack key={s.userId} direction="row" alignItems="center" spacing={1}>
                      <Avatar sx={{ width: 30, height: 30 }}>{firstNonEmoji(s.name)}</Avatar>
                      <Typography variant="body2" sx={{ flex: 1 }}>{s.name}</Typography>
                      <Chip size="small" variant="outlined" label="等位中" />
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={async () => {
                          if (!eventId || !user?.id) return;
                          try {
                            await hostApproveWaitlist(eventId, s.userId, user.id);
                            setFlash({ open: true, severity: 'success', message: `已接纳 ${s.name}` });
                            await refreshEvent();
                          } catch {
                            setFlash({ open: true, severity: 'error', message: '操作失败' });
                          }
                        }}
                      >
                        接纳
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={async () => {
                          if (!eventId || !user?.id) return;
                          try {
                            await hostRejectWaitlist(eventId, s.userId, user.id);
                            setFlash({ open: true, severity: 'success', message: `已拒绝 ${s.name}` });
                            await refreshEvent();
                          } catch {
                            setFlash({ open: true, severity: 'error', message: '操作失败' });
                          }
                        }}
                      >
                        拒绝
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          );
        })()}

        {/* 8. Unified tasks (分工) */}
        {(tasks.length > 0 || user?.name === event.host) && (
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>分工</Typography>
                {user?.name === event.host && !taskEditing && (
                  <Button size="small" startIcon={<EditIcon />} onClick={() => setTaskEditing(true)}>
                    编辑
                  </Button>
                )}
                {taskEditing && (
                  <Button size="small" variant="contained" onClick={() => setTaskEditing(false)}>
                    完成
                  </Button>
                )}
              </Stack>

              {taskEditing ? (
                /* Host edit mode */
                <Stack spacing={1.5}>
                  {tasks.map((task, idx) => (
                    <Stack key={idx} direction="row" spacing={1} alignItems="center">
                      <TextField
                        size="small"
                        placeholder="任务名称"
                        value={task.role}
                        onChange={(e) => {
                          const next = [...tasks];
                          next[idx] = { ...next[idx], role: e.target.value };
                          setTasks(next);
                        }}
                        sx={{ flex: 1 }}
                      />
                      <Select
                        size="small"
                        displayEmpty
                        value={task.name ?? ''}
                        onChange={(e) => {
                          const next = [...tasks];
                          next[idx] = { ...next[idx], name: e.target.value || undefined };
                          setTasks(next);
                        }}
                        sx={{ minWidth: 110 }}
                      >
                        <MenuItem value="">待认领</MenuItem>
                        {event.people.map((name) => (
                          <MenuItem key={name} value={name}>{name}</MenuItem>
                        ))}
                      </Select>
                      <IconButton
                        size="small"
                        onClick={() => setTasks((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                  <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => setTasks((prev) => [...prev, { role: '' }])}
                    >
                      添加分工
                    </Button>
                    {taskPresets[eventTagToChinese[event.scene]] && tasks.length === 0 && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          const tag = eventTagToChinese[event.scene];
                          setTasks(taskPresets[tag].map((role) => ({ role })));
                        }}
                      >
                        使用预设
                      </Button>
                    )}
                  </Stack>
                </Stack>
              ) : (
                /* Display mode */
                <Stack spacing={1}>
                  {tasks.map((task, idx) => (
                    <Stack key={idx} direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                        {task.name ? (
                          <>
                            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>{firstNonEmoji(task.name)}</Avatar>
                            <Typography variant="body2">{task.name}</Typography>
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">待认领</Typography>
                        )}
                        <Chip size="small" variant="outlined" label={task.role} />
                      </Stack>
                      {task.name ? (
                        task.name === user?.name ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              const next = [...tasks];
                              next[idx] = { ...next[idx], name: undefined };
                              setTasks(next);
                            }}
                          >
                            取消认领
                          </Button>
                        ) : (
                          <Chip size="small" color="success" label="已分配" />
                        )
                      ) : (
                        user && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => {
                              const next = [...tasks];
                              next[idx] = { ...next[idx], name: user.name };
                              setTasks(next);
                              setFlash({ open: true, severity: 'success', message: `已认领「${task.role}」` });
                            }}
                          >
                            我可以！
                          </Button>
                        )
                      )}
                    </Stack>
                  ))}
                  {tasks.length === 0 && user?.name === event.host && (
                    <Typography variant="body2" color="text.secondary">
                      暂无分工，点击"编辑"添加
                    </Typography>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        )}

        {/* Photo Gallery — always visible */}
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                📷 活动照片{photos.length > 0 ? ` (${photos.length})` : ''}
              </Typography>
              {user && photos.length > 0 && (
                <Button size="small" onClick={() => setUploadOpen(true)}>
                  上传照片
                </Button>
              )}
            </Stack>
            {photos.length > 0 ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 1,
                }}
              >
                {photos.map((photo, idx) => (
                  <Box
                    key={photo.id}
                    onClick={() => setLightboxIndex(idx)}
                    sx={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: 1,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      background: photoBg(photo.url),
                      filter: 'saturate(0.85) contrast(1.05)',
                      transition: 'transform 0.15s',
                      '&:hover': { transform: 'scale(1.03)' },
                      '&:hover .photo-delete': { opacity: 1 },
                    }}
                  >
                    {user && photo.uploadedBy === user.name && (
                      <IconButton
                        className="photo-delete"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(photo.id);
                        }}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          opacity: 0,
                          transition: 'opacity 0.15s',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                还没有照片
              </Typography>
            )}
            {user && (
              <Button
                variant="outlined"
                fullWidth
                size="small"
                onClick={() => setUploadOpen(true)}
                sx={{ mt: 1.5 }}
              >
                📷 上传照片
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Lightbox Dialog */}
        <Dialog
          open={lightboxIndex >= 0}
          onClose={() => setLightboxIndex(-1)}
          maxWidth={false}
          fullScreen
          PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.95)' } }}
        >
          {lightboxIndex >= 0 && lightboxIndex < photos.length && (() => {
            const photo = photos[lightboxIndex];
            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
                  <IconButton onClick={() => setLightboxIndex(-1)} sx={{ color: '#fff' }}>
                    <CloseIcon />
                  </IconButton>
                </Box>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', px: 6 }}>
                  {lightboxIndex > 0 && (
                    <IconButton
                      onClick={() => setLightboxIndex((i) => i - 1)}
                      sx={{ position: 'absolute', left: 8, color: '#fff' }}
                    >
                      <ArrowBackIosNewIcon />
                    </IconButton>
                  )}
                    <Box
                    component="img"
                    src={photo.url.startsWith('linear-gradient') || photo.url.startsWith('radial-gradient') ? undefined : photo.url}
                    alt={photo.caption || '照片'}
                    sx={{
                      maxWidth: '90%',
                      maxHeight: 'calc(100vh - 160px)',
                      borderRadius: 2,
                      objectFit: 'contain',
                      filter: 'saturate(0.85) contrast(1.05)',
                    }}
                  />
                  {lightboxIndex < photos.length - 1 && (
                    <IconButton
                      onClick={() => setLightboxIndex((i) => i + 1)}
                      sx={{ position: 'absolute', right: 8, color: '#fff' }}
                    >
                      <ArrowForwardIosIcon />
                    </IconButton>
                  )}
                </Box>
                <Box sx={{ textAlign: 'center', pb: 4, px: 2 }}>
                  {photo.caption && (
                    <Typography variant="body1" sx={{ color: '#fff', mb: 0.5 }}>
                      {photo.caption}
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    {photo.uploadedBy} · {photo.createdAt}
                  </Typography>
                </Box>
              </Box>
            );
          })()}
        </Dialog>

        {/* Upload Dialog */}
        <Dialog open={uploadOpen} onClose={() => { setUploadOpen(false); setUploadPreviews([]); }} maxWidth="sm" fullWidth>
          <DialogTitle>上传照片</DialogTitle>
          <DialogContent>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                const valid = files.slice(0, 9 - uploadPreviews.length);
                const newPreviews = valid.map((file) => ({
                  file,
                  preview: URL.createObjectURL(file),
                  caption: '',
                }));
                setUploadPreviews((prev) => [...prev, ...newPreviews].slice(0, 9));
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
            {uploadPreviews.length === 0 ? (
              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Typography variant="body1" sx={{ mb: 0.5 }}>点击选择照片</Typography>
                <Typography variant="caption" color="text.secondary">
                  最多选择 9 张，单张不超过 10MB
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 1,
                  }}
                >
                  {uploadPreviews.map((item, idx) => (
                    <Box key={idx} sx={{ position: 'relative' }}>
                      <Box
                        component="img"
                        src={item.preview}
                        sx={{
                          width: '100%',
                          aspectRatio: '1',
                          objectFit: 'cover',
                          borderRadius: 1,
                          display: 'block',
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => {
                          URL.revokeObjectURL(item.preview);
                          setUploadPreviews((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        sx={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          bgcolor: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
                {uploadPreviews.map((item, idx) => (
                  <TextField
                    key={idx}
                    size="small"
                    fullWidth
                    placeholder={`照片 ${idx + 1} 的说明（可选）`}
                    value={item.caption}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 50);
                      setUploadPreviews((prev) => prev.map((p, i) => i === idx ? { ...p, caption: val } : p));
                    }}
                    inputProps={{ maxLength: 50 }}
                  />
                ))}
                {uploadPreviews.length < 9 && (
                  <Button variant="outlined" size="small" onClick={() => fileInputRef.current?.click()}>
                    继续添加
                  </Button>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setUploadOpen(false); setUploadPreviews([]); }}>取消</Button>
            <Button
              variant="contained"
              disabled={uploadPreviews.length === 0 || isUploading}
              onClick={async () => {
                if (!user || !eventId) return;
                setIsUploading(true);
                const uploaded: EventPhoto[] = [];
                try {
                  for (const item of uploadPreviews) {
                    try {
                      const { publicUrl } = await uploadMedia(item.file, 'event-recap', user.id);
                      await addEventRecapPhoto(eventId, publicUrl);
                      uploaded.push({
                        id: `upload-${Date.now()}-${uploaded.length}`,
                        url: publicUrl,
                        uploadedBy: user.name ?? '我',
                        caption: item.caption || undefined,
                        createdAt: '刚刚',
                      });
                    } catch (err) {
                      console.error('Photo upload failed:', err);
                    }
                  }
                  if (uploaded.length > 0) {
                    setPhotos((prev) => [...prev, ...uploaded]);
                    setFlash({ open: true, severity: 'success', message: `上传成功，已添加 ${uploaded.length} 张照片` });
                  } else {
                    setFlash({ open: true, severity: 'error', message: '上传失败，请重试' });
                  }
                } finally {
                  uploadPreviews.forEach((item) => URL.revokeObjectURL(item.preview));
                  setUploadPreviews([]);
                  setUploadOpen(false);
                  setIsUploading(false);
                }
              }}
            >
              {isUploading ? '上传中…' : '上传'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete photo confirm */}
        <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
          <DialogTitle>删除这张照片？</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              删除后不可恢复。
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirm(null)}>取消</Button>
            <Button
              color="error"
              onClick={async () => {
                const photo = photos.find((p) => p.id === deleteConfirm);
                if (photo && eventId) {
                  try {
                    await removeEventRecapPhoto(eventId, photo.url);
                    try { await deleteMediaAsset(photo.url); } catch { /* best effort */ }
                  } catch (err) {
                    console.error('Failed to remove photo from server:', err);
                  }
                }
                setPhotos((prev) => prev.filter((p) => p.id !== deleteConfirm));
                setDeleteConfirm(null);
                setFlash({ open: true, severity: 'success', message: '照片已删除' });
              }}
            >
              删除
            </Button>
          </DialogActions>
        </Dialog>

        {/* 9. Comments */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              💬 讨论 ({comments.length})
            </Typography>
            {comments.length > 0 ? (
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                {comments.map((c, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                    <Avatar
                      sx={{ width: 28, height: 28, fontSize: 12, cursor: 'pointer', mt: 0.25 }}
                      onClick={() => navigate(`/members/${encodeURIComponent(c.name)}`)}
                    >
                      {firstNonEmoji(c.name)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="baseline">
                        <Typography variant="body2" fontWeight={700}>{c.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.date}</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">{c.text}</Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                暂无讨论，来说点什么吧！
              </Typography>
            )}
            {user ? (
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Avatar sx={{ width: 28, height: 28, fontSize: 12, mt: 0.5 }}>
                  {user.name?.[0] ?? 'U'}
                </Avatar>
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="说点什么..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && !e.shiftKey && commentText.trim()) {
                      e.preventDefault();
                      const text = commentText.trim();
                      setCommentText('');
                      setComments((prev) => [...prev, { name: user.name ?? '我', text, date: '刚刚' }]);
                      try {
                        await addCommentApi({ entityType: 'event', entityId: eventId!, authorId: user.id, content: text });
                      } catch {
                        setComments((prev) => prev.slice(0, -1));
                        setFlash({ open: true, severity: 'error', message: '评论失败，请重新登录后再试' });
                      }
                    }
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  disabled={!commentText.trim()}
                  onClick={async () => {
                    if (commentText.trim()) {
                      const text = commentText.trim();
                      setCommentText('');
                      setComments((prev) => [...prev, { name: user.name ?? '我', text, date: '刚刚' }]);
                      try {
                        await addCommentApi({ entityType: 'event', entityId: eventId!, authorId: user.id, content: text });
                      } catch {
                        setComments((prev) => prev.slice(0, -1));
                        setFlash({ open: true, severity: 'error', message: '评论失败，请重新登录后再试' });
                      }
                    }
                  }}
                  sx={{ mt: 0.5 }}
                >
                  发送
                </Button>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">登录后可参与讨论</Typography>
            )}
          </CardContent>
        </Card>

        {/* 10. Action button — offer response or signup */}
        {event.phase !== 'cancelled' && myStatus === 'offered' && user && (() => {
          const myDetail = (event.signupDetails ?? []).find((s) => s.userId === user.id);
          const offeredAt = myDetail?.offeredAt ? new Date(myDetail.offeredAt).getTime() : Date.now();
          return <OfferResponseUI eventId={eventId!} userId={user.id} offeredAt={offeredAt} onDone={async (accepted) => {
            if (accepted) {
              setMyStatus('accepted');
              setFlash({ open: true, severity: 'success', message: '报名成功！' });
            } else {
              setMyStatus('declined');
              setFlash({ open: true, severity: 'success', message: '已放弃名额' });
            }
            await refreshEvent();
          }} />;
        })()}
        {event.phase !== 'cancelled' && myStatus !== 'offered' && (
          <Box>
            <Button
              variant="contained"
              fullWidth
              onClick={onSignup}
              disabled={!user}
              color={signedUp ? 'success' : myStatus === 'waitlist' ? 'warning' : 'primary'}
            >
              {!user
                ? '登录后可报名'
                : event.phase === 'ended'
                  ? signedUp
                    ? '✓ 已参与'
                    : '我也参加了'
                  : myStatus === 'waitlist'
                    ? `等位中 · 第${((event.signupDetails ?? []).filter(s => s.status === 'waitlist').findIndex(s => s.userId === user.id) + 1) || '?'}位`
                    : signedUp
                      ? '✓ 已报名'
                      : event.spots <= 0
                        ? '加入等位'
                        : event.phase === 'invite'
                          ? '接受邀请'
                          : '报名参加'}
            </Button>
          </Box>
        )}

        {/* Edit event dialog */}
        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>编辑活动</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField
                label="名称"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                fullWidth
              />
              <TextField
                label="地点"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                fullWidth
              />
              <TextField
                label="人数上限"
                type="number"
                value={editCapacity}
                onChange={(e) => setEditCapacity(Math.max(2, Number(e.target.value) || 8))}
                fullWidth
              />
              <TextField
                label="开始时间"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={editStartsAt}
                onChange={(e) => setEditStartsAt(e.target.value)}
                fullWidth
              />
              <TextField
                label="结束时间"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={editEndsAt}
                onChange={(e) => setEditEndsAt(e.target.value)}
                fullWidth
              />
              <TextField
                label="说明"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                multiline
                minRows={3}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>取消</Button>
            <Button
              variant="contained"
              disabled={editSaving || !editTitle.trim()}
              onClick={async () => {
                if (!eventId) return;
                setEditSaving(true);
                try {
                  const payload: Record<string, unknown> = {};
                  if (editTitle.trim() !== event.title) payload.title = editTitle.trim();
                  if (editDesc !== event.desc) payload.description = editDesc;
                  if (editLocation !== event.location) payload.location = editLocation;
                  if (editCapacity !== event.total) payload.capacity = editCapacity;
                  if (editStartsAt) payload.startsAt = editStartsAt;
                  if (editEndsAt) payload.endsAt = editEndsAt;
                  if (Object.keys(payload).length > 0) {
                    await updateEvent(eventId, payload as any);
                    setEvent((prev) => prev ? {
                      ...prev,
                      title: editTitle.trim() || prev.title,
                      desc: editDesc ?? prev.desc,
                      location: editLocation || prev.location,
                      total: editCapacity || prev.total,
                      spots: Math.max(0, (editCapacity || prev.total) - prev.people.length),
                      date: editStartsAt ? new Date(editStartsAt).toLocaleString('zh-CN') : prev.date,
                      endDate: editEndsAt ? new Date(editEndsAt).toLocaleString('zh-CN') : prev.endDate,
                    } : prev);
                    setFlash({ open: true, severity: 'success', message: '活动已更新' });
                  }
                  setEditOpen(false);
                } catch {
                  setFlash({ open: true, severity: 'error', message: '更新失败，请重试' });
                } finally {
                  setEditSaving(false);
                }
              }}
            >
              {editSaving ? '保存中…' : '保存'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Host invite dialog */}
        <Dialog open={hostInviteOpen} onClose={() => { setHostInviteOpen(false); setHostInviteSearch(''); }} maxWidth="xs" fullWidth>
          <DialogTitle>{event.phase === 'ended' ? '添加参与者' : '邀请成员'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              size="small"
              placeholder="搜索成员名..."
              value={hostInviteSearch}
              onChange={(e) => setHostInviteSearch(e.target.value)}
              autoFocus
              sx={{ mb: 1.5, mt: 0.5 }}
            />
            {(() => {
              const hq = hostInviteSearch.toLowerCase();
              const filtered = allMembers.filter((m) => {
                if (event.people.includes(m.name)) return false;
                if (hostInvitedPeople.includes(m.name)) return false;
                if (hq && !m.name.toLowerCase().includes(hq)) return false;
                return true;
              }).slice(0, 10);
              return (
                <Stack spacing={0.5}>
                  {hostInvitedPeople.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                      已选 {hostInvitedPeople.length} 人
                    </Typography>
                  )}
                  {filtered.map((m) => (
                    <Stack direction="row" key={m.name} justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 28, height: 28 }}>{firstNonEmoji(m.name)}</Avatar>
                        <Typography variant="body2">{m.name}</Typography>
                      </Stack>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setHostInvitedPeople((prev) => [...prev, m.name])}
                      >
                        邀请
                      </Button>
                    </Stack>
                  ))}
                  {filtered.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
                      {hostInviteSearch ? '未找到匹配成员' : '没有更多可邀请的成员'}
                    </Typography>
                  )}
                </Stack>
              );
            })()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setHostInviteOpen(false); setHostInviteSearch(''); setHostInvitedPeople([]); }}>取消</Button>
            <Button
              variant="contained"
              disabled={hostInvitedPeople.length === 0}
              onClick={async () => {
                if (eventId && user?.id && hostInvitedPeople.length > 0) {
                  try {
                    const userIds = hostInvitedPeople
                      .map((name) => allMembers.find((m) => m.name === name)?.id)
                      .filter(Boolean) as string[];
                    if (userIds.length > 0) {
                      if (event.phase === 'ended') {
                        // For ended events, directly add as participants
                        for (const uid of userIds) {
                          await signupEvent(eventId, uid);
                        }
                        setFlash({ open: true, severity: 'success', message: `已添加 ${userIds.length} 人` });
                      } else {
                        await inviteToEvent(eventId, userIds, user.id);
                        setFlash({ open: true, severity: 'success', message: `已邀请 ${userIds.length} 人` });
                      }
                      await refreshEvent();
                    }
                  } catch {
                    setFlash({ open: true, severity: 'error', message: event.phase === 'ended' ? '添加失败，请稍后重试' : '邀请失败，请稍后重试' });
                  }
                }
                setHostInviteOpen(false);
                setHostInviteSearch('');
                setHostInvitedPeople([]);
              }}
            >
              {event.phase === 'ended' ? '确认添加' : '确认邀请'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Cancel signup dialog */}
        <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
          <DialogTitle>{myStatus === 'waitlist' ? '退出等位？' : '确定要取消报名吗？'}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              {myStatus === 'waitlist' ? '退出后你的等位位置将丢失。' : '取消后你的名额将释放给其他人。'}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelDialogOpen(false)}>{myStatus === 'waitlist' ? '继续等位' : '保持报名'}</Button>
            <Button
              color="warning"
              onClick={async () => {
                if (eventId && user?.id) {
                  try {
                    await cancelSignup(eventId, user.id);
                    setMyStatus(null);
                    setFlash({ open: true, severity: 'success', message: myStatus === 'waitlist' ? '已退出等位' : '已取消报名' });
                    await refreshEvent();
                  } catch {
                    setFlash({ open: true, severity: 'error', message: '取消报名失败，请稍后重试' });
                  }
                } else {
                  setMyStatus(null);
                }
                setCancelDialogOpen(false);
              }}
            >
              {myStatus === 'waitlist' ? '退出等位' : '取消报名'}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  );
}
