import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { firstNonEmoji } from '@/components/Atoms';
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
  IconButton,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useAuth } from '@/auth/AuthContext';
import { useTaskPresets } from '@/hooks/useTaskPresets';
import { createEvent, inviteToEvent, fetchMembersApi, fetchRecommendationsApi, fetchMoviesApi, linkEventRecommendation, linkEventMovie, completeLottery } from '@/lib/domainApi';
import type { FoodOption } from '@/types';

interface CreateTaskItem {
  role: string;
  description: string;
}
import { ImageUpload } from '@/components/ImageUpload';
import { chineseTagToEventTag } from '@/lib/mappings';
import { generateEventPoster, downloadBlob } from '@/lib/posterGenerator';
const RichTextEditorLazy = lazy(() => import('@/components/RichTextEditor'));

const tagOptions = ['电影夜', '茶话会/分享会', '户外', '运动', '其他'];

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
  const taskPresets = useTaskPresets();

  const fromProposal = (routeLocation.state as { fromProposal?: { id?: string; title: string; descriptionHtml: string } } | null)?.fromProposal;
  const preTag = (routeLocation.state as { preTag?: string } | null)?.preTag;
  const lotteryId = (routeLocation.state as { lotteryId?: string } | null)?.lotteryId;

  const [name, setName] = useState(fromProposal?.title ?? '');
  const [tags, setTags] = useState<string[]>(preTag ? [preTag] : []);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [isHome, setIsHome] = useState(false);
  const [houseRules, setHouseRules] = useState('');
  const [capacity, setCapacity] = useState(lotteryId ? 6 : 8);
  const [description, setDescription] = useState(fromProposal?.descriptionHtml ?? '');
  const [delayPublish, setDelayPublish] = useState(false);
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [excludedUserIds, setExcludedUserIds] = useState<string[]>([]);
  const [exclusionDialogOpen, setExclusionDialogOpen] = useState(false);
  const [exclusionSearch, setExclusionSearch] = useState('');
  const [signupMode, setSignupMode] = useState<'direct' | 'application'>('application');
  const [error, setError] = useState('');
  const [snackOpen, setSnackOpen] = useState(false);

  // Invite dialog state — stores created event ID (empty string = not yet created)
  const [createdId, setCreatedId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [invitedPeople, setInvitedPeople] = useState<string[]>([]);

  // Food option state
  const [foodOption, setFoodOption] = useState<FoodOption>('none');
  const [restaurantLocation, setRestaurantLocation] = useState('');

  // Task (分工) state
  const [tasks, setTasks] = useState<CreateTaskItem[]>([]);
  // Title image
  const [titleImageUrl, setTitleImageUrl] = useState('');
  const [posterLoading, setPosterLoading] = useState(false);

  // Recommendation state
  const [allRecs, setAllRecs] = useState<any[]>([]);
  const [selectedRecs, setSelectedRecs] = useState<any[]>([]);
  const [recPickerOpen, setRecPickerOpen] = useState(false);
  const [recSearch, setRecSearch] = useState('');
  const [recCategory, setRecCategory] = useState<string>('all');
  // Per-category mode: { movie: 'nominate', recipe: 'pick', ... }
  const [recCatModes, setRecCatModes] = useState<Record<string, 'nominate' | 'pick'>>({});
  const recCategories = Object.keys(recCatModes);

  // API-loaded data for members
  const [allMembers, setAllMembers] = useState<{ id: string; name: string; avatar?: string }[]>([]);
  // "帮别人发起" — pick a different host
  const [hostForOther, setHostForOther] = useState(false);
  const [selectedHostId, setSelectedHostId] = useState('');
  const [hostSearch, setHostSearch] = useState('');

  useEffect(() => {
    fetchMembersApi().then((m: any[]) => setAllMembers(m)).catch(() => {});
    // Load both recommendations and movies (movies are in a separate table)
    Promise.all([
      fetchRecommendationsApi().catch(() => []),
      fetchMoviesApi().catch(() => []),
    ]).then(([recs, movies]: [any[], any[]]) => {
      // Normalize movies to match recommendation shape for the picker
      const movieRecs = movies.map((m: any) => ({
        id: m.id,
        title: m.title,
        category: 'movie',
        description: [m.year, m.director].filter(Boolean).join(' · '),
        voteCount: m._count?.votes ?? m.votes?.length ?? 0,
        author: m.recommendedBy ?? m.author,
        _fromMovieTable: true,
      }));
      // Normalize recommendation voteCount: prefer _count.votes over stale voteCount field
      const normalizedRecs = recs.map((r: any) => ({
        ...r,
        voteCount: r._count?.votes ?? r.voteCount ?? 0,
      }));
      setAllRecs([...normalizedRecs, ...movieRecs]);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [navigate, user]);

  // Auto-fill task presets when tags change (only when tasks are empty)
  useEffect(() => {
    if (tags.length > 0 && tasks.length === 0) {
      const presetRoles = tags.flatMap((t) => taskPresets[t] ?? []);
      // Deduplicate by role name
      const seen = new Set<string>();
      const unique = presetRoles.filter((r) => {
        if (seen.has(r.role)) return false;
        seen.add(r.role);
        return true;
      });
      if (unique.length > 0) {
        setTasks(unique.map((r) => ({ role: r.role, description: r.description })));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags]);

  // Auto-fill end = same day + 3h when start is set
  useEffect(() => {
    if (startDate && startTime) {
      const d = new Date(combineDT(startDate, startTime));
      d.setHours(d.getHours() + 3);
      const pad = (n: number) => String(n).padStart(2, '0');
      const localEnd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      if (!endDate) setEndDate(splitDate(localEnd));
      if (!endTime) setEndTime(splitTime(localEnd));
    }
  }, [startDate, startTime, endDate, endTime]);

  if (!user) return null;

  const capMax = 50;
  const isPastDate = startDate && new Date(combineDT(startDate, startTime || '23:59')) < new Date();

  const filteredMembers = useMemo(() => {
    const q = inviteSearch.toLowerCase();
    if (!q) return allMembers.slice(0, 6);
    return allMembers.filter((m) => m.name.toLowerCase().includes(q));
  }, [inviteSearch]);

  const onSubmit = async () => {
    if (submitting) return;
    if (!name.trim() || !startDate || !city.trim()) {
      setError('请填写名称、日期和城市');
      return;
    }
    if (hostForOther && !selectedHostId) {
      setError('请选择 Host');
      return;
    }
    setSubmitting(true);
    try {
      const mappedTags = tags.map((t) => chineseTagToEventTag[t]).filter(Boolean);
      // Filter out empty tasks and prepare for API
      const validTasks = tasks
        .filter((t) => t.role.trim())
        .map((t) => ({ role: t.role.trim(), description: t.description?.trim() || undefined }));
      const actualHostId = (hostForOther && selectedHostId) ? selectedHostId : user.id;
      const result = await createEvent({
        title: name.trim(),
        hostId: actualHostId,
        city: city.trim(),
        state: state.trim() || undefined,
        zipCode: zipCode.trim() || undefined,
        address: address.trim() || undefined,
        startsAt: new Date(combineDT(startDate, startTime || '19:00')).toISOString(),
        capacity,
        description,
        titleImageUrl: titleImageUrl || undefined,
        tags: mappedTags.length > 0 ? mappedTags : (lotteryId ? ['small_group'] : undefined),
        phase: isPastDate ? 'ended' : delayPublish ? 'invite' : 'open',
        publishAt: delayPublish && publishDate ? new Date(combineDT(publishDate, publishTime || '00:00')).toISOString() : undefined,
        recCategories: recCategories.length > 0
          ? Object.entries(recCatModes).map(([c, m]) => `${c}:${m}`)
          : undefined,
        isPrivate: isPrivate || undefined,
        signupMode,
        isWeeklyLotteryEvent: lotteryId ? true : undefined,
        isHomeEvent: isHome || undefined,
        houseRules: isHome && houseRules.trim() ? houseRules.trim() : undefined,
        foodOption: foodOption !== 'none' ? foodOption : undefined,
        restaurantLocation: foodOption === 'eat_out' && restaurantLocation.trim() ? restaurantLocation.trim() : undefined,
        proposalId: fromProposal?.id,
        tasks: validTasks.length > 0 ? validTasks : undefined,
        excludedUserIds: excludedUserIds.length > 0 ? excludedUserIds : undefined,
      });
      const newEventId = String((result as any).id ?? '');
      // Complete lottery draw if this is a lottery event
      if (lotteryId && newEventId) {
        try { await completeLottery(lotteryId, newEventId); } catch { /* best effort */ }
      }
      // Link selected recommendations / movies
      for (const rec of selectedRecs) {
        try {
          if (rec._fromMovieTable) {
            await linkEventMovie(newEventId, rec.id);
          } else {
            const isNom = recCatModes[rec.category] === 'nominate';
            await linkEventRecommendation(newEventId, rec.id, user.id, isNom);
          }
        } catch { /* best effort */ }
      }
      setCreatedId(newEventId);
    } catch (err: any) {
      setError(err?.message ?? '创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const recCategoryOptions = [
    { key: 'movie', label: '🍿 电影' },
    { key: 'book', label: '📚 书' },
    { key: 'recipe', label: '🍳 食谱与调酒' },
    { key: 'place', label: '📍 地方' },
    { key: 'music', label: '🎵 音乐' },
    { key: 'external_event', label: '🎭 演出与展览' },
  ];

  return (
    <Card>
      <CardContent>
        <Stack spacing={2.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={() => navigate('/events')} size="small"><ArrowBackRoundedIcon /></IconButton>
            <Typography variant="h5" fontWeight={700}>发起活动</Typography>
          </Stack>
          {fromProposal && (
            <Chip size="small" label={`从创意「${fromProposal.title}」发起`} color="info" variant="outlined" />
          )}
          <TextField
            label="名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            placeholder={undefined}
          />

          {/* 帮别人发起活动 — admin only */}
          {user.role === 'admin' && (
            <FormControlLabel
              control={<Switch checked={hostForOther} onChange={(e) => { setHostForOther(e.target.checked); if (!e.target.checked) setSelectedHostId(''); }} />}
              label="帮别人发起"
            />
          )}
          {hostForOther && (
            <Box>
              <TextField
                size="small"
                fullWidth
                placeholder="搜索成员名..."
                value={hostSearch}
                onChange={(e) => setHostSearch(e.target.value)}
                sx={{ mb: 1 }}
              />
              {(() => {
                const hq = hostSearch.toLowerCase();
                const candidates = allMembers.filter((m) => m.id !== user.id && (!hq || m.name.toLowerCase().includes(hq))).slice(0, 8);
                return candidates.map((m) => {
                  const chosen = selectedHostId === m.id;
                  return (
                    <Stack direction="row" key={m.id} justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar src={m.avatar} sx={{ width: 28, height: 28 }}>{firstNonEmoji(m.name)}</Avatar>
                        <Typography variant="body2">{m.name}</Typography>
                      </Stack>
                      <Chip
                        size="small"
                        label={chosen ? '✓ 已选为 Host' : '选为 Host'}
                        color={chosen ? 'primary' : 'default'}
                        variant={chosen ? 'filled' : 'outlined'}
                        onClick={() => setSelectedHostId(chosen ? '' : m.id)}
                      />
                    </Stack>
                  );
                });
              })()}
              {selectedHostId && (
                <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                  将以 {allMembers.find((m) => m.id === selectedHostId)?.name} 的名义发起活动
                </Typography>
              )}
            </Box>
          )}

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Tag</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {tagOptions.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  onClick={() => setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
                  color={tags.includes(t) ? 'primary' : 'default'}
                  variant={tags.includes(t) ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          </Box>

          {/* Title Image */}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>封面图（可选）</Typography>
            <ImageUpload
              value={titleImageUrl}
              onChange={setTitleImageUrl}
              category="event-image"
              ownerId={user.id}
              width="100%"
              height={160}
              shape="rect"
              maxSize={10 * 1024 * 1024}
            />
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
            {isPastDate && (
              <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                日期已过，将创建为已结束活动
              </Typography>
            )}
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
            control={<Switch checked={isHome} onChange={(e) => {
              setIsHome(e.target.checked);
              if (e.target.checked && !houseRules && user?.defaultHouseRules) {
                setHouseRules(user.defaultHouseRules);
              }
            }} />}
            label="在我家"
          />

          <Stack direction="row" spacing={1}>
            <TextField label="城市" value={city} onChange={(e) => setCity(e.target.value)} required autoComplete="address-level2" sx={{ flex: 2 }} />
            <TextField label="州" value={state} onChange={(e) => setState(e.target.value)} autoComplete="address-level1" sx={{ flex: 1 }} placeholder="NJ" />
            <TextField label="邮编" value={zipCode} onChange={(e) => setZipCode(e.target.value)} autoComplete="postal-code" sx={{ flex: 1 }} placeholder="08820" />
          </Stack>
          <TextField
            label="具体地址（报名后可见）"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            fullWidth
            autoComplete="street-address"
            helperText="仅报名成功的参与者可见"
            placeholder={isHome ? '如: 123 Main St, Apt 4B' : '如: 456 Oak Ave'}
          />

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
            helperText={undefined}
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>说明</Typography>
            <Suspense fallback={<div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>加载编辑器...</div>}>
              <RichTextEditorLazy content={description} onChange={setDescription} placeholder="活动说明..." />
            </Suspense>
          </Box>

          {/* 吃什么 — food arrangement */}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>吃什么</Typography>
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
                  onClick={() => setFoodOption(opt.value)}
                  color={foodOption === opt.value ? 'primary' : 'default'}
                  variant={foodOption === opt.value ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
            {foodOption === 'potluck' && !tasks.some((t) => t.role === '带一道菜') && (
              <Button
                size="small"
                sx={{ mt: 1 }}
                onClick={() => {
                  const slots = Array.from({ length: Math.max(1, capacity - 1) }, () => ({
                    role: '带一道菜',
                    description: '',
                  }));
                  setTasks((prev) => [...prev, ...slots]);
                }}
              >
                + 添加「带一道菜」分工（{Math.max(1, capacity - 1)} 个槽位）
              </Button>
            )}
            {foodOption === 'eat_out' && (
              <TextField
                label="餐厅地址"
                value={restaurantLocation}
                onChange={(e) => setRestaurantLocation(e.target.value)}
                fullWidth
                placeholder="餐厅名称和地址"
                sx={{ mt: 1.5 }}
              />
            )}
          </Box>

          {/* 分工 — task assignment */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                分工
              </Typography>
              {tasks.length > 0 ? (
                <Stack spacing={2}>
                  {tasks.map((task, idx) => (
                    <Box key={idx}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          size="small"
                          placeholder="分工名称"
                          value={task.role}
                          onChange={(e) => {
                            const next = [...tasks];
                            next[idx] = { ...next[idx], role: e.target.value };
                            setTasks(next);
                          }}
                          sx={{ flex: 1 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => setTasks((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      <TextField
                        size="small"
                        placeholder="描述（可选，降低认领门槛）"
                        value={task.description}
                        onChange={(e) => {
                          const next = [...tasks];
                          next[idx] = { ...next[idx], description: e.target.value };
                          setTasks(next);
                        }}
                        variant="standard"
                        sx={{ ml: 1.5, mt: 0.5, width: 'calc(100% - 48px)', '& .MuiInputBase-input': { fontSize: 13, color: 'text.secondary' } }}
                      />
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {tags.some((t) => taskPresets[t]) ? '选择 Tag 后自动预设' : '暂无分工，可手动添加'}
                </Typography>
              )}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setTasks((prev) => [...prev, { role: '', description: '' }])}
                sx={{ mt: 1.5 }}
              >
                添加分工
              </Button>
            </CardContent>
          </Card>

          {/* 推荐选择（可选） */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                📋 推荐选择（可选）
              </Typography>

              {/* Category multi-select */}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>类别</Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                {recCategoryOptions.map((cat) => (
                  <Chip
                    key={cat.key}
                    label={cat.label}
                    size="small"
                    color={cat.key in recCatModes ? 'primary' : 'default'}
                    variant={cat.key in recCatModes ? 'filled' : 'outlined'}
                    onClick={() => setRecCatModes((prev) => {
                      if (cat.key in prev) {
                        const { [cat.key]: _, ...rest } = prev;
                        setSelectedRecs((sr) => sr.filter((r) => r.category !== cat.key));
                        return rest;
                      }
                      return { ...prev, [cat.key]: 'nominate' };
                    })}
                  />
                ))}
              </Stack>

              {/* Per-category sections — each with its own mode toggle + list */}
              {recCategories.map((cat) => {
                const catLabel = recCategoryOptions.find((o) => o.key === cat)?.label ?? cat;
                const catRecs = selectedRecs.filter((r) => r.category === cat);
                const mode = recCatModes[cat];
                const isPick = mode === 'pick';
                return (
                  <Card key={cat} variant="outlined" sx={{ mb: 1.5 }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                        {catLabel}
                      </Typography>

                      {/* Per-category mode toggle */}
                      <Stack direction="row" spacing={0.75} sx={{ mb: 1.5 }}>
                        <Chip
                          label="先开放提名"
                          size="small"
                          onClick={() => setRecCatModes((prev) => ({ ...prev, [cat]: 'nominate' }))}
                          color={mode === 'nominate' ? 'primary' : 'default'}
                          variant={mode === 'nominate' ? 'filled' : 'outlined'}
                        />
                        <Chip
                          label="直接选定"
                          size="small"
                          onClick={() => setRecCatModes((prev) => ({ ...prev, [cat]: 'pick' }))}
                          color={mode === 'pick' ? 'primary' : 'default'}
                          variant={mode === 'pick' ? 'filled' : 'outlined'}
                        />
                      </Stack>

                      {/* Recommendation cards */}
                      {catRecs.length > 0 && (
                        <Stack spacing={1} sx={{ mb: 1 }}>
                          {catRecs.map((rec) => (
                            <Card key={rec.id} variant="outlined" sx={isPick ? { borderColor: 'success.main', borderWidth: 2 } : undefined}>
                              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={600}>{rec.title}</Typography>
                                    <Stack direction="row" spacing={1.5} sx={{ mt: 0.25 }}>
                                      <Typography variant="caption" color="text.secondary">
                                        🌐 {rec.voteCount ?? 0}票
                                      </Typography>
                                      {rec.authorName && (
                                        <Typography variant="caption" color="text.secondary">
                                          {rec.authorName} 推荐
                                        </Typography>
                                      )}
                                    </Stack>
                                  </Box>
                                  {isPick && <Chip size="small" color="success" label="✓ 已选" />}
                                  <IconButton size="small" onClick={() => setSelectedRecs((prev) => prev.filter((r) => r.id !== rec.id))}>
                                    <CloseIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              </CardContent>
                            </Card>
                          ))}
                        </Stack>
                      )}

                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        onClick={() => { setRecCategory(cat); setRecPickerOpen(true); }}
                      >
                        {isPick ? '选择' : '添加提名'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>

          {/* Recommendation picker dialog */}
          <Dialog open={recPickerOpen} onClose={() => { setRecPickerOpen(false); setRecSearch(''); setRecCategory('all'); }} maxWidth="xs" fullWidth>
            <DialogTitle>选择推荐{recCategory !== 'all' ? ` · ${{ movie: '电影', book: '书', recipe: '食谱与调酒', place: '地方', music: '音乐', external_event: '演出/展览' }[recCategory] ?? ''}` : ''}</DialogTitle>
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
                const selectedIds = new Set(selectedRecs.map((r) => r.id));
                const filtered = allRecs.filter((r: any) => {
                  if (selectedIds.has(r.id)) return false;
                  if (recCategory !== 'all' && r.category !== recCategory) return false;
                  if (rq && !(r.title ?? '').toLowerCase().includes(rq) && !(r.description ?? '').toLowerCase().includes(rq)) return false;
                  return true;
                });
                const categoryLabel: Record<string, string> = { book: '书', recipe: '食谱与调酒', place: '地方', movie: '电影', music: '音乐', external_event: '演出/展览' };
                return filtered.length > 0 ? (
                  <Stack spacing={1}>
                    {filtered.slice(0, 20).map((r: any) => {
                      const votes = r._count?.votes ?? r.voteCount ?? 0;
                      return (
                        <Card key={r.id} variant="outlined">
                          <CardActionArea onClick={() => {
                            setSelectedRecs((prev) => [...prev, {
                              id: r.id, title: r.title, category: r.category,
                              voteCount: votes, authorName: r.author?.name,
                              _fromMovieTable: r._fromMovieTable || undefined,
                            }]);
                            setRecPickerOpen(false);
                            setRecSearch('');
                          }}>
                            <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                              <Typography variant="body2" fontWeight={600}>{r.title}</Typography>
                              <Stack direction="row" spacing={1.5}>
                                <Typography variant="caption" color="text.secondary">
                                  {categoryLabel[r.category] ?? r.category}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  🌐 {votes}票
                                </Typography>
                                {r.author?.name && (
                                  <Typography variant="caption" color="text.secondary">
                                    {r.author.name} 推荐
                                  </Typography>
                                )}
                              </Stack>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      );
                    })}
                  </Stack>
                ) : (
                  <Stack spacing={1.5} alignItems="center" sx={{ py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {recSearch ? `没有找到「${recSearch}」` : '没有更多推荐'}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        setRecPickerOpen(false);
                        setRecSearch('');
                        navigate('/discover');
                      }}
                    >
                      去添加推荐
                    </Button>
                  </Stack>
                );
              })()}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setRecPickerOpen(false); setRecSearch(''); }}>取消</Button>
            </DialogActions>
          </Dialog>

          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>公开设置</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
              <Chip
                label="延时公开"
                size="small"
                variant={delayPublish ? 'filled' : 'outlined'}
                color={delayPublish ? 'primary' : 'default'}
                onClick={() => setDelayPublish(!delayPublish)}
              />
              <Chip
                label="申请制"
                size="small"
                variant={signupMode === 'application' ? 'filled' : 'outlined'}
                color={signupMode === 'application' ? 'primary' : 'default'}
                onClick={() => setSignupMode(signupMode === 'application' ? 'direct' : 'application')}
              />
              <Chip
                label="私密活动"
                size="small"
                variant={isPrivate ? 'filled' : 'outlined'}
                color={isPrivate ? 'primary' : 'default'}
                onClick={() => setIsPrivate(!isPrivate)}
              />
              <Chip
                label={`不可见名单${excludedUserIds.length > 0 ? ` (${excludedUserIds.length})` : ''}`}
                size="small"
                variant={excludedUserIds.length > 0 ? 'filled' : 'outlined'}
                color={excludedUserIds.length > 0 ? 'warning' : 'default'}
                onClick={() => setExclusionDialogOpen(true)}
              />
            </Stack>
            {delayPublish && (
              <Box sx={{ mb: 1 }}>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    sx={{ flex: 2 }}
                  />
                  <TextField
                    type="time"
                    size="small"
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
            )}
          </Box>

          {/* Exclusion picker dialog */}
          <Dialog open={exclusionDialogOpen} onClose={() => { setExclusionDialogOpen(false); setExclusionSearch(''); }} maxWidth="xs" fullWidth>
            <DialogTitle>设置不可见名单</DialogTitle>
            <DialogContent>
              {excludedUserIds.length > 0 && (
                <Stack spacing={0.5} sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">已屏蔽的成员</Typography>
                  {excludedUserIds.map((uid) => {
                    const member = allMembers.find((m) => m.id === uid);
                    const mName = member?.name ?? uid;
                    return (
                      <Stack key={uid} direction="row" alignItems="center" spacing={1}>
                        <Avatar sx={{ width: 28, height: 28 }}>{firstNonEmoji(mName)}</Avatar>
                        <Typography variant="body2" sx={{ flex: 1 }}>{mName}</Typography>
                        <IconButton size="small" onClick={() => setExcludedUserIds((prev) => prev.filter((id) => id !== uid))}>
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
                const filtered = allMembers.filter((m) => {
                  if (m.id === user?.id) return false;
                  if (excludedUserIds.includes(m.id)) return false;
                  if (exclusionSearch && !m.name.toLowerCase().includes(exclusionSearch.toLowerCase())) return false;
                  return true;
                }).slice(0, 10);
                return (
                  <Stack spacing={0.5}>
                    {filtered.map((m) => (
                      <Stack direction="row" key={m.id} justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 28, height: 28 }}>{firstNonEmoji(m.name)}</Avatar>
                          <Typography variant="body2">{m.name}</Typography>
                        </Stack>
                        <Button size="small" variant="outlined" onClick={() => setExcludedUserIds((prev) => [...prev, m.id])}>
                          屏蔽
                        </Button>
                      </Stack>
                    ))}
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
              <Button onClick={() => { setExclusionDialogOpen(false); setExclusionSearch(''); }}>完成</Button>
            </DialogActions>
          </Dialog>

          <Box>
            <Button variant="contained" onClick={onSubmit} size="large" disabled={submitting}>
              {submitting ? '发布中…' : '发布活动'}
            </Button>
          </Box>
        </Stack>
      </CardContent>

      <Dialog open={Boolean(createdId)} fullWidth maxWidth="xs">
        <DialogTitle>活动创建成功！</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {delayPublish ? '邀请阶段，选择你要邀请的成员' : '邀请朋友参加吧'}
          </Typography>
          <TextField fullWidth size="small" placeholder="搜索成员名..." value={inviteSearch}
            onChange={(e) => setInviteSearch(e.target.value)} sx={{ mb: 1.5 }} />
          {filteredMembers.map((m) => {
            const invited = invitedPeople.includes(m.name);
            return (
              <Stack direction="row" key={m.name} justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar sx={{ width: 28, height: 28 }}>{firstNonEmoji(m.name)}</Avatar>
                  <Typography variant="body2">{m.name}</Typography>
                </Stack>
                <Button size="small" variant={invited ? 'contained' : 'outlined'}
                  onClick={() => setInvitedPeople((prev) =>
                    invited ? prev.filter((n) => n !== m.name) : [...prev, m.name]
                  )}>
                  {invited ? '✓ 已选' : '邀请'}
                </Button>
              </Stack>
            );
          })}
          {invitedPeople.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              已选 {invitedPeople.length} 人
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate(`/events/${createdId}`)}>跳过</Button>
          <Button variant="contained" onClick={async () => {
            if (invitedPeople.length > 0 && createdId) {
              try {
                const userIds = invitedPeople
                  .map((name) => allMembers.find((m) => m.name === name)?.id)
                  .filter(Boolean) as string[];
                if (userIds.length > 0) {
                  await inviteToEvent(createdId, userIds, user.id);
                }
              } catch { /* best effort */ }
            }
            navigate(`/events/${createdId}`);
          }}>完成</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        message="活动创建成功！"
      />

      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Card>
  );
}
