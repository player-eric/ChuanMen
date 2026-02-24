import { useEffect, useRef, useState } from 'react';
import { useLoaderData, useNavigate, useParams } from 'react-router';
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
import type { EventComment, EventData, EventPhoto, FoodOption, TaskRole } from '@/types';
import { getEventById, signupEvent, uploadMedia, addEventRecapPhoto, removeEventRecapPhoto, deleteMediaAsset } from '@/lib/domainApi';
import { useAuth } from '@/auth/AuthContext';
import { ScenePhoto } from '@/components/ScenePhoto';
import { Poster } from '@/components/Poster';
import { RichTextViewer } from '@/components/RichTextEditor';
import { moviePool, movieDetailMap, membersData, taskPresets } from '@/mock/data';

const sceneToTag: Record<string, string> = {
  movieNight: '电影夜',
  hike: '户外',
  sports: '运动',
};

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

export default function EventDetailPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { user } = useAuth();
  const loadedEvent = useLoaderData() as EventData | null;
  const [event, setEvent] = useState<EventData | null>(loadedEvent);
  const [signedUp, setSignedUp] = useState(false);
  const [comments, setComments] = useState<EventComment[]>(loadedEvent?.comments ?? []);
  const [commentText, setCommentText] = useState('');
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

  useEffect(() => {
    const run = async () => {
      if (!eventId || loadedEvent) {
        return;
      }
      try {
        const item = await getEventById(eventId);
        setEvent({
          id: 0,
          title: String(item.title ?? ''),
          host: 'Host',
          date: new Date(String(item.startsAt ?? new Date().toISOString())).toLocaleString('zh-CN'),
          location: String(item.location ?? ''),
          scene: 'small-group',
          film: undefined,
          spots: Math.max(0, Number(item.capacity ?? 0)),
          total: Number(item.capacity ?? 0),
          people: [],
          phase: String(item.phase ?? 'open') === 'invite' ? 'invite' : 'open',
          desc: String(item.description ?? ''),
        });
      } catch {
        setEvent(null);
      }
    };

    void run();
  }, [eventId, loadedEvent]);

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

  const onSignup = async () => {
    if (signedUp) {
      setCancelDialogOpen(true);
      return;
    }

    if (!eventId || eventId.length !== 24) {
      // Mock event — toggle locally
      setSignedUp(true);
      return;
    }
    if (!user?.id) {
      setFlash({ open: true, severity: 'error', message: '请先登录后再报名' });
      return;
    }
    try {
      await signupEvent(eventId, user.id);
      setSignedUp(true);
      setFlash({ open: true, severity: 'success', message: '报名参加成功' });
    } catch (error) {
      setFlash({
        open: true,
        severity: 'error',
        message: error instanceof Error ? error.message : '报名失败，请稍后重试',
      });
    }
  };

  const phase = phaseLabel[event.phase] ?? phaseLabel.open;

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
        {event.invitedBy && !signedUp && !inviteDeclined && (
          <Alert
            severity="info"
            sx={{ '& .MuiAlert-message': { width: '100%' } }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={1}>
              <Typography variant="body2">{event.invitedBy} 邀请你参加这场活动</Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => setSignedUp(true)}
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
                  const m = moviePool.find((p) => p.title === event.film);
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
                    const detail = movieDetailMap[movieId];
                    const pool = moviePool.find((m) => m.id === movieId);
                    if (!detail && !pool) return null;
                    const title = detail?.title ?? pool!.title;
                    const dir = detail?.dir ?? pool!.dir;
                    const year = detail?.year ?? pool!.year;
                    const totalVotes = detail?.v ?? pool!.v;
                    const voters = detail?.voters ?? [];
                    const attendeeVotes = voters.filter((name) => event.people.includes(name)).length;
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
              const filtered = moviePool.filter((m) => {
                if (m.status?.includes('已放映')) return false;
                if ((event.nominations ?? []).includes(m.id)) return false;
                if (nq && !m.title.toLowerCase().includes(nq) && !m.dir.toLowerCase().includes(nq) && !m.by.toLowerCase().includes(nq)) return false;
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
                              <Typography variant="caption" color="text.secondary">{m.year} · {m.dir} · {m.v} 票</Typography>
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
              <Typography variant="body2" color={event.spots > 0 ? 'success.main' : 'text.secondary'}>
                {event.spots > 0 ? `还剩 ${event.spots}/${event.total} 位` : '已满 · 可排队'}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <AvatarGroup max={8}>
                {event.people.map((name) => (
                  <Avatar
                    key={name}
                    sx={{ cursor: 'pointer', width: 34, height: 34 }}
                    onClick={() => navigate(`/members/${encodeURIComponent(name)}`)}
                  >
                    {name[0]}
                  </Avatar>
                ))}
              </AvatarGroup>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>{event.host[0]}</Avatar>
              <Typography variant="body2" color="text.secondary">
                {event.host} · Host
              </Typography>
            </Stack>
          </CardContent>
        </Card>

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
                        {membersData.map((m) => (
                          <MenuItem key={m.name} value={m.name}>{m.name}</MenuItem>
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
                    {taskPresets[sceneToTag[event.scene]] && tasks.length === 0 && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          const tag = sceneToTag[event.scene];
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
                            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>{task.name[0]}</Avatar>
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

        {/* Photo Gallery */}
        {photos.length > 0 && (
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  活动照片 ({photos.length})
                </Typography>
                {user && (
                  <Button size="small" onClick={() => setUploadOpen(true)}>
                    上传照片
                  </Button>
                )}
              </Stack>
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
            </CardContent>
          </Card>
        )}

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
                    sx={{
                      width: '100%',
                      maxWidth: 600,
                      aspectRatio: '4/3',
                      borderRadius: 2,
                      background: photoBg(photo.url),
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
            {comments.length > 0 && (
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                {comments.map((c, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                    <Avatar
                      sx={{ width: 28, height: 28, fontSize: 12, cursor: 'pointer', mt: 0.25 }}
                      onClick={() => navigate(`/members/${encodeURIComponent(c.name)}`)}
                    >
                      {c.name[0]}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && commentText.trim()) {
                      e.preventDefault();
                      setComments((prev) => [...prev, { name: user.name ?? '我', text: commentText.trim(), date: '刚刚' }]);
                      setCommentText('');
                    }
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  disabled={!commentText.trim()}
                  onClick={() => {
                    if (commentText.trim()) {
                      setComments((prev) => [...prev, { name: user.name ?? '我', text: commentText.trim(), date: '刚刚' }]);
                      setCommentText('');
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

        {/* 10. Action button */}
        {event.phase === 'ended' ? (
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => navigate('/cards')}
            >
              ✉ 发感谢卡
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setUploadOpen(true)}
              disabled={!user}
            >
              📷 上传照片
            </Button>
          </Stack>
        ) : (
          <Box>
            <Button
              variant="contained"
              fullWidth
              onClick={onSignup}
              disabled={!user || event.phase === 'cancelled'}
              color={signedUp ? 'success' : 'primary'}
            >
              {!user
                ? '登录后可报名'
                : event.phase === 'cancelled'
                  ? '活动已取消'
                  : signedUp
                    ? '✓ 已报名'
                    : event.phase === 'invite'
                      ? '接受邀请'
                      : '报名参加'}
            </Button>
          </Box>
        )}

        {/* Cancel signup dialog */}
        <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
          <DialogTitle>确定要取消报名吗？</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              取消后你的名额将释放给其他人。
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelDialogOpen(false)}>保持报名</Button>
            <Button
              color="warning"
              onClick={() => {
                setSignedUp(false);
                setCancelDialogOpen(false);
              }}
            >
              取消报名
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  );
}
