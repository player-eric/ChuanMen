import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLoaderData, useNavigate, useParams } from 'react-router';
import { firstNonEmoji } from '@/components/Atoms';
import {
  Avatar,
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
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Switch,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EditIcon from '@mui/icons-material/Edit';
import ImageIcon from '@mui/icons-material/Image';
import type { EventData, EventPhoto, EventTaskData, FoodOption, SignupStatus, TaskRole } from '@/types';
import { getEventById, signupEvent, cancelSignup, inviteToEvent, uploadMedia, addEventRecapPhoto, removeEventRecapPhoto, deleteMediaAsset, fetchMembersApi, fetchMoviesApi, fetchRecommendationsApi, linkEventRecommendation, linkEventMovie, unlinkEventRecommendation, unlinkEventMovie, selectEventRecommendation, updateEvent, removeParticipant, acceptOffer, declineOffer, hostApproveWaitlist, hostRejectWaitlist, approveApplication, rejectApplication, fetchEventTasks, claimEventTask, unclaimEventTask, volunteerEventTask, createEventTasks, deleteEventTask, addCoHost, removeCoHost, toggleMovieVote, toggleRecommendationVote, getEventExclusions, setEventExclusions } from '@/lib/domainApi';
import TaskClaimDialog from '@/components/TaskClaimDialog';
import CommentSection from '@/components/CommentSection';
import { useAuth } from '@/auth/AuthContext';
import { ScenePhoto, isImageUrl } from '@/components/ScenePhoto';
import { Poster } from '@/components/Poster';
import { RichTextViewer, type RichTextEditorHandle } from '@/components/RichTextEditor';
import { ImageUpload } from '@/components/ImageUpload';
const RichTextEditorLazy = lazy(() => import('@/components/RichTextEditor'));
import { useTaskPresets } from '@/hooks/useTaskPresets';
import { eventTagToChinese } from '@/lib/mappings';
import { generateEventPoster, downloadBlob, resolveEventTag } from '@/lib/posterGenerator';
import { useColors } from '@/hooks/useColors';

/** Extract name string from people item (supports both legacy string and {name,avatar} object) */
const pName = (p: string | { name: string; avatar?: string }): string => typeof p === 'string' ? p : p.name;
const pAvatar = (p: string | { name: string; avatar?: string }): string | undefined => typeof p === 'string' ? undefined : p.avatar;

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
  const c = useColors();
  const taskPresets = useTaskPresets();
  const loadedEvent = useLoaderData() as EventData | null;
  const [event, setEvent] = useState<EventData | null>(loadedEvent);
  const [myStatus, setMyStatus] = useState<SignupStatus | null>(null);

  // Derive signedUp from myStatus for backward compatibility (invited = not yet accepted)
  const signedUp = myStatus === 'accepted';

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

  const [inviteDeclined, setInviteDeclined] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);
  const [applicationNote, setApplicationNote] = useState('');
  const [applicationTaskId, setApplicationTaskId] = useState('');
  const [capacityBumpTarget, setCapacityBumpTarget] = useState<{ userId: string; name: string } | null>(null);
  const [eventTasks, setEventTasks] = useState<EventTaskData[]>([]);
  const [taskEditing, setTaskEditing] = useState(false);
  const [taskClaimOpen, setTaskClaimOpen] = useState(false);
  const [newTaskRole, setNewTaskRole] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  // Task assignment dialog state (host assigns task to a signed-up member)
  const [assignTaskId, setAssignTaskId] = useState<string | null>(null);
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
  const [directSignup, setDirectSignup] = useState(false);
  // Co-host management dialog state
  const [coHostDialogOpen, setCoHostDialogOpen] = useState(false);
  const [coHostSearch, setCoHostSearch] = useState('');
  // Visibility exclusion dialog state
  const [exclusionDialogOpen, setExclusionDialogOpen] = useState(false);
  const [excludedUserIds, setExcludedUserIds] = useState<string[]>([]);
  const [exclusionSearch, setExclusionSearch] = useState('');
  // Edit event dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const descEditorRef = useRef<RichTextEditorHandle | null>(null);
  const [embeddedUrls, setEmbeddedUrls] = useState<Set<string>>(new Set());
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editZipCode, setEditZipCode] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCapacity, setEditCapacity] = useState(0);
  const [editStartsAt, setEditStartsAt] = useState('');
  const [editEndsAt, setEditEndsAt] = useState('');
  const [editTitleImageUrl, setEditTitleImageUrl] = useState('');
  const [editSignupMode, setEditSignupMode] = useState<'direct' | 'application'>('direct');
  const [editFoodOption, setEditFoodOption] = useState<FoodOption>('none');
  const [editRestaurantLocation, setEditRestaurantLocation] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [posterLoading, setPosterLoading] = useState(false);

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

  // API-loaded data for movies, members & recommendations
  const [allMovies, setAllMovies] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<{ id: string; name: string }[]>([]);
  const [allRecs, setAllRecs] = useState<any[]>([]);
  const [recLinkOpen, setRecLinkOpen] = useState(false);
  const [showAllPeople, setShowAllPeople] = useState(false);
  const [recSearch, setRecSearch] = useState('');
  const [recCategory, setRecCategory] = useState<string>('all');
  // Load persisted event tasks from API
  const refreshTasks = async () => {
    if (!eventId) return;
    try {
      const tasks = await fetchEventTasks(eventId);
      setEventTasks(tasks);
    } catch { /* ignore */ }
  };
  useEffect(() => {
    if (eventId) refreshTasks();
  }, [eventId]);

  useEffect(() => {
    Promise.all([
      fetchRecommendationsApi().catch(() => []),
      fetchMoviesApi().catch(() => []),
    ]).then(([recs, movies]: [any[], any[]]) => {
      setAllMovies(movies);
      // Merge movies into allRecs (same as EventCreatePage)
      const movieRecs = movies.map((m: any) => ({
        id: m.id,
        title: m.title,
        category: 'movie',
        description: [m.year, m.director].filter(Boolean).join(' · '),
        voteCount: m.votes?.length ?? m._count?.votes ?? 0,
        author: m.recommendedBy ?? m.author,
        _fromMovieTable: true,
      }));
      setAllRecs([...recs, ...movieRecs]);
    });
    fetchMembersApi().then((m: any[]) => setAllMembers(m)).catch(() => {});
  }, []);

  // Load visibility exclusions for host/coHost
  useEffect(() => {
    if (!eventId || !user?.id) return;
    const hostIdVal = (loadedEvent as any)?.hostId ?? '';
    const coHostIds: string[] = (loadedEvent as any)?.coHostIds ?? [];
    if (user.id !== hostIdVal && !coHostIds.includes(user.id)) return;
    getEventExclusions(eventId, user.id).then((res) => setExcludedUserIds(res.userIds)).catch(() => {});
  }, [eventId, user?.id, loadedEvent]);

  // Paste image (Ctrl+V) support for upload dialog
  useEffect(() => {
    if (!uploadOpen) return;
    const onPaste = (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) return;
      e.preventDefault();
      setUploadPreviews((prev) => {
        const valid = files.slice(0, 9 - prev.length);
        const newPreviews = valid.map((file) => ({ file, preview: URL.createObjectURL(file), caption: '' }));
        return [...prev, ...newPreviews].slice(0, 9);
      });
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [uploadOpen]);

  useEffect(() => {
    const run = async () => {
      if (!eventId || loadedEvent) {
        return;
      }
      try {
        const item = await getEventById(eventId);
        const hostName = typeof (item as any).host === 'string' ? (item as any).host : (item as any).host?.name ?? 'Host';
        const signups = ((item as any).signups ?? []) as any[];
        const coHostNames: string[] = ((item as any).coHosts ?? []).map((ch: any) => ch.user?.name).filter(Boolean);
        const coHostIds: string[] = ((item as any).coHosts ?? []).map((ch: any) => ch.user?.id ?? ch.userId).filter(Boolean);
        // People displayed: host + co-hosts + accepted/offered (invited hidden)
        const accepted = signups.filter((s: any) => ['accepted', 'offered'].includes(s.status));
        const occupying = signups.filter((s: any) => ['accepted', 'invited', 'offered'].includes(s.status));
        const people = accepted.map((s: any) => s.user?.name ?? s.userName ?? '?');
        if (hostName && hostName !== '?' && !people.includes(hostName)) {
          people.unshift(hostName);
        }
        for (const chName of coHostNames) {
          if (chName && !people.includes(chName)) people.push(chName);
        }
        const hostSlots = 1 + coHostNames.length;
        setEvent({
          id: '',
          title: String(item.title ?? ''),
          host: hostName,
          date: new Date(String(item.startsAt ?? new Date().toISOString())).toLocaleString('zh-CN', { timeZone: 'UTC' }),
          city: String(item.city || item.location || ''),
          scene: 'small-group',
          film: undefined,
          spots: Math.max(0, Number(item.capacity ?? 0) - hostSlots - occupying.length),
          total: Number(item.capacity ?? 0),
          people,
          phase: String(item.phase ?? 'open') === 'invite' ? 'invite' : 'open',
          desc: String(item.description ?? ''),
          coHosts: coHostNames,
          coHostIds,
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
    // If already accepted or waitlisted, show cancel dialog
    if (myStatus === 'accepted' || myStatus === 'waitlist') {
      if (event.phase === 'ended') return;
      setCancelDialogOpen(true);
      return;
    }
    // If already pending (application submitted), show cancel dialog
    if (myStatus === 'pending') {
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

    // Application mode: show dialog to enter note
    if (event.signupMode === 'application' && myStatus !== 'invited') {
      setApplicationDialogOpen(true);
      return;
    }

    try {
      const result = await signupEvent(eventId, user.id);
      if (result.wasWaitlisted) {
        setMyStatus('waitlist');
        setFlash({ open: true, severity: 'success', message: '已加入等位名单' });
      } else {
        setMyStatus('accepted');
        // Show task claim dialog if there are tasks
        if (eventTasks.length > 0 && event.phase !== 'ended') {
          setTaskClaimOpen(true);
        } else {
          setFlash({ open: true, severity: 'success', message: '报名参加成功' });
        }
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

  /** Submit application with note */
  const onSubmitApplication = async () => {
    if (!eventId || !user?.id) return;
    try {
      const result = await signupEvent(eventId, user.id, applicationNote.trim() || undefined, applicationTaskId || undefined);
      if (result.wasPending) {
        setMyStatus('pending');
        setFlash({ open: true, severity: 'success', message: '申请已提交，等待审批' });
      } else if (result.wasWaitlisted) {
        setMyStatus('waitlist');
        setFlash({ open: true, severity: 'success', message: '已加入等位名单' });
      } else {
        setMyStatus('accepted');
        setFlash({ open: true, severity: 'success', message: '报名参加成功' });
      }
      setApplicationDialogOpen(false);
      setApplicationNote('');
      await refreshEvent();
    } catch (error) {
      setFlash({
        open: true,
        severity: 'error',
        message: error instanceof Error ? error.message : '申请失败，请稍后重试',
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
      const coHostNames: string[] = ((raw as any).coHosts ?? []).map((ch: any) => ch.user?.name).filter(Boolean);
      const coHostIds: string[] = ((raw as any).coHosts ?? []).map((ch: any) => ch.user?.id ?? ch.userId).filter(Boolean);
      // People displayed: host + co-hosts + accepted/offered (invited hidden)
      const accepted = signups.filter((s: any) => ['accepted', 'offered'].includes(s.status));
      const people = accepted.map((s: any) => s.user?.name ?? s.userName ?? '?');
      const hostName = typeof (raw as any).host === 'string' ? (raw as any).host : (raw as any).host?.name ?? '?';
      if (hostName && hostName !== '?' && !people.includes(hostName)) {
        people.unshift(hostName);
      }
      for (const chName of coHostNames) {
        if (chName && !people.includes(chName)) people.push(chName);
      }
      const pendingSignups = signups.filter((s: any) => s.status === 'pending');
      const signupDetails = signups.map((s: any) => ({
        userId: s.user?.id ?? s.userId,
        name: s.user?.name ?? '?',
        status: s.status,
        offeredAt: s.offeredAt ?? undefined,
        note: s.note || undefined,
        intendedTaskId: s.intendedTaskId || undefined,
      }));
      const hostSlots = 1 + coHostNames.length;
      setEvent((prev) => prev ? {
        ...prev,
        people,
        host: hostName,
        spots: Math.max(0, (prev.total ?? 0) - hostSlots - occupying.length),
        waitlistCount: waitlistSignups.length,
        pendingCount: pendingSignups.length,
        signupMode: (raw as any).signupMode || 'direct',
        signupDetails,
        coHosts: coHostNames,
        coHostIds,
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
    } catch (err) {
      console.error('[refreshEvent] failed:', err);
    }
  };

  const eventStarted = (event as any).startsAt && new Date((event as any).startsAt) < new Date();
  const effectivePhase = (eventStarted && ['invite', 'open', 'closed'].includes(event.phase))
    ? phaseLabel.ended
    : event.signupMode === 'application' && event.phase === 'open'
      ? { label: '申请制', color: 'warning' as const }
      : (phaseLabel[event.phase] ?? phaseLabel.open);
  const phase = effectivePhase;
  const hostId: string = (loadedEvent as any)?.hostId ?? '';
  const isHost = Boolean(user?.id && hostId && user.id === hostId);
  const isCoHost = Boolean(user?.id && event.coHostIds?.includes(user.id));
  const isAdmin = user?.role === 'admin';

  /** Convert a photo URL to a CSS background value — handles both gradient strings and real URLs */
  const photoBg = (url: string) =>
    url.startsWith('linear-gradient') || url.startsWith('radial-gradient')
      ? url
      : `url(${url}) center/cover no-repeat`;

  return (
    <Box sx={{ maxWidth: isImageUrl(event.scene) ? 800 : 680, mx: 'auto' }}>
      <Stack spacing={2}>
        <IconButton onClick={() => navigate('/events')} size="small" sx={{ alignSelf: 'flex-start' }}><ArrowBackRoundedIcon /></IconButton>
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
          {isImageUrl(event.scene) ? (
            /* Poster hero: blur-fill background + large poster, height adapts to image */
            <Box sx={{ position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${event.scene})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(24px) brightness(0.3)', transform: 'scale(1.3)' }} />
              <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.6))' }} />
              <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', py: 2, px: 1 }}>
                <img src={event.scene} alt="" style={{ width: '100%', maxHeight: 720, objectFit: 'contain', borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }} />
              </Box>
              <Box sx={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  {event.title}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ position: 'relative' }}>
              <ScenePhoto scene={event.scene} h={200} objectFit="cover" style={{ borderRadius: 0 }}>
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
          )}

          <CardContent>
            {/* 2. Phase badge + date & location — single row */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap rowGap={1}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip size="small" color={phase.color} label={phase.label} />
                {event.isHomeEvent && <Chip size="small" variant="outlined" label="🏠 在家" />}
                {event.isPrivate && <Chip size="small" variant="outlined" color="warning" label="🔒 私密活动" />}
              </Stack>
              <Stack alignItems="flex-end" spacing={0.25}>
                <Typography variant="body2" color="text.secondary">📅 {event.date}{event.endDate ? ` — ${event.endDate}` : ''}</Typography>
                <Typography variant="body2" color="text.secondary">📍 <a href={`https://maps.google.com/?q=${encodeURIComponent([event.city, event.state].filter(Boolean).join(', '))}`} target="_blank" rel="noopener" style={{ color: 'inherit', textDecoration: 'underline' }}>{[event.city, event.state].filter(Boolean).join(', ')}</a></Typography>
                {signedUp && event.address && (
                  <Typography variant="caption" color="success.main">📍 <a href={`https://maps.google.com/?q=${encodeURIComponent([event.address, event.city, event.state].filter(Boolean).join(', '))}`} target="_blank" rel="noopener" style={{ color: 'inherit', textDecoration: 'underline' }}>{event.address}</a></Typography>
                )}
                {!signedUp && (
                  <Typography variant="caption" color="text.secondary">🔒 报名后可见具体地址</Typography>
                )}
              </Stack>
            </Stack>

            {/* Host management bar */}
            {(isHost || isCoHost || isAdmin) && event.phase !== 'cancelled' && (
              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => {
                    setEditTitle(event.title);
                    setEditDesc(event.desc);
                    setEditCity(event.city);
                    setEditState(event.state ?? '');
                    setEditZipCode(event.zipCode ?? '');
                    setEditAddress(event.address ?? '');
                    setEditCapacity(event.total);
                    setEditStartsAt((loadedEvent as any)?.startsAt ? new Date((loadedEvent as any).startsAt).toISOString().slice(0, 16) : '');
                    setEditEndsAt((loadedEvent as any)?.endsAt ? new Date((loadedEvent as any).endsAt).toISOString().slice(0, 16) : '');
                    setEditTitleImageUrl(isImageUrl(event.scene) ? event.scene : '');
                    setEditSignupMode(event.signupMode ?? 'direct');
                    setEditFoodOption((event.foodOption as FoodOption) || 'none');
                    setEditRestaurantLocation(event.restaurantLocation ?? '');
                    // Pre-populate embedded URLs from existing description
                    const alreadyEmbedded = new Set<string>();
                    for (const p of photos) {
                      if (event.desc.includes(p.url)) alreadyEmbedded.add(p.url);
                    }
                    setEmbeddedUrls(alreadyEmbedded);
                    setEditOpen(true);
                  }}
                >
                  编辑
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color={event.isPrivate ? 'warning' : 'inherit'}
                  onClick={async () => {
                    if (!eventId) return;
                    const next = !event.isPrivate;
                    try {
                      await updateEvent(eventId, { isPrivate: next });
                      setEvent((prev) => prev ? { ...prev, isPrivate: next } : prev);
                      setFlash({ open: true, severity: 'success', message: next ? '已设为私密' : '已设为公开' });
                    } catch { setFlash({ open: true, severity: 'error', message: '操作失败' }); }
                  }}
                >
                  {event.isPrivate ? '🔒 设为公开' : '🔓 设为私密'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color={event.signupMode === 'application' ? 'warning' : 'inherit'}
                  onClick={async () => {
                    if (!eventId) return;
                    const next = event.signupMode === 'application' ? 'direct' : 'application';
                    try {
                      await updateEvent(eventId, { signupMode: next });
                      setEvent((prev) => prev ? { ...prev, signupMode: next } : prev);
                      setFlash({ open: true, severity: 'success', message: next === 'application' ? '已开启申请制' : '已切换为直接报名' });
                    } catch { setFlash({ open: true, severity: 'error', message: '操作失败' }); }
                  }}
                >
                  {event.signupMode === 'application' ? '📋 关闭申请制' : '📋 开启申请制'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color={excludedUserIds.length > 0 ? 'warning' : 'inherit'}
                  onClick={() => setExclusionDialogOpen(true)}
                >
                  {excludedUserIds.length > 0 ? `👁 不可见 (${excludedUserIds.length})` : '👁 不可见名单'}
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
              {/* Poster generation — visible to all logged-in users */}
                {user?.id && (
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={posterLoading}
                    startIcon={<ImageIcon />}
                    onClick={async () => {
                      if (!event) return;
                      setPosterLoading(true);
                      try {
                        const eventTag = resolveEventTag(event.scene, (event as any).tags);
                        const recs = event.linkedRecommendations ?? [];
                        const primaryRec = recs.find((r) => r.isSelected) ?? recs.find((r) => r.coverUrl) ?? recs[0];
                        const coverImageUrl = primaryRec?.coverUrl || event.filmPoster || (isImageUrl(event.scene) ? event.scene : undefined);
                        const isMovie = eventTag === 'movie';
                        const movieRec = isMovie ? (recs.find((r) => r.category === 'movie') ?? primaryRec) : undefined;
                        const blob = await generateEventPoster({
                          title: event.title,
                          date: event.date,
                          location: [event.city, event.state].filter(Boolean).join(', '),
                          hostName: event.host,
                          eventTag,
                          coverImageUrl,
                          movieName: isMovie ? (movieRec?.title || event.film || undefined) : undefined,
                          movieMeta: isMovie ? (movieRec?.description || undefined) : undefined,
                        });
                        downloadBlob(blob, `${event.title}-海报.png`);
                      } catch (err) {
                        console.error('Poster generation failed:', err);
                        setFlash({ open: true, severity: 'error', message: '海报生成失败' });
                      } finally {
                        setPosterLoading(false);
                      }
                    }}
                  >
                    {posterLoading ? '生成中…' : '生成海报'}
                  </Button>
                )}
              </Stack>
            )}
            {/* Poster button for non-host users */}
            {user?.id && !(isHost || isCoHost || isAdmin) && (
              <Stack direction="row" sx={{ mb: 1.5 }}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={posterLoading}
                  startIcon={<ImageIcon />}
                  onClick={async () => {
                    if (!event) return;
                    setPosterLoading(true);
                    try {
                      const eventTag = resolveEventTag(event.scene, (event as any).tags);
                      const recs = event.linkedRecommendations ?? [];
                      const primaryRec = recs.find((r) => r.isSelected) ?? recs.find((r) => r.coverUrl) ?? recs[0];
                      const coverImageUrl = primaryRec?.coverUrl || event.filmPoster || (isImageUrl(event.scene) ? event.scene : undefined);
                      const isMovie = eventTag === 'movie';
                      const movieRec = isMovie ? (recs.find((r) => r.category === 'movie') ?? primaryRec) : undefined;
                      const blob = await generateEventPoster({
                        title: event.title,
                        date: event.date,
                        location: [event.city, event.state].filter(Boolean).join(', '),
                        hostName: event.host,
                        eventTag,
                        coverImageUrl,
                        movieName: isMovie ? (movieRec?.title || event.film || undefined) : undefined,
                        movieMeta: isMovie ? (movieRec?.description || undefined) : undefined,
                      });
                      downloadBlob(blob, `${event.title}-海报.png`);
                    } catch (err) {
                      console.error('Poster generation failed:', err);
                      setFlash({ open: true, severity: 'error', message: '海报生成失败' });
                    } finally {
                      setPosterLoading(false);
                    }
                  }}
                >
                  {posterLoading ? '生成中…' : '生成海报'}
                </Button>
              </Stack>
            )}

            {/* 3. Description */}
            {event.desc && (
              <Box sx={{ mt: 1, mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>活动说明</Typography>
                <RichTextViewer html={event.desc} />
              </Box>
            )}

            {/* 4. Additional info */}
            <Stack spacing={0.75} sx={{ mb: 2 }}>
              {signedUp && event.address && (
                <Typography variant="caption" color="success.main">
                  📍 {event.address}{event.zipCode ? ` ${event.zipCode}` : ''}
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
                      {(() => {
                        const movieRec = (event.linkedRecommendations ?? []).find((r) => r.category === 'movie' && r.title === event.film);
                        const posterUrl = movieRec?.coverUrl;
                        return posterUrl
                          ? <img src={posterUrl} alt={event.film} style={{ width: 40, height: 56, borderRadius: 4, objectFit: 'cover' }} />
                          : <Poster title={event.film} w={40} h={56} />;
                      })()}
                      <Box>
                        <Typography variant="body2" fontWeight={700}>🎬 放映：{event.film}</Typography>
                        <Typography variant="caption" color="text.secondary">点击查看电影详情</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            )}

            {/* 6b. Unified recommendations section — per-category */}
            {(() => {
              const recs = (event.linkedRecommendations ?? []) as NonNullable<typeof event.linkedRecommendations>;
              const cats = event.recCategories ?? [];
              const catModes = event.recCategoryModes ?? {};
              const defaultMode = event.recSelectionMode ?? 'nominate';
              const hasRecs = recs.length > 0;
              const isEnded = event.phase === 'ended' || event.phase === 'cancelled';
              const showSection = hasRecs || cats.length > 0 || ((!isEnded) && (isHost || isCoHost || isAdmin || signedUp));

              const handleVote = async (recId: string, isMovieTable: boolean) => {
                if (!user) return;
                try {
                  const result = isMovieTable
                    ? await toggleMovieVote(recId, user.id)
                    : await toggleRecommendationVote(recId, user.id);
                  const newVoted = (result as any).voted as boolean;
                  const serverCount = (result as any).voteCount as number | undefined;
                  setEvent((prev) => {
                    if (!prev) return prev;
                    const signupIds: string[] = (prev as any).signupUserIds ?? [];
                    const hId: string = (prev as any).hostId ?? '';
                    const coIds: string[] = (prev as any).coHostIds ?? [];
                    const isParticipant = user.id === hId || coIds.includes(user.id) || signupIds.includes(user.id);
                    const delta = newVoted ? 1 : -1;
                    const updated = (prev.linkedRecommendations ?? []).map((r) => {
                      if (r.id !== recId) return r;
                      const newVoterIds = newVoted
                        ? [...(r.voterIds ?? []).filter((id) => id !== user.id), user.id]
                        : (r.voterIds ?? []).filter((id) => id !== user.id);
                      return {
                        ...r,
                        voterIds: newVoterIds,
                        globalVotes: serverCount ?? ((r.globalVotes ?? 0) + delta),
                        attendeeVotes: isParticipant ? Math.max(0, (r.attendeeVotes ?? 0) + delta) : r.attendeeVotes,
                      };
                    });
                    return { ...prev, linkedRecommendations: updated };
                  });
                } catch { setFlash({ open: true, severity: 'error', message: '投票失败' }); }
              };
              if (!showSection) return null;

              const catIcon: Record<string, string> = { movie: '🍿', book: '📚', recipe: '🍳', place: '📍', music: '🎵', external_event: '🎭' };
              const catLabel: Record<string, string> = { movie: '电影', book: '书', recipe: '食谱', place: '地方', music: '音乐', external_event: '演出' };

              // Determine which categories to show: configured cats, or unique cats from linked recs
              const displayCats = cats.length > 0 ? cats : [...new Set(recs.map((r) => r.category))];

              return (
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" fontWeight={700} sx={{ mb: 1.5, display: 'block' }}>
                      📋 推荐
                    </Typography>

                    {displayCats.map((cat) => {
                      const mode = catModes[cat] ?? defaultMode;
                      const catRecs = recs.filter((r) => r.category === cat);
                      const selected = catRecs.filter((r) => r.isSelected);
                      const unselected = catRecs.filter((r) => !r.isSelected);
                      const canNominate = (isHost || isCoHost || isAdmin || (signedUp && mode === 'nominate')) && event.phase !== 'ended' && event.phase !== 'cancelled';

                      return (
                        <Box key={cat} sx={{ mb: 2 }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                            <Typography variant="body2" fontWeight={700}>
                              {catIcon[cat] ?? '📋'} {catLabel[cat] ?? cat}
                            </Typography>
                            <Chip size="small" variant="outlined" label={mode === 'nominate' ? '开放提名' : '已选定'} />
                          </Stack>

                          {/* Selected */}
                          {selected.map((rec) => {
                            const isMovie = (rec as any)._fromMovieTable;
                            const voted = user ? (rec.voterIds ?? []).includes(user.id) : false;
                            return (
                            <Card key={rec.id} variant="outlined" sx={{ borderColor: 'success.main', borderWidth: 2, mb: 1 }}>
                              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Box sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate(`/discover/${rec.category}/${rec.id}`)}>
                                    <Typography variant="body2" fontWeight={700}>{rec.title}</Typography>
                                    <Stack direction="row" spacing={1.5} sx={{ mt: 0.25 }}>
                                      <Typography variant="caption" color="text.secondary">串门儿 {rec.globalVotes ?? 0} 票</Typography>
                                      {(rec.attendeeTotal ?? 0) > 0 && (
                                        <Typography variant="caption" fontWeight={700} color="primary">参与者 {rec.attendeeVotes ?? 0}/{rec.attendeeTotal} 已投</Typography>
                                      )}
                                    </Stack>
                                  </Box>
                                  <Chip size="small" color="success" label="✓ 已选" />
                                  {user && (
                                    <Chip
                                      size="small"
                                      variant={voted ? 'filled' : 'outlined'}
                                      color={voted ? 'primary' : 'default'}
                                      label={`▲ ${rec.globalVotes ?? 0}`}
                                      clickable
                                      onClick={() => handleVote(rec.id, isMovie)}
                                    />
                                  )}
                                </Stack>
                              </CardContent>
                            </Card>
                            );
                          })}

                          {/* Unselected / nominations */}
                          {unselected.map((rec) => {
                            const isMovie = (rec as any)._fromMovieTable;
                            const canDelete = isHost || isCoHost || isAdmin || (!isMovie && user && rec.linkedById === user.id);
                            const canSelect = !isMovie && (isHost || isCoHost || isAdmin) && (event.phase === 'invite' || event.phase === 'open');
                            const voted = user ? (rec.voterIds ?? []).includes(user.id) : false;
                            return (
                              <Card key={rec.id} variant="outlined" sx={{ mb: 1 }}>
                                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Box sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate(isMovie ? `/discover/movies/${rec.id}` : `/discover/${rec.category}/${rec.id}`)}>
                                      <Typography variant="body2" fontWeight={600}>{rec.title}</Typography>
                                      <Stack direction="row" spacing={1.5} sx={{ mt: 0.25 }}>
                                        <Typography variant="caption" color="text.secondary">串门儿 {rec.globalVotes ?? 0} 票</Typography>
                                        {(rec.attendeeTotal ?? 0) > 0 && (
                                          <Typography variant="caption" fontWeight={700} color="primary">参与者 {rec.attendeeVotes ?? 0}/{rec.attendeeTotal} 已投</Typography>
                                        )}
                                        {rec.linkedByName && <Typography variant="caption" color="text.secondary">{rec.linkedByName} 提名</Typography>}
                                      </Stack>
                                    </Box>
                                    {user && (
                                      <Chip
                                        size="small"
                                        variant={voted ? 'filled' : 'outlined'}
                                        color={voted ? 'primary' : 'default'}
                                        label={`▲ ${rec.globalVotes ?? 0}`}
                                        clickable
                                        onClick={() => handleVote(rec.id, isMovie)}
                                      />
                                    )}
                                    {canSelect && (
                                      <Button variant="outlined" size="small" color="success" onClick={async () => {
                                        if (!eventId) return;
                                        try {
                                          await selectEventRecommendation(eventId, rec.id);
                                          setEvent((prev) => {
                                            if (!prev) return prev;
                                            const updated = (prev.linkedRecommendations ?? []).map((r) => ({
                                              ...r, isSelected: r.category === rec.category ? r.id === rec.id : r.isSelected,
                                            }));
                                            return { ...prev, linkedRecommendations: updated };
                                          });
                                          setFlash({ open: true, severity: 'success', message: `已选定「${rec.title}」` });
                                        } catch { setFlash({ open: true, severity: 'error', message: '选定失败' }); }
                                      }} sx={{ whiteSpace: 'nowrap', minWidth: 'auto' }}>选为本场</Button>
                                    )}
                                    {canDelete && (
                                      <IconButton size="small" onClick={async () => {
                                        if (!eventId) return;
                                        try {
                                          if (isMovie) {
                                            await unlinkEventMovie(eventId, rec.id);
                                          } else {
                                            await unlinkEventRecommendation(eventId, rec.id);
                                          }
                                          setEvent((prev) => {
                                            if (!prev) return prev;
                                            return { ...prev, linkedRecommendations: (prev.linkedRecommendations ?? []).filter((r) => r.id !== rec.id) };
                                          });
                                          setFlash({ open: true, severity: 'success', message: `已移除「${rec.title}」` });
                                        } catch { setFlash({ open: true, severity: 'error', message: '移除失败' }); }
                                      }} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}><CloseIcon fontSize="small" /></IconButton>
                                    )}
                                  </Stack>
                                </CardContent>
                              </Card>
                            );
                          })}

                          {catRecs.length === 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                              {mode === 'nominate' ? '还没有提名' : '暂无推荐'}
                            </Typography>
                          )}

                          {canNominate && (
                            <Button variant="outlined" size="small" fullWidth onClick={() => { setRecCategory(cat); setRecLinkOpen(true); }}>
                              {mode === 'nominate' ? '提名' : '添加'}
                            </Button>
                          )}
                        </Box>
                      );
                    })}

                    {/* Fallback: no configured categories, show generic add buttons */}
                    {displayCats.length === 0 && (isHost || isCoHost || isAdmin || signedUp) && event.phase !== 'ended' && event.phase !== 'cancelled' && (
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        {[
                          { key: 'all', label: '+ 全部' },
                          { key: 'movie', label: '🍿 电影' },
                          { key: 'book', label: '📚 书' },
                          { key: 'recipe', label: '🍳 食谱' },
                          { key: 'place', label: '📍 地方' },
                          { key: 'music', label: '🎵 音乐' },
                          { key: 'external_event', label: '🎭 演出' },
                        ].map((cat) => (
                          <Chip key={cat.key} label={cat.label} size="small" variant="outlined" clickable
                            onClick={() => { setRecCategory(cat.key); setRecLinkOpen(true); }} />
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </CardContent>
        </Card>

        {/* Link/Nominate Recommendation dialog */}
        <Dialog open={recLinkOpen} onClose={() => { setRecLinkOpen(false); setRecSearch(''); setRecCategory('all'); }} maxWidth="xs" fullWidth>
          <DialogTitle>{(event.recSelectionMode === 'nominate') ? '提名推荐' : '关联推荐'}{recCategory !== 'all' ? ` · ${{ movie: '电影', book: '书', recipe: '食谱', place: '地方', music: '音乐', external_event: '演出' }[recCategory] ?? ''}` : ''}</DialogTitle>
          <DialogContent>
            <TextField
              size="small"
              fullWidth
              placeholder="搜索推荐名称..."
              value={recSearch}
              onChange={(e) => setRecSearch(e.target.value)}
              autoFocus
              sx={{ mb: 1.5, mt: 0.5 }}
            />
            {(() => {
              const rq = recSearch.toLowerCase();
              const linkedIds = new Set(((event as any).linkedRecommendations ?? []).map((r: any) => r.id));
              const filtered = allRecs.filter((r: any) => {
                if (linkedIds.has(r.id)) return false;
                if (recCategory !== 'all' && r.category !== recCategory) return false;
                if (rq && !(r.title ?? '').toLowerCase().includes(rq) && !(r.description ?? '').toLowerCase().includes(rq)) return false;
                return true;
              });
              const categoryLabel: Record<string, string> = { book: '书', recipe: '食谱', place: '地方', movie: '电影', music: '音乐', external_event: '演出' };
              return filtered.length > 0 ? (
                <Stack spacing={1}>
                  {filtered.slice(0, 20).map((r: any) => (
                    <Card key={r.id} variant="outlined">
                      <CardActionArea onClick={async () => {
                        if (!eventId) return;
                        const isNom = event.recSelectionMode === 'nominate';
                        const isMovie = r._fromMovieTable;
                        try {
                          if (isMovie) {
                            await linkEventMovie(eventId, r.id);
                          } else {
                            await linkEventRecommendation(eventId, r.id, user?.id, isNom);
                          }
                          setEvent((prev) => {
                            if (!prev) return prev;
                            const linked = [...(prev.linkedRecommendations ?? []), {
                              id: r.id, title: r.title, category: r.category,
                              linkedById: isMovie ? undefined : user?.id,
                              linkedByName: isMovie ? undefined : user?.name,
                              isSelected: false, isNomination: isNom,
                              globalVotes: r.voteCount ?? 0, attendeeVotes: 0, attendeeTotal: 0,
                              _fromMovieTable: isMovie || undefined,
                            }];
                            return { ...prev, linkedRecommendations: linked };
                          });
                          setRecLinkOpen(false);
                          setRecSearch('');
                          setRecCategory('all');
                          setFlash({ open: true, severity: 'success', message: isNom ? `已提名「${r.title}」` : `已关联「${r.title}」` });
                        } catch {
                          setFlash({ open: true, severity: 'error', message: '操作失败' });
                        }
                      }}>
                        <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                          <Typography variant="body2" fontWeight={600}>{r.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {categoryLabel[r.category] ?? r.category}{r.recommendedBy?.name ? ` · ${r.recommendedBy.name} 推荐` : ''}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Stack spacing={1.5} alignItems="center" sx={{ py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {recSearch ? `没有找到「${recSearch}」` : '没有更多推荐'}
                  </Typography>
                  {recSearch && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        setRecLinkOpen(false);
                        setRecSearch('');
                        setRecCategory('all');
                        navigate('/discover');
                      }}
                    >
                      去添加推荐
                    </Button>
                  )}
                </Stack>
              );
            })()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setRecLinkOpen(false); setRecSearch(''); setRecCategory('all'); }}>取消</Button>
          </DialogActions>
        </Dialog>

        {/* 7b. Action button — offer response or signup */}
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
            {myStatus === 'pending' && event.phase !== 'ended' ? (
              /* Application pending: show status with cancel option */
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ flex: 1, textAlign: 'center', py: 1.2, borderRadius: 2, bgcolor: 'warning.main', opacity: 0.15 }}>
                    <Typography sx={{ color: 'warning.main', fontWeight: 700, fontSize: 14, opacity: 1 }}>申请已提交，等待审批</Typography>
                  </Box>
                  <Button size="small" color="inherit" sx={{ color: 'text.secondary', fontSize: 12, flexShrink: 0 }} onClick={() => setCancelDialogOpen(true)}>
                    撤回申请
                  </Button>
                </Stack>
                {(() => {
                  const myDetail = (event.signupDetails ?? []).find((s) => s.userId === user?.id);
                  if (!myDetail?.note && !myDetail?.intendedTaskId) return null;
                  const task = myDetail.intendedTaskId ? eventTasks.find(t => t.id === myDetail.intendedTaskId) : null;
                  return (
                    <Box sx={{ px: 1.5, py: 1, bgcolor: 'action.hover', borderRadius: 2 }}>
                      {myDetail.note && <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>留言：{myDetail.note}</Typography>}
                      {task && <Typography variant="body2" color="primary" sx={{ fontSize: 13 }}>想认领：{task.role}</Typography>}
                    </Box>
                  );
                })()}
              </Stack>
            ) : signedUp && event.phase !== 'ended' ? (
              /* Already signed up: muted status with cancel option */
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ flex: 1, textAlign: 'center', py: 1.2, borderRadius: 2, bgcolor: 'success.main', opacity: 0.15 }}>
                  <Typography sx={{ color: 'success.main', fontWeight: 700, fontSize: 14, opacity: 1 }}>✓ 已报名</Typography>
                </Box>
                <Button size="small" color="inherit" sx={{ color: 'text.secondary', fontSize: 12, flexShrink: 0 }} onClick={() => setCancelDialogOpen(true)}>
                  取消报名
                </Button>
              </Stack>
            ) : signedUp && event.phase === 'ended' ? (
              /* Already participated in ended event: passive label */
              <Box sx={{ textAlign: 'center', py: 1.2, borderRadius: 2, bgcolor: 'success.main', opacity: 0.15 }}>
                <Typography sx={{ color: 'success.main', fontWeight: 700, fontSize: 14, opacity: 1 }}>✓ 已参与</Typography>
              </Box>
            ) : event.phase !== 'ended' ? (
              /* Not signed up: action button */
              <Button
                variant="contained"
                fullWidth
                onClick={onSignup}
                disabled={!user}
                color={myStatus === 'waitlist' ? 'warning' : myStatus === 'invited' ? 'info' : 'primary'}
              >
                {!user
                  ? '登录后可报名'
                  : myStatus === 'waitlist'
                    ? `等位中 · 第${((event.signupDetails ?? []).filter(s => s.status === 'waitlist').findIndex(s => s.userId === user.id) + 1) || '?'}位`
                    : myStatus === 'invited'
                      ? '接受邀请'
                      : event.signupMode === 'application'
                        ? '申请参加'
                        : event.spots <= 0
                          ? '加入等位'
                          : '报名参加'}
              </Button>
            ) : null}
          </Box>
        )}

        {/* 8. Participants */}
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>参与者</Typography>
              {event.phase !== 'ended' && event.phase !== 'cancelled' && event.spots <= 0 && (
                <Typography variant="body2" color="error.main">
                  {(event.waitlistCount ?? 0) > 0
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
            {(isHost || isCoHost || isAdmin) ? (
              /* Host/co-host/admin view: list with remove buttons */
              <Stack spacing={0.5}>
                {event.people.map((p) => {
                  const name = pName(p);
                  const avatar = pAvatar(p);
                  const memberId = allMembers.find((m) => m.name === name)?.id;
                  const isNameCoHost = event.coHosts?.includes(name) ?? false;
                  return (
                    <Stack key={name} direction="row" alignItems="center" spacing={1}>
                      <Avatar
                        src={avatar}
                        sx={{ cursor: 'pointer', width: 34, height: 34, ...((name === event.host || isNameCoHost) ? { border: '2px solid', borderColor: 'primary.main' } : {}) }}
                        onClick={() => navigate(`/members/${encodeURIComponent(name)}`)}
                      >
                        {firstNonEmoji(name)}
                      </Avatar>
                      <Typography variant="body2" sx={{ flex: 1 }}>{name}</Typography>
                      {name === event.host && <Chip size="small" label="Host" variant="outlined" />}
                      {isNameCoHost && (
                        <>
                          <Chip size="small" label="Co-Host" variant="outlined" color="secondary" />
                          {(isHost || isCoHost) && memberId && (
                            <IconButton
                              size="small"
                              onClick={async () => {
                                if (!eventId || !user?.id) return;
                                try {
                                  await removeCoHost(eventId, memberId, user.id);
                                  setFlash({ open: true, severity: 'success', message: `已移除 Co-Host ${name}` });
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
                        </>
                      )}
                      {name !== event.host && !isNameCoHost && memberId && (
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
                {/* Invited section (pending acceptance) */}
                {(() => {
                  const invitedPeople = (event.signupDetails ?? []).filter((s) => s.status === 'invited');
                  if (invitedPeople.length === 0) return null;
                  return (
                    <>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, mb: 0.5 }}>
                        已邀请（待确认）
                      </Typography>
                      {invitedPeople.map((s) => (
                        <Stack key={s.userId} direction="row" alignItems="center" spacing={1}>
                          <Avatar
                            sx={{ cursor: 'pointer', width: 30, height: 30, opacity: 0.6 }}
                            onClick={() => navigate(`/members/${encodeURIComponent(s.name)}`)}
                          >
                            {firstNonEmoji(s.name)}
                          </Avatar>
                          <Typography variant="body2" sx={{ flex: 1, opacity: 0.6 }}>{s.name}</Typography>
                          <Chip size="small" label="待接受" variant="outlined" sx={{ opacity: 0.6 }} />
                          <IconButton
                            size="small"
                            onClick={async () => {
                              if (!eventId || !user?.id) return;
                              try {
                                await removeParticipant(eventId, s.userId, user.id);
                                setFlash({ open: true, severity: 'success', message: `已取消邀请 ${s.name}` });
                                await refreshEvent();
                              } catch {
                                setFlash({ open: true, severity: 'error', message: '取消邀请失败' });
                              }
                            }}
                            sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      ))}
                    </>
                  );
                })()}
                {event.phase !== 'cancelled' && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => setHostInviteOpen(true)}
                    >
                      {event.phase === 'ended' ? '添加参与者' : '邀请成员'}
                    </Button>
                    {(isHost || isCoHost) && event.phase !== 'ended' && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="secondary"
                        onClick={() => setCoHostDialogOpen(true)}
                      >
                        添加 Co-Host
                      </Button>
                    )}
                  </Stack>
                )}
              </Stack>
            ) : (
              /* Normal view: clickable avatar row */
              <Stack spacing={0.5}>
                <Stack direction="row" gap={0.5} alignItems="center" flexWrap="wrap">
                  {(showAllPeople ? event.people : event.people.slice(0, 8)).map((p) => {
                    const name = pName(p);
                    const avatar = pAvatar(p);
                    const isNameCoHost = event.coHosts?.includes(name) ?? false;
                    return (
                      <Tooltip key={name} title={name} arrow>
                        <Avatar
                          src={avatar}
                          sx={{ cursor: 'pointer', width: 34, height: 34, ...((name === event.host || isNameCoHost) ? { border: '2px solid', borderColor: 'primary.main' } : {}) }}
                          onClick={() => navigate(`/members/${encodeURIComponent(name)}`)}
                        >
                          {firstNonEmoji(name)}
                        </Avatar>
                      </Tooltip>
                    );
                  })}
                  {!showAllPeople && event.people.length > 8 && (
                    <Avatar
                      sx={{ cursor: 'pointer', width: 34, height: 34, bgcolor: 'action.selected', fontSize: 14 }}
                      onClick={() => setShowAllPeople(true)}
                    >
                      +{event.people.length - 8}
                    </Avatar>
                  )}
                  {showAllPeople && event.people.length > 8 && (
                    <Typography
                      variant="caption"
                      color="primary"
                      sx={{ cursor: 'pointer', ml: 0.5 }}
                      onClick={() => setShowAllPeople(false)}
                    >
                      收起
                    </Typography>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  🏠 {event.host} · Host{(event.coHosts?.length ?? 0) > 0 && ` + ${event.coHosts!.join(', ')} · Co-Host`}
                </Typography>
              </Stack>
            )}
            {event.phase === 'ended' && user && (
              <Stack spacing={1} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => navigate('/cards')}
                >
                  ✉ 给 Ta 们寄张感谢卡
                </Button>
                {signedUp && (
                  <>
                    {event.host !== user?.name && (
                      <Button variant="outlined" size="small" fullWidth
                        onClick={() => navigate('/events/new')}>
                        🏠 试试当 Host
                      </Button>
                    )}
                    <Button variant="outlined" size="small" fullWidth
                      onClick={() => navigate('/events/proposals/new')}>
                      💡 提一个活动创意
                    </Button>
                  </>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Host waitlist management panel */}
        {(isHost || isCoHost || isAdmin) && event.phase !== 'ended' && event.phase !== 'cancelled' && (() => {
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

        {/* Host application management panel */}
        {(isHost || isCoHost || isAdmin) && event.signupMode === 'application' && event.phase !== 'ended' && event.phase !== 'cancelled' && (() => {
          const pendingPeople = (event.signupDetails ?? []).filter((s) => s.status === 'pending');
          if (pendingPeople.length === 0) return null;
          return (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  待审批申请 ({pendingPeople.length}人)
                </Typography>
                <Stack spacing={1.5}>
                  {pendingPeople.map((s) => (
                    <Stack key={s.userId} spacing={0.5}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Avatar sx={{ width: 30, height: 30 }}>{firstNonEmoji(s.name)}</Avatar>
                        <Typography variant="body2" sx={{ flex: 1 }}>{s.name}</Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={async () => {
                            if (!eventId || !user?.id) return;
                            try {
                              await approveApplication(eventId, s.userId, user.id);
                              setFlash({ open: true, severity: 'success', message: `已通过 ${s.name} 的申请` });
                              await Promise.all([refreshEvent(), refreshTasks()]);
                            } catch (err: any) {
                              const isFull = err?.status === 409;
                              if (isFull) {
                                setCapacityBumpTarget({ userId: s.userId, name: s.name });
                              } else {
                                setFlash({ open: true, severity: 'error', message: '操作失败' });
                              }
                            }
                          }}
                        >
                          通过
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          onClick={async () => {
                            if (!eventId || !user?.id) return;
                            try {
                              await rejectApplication(eventId, s.userId, user.id);
                              setFlash({ open: true, severity: 'success', message: `已婉拒 ${s.name}` });
                              await refreshEvent();
                            } catch {
                              setFlash({ open: true, severity: 'error', message: '操作失败' });
                            }
                          }}
                        >
                          婉拒
                        </Button>
                      </Stack>
                      {(s.note || s.intendedTaskId) && (
                        <Box sx={{ ml: 5.5 }}>
                          {s.note && <Typography variant="caption" color="text.secondary">留言：{s.note}</Typography>}
                          {s.intendedTaskId && (() => {
                            const task = eventTasks.find(t => t.id === s.intendedTaskId);
                            return task ? <Typography variant="caption" color="primary">想认领：{task.role}</Typography> : null;
                          })()}
                        </Box>
                      )}
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          );
        })()}

        {/* 8. Unified tasks (分工) — persisted via API */}
        {(eventTasks.length > 0 || isHost || isCoHost || isAdmin) && (
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>分工认领</Typography>
                {(isHost || isCoHost || isAdmin) && !taskEditing && (
                  <Button size="small" startIcon={<EditIcon />} onClick={() => setTaskEditing(true)}>
                    编辑
                  </Button>
                )}
                {taskEditing && (
                  <Button size="small" variant="contained" onClick={async () => {
                    // Auto-save unsaved input before exiting edit mode
                    if (eventId && newTaskRole.trim()) {
                      try {
                        await createEventTasks(eventId, [{ role: newTaskRole.trim(), description: newTaskDesc.trim() || undefined }]);
                        setNewTaskRole('');
                        setNewTaskDesc('');
                        await refreshTasks();
                      } catch { /* ignore — will show in list if saved */ }
                    }
                    setTaskEditing(false);
                  }}>
                    完成
                  </Button>
                )}
              </Stack>

              {taskEditing ? (
                /* Host edit mode */
                <Stack spacing={1.5}>
                  {eventTasks.map((task) => (
                    <Stack key={task.id} direction="row" spacing={1} alignItems="center">
                      <Stack sx={{ flex: 1 }} spacing={0.5}>
                        <Typography variant="body2" fontWeight={600}>{task.role}</Typography>
                        {task.description && (
                          <Typography variant="caption" color="text.secondary">{task.description}</Typography>
                        )}
                        {task.claimedBy && (
                          <Typography variant="caption" color="primary">认领人：{task.claimedBy.name}</Typography>
                        )}
                      </Stack>
                      <IconButton
                        size="small"
                        onClick={async () => {
                          if (!eventId) return;
                          try {
                            await deleteEventTask(eventId, task.id);
                            await refreshTasks();
                          } catch {
                            setFlash({ open: true, severity: 'error', message: '删除失败' });
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                  {/* Add new task inline */}
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <TextField
                      size="small"
                      placeholder="新分工名称"
                      value={newTaskRole}
                      onChange={(e) => setNewTaskRole(e.target.value)}
                    />
                    <TextField
                      size="small"
                      placeholder="描述（可选）"
                      value={newTaskDesc}
                      onChange={(e) => setNewTaskDesc(e.target.value)}
                    />
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      disabled={!newTaskRole.trim()}
                      onClick={async () => {
                        if (!eventId || !newTaskRole.trim()) return;
                        try {
                          await createEventTasks(eventId, [{ role: newTaskRole.trim(), description: newTaskDesc.trim() || undefined }]);
                          setNewTaskRole('');
                          setNewTaskDesc('');
                          await refreshTasks();
                          setFlash({ open: true, severity: 'success', message: '分工已添加' });
                        } catch (err) {
                          console.error('添加分工失败', err);
                          setFlash({ open: true, severity: 'error', message: err instanceof Error ? err.message : '添加失败' });
                        }
                      }}
                    >
                      添加分工
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                /* Display mode — all users can see */
                <Stack spacing={1}>
                  {eventTasks.map((task) => (
                    <Stack key={task.id} direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                        {task.claimedBy ? (
                          <>
                            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>{firstNonEmoji(task.claimedBy.name)}</Avatar>
                            <Typography variant="body2">{task.claimedBy.name}</Typography>
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">待认领</Typography>
                        )}
                        <Chip
                          size="small"
                          variant="outlined"
                          label={task.role}
                          color={task.isCustom ? 'info' : 'default'}
                          icon={task.isCustom ? <span style={{ fontSize: 12, marginLeft: 6 }}>💡</span> : undefined}
                        />
                      </Stack>
                      {task.claimedBy ? (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {(task.claimedById === user?.id || isHost || isCoHost || isAdmin) && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={async () => {
                                if (!eventId) return;
                                try {
                                  await unclaimEventTask(eventId, task.id);
                                  await refreshTasks();
                                  setFlash({ open: true, severity: 'success', message: `已取消「${task.role}」的分配` });
                                } catch {
                                  setFlash({ open: true, severity: 'error', message: '操作失败' });
                                }
                              }}
                            >
                              {task.claimedById === user?.id ? '取消认领' : '取消分配'}
                            </Button>
                          )}
                          {task.claimedById !== user?.id && !(isHost || isCoHost || isAdmin) && (
                            <Chip size="small" color="success" label="已分配" />
                          )}
                        </Stack>
                      ) : (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {user && (signedUp || isHost || isCoHost || isAdmin) && (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={async () => {
                                if (!eventId) return;
                                try {
                                  await claimEventTask(eventId, task.id, user.id);
                                  await refreshTasks();
                                  setFlash({ open: true, severity: 'success', message: `已认领「${task.role}」` });
                                } catch (err) {
                                  setFlash({ open: true, severity: 'error', message: err instanceof Error ? err.message : '认领失败' });
                                }
                              }}
                            >
                              我来！
                            </Button>
                          )}
                          {(isHost || isCoHost || isAdmin) && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setAssignTaskId(task.id)}
                            >
                              指派
                            </Button>
                          )}
                        </Stack>
                      )}
                    </Stack>
                  ))}
                  {eventTasks.length === 0 && (isHost || isCoHost || isAdmin) && (
                    <Typography variant="body2" color="text.secondary">
                      暂无分工，点击"编辑"添加
                    </Typography>
                  )}
                  {/* Volunteer button for signed-up users */}
                  {user && (signedUp || isHost || isCoHost || isAdmin) && eventTasks.length > 0 && (
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<AddIcon />}
                      onClick={() => setTaskClaimOpen(true)}
                      sx={{ alignSelf: 'flex-start', mt: 0.5 }}
                    >
                      我也能帮忙
                    </Button>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        )}

        {/* Task Claim Dialog */}
        <TaskClaimDialog
          open={taskClaimOpen}
          onClose={() => {
            setTaskClaimOpen(false);
            setFlash({ open: true, severity: 'success', message: '报名参加成功' });
          }}
          tasks={eventTasks}
          onClaim={async (taskId) => {
            if (!eventId || !user?.id) return;
            await claimEventTask(eventId, taskId, user.id);
            await refreshTasks();
            setFlash({ open: true, severity: 'success', message: '认领成功！' });
          }}
          onVolunteer={async (role, description) => {
            if (!eventId || !user?.id) return;
            await volunteerEventTask(eventId, user.id, role, description);
            await refreshTasks();
            setFlash({ open: true, severity: 'success', message: '自荐成功！' });
          }}
        />

        {/* Assign task dialog — host picks a signed-up member */}
        <Dialog open={Boolean(assignTaskId)} onClose={() => setAssignTaskId(null)} maxWidth="xs" fullWidth>
          <DialogTitle>指派分工</DialogTitle>
          <DialogContent>
            {(() => {
              const task = eventTasks.find((t) => t.id === assignTaskId);
              if (!task) return null;
              // Show accepted participants (not host/co-hosts, not already assigned to this task)
              const assignable = (event.signupDetails ?? [])
                .filter((s) => ['accepted', 'offered'].includes(s.status))
                .filter((s) => s.name !== event.host && !(event.coHosts ?? []).includes(s.name));
              return (
                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    为「{task.role}」选择负责人
                  </Typography>
                  {assignable.map((s) => (
                    <Stack key={s.userId} direction="row" alignItems="center" spacing={1}>
                      <Avatar sx={{ width: 28, height: 28 }}>{firstNonEmoji(s.name)}</Avatar>
                      <Typography variant="body2" sx={{ flex: 1 }}>{s.name}</Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={async () => {
                          if (!eventId || !assignTaskId) return;
                          try {
                            await claimEventTask(eventId, assignTaskId, s.userId);
                            await refreshTasks();
                            setAssignTaskId(null);
                            setFlash({ open: true, severity: 'success', message: `已指派「${task.role}」给 ${s.name}` });
                          } catch (err) {
                            setFlash({ open: true, severity: 'error', message: err instanceof Error ? err.message : '指派失败' });
                          }
                        }}
                      >
                        指派
                      </Button>
                    </Stack>
                  ))}
                  {assignable.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
                      暂无可指派的参与者
                    </Typography>
                  )}
                </Stack>
              );
            })()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssignTaskId(null)}>关闭</Button>
          </DialogActions>
        </Dialog>

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
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
                  if (files.length === 0) return;
                  const valid = files.slice(0, 9);
                  const newPreviews = valid.map((file) => ({ file, preview: URL.createObjectURL(file), caption: '' }));
                  setUploadPreviews((prev) => [...prev, ...newPreviews].slice(0, 9));
                }}
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
                <Typography variant="body1" sx={{ mb: 0.5 }}>点击、粘贴或拖拽照片到此处</Typography>
                <Typography variant="caption" color="text.secondary">
                  最多选择 9 张，单张不超过 10MB
                </Typography>
              </Box>
            ) : (
              <Stack
                spacing={2}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
                  if (files.length === 0) return;
                  setUploadPreviews((prev) => {
                    const valid = files.slice(0, 9 - prev.length);
                    const newPreviews = valid.map((file) => ({ file, preview: URL.createObjectURL(file), caption: '' }));
                    return [...prev, ...newPreviews].slice(0, 9);
                  });
                }}
              >
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
                let lastError = '';
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
                      lastError = err instanceof Error ? err.message : String(err);
                      console.error('Photo upload failed:', err);
                    }
                  }
                  if (uploaded.length > 0) {
                    setPhotos((prev) => [...prev, ...uploaded]);
                    const msg = uploaded.length < uploadPreviews.length
                      ? `已上传 ${uploaded.length}/${uploadPreviews.length} 张，部分失败: ${lastError}`
                      : `上传成功，已添加 ${uploaded.length} 张照片`;
                    setFlash({ open: true, severity: uploaded.length < uploadPreviews.length ? 'error' : 'success', message: msg });
                  } else {
                    setFlash({ open: true, severity: 'error', message: `上传失败: ${lastError || '未知错误'}` });
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
        {eventId && <CommentSection entityType="event" entityId={eventId} />}


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
              <Stack direction="row" spacing={1}>
                <TextField label="城市" value={editCity} onChange={(e) => setEditCity(e.target.value)} sx={{ flex: 2 }} />
                <TextField label="州" value={editState} onChange={(e) => setEditState(e.target.value)} sx={{ flex: 1 }} />
                <TextField label="邮编" value={editZipCode} onChange={(e) => setEditZipCode(e.target.value)} sx={{ flex: 1 }} />
              </Stack>
              <TextField
                label="具体地址（报名后可见）"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                fullWidth
                helperText="仅报名成功的参与者可见"
              />
              <TextField
                label="总人数上限（含 Host）"
                type="number"
                value={editCapacity}
                onChange={(e) => setEditCapacity(Math.max(2, Number(e.target.value) || 8))}
                fullWidth
                helperText="包括 Host 和 Co-Host 在内的总人数"
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
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>封面图（可选）</Typography>
                <ImageUpload
                  value={editTitleImageUrl}
                  onChange={setEditTitleImageUrl}
                  category="event-image"
                  ownerId={user?.id}
                  width="100%"
                  height={160}
                  shape="rect"
                  maxSize={10 * 1024 * 1024}
                />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>说明</Typography>
                <Suspense fallback={<div style={{ minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>加载编辑器...</div>}>
                  <RichTextEditorLazy
                    content={editDesc}
                    onChange={setEditDesc}
                    placeholder="活动说明..."
                    editorRef={descEditorRef}
                    onUploadImage={async (file) => {
                      const { publicUrl } = await uploadMedia(file, 'event-image', user!.id);
                      return publicUrl;
                    }}
                  />
                </Suspense>
                {photos.filter((p) => !embeddedUrls.has(p.url)).length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      点击 + 将照片插入到描述中
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                      {photos.filter((p) => !embeddedUrls.has(p.url)).map((p) => (
                        <Box key={p.id} sx={{ position: 'relative' }}>
                          <Box
                            sx={{
                              width: 56, height: 56, borderRadius: 1,
                              backgroundImage: `url(${p.url})`, backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => {
                              descEditorRef.current?.insertImage(p.url);
                              setEmbeddedUrls((prev) => new Set(prev).add(p.url));
                            }}
                            sx={{
                              position: 'absolute', bottom: -4, right: -4,
                              bgcolor: 'primary.main', color: '#fff',
                              width: 20, height: 20,
                              '&:hover': { bgcolor: 'primary.dark' },
                            }}
                          >
                            <AddIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>吃什么</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {([
                    { value: 'potluck' as FoodOption, label: 'Potluck' },
                    { value: 'host_cook' as FoodOption, label: 'Host 准备' },
                    { value: 'eat_out' as FoodOption, label: '出去吃' },
                    { value: 'none' as FoodOption, label: '不涉及' },
                  ]).map((opt) => (
                    <Chip
                      key={opt.value}
                      label={opt.label}
                      onClick={() => setEditFoodOption(opt.value)}
                      color={editFoodOption === opt.value ? 'primary' : 'default'}
                      variant={editFoodOption === opt.value ? 'filled' : 'outlined'}
                    />
                  ))}
                </Stack>
                {editFoodOption === 'eat_out' && (
                  <TextField
                    label="餐厅地址"
                    value={editRestaurantLocation}
                    onChange={(e) => setEditRestaurantLocation(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2">申请制报名</Typography>
                  <Typography variant="caption" color="text.secondary">开启后参与者需提交申请，由你审批</Typography>
                </Box>
                <Switch checked={editSignupMode === 'application'} onChange={(_, checked) => setEditSignupMode(checked ? 'application' : 'direct')} />
              </Stack>
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
                  if (editCity !== event.city) payload.city = editCity;
                  if (editState !== (event.state ?? '')) payload.state = editState;
                  if (editZipCode !== (event.zipCode ?? '')) payload.zipCode = editZipCode;
                  if (editAddress !== (event.address ?? '')) payload.address = editAddress;
                  if (editCapacity !== event.total) payload.capacity = editCapacity;
                  const origStartsAt = (loadedEvent as any)?.startsAt ? new Date((loadedEvent as any).startsAt).toISOString().slice(0, 16) : '';
                  const origEndsAt = (loadedEvent as any)?.endsAt ? new Date((loadedEvent as any).endsAt).toISOString().slice(0, 16) : '';
                  if (editStartsAt && editStartsAt !== origStartsAt) payload.startsAt = editStartsAt;
                  if (editEndsAt && editEndsAt !== origEndsAt) payload.endsAt = editEndsAt;
                  const currentImageUrl = isImageUrl(event.scene) ? event.scene : '';
                  if (editTitleImageUrl !== currentImageUrl) payload.titleImageUrl = editTitleImageUrl;
                  if (editSignupMode !== (event.signupMode ?? 'direct')) payload.signupMode = editSignupMode;
                  const newFood = editFoodOption === 'none' ? '' : editFoodOption;
                  if (newFood !== (event.foodOption ?? '')) payload.foodOption = newFood;
                  const newRestaurant = editFoodOption === 'eat_out' ? editRestaurantLocation.trim() : '';
                  if (newRestaurant !== (event.restaurantLocation ?? '')) payload.restaurantLocation = newRestaurant;
                  if (Object.keys(payload).length > 0) {
                    await updateEvent(eventId, payload as any);
                    setEvent((prev) => prev ? {
                      ...prev,
                      title: editTitle.trim() || prev.title,
                      desc: editDesc ?? prev.desc,
                      city: editCity || prev.city,
                      state: editState || prev.state,
                      zipCode: editZipCode || prev.zipCode,
                      address: editAddress || prev.address,
                      total: editCapacity || prev.total,
                      spots: Math.max(0, (editCapacity || prev.total) - (1 + (prev.coHosts?.length ?? 0)) - (prev.signupDetails ?? []).filter((s) => ['accepted', 'invited', 'offered'].includes(s.status)).length),
                      date: editStartsAt ? new Date(editStartsAt).toLocaleString('zh-CN') : prev.date,
                      endDate: editEndsAt ? new Date(editEndsAt).toLocaleString('zh-CN') : prev.endDate,
                      scene: editTitleImageUrl || prev.scene,
                      signupMode: editSignupMode,
                      foodOption: newFood || undefined,
                      restaurantLocation: newRestaurant || undefined,
                    } : prev);
                    setFlash({ open: true, severity: 'success', message: '活动已更新' });
                  }
                  // Move newly embedded photos out of the recap album
                  const newlyEmbedded = photos.filter((p) => embeddedUrls.has(p.url));
                  if (newlyEmbedded.length > 0) {
                    for (const p of newlyEmbedded) {
                      try { await removeEventRecapPhoto(eventId, p.url); } catch { /* ignore */ }
                    }
                    setPhotos((prev) => prev.filter((p) => !embeddedUrls.has(p.url)));
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
              const invitedIds = new Set(
                (event.signupDetails ?? []).filter((s) => s.status === 'invited').map((s) => s.userId),
              );
              const filtered = allMembers.filter((m) => {
                if (event.people.some(p => pName(p) === m.name)) return false;
                if (invitedIds.has(m.id)) return false;
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
                        {event.phase === 'ended' ? '添加' : '邀请'}
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
          <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
            {isAdmin && event.phase !== 'ended' && (
              <FormControlLabel
                control={<Switch size="small" checked={directSignup} onChange={(e) => setDirectSignup(e.target.checked)} />}
                label={<Typography variant="caption">直接报名（跳过邀请）</Typography>}
                sx={{ mx: 1 }}
              />
            )}
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={() => { setHostInviteOpen(false); setHostInviteSearch(''); setHostInvitedPeople([]); setDirectSignup(false); }}>取消</Button>
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
                        // Check if inviting would exceed capacity
                        const occupying = (event.signupDetails ?? []).filter((s) => ['accepted', 'invited', 'offered'].includes(s.status)).length;
                        const hostSlots = 1 + (event.coHosts?.length ?? 0);
                        const totalAfterInvite = hostSlots + occupying + userIds.length;
                        if (totalAfterInvite > event.total) {
                          const newCapacity = totalAfterInvite;
                          const ok = window.confirm(
                            `邀请这 ${userIds.length} 人后总人数将达到 ${totalAfterInvite} 人，超过当前上限 ${event.total} 人。\n\n是否自动将上限提高到 ${newCapacity}？`,
                          );
                          if (!ok) return;
                          // Increase capacity first
                          await updateEvent(eventId, { capacity: newCapacity });
                          setEvent((prev) => prev ? { ...prev, total: newCapacity } : prev);
                        }
                        await inviteToEvent(eventId, userIds, user.id);
                        if (event.phase === 'ended' || directSignup) {
                          setFlash({ open: true, severity: 'success', message: `已${directSignup ? '报名' : '添加'} ${userIds.length} 人` });
                        } else {
                          setFlash({ open: true, severity: 'success', message: `已邀请 ${userIds.length} 人` });
                        }
                        await refreshEvent();
                      }
                    } catch {
                      setFlash({ open: true, severity: 'error', message: event.phase === 'ended' ? '添加失败，请稍后重试' : '操作失败，请稍后重试' });
                    }
                  }
                  setHostInviteOpen(false);
                  setHostInviteSearch('');
                  setHostInvitedPeople([]);
                  setDirectSignup(false);
                }}
              >
                {event.phase === 'ended' ? '确认添加' : directSignup ? '确认报名' : '确认邀请'}
              </Button>
            </Stack>
          </DialogActions>
        </Dialog>

        {/* Co-host management dialog */}
        <Dialog open={coHostDialogOpen} onClose={() => { setCoHostDialogOpen(false); setCoHostSearch(''); }} maxWidth="xs" fullWidth>
          <DialogTitle>管理 Co-Host</DialogTitle>
          <DialogContent>
            {/* Current co-hosts */}
            {(event.coHosts?.length ?? 0) > 0 && (
              <Stack spacing={0.5} sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">当前 Co-Host</Typography>
                {event.coHosts!.map((name) => {
                  const memberId = allMembers.find((m) => m.name === name)?.id;
                  return (
                    <Stack key={name} direction="row" alignItems="center" spacing={1}>
                      <Avatar sx={{ width: 28, height: 28 }}>{firstNonEmoji(name)}</Avatar>
                      <Typography variant="body2" sx={{ flex: 1 }}>{name}</Typography>
                      {memberId && (
                        <IconButton
                          size="small"
                          onClick={async () => {
                            if (!eventId || !user?.id) return;
                            try {
                              await removeCoHost(eventId, memberId, user.id);
                              setFlash({ open: true, severity: 'success', message: `已移除 Co-Host ${name}` });
                              await refreshEvent();
                            } catch {
                              setFlash({ open: true, severity: 'error', message: '移除失败' });
                            }
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  );
                })}
              </Stack>
            )}
            <TextField
              autoFocus
              fullWidth
              size="small"
              placeholder="搜索成员..."
              value={coHostSearch}
              onChange={(e) => setCoHostSearch(e.target.value)}
              sx={{ mb: 1 }}
            />
            {(() => {
              const filtered = allMembers.filter((m) => {
                if (m.name === event.host) return false;
                if (event.coHosts?.includes(m.name)) return false;
                if (coHostSearch && !m.name.toLowerCase().includes(coHostSearch.toLowerCase())) return false;
                return true;
              }).slice(0, 10);
              return (
                <Stack spacing={0.5}>
                  {filtered.map((m) => (
                    <Stack direction="row" key={m.name} justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 28, height: 28 }}>{firstNonEmoji(m.name)}</Avatar>
                        <Typography variant="body2">{m.name}</Typography>
                      </Stack>
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        onClick={async () => {
                          if (!eventId || !user?.id || !m.id) return;
                          try {
                            await addCoHost(eventId, m.id, user.id);
                            setFlash({ open: true, severity: 'success', message: `已添加 Co-Host ${m.name}` });
                            await refreshEvent();
                          } catch {
                            setFlash({ open: true, severity: 'error', message: '添加失败' });
                          }
                        }}
                      >
                        添加
                      </Button>
                    </Stack>
                  ))}
                  {filtered.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
                      {coHostSearch ? '未找到匹配成员' : '没有更多可添加的成员'}
                    </Typography>
                  )}
                </Stack>
              );
            })()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setCoHostDialogOpen(false); setCoHostSearch(''); }}>关闭</Button>
          </DialogActions>
        </Dialog>

        {/* Visibility exclusion dialog */}
        <Dialog open={exclusionDialogOpen} onClose={() => { setExclusionDialogOpen(false); setExclusionSearch(''); }} maxWidth="xs" fullWidth>
          <DialogTitle>管理不可见名单</DialogTitle>
          <DialogContent>
            {excludedUserIds.length > 0 && (
              <Stack spacing={0.5} sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">已屏蔽的成员</Typography>
                {excludedUserIds.map((uid) => {
                  const member = allMembers.find((m) => m.id === uid);
                  const name = member?.name ?? uid;
                  return (
                    <Stack key={uid} direction="row" alignItems="center" spacing={1}>
                      <Avatar sx={{ width: 28, height: 28 }}>{firstNonEmoji(name)}</Avatar>
                      <Typography variant="body2" sx={{ flex: 1 }}>{name}</Typography>
                      <IconButton
                        size="small"
                        onClick={async () => {
                          if (!eventId || !user?.id) return;
                          const newIds = excludedUserIds.filter((id) => id !== uid);
                          try {
                            await setEventExclusions(eventId, newIds, user.id);
                            setExcludedUserIds(newIds);
                            setFlash({ open: true, severity: 'success', message: `已移除屏蔽 ${name}` });
                          } catch {
                            setFlash({ open: true, severity: 'error', message: '操作失败' });
                          }
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  );
                })}
              </Stack>
            )}
            <TextField
              autoFocus
              fullWidth
              size="small"
              placeholder="搜索成员..."
              value={exclusionSearch}
              onChange={(e) => setExclusionSearch(e.target.value)}
              sx={{ mb: 1 }}
            />
            {(() => {
              const signedUpIds = (event as any)?.signupDetails?.map((s: any) => s.userId).filter(Boolean) ?? [];
              const filtered = allMembers.filter((m) => {
                if (m.id === hostId) return false;
                if (excludedUserIds.includes(m.id)) return false;
                if (exclusionSearch && !m.name.toLowerCase().includes(exclusionSearch.toLowerCase())) return false;
                return true;
              }).slice(0, 10);
              return (
                <Stack spacing={0.5}>
                  {filtered.map((m) => {
                    const isSignedUp = signedUpIds.includes(m.id);
                    return (
                      <Stack direction="row" key={m.id} justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 28, height: 28 }}>{firstNonEmoji(m.name)}</Avatar>
                          <Typography variant="body2">{m.name}</Typography>
                          {isSignedUp && <Chip label="已报名" size="small" color="warning" variant="outlined" sx={{ height: 20 }} />}
                        </Stack>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={async () => {
                            if (!eventId || !user?.id) return;
                            const newIds = [...excludedUserIds, m.id];
                            try {
                              await setEventExclusions(eventId, newIds, user.id);
                              setExcludedUserIds(newIds);
                              setFlash({ open: true, severity: 'success', message: `已屏蔽 ${m.name}` });
                            } catch {
                              setFlash({ open: true, severity: 'error', message: '操作失败' });
                            }
                          }}
                        >
                          屏蔽
                        </Button>
                      </Stack>
                    );
                  })}
                  {filtered.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
                      {exclusionSearch ? '未找到匹配成员' : '没有更多可添加的成员'}
                    </Typography>
                  )}
                </Stack>
              );
            })()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setExclusionDialogOpen(false); setExclusionSearch(''); }}>关闭</Button>
          </DialogActions>
        </Dialog>

        {/* Capacity bump dialog (when approve fails due to full) */}
        <Dialog open={Boolean(capacityBumpTarget)} onClose={() => setCapacityBumpTarget(null)}>
          <DialogTitle>活动已满</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              当前活动已满员，是否增加 1 个名额并通过 {capacityBumpTarget?.name} 的申请？
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCapacityBumpTarget(null)}>取消</Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (!eventId || !user?.id || !capacityBumpTarget) return;
                try {
                  // Increase capacity by 1
                  const newCapacity = (event?.total ?? 10) + 1;
                  await updateEvent(eventId, { capacity: newCapacity });
                  // Retry approve
                  await approveApplication(eventId, capacityBumpTarget.userId, user.id);
                  setFlash({ open: true, severity: 'success', message: `已增加名额并通过 ${capacityBumpTarget.name} 的申请` });
                  setCapacityBumpTarget(null);
                  await refreshEvent();
                } catch {
                  setFlash({ open: true, severity: 'error', message: '操作失败' });
                  setCapacityBumpTarget(null);
                }
              }}
            >
              增加名额并通过
            </Button>
          </DialogActions>
        </Dialog>

        {/* Application note dialog */}
        <Dialog open={applicationDialogOpen} onClose={() => setApplicationDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>申请参加</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              给 Host 留言，说说你为什么想参加（选填）
            </Typography>
            {eventTasks.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>想认领哪个分工？（选填）</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                  {eventTasks.map((t) => (
                    <Box
                      key={t.id}
                      onClick={() => !t.claimedById && setApplicationTaskId(applicationTaskId === t.id ? '' : t.id)}
                      sx={{
                        px: 1.5, py: 0.5, borderRadius: 2, fontSize: 13, cursor: t.claimedById ? 'default' : 'pointer',
                        border: '1px solid',
                        borderColor: applicationTaskId === t.id ? 'primary.main' : 'divider',
                        bgcolor: applicationTaskId === t.id ? 'primary.main' : 'transparent',
                        color: t.claimedById ? 'text.disabled' : applicationTaskId === t.id ? 'primary.contrastText' : 'text.primary',
                        opacity: t.claimedById ? 0.5 : 1,
                        textDecoration: t.claimedById ? 'line-through' : 'none',
                      }}
                    >
                      {t.role}{t.claimedById ? ` (${t.claimedBy?.name})` : ''}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            <TextField
              label="留言（选填）"
              multiline
              minRows={2}
              maxRows={4}
              fullWidth
              value={applicationNote}
              onChange={(e) => setApplicationNote(e.target.value)}
              inputProps={{ maxLength: 500 }}
              placeholder="给 Host 留个言..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setApplicationDialogOpen(false); setApplicationNote(''); setApplicationTaskId(''); }}>取消</Button>
            <Button variant="contained" onClick={onSubmitApplication}>提交申请</Button>
          </DialogActions>
        </Dialog>

        {/* Cancel signup dialog */}
        <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
          <DialogTitle>{myStatus === 'pending' ? '撤回申请？' : myStatus === 'waitlist' ? '退出等位？' : '确定要取消报名吗？'}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              {myStatus === 'pending' ? '撤回后你需要重新提交申请。' : myStatus === 'waitlist' ? '退出后你的等位位置将丢失。' : '取消后你的名额将释放给其他人。'}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelDialogOpen(false)}>{myStatus === 'pending' ? '保持申请' : myStatus === 'waitlist' ? '继续等位' : '保持报名'}</Button>
            <Button
              color="warning"
              onClick={async () => {
                if (eventId && user?.id) {
                  try {
                    await cancelSignup(eventId, user.id);
                    setMyStatus(null);
                    setFlash({ open: true, severity: 'success', message: myStatus === 'pending' ? '已撤回申请' : myStatus === 'waitlist' ? '已退出等位' : '已取消报名' });
                    await refreshEvent();
                  } catch {
                    setFlash({ open: true, severity: 'error', message: '操作失败，请稍后重试' });
                  }
                } else {
                  setMyStatus(null);
                }
                setCancelDialogOpen(false);
              }}
            >
              {myStatus === 'pending' ? '撤回申请' : myStatus === 'waitlist' ? '退出等位' : '取消报名'}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  );
}
