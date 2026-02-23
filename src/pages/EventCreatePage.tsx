import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { moviePool, membersData } from '@/mock/data';
import { Poster } from '@/components/Poster';
const RichTextEditorLazy = lazy(() => import('@/components/RichTextEditor'));

const tagOptions = ['电影夜', 'Potluck', '徒步', '咖啡', '运动', '小局', '其他'];

/** Combine date + time strings into datetime-local value */
function combineDT(date: string, time: string) {
  if (!date) return '';
  return time ? `${date}T${time}` : `${date}T00:00`;
}
function splitDate(dt: string) { return dt ? dt.slice(0, 10) : ''; }
function splitTime(dt: string) { return dt.length >= 16 ? dt.slice(11, 16) : ''; }

export default function EventCreatePage() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { user } = useAuth();

  const fromProposal = (routeLocation.state as { fromProposal?: { title: string; descriptionHtml: string } } | null)?.fromProposal;
  const preTag = (routeLocation.state as { preTag?: string } | null)?.preTag;

  const [name, setName] = useState(fromProposal?.title ?? '');
  const [tag, setTag] = useState(preTag ?? '');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [isHome, setIsHome] = useState(false);
  const [houseRules, setHouseRules] = useState('');
  const [capacity, setCapacity] = useState(8);
  const [description, setDescription] = useState(fromProposal?.descriptionHtml ?? '');
  const [delayPublish, setDelayPublish] = useState(false);
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const [snackOpen, setSnackOpen] = useState(false);

  // Invite dialog state
  const [created, setCreated] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [invitedPeople, setInvitedPeople] = useState<string[]>([]);

  // Movie night state
  const [filmMode, setFilmMode] = useState<'nominate' | 'pick'>('nominate');
  const [selectedFilm, setSelectedFilm] = useState<number | null>(null);
  const [nominations, setNominations] = useState<number[]>([]);
  const [moviePickerOpen, setMoviePickerOpen] = useState(false);
  const [moviePickerTarget, setMoviePickerTarget] = useState<'film' | 'nomination'>('film');
  const [movieSearch, setMovieSearch] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [navigate, user]);

  // Auto-fill end = same day + 3h when start is set
  useEffect(() => {
    if (startDate && startTime) {
      const d = new Date(combineDT(startDate, startTime));
      d.setHours(d.getHours() + 3);
      const iso = d.toISOString().slice(0, 16);
      if (!endDate) setEndDate(splitDate(iso));
      if (!endTime) setEndTime(splitTime(iso));
    }
  }, [startDate, startTime, endDate, endTime]);

  // Reset movie state when tag changes away from 电影夜
  useEffect(() => {
    if (tag !== '电影夜') {
      setFilmMode('nominate');
      setSelectedFilm(null);
      setNominations([]);
    }
  }, [tag]);

  if (!user) return null;

  const isMovieNight = tag === '电影夜';
  const isSmallGroup = tag === '小局';
  const capMax = isSmallGroup ? 10 : 50;

  const filteredMembers = useMemo(() => {
    const q = inviteSearch.toLowerCase();
    if (!q) return membersData.slice(0, 6);
    return membersData.filter((m) => m.name.toLowerCase().includes(q));
  }, [inviteSearch]);
  const availableMovies = moviePool.filter((m) => !m.status?.includes('已放映'));
  const selectedFilmData = selectedFilm ? moviePool.find((m) => m.id === selectedFilm) : null;

  const onSubmit = () => {
    if (!name.trim() || !startDate || (!isHome && !location.trim())) {
      setError(isHome ? '请填写名称和日期' : '请填写名称、日期和地点');
      return;
    }
    setCreated(true);
  };

  const openPicker = (target: 'film' | 'nomination') => {
    setMoviePickerTarget(target);
    setMovieSearch('');
    setMoviePickerOpen(true);
  };

  const handlePickMovie = (movieId: number) => {
    if (moviePickerTarget === 'film') {
      setSelectedFilm(movieId);
    } else {
      setNominations((prev) => [...prev, movieId]);
    }
    setMoviePickerOpen(false);
  };

  // Movies not yet selected/nominated, filtered by search
  const q = movieSearch.toLowerCase();
  const pickerMovies = availableMovies.filter((m) => {
    if (moviePickerTarget === 'nomination' && (nominations.includes(m.id) || m.id === selectedFilm)) return false;
    if (q && !m.title.toLowerCase().includes(q) && !m.dir.toLowerCase().includes(q) && !m.by.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <Card>
      <CardContent>
        <Stack spacing={2.5}>
          <Typography variant="h5" fontWeight={700}>发起活动</Typography>
          {fromProposal && (
            <Chip size="small" label={`从创意「${fromProposal.title}」发起`} color="info" variant="outlined" />
          )}
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            placeholder={isSmallGroup ? '本周小局 · 散步聊天' : undefined}
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Tag</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {tagOptions.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  onClick={() => setTag(tag === t ? '' : t)}
                  color={tag === t ? 'primary' : 'default'}
                  variant={tag === t ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          </Box>

          {/* Date + Time — split for cleaner UI */}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>开始 *</Typography>
            <Stack direction="row" spacing={1.5}>
              <TextField
                type="date"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                sx={{ flex: 2 }}
                required
              />
              <TextField
                type="time"
                InputLabelProps={{ shrink: true }}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                sx={{ flex: 1 }}
              />
            </Stack>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>结束</Typography>
            <Stack direction="row" spacing={1.5}>
              <TextField
                type="date"
                InputLabelProps={{ shrink: true }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                sx={{ flex: 2 }}
              />
              <TextField
                type="time"
                InputLabelProps={{ shrink: true }}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                sx={{ flex: 1 }}
              />
            </Stack>
          </Box>

          <FormControlLabel
            control={<Switch checked={isHome} onChange={(e) => setIsHome(e.target.checked)} />}
            label="在我家"
          />

          {isHome ? (
            <TextField
              label="完整地址（仅报名后可见）"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              fullWidth
              placeholder="报名成功后参与者可见"
              helperText="选填，报名后才会展示给参与者"
            />
          ) : (
            <TextField
              label="地点"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              fullWidth
              required
            />
          )}

          {isHome && (
            <TextField
              label="House Rules"
              value={houseRules}
              onChange={(e) => setHouseRules(e.target.value)}
              multiline
              minRows={2}
              fullWidth
              placeholder="例如：请换鞋入内 · 有猫"
            />
          )}

          <TextField
            label="人数上限"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Math.max(2, Math.min(capMax, Number(e.target.value) || 8)))}
            fullWidth
            helperText={isSmallGroup ? '小局容量 2-10 人' : undefined}
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>说明</Typography>
            <Suspense fallback={<div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>加载编辑器...</div>}>
              <RichTextEditorLazy content={description} onChange={setDescription} placeholder="活动说明..." />
            </Suspense>
          </Box>

          {/* Movie night — film selection */}
          {isMovieNight && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  🎬 电影选择
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    label="先开放提名"
                    onClick={() => setFilmMode('nominate')}
                    color={filmMode === 'nominate' ? 'primary' : 'default'}
                    variant={filmMode === 'nominate' ? 'filled' : 'outlined'}
                  />
                  <Chip
                    label="直接选定电影"
                    onClick={() => setFilmMode('pick')}
                    color={filmMode === 'pick' ? 'primary' : 'default'}
                    variant={filmMode === 'pick' ? 'filled' : 'outlined'}
                  />
                </Stack>

                {filmMode === 'pick' && (
                  <Box>
                    {selectedFilmData ? (
                      <Card variant="outlined" sx={{ borderColor: 'success.main', borderWidth: 2, mb: 1.5 }}>
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Poster title={selectedFilmData.title} w={36} h={50} />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={700}>{selectedFilmData.title}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {selectedFilmData.year} · {selectedFilmData.dir} · {selectedFilmData.v} 票
                              </Typography>
                            </Box>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => setSelectedFilm(null)}
                            >
                              移除
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    ) : (
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => openPicker('film')}
                      >
                        从候选池选择电影
                      </Button>
                    )}
                  </Box>
                )}

                {filmMode === 'nominate' && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      活动发布后，报名成员可提名候选电影，你可以在活动页选片。
                    </Typography>
                    {nominations.length > 0 && (
                      <Stack spacing={1} sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          初始提名 ({nominations.length})
                        </Typography>
                        {nominations.map((id) => {
                          const m = moviePool.find((p) => p.id === id);
                          if (!m) return null;
                          return (
                            <Card key={id} variant="outlined">
                              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                  <Poster title={m.title} w={28} h={40} />
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" fontWeight={600}>{m.title}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {m.year} · {m.dir} · {m.v} 票
                                    </Typography>
                                  </Box>
                                  <Button
                                    size="small"
                                    color="error"
                                    onClick={() => setNominations((prev) => prev.filter((n) => n !== id))}
                                  >
                                    移除
                                  </Button>
                                </Stack>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </Stack>
                    )}
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      onClick={() => openPicker('nomination')}
                    >
                      添加初始提名（可选）
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Movie picker dialog */}
          <Dialog open={moviePickerOpen} onClose={() => setMoviePickerOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle>
              {moviePickerTarget === 'film' ? '选择放映电影' : '添加提名'}
            </DialogTitle>
            <DialogContent>
              <TextField
                size="small"
                fullWidth
                placeholder="搜电影名、导演..."
                value={movieSearch}
                onChange={(e) => setMovieSearch(e.target.value)}
                autoFocus
                sx={{ mb: 1.5, mt: 0.5 }}
              />
              {pickerMovies.length > 0 ? (
                <Stack spacing={1}>
                  {pickerMovies.map((m) => (
                    <Card key={m.id} variant="outlined">
                      <CardActionArea onClick={() => handlePickMovie(m.id)}>
                        <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Poster title={m.title} w={28} h={40} />
                            <Box>
                              <Typography variant="body2" fontWeight={600}>{m.title}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {m.year} · {m.dir} · {m.v} 票
                              </Typography>
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
                    {movieSearch ? `没有找到「${movieSearch}」` : '没有更多候选电影'}
                  </Typography>
                  {movieSearch && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        setMoviePickerOpen(false);
                        navigate('/discover/movie/add');
                      }}
                    >
                      添加到候选池
                    </Button>
                  )}
                </Stack>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setMoviePickerOpen(false)}>取消</Button>
            </DialogActions>
          </Dialog>

          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>公开设置</Typography>
            <Stack spacing={1.5}>
              <FormControlLabel
                control={<Switch checked={delayPublish} onChange={(e) => setDelayPublish(e.target.checked)} />}
                label="延时公开"
              />
              {delayPublish ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>公开时间</Typography>
                  <Stack direction="row" spacing={1.5}>
                    <TextField
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                      sx={{ flex: 2 }}
                    />
                    <TextField
                      type="time"
                      InputLabelProps={{ shrink: true }}
                      value={publishTime}
                      onChange={(e) => setPublishTime(e.target.value)}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    到达设定时间后自动公开报名
                  </Typography>
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  发布后立即公开，所有成员可见并报名
                </Typography>
              )}
              <FormControlLabel
                control={<Switch checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />}
                label="私密活动"
              />
              {isPrivate && (
                <Typography variant="caption" color="text.secondary">
                  私密活动不会在社区动态中显示详情，仅显示"xx 发起了私密活动"
                </Typography>
              )}
            </Stack>
          </Box>

          <Box>
            <Button variant="contained" onClick={onSubmit} size="large">
              发布活动
            </Button>
          </Box>
        </Stack>
      </CardContent>

      <Dialog open={created} fullWidth maxWidth="xs">
        <DialogTitle>活动创建成功！</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            邀请朋友参加吧
          </Typography>
          <TextField fullWidth size="small" placeholder="搜索成员名..." value={inviteSearch}
            onChange={(e) => setInviteSearch(e.target.value)} sx={{ mb: 1.5 }} />
          {filteredMembers.map((m) => {
            const invited = invitedPeople.includes(m.name);
            return (
              <Stack direction="row" key={m.name} justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar sx={{ width: 28, height: 28 }}>{m.name[0]}</Avatar>
                  <Typography variant="body2">{m.name}</Typography>
                </Stack>
                <Button size="small" variant={invited ? 'contained' : 'outlined'}
                  onClick={() => setInvitedPeople((prev) =>
                    invited ? prev.filter((n) => n !== m.name) : [...prev, m.name]
                  )}>
                  {invited ? '✓ 已邀请' : '邀请'}
                </Button>
              </Stack>
            );
          })}
          {invitedPeople.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              已邀请 {invitedPeople.length} 人
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/events')}>跳过</Button>
          <Button variant="contained" onClick={() => navigate('/events')}>完成</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        message="活动创建成功！"
      />
    </Card>
  );
}
