import { useState, useEffect } from 'react';
import { useLoaderData, useLocation, useNavigate, useRevalidator } from 'react-router';
import { firstNonEmoji } from '@/components/Atoms';
import {
  Avatar,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Grid,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import type { CardsPageData } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { PostCard } from '@/components/PostCard';
import { EmptyState } from '@/components/EmptyState';
import { useTitleDefs } from '@/hooks/useTitleDefs';
import MailRoundedIcon from '@mui/icons-material/MailRounded';

function EmptyCards({ credits }: { credits?: number }) {
  const navigate = useNavigate();
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <MailRoundedIcon sx={{ fontSize: 48, mb: 1.5, color: 'text.secondary' }} />
      <Typography variant="h6" sx={{ mb: 1 }}>还没有感谢卡</Typography>
      {(credits ?? 0) > 0 && (
        <Typography variant="body2" color="warning.main" sx={{ mb: 1 }}>
          你有 {credits} 张感谢卡可用
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, whiteSpace: 'pre-line' }}>
        参加一次活动后，就可以给同行的人寄一张感谢卡。{'\n'}你的卡片和收到的卡片都会出现在这里。
      </Typography>
      <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" useFlexGap>
        <Button variant="contained" onClick={() => navigate('/events')}>看看最近的活动</Button>
        <Button variant="outlined" onClick={() => navigate('/events/new')}>组织一个小局试试</Button>
      </Stack>
    </Box>
  );
}

export default function CardsPage() {
  const data = useLoaderData() as CardsPageData;
  const { user } = useAuth();
  // Show empty state when not logged in or no cards and no eligible people
  const isEmpty = !user || (data.myCards.length === 0 && data.sentCards.length === 0 && data.people.length === 0);
  if (isEmpty) return <EmptyCards credits={data.credits} />;
  return <FullCards />;
}

function FullCards() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const data = useLoaderData() as CardsPageData;
  const revalidator = useRevalidator();
  const titleDefs = useTitleDefs();
  const [step, setStep] = useState(0);
  const [who, setWho] = useState<string | null>(null);
  const [whoId, setWhoId] = useState<string | null>(null);
  const [whoCtx, setWhoCtx] = useState<string | null>(null);
  const [stamp, setStamp] = useState('');
  const [msg, setMsg] = useState('');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoPos, setPhotoPos] = useState<'left' | 'center' | 'right'>('center');
  const [sent, setSent] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showCardInfo, setShowCardInfo] = useState(false);
  const [showAll, setShowAll] = useState(true);
  const [showAllSent, setShowAllSent] = useState(true);
  const [snackMsg, setSnackMsg] = useState('');

  const { people, quickMessages, myCards, sentCards, credits } = data;

  /* If navigated from MemberDetailPage with recipient info, pre-select */
  useEffect(() => {
    const state = location.state as { recipientName?: string; recipientId?: string } | null;
    if (state?.recipientName) {
      // Cannot send postcard to yourself
      if (state.recipientId === user?.id) {
        setSnackMsg('不能给自己寄感谢卡哦');
        window.history.replaceState({}, '');
        return;
      }
      const match = people.find((p) => (p.id ?? p.name) === (state.recipientId ?? state.recipientName));
      if (match) {
        setWho(state.recipientName);
        setWhoId(state.recipientId ?? state.recipientName);
        setWhoCtx(match.ctx);
        setStep(1);
      } else {
        // Recipient not in eligible list
        setSnackMsg('需要一起参加过活动才能寄感谢卡，去看看最近的活动，或者直接约人吧');
      }
      // Clear location state so refreshing doesn't re-trigger
      window.history.replaceState({}, '');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setStep(0);
    setWho(null);
    setWhoId(null);
    setWhoCtx(null);
    setStamp('');
    setMsg('');
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setHasPhoto(false);
    setPhotoPos('center');
    setSent(false);
    setIsPrivate(true);
  };

  const toggleCardVisibility = async (cardId: string, currentVisibility: string) => {
    if (!user?.id) return;
    const newVis = currentVisibility === 'private' ? 'public' : 'private';
    try {
      const { updatePostcardVisibility } = await import('@/lib/domainApi');
      await updatePostcardVisibility(cardId, user.id, newVis);
      revalidator.revalidate();
    } catch { /* ignore */ }
  };

  return (
    <Stack spacing={2}>
      {!user && (
        <Alert severity="info" action={<Button color="inherit" size="small" onClick={() => navigate('/login')}>去登录</Button>}>
          游客为只读模式，登录后可寄感谢卡。
        </Alert>
      )}

      {/* Credit balance + earn rules (merged) */}
      {user && (
        <Card variant="outlined">
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: showCardInfo ? undefined : 1.5 } }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ cursor: 'pointer' }}
              onClick={() => setShowCardInfo((v) => !v)}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <MailRoundedIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {credits} 张可用
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    如何获得 {showCardInfo ? '▾' : '▸'}
                  </Typography>
                </Box>
              </Stack>
              {credits === 0 && (
                <Button variant="outlined" size="small" onClick={(e) => { e.stopPropagation(); navigate('/events'); }}>
                  去参加活动
                </Button>
              )}
            </Stack>
            {showCardInfo && (
              <Stack spacing={0.5} sx={{ mt: 1.5, pl: 6.5 }}>
                <Typography variant="body2" color="text.secondary">· 新成员自动获得 4 张</Typography>
                <Typography variant="body2" color="text.secondary">· 每参加一次活动 +2 张</Typography>
                <Typography variant="body2" color="text.secondary">· 每次做 Host 额外 +4 张</Typography>
                <Typography variant="body2" color="text.secondary">· 不限期，累计不清零</Typography>
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {user && !sent ? (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 0.5 }}>寄一张感谢卡</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              对你想感谢的人说一句话吧
            </Typography>
            <Stepper activeStep={step} alternativeLabel sx={{ mb: 2 }}>
              {['选人', '写话+封面', '寄出'].map((label) => (
                <Step key={label}><StepLabel>{label}</StepLabel></Step>
              ))}
            </Stepper>

            {step === 0 && (
              people.filter((p) => (p.id ?? p.name) !== user?.id).length === 0 ? (
                <EmptyState
                  icon="✉"
                  title="参加一次活动，就可以给同行的人寄感谢卡"
                  description="感谢卡只能寄给一起参加过活动的人。快去看看有什么活动吧！"
                  action={{ label: '看看最近的活动', to: '/events' }}
                />
              ) : (
                <Grid container spacing={1.5}>
                  {people.filter((p) => (p.id ?? p.name) !== user?.id).map((person, index) => (
                    <Grid key={index} size={{ xs: 6, md: 4 }}>
                      <Card
                        variant="outlined"
                        onClick={() => {
                          setWho(person.name);
                          setWhoId(person.id ?? person.name);
                          setWhoCtx(person.ctx);
                          setStep(1);
                        }}
                        sx={{ p: 1.5, cursor: 'pointer', textAlign: 'center' }}
                      >
                        <Avatar sx={{ mx: 'auto', mb: 1 }}>{firstNonEmoji(person.name)}</Avatar>
                        <Typography fontWeight={700}>{person.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{person.ctx}</Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )
            )}

            {step === 1 && who && (
              <Stack spacing={2.5}>
                {/* Recipient header */}
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ width: 44, height: 44 }}>{who[0]}</Avatar>
                  <Box>
                    <Typography fontWeight={700} variant="subtitle1">给 {who}</Typography>
                    <Typography variant="caption" color="text.secondary">{whoCtx ?? ''}</Typography>
                  </Box>
                </Stack>

                {/* Message section */}
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>写一句话</Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                    {quickMessages.map((quick, index) => (
                      <Chip
                        key={index}
                        label={quick}
                        size="small"
                        onClick={() => setMsg(quick)}
                        color={msg === quick ? 'primary' : 'default'}
                        variant={msg === quick ? 'filled' : 'outlined'}
                      />
                    ))}
                  </Stack>
                  <TextField
                    multiline
                    minRows={3}
                    value={msg}
                    onChange={(event) => setMsg(event.target.value.slice(0, 80))}
                    placeholder="或者自己写..."
                    helperText={`${msg.length}/80`}
                    fullWidth
                  />
                </Box>

                {/* Title section */}
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>送一个称号（可选）</Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {titleDefs.map((t) => (
                      <Chip
                        key={t.id}
                        label={`${t.emoji} ${t.name}`}
                        size="small"
                        variant={stamp === t.emoji ? 'filled' : 'outlined'}
                        color={stamp === t.emoji ? 'primary' : 'default'}
                        onClick={() => setStamp(t.emoji)}
                      />
                    ))}
                  </Stack>
                </Box>

                {/* Cover photo section */}
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>添加封面（可选）</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      variant="outlined"
                      component="label"
                      size="small"
                      color={hasPhoto ? 'success' : 'primary'}
                    >
                      {hasPhoto ? '更换封面' : '选择图片'}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (photoPreview) URL.revokeObjectURL(photoPreview);
                            setPhotoFile(file);
                            setPhotoPreview(URL.createObjectURL(file));
                            setHasPhoto(true);
                          }
                        }}
                      />
                    </Button>
                    {hasPhoto && (
                      <Button size="small" color="error" onClick={() => {
                        if (photoPreview) URL.revokeObjectURL(photoPreview);
                        setPhotoFile(null);
                        setPhotoPreview(null);
                        setHasPhoto(false);
                      }}>
                        移除
                      </Button>
                    )}
                  </Stack>
                  {photoPreview && (
                    <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 140, aspectRatio: '2 / 3', flexShrink: 0, borderRadius: 1.5, overflow: 'hidden',
                          background: `url(${photoPreview}) ${photoPos}/cover no-repeat`,
                        }}
                      />
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">显示区域：</Typography>
                        <Stack direction="row" spacing={0.5}>
                          {(['left', 'center', 'right'] as const).map((pos) => (
                            <Chip
                              key={pos}
                              label={pos === 'left' ? '左' : pos === 'center' ? '中' : '右'}
                              size="small"
                              variant={photoPos === pos ? 'filled' : 'outlined'}
                              color={photoPos === pos ? 'primary' : 'default'}
                              onClick={() => setPhotoPos(pos)}
                            />
                          ))}
                        </Stack>
                      </Stack>
                    </Stack>
                  )}
                </Box>

                <RadioGroup row value={isPrivate ? 'private' : 'public'} onChange={(event) => setIsPrivate(event.target.value === 'private')}>
                  <FormControlLabel value="private" control={<Radio size="small" />} label="🔒 仅彼此可见" />
                  <FormControlLabel value="public" control={<Radio size="small" />} label="🌐 公开到动态流" />
                </RadioGroup>

                <Stack direction="row" spacing={1}>
                  <Button
                    onClick={() => {
                      setStep(0);
                      setWho(null);
                      setStamp('');
                      setMsg('');
                      if (photoPreview) URL.revokeObjectURL(photoPreview);
                      setPhotoFile(null);
                      setPhotoPreview(null);
                      setHasPhoto(false);
                      setPhotoPos('center');
                    }}
                    variant="outlined"
                    fullWidth
                  >
                    返回
                  </Button>
                  <Button onClick={() => { if (msg) setStep(2); }} variant="contained" fullWidth disabled={!msg}>
                    预览
                  </Button>
                </Stack>
              </Stack>
            )}

            {step === 2 && who && (
              <Stack spacing={2}>
                <PostCard
                  from={user.name ?? '我'}
                  to={who}
                  message={msg}
                  stamp={stamp || '✉'}
                  photo={photoPreview ? `url(${photoPreview}) ${photoPos}/cover no-repeat` : undefined}
                  isPrivate={isPrivate}
                  showVisibility
                  layout="horizontal"
                  date={new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                  eventCtx={whoCtx ?? undefined}
                />
                <Stack direction="row" spacing={1}>
                  <Button onClick={() => setStep(1)} variant="outlined" fullWidth>改一改</Button>
                  <Button
                    onClick={async () => {
                      if (!user?.id || !who) return;
                      try {
                        const { sendPostcard, uploadMedia } = await import('@/lib/domainApi');
                        let photoUrl: string | undefined;
                        if (photoFile) {
                          const uploaded = await uploadMedia(photoFile, 'postcard', user.id);
                          photoUrl = uploaded.publicUrl;
                        }
                        await sendPostcard({
                          fromId: user.id,
                          toId: whoId ?? who,
                          message: msg,
                          eventCtx: whoCtx ?? undefined,
                          visibility: isPrivate ? 'private' : 'public',
                          photoUrl,
                          tags: stamp ? [stamp] : [],
                        });
                        revalidator.revalidate();
                        setSent(true);
                      } catch {
                        alert('寄出失败，请重新登录后再试');
                      }
                    }}
                    variant="contained"
                    fullWidth
                    disabled={credits === 0}
                  >
                    ✉ 寄出
                  </Button>
                </Stack>
              </Stack>
            )}
          </CardContent>
        </Card>
      ) : user ? (
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography color="success.main" fontWeight={700}>✓ 已寄出</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{who} 会收到通知</Typography>
            <Button onClick={reset} sx={{ mt: 1.5 }}>再寄一张</Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>收到的感谢卡 · {myCards.length} 张</Typography>
            {myCards.length > 0 && (
              <Button size="small" onClick={() => setShowAll(!showAll)}>{showAll ? '收起' : '展开'}</Button>
            )}
          </Stack>

          {myCards.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              还没有收到感谢卡——参加活动后，朋友可能会给你寄一张哦！
            </Typography>
          ) : (
            <Grid container spacing={1.5}>
              {(showAll ? myCards : myCards.slice(0, 2)).map((card, index) => (
                <Grid key={index} size={{ xs: 12, md: 6 }}>
                  <PostCard
                    from={card.from}
                    to={user?.name ?? '我'}
                    message={card.message}
                    stamp={card.stamp}
                    date={card.date}
                    photo={card.photo}
                    isPrivate={card.visibility === 'private'}
                    showVisibility
                    layout="horizontal"
                    eventCtx={card.eventCtx}
                    onToggleVisibility={card.id ? () => toggleCardVisibility(card.id!, card.visibility) : undefined}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Sent cards */}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>寄出的感谢卡 · {sentCards.length} 张</Typography>
            {sentCards.length > 0 && (
              <Button size="small" onClick={() => setShowAllSent(!showAllSent)}>{showAllSent ? '收起' : '展开'}</Button>
            )}
          </Stack>

          {sentCards.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              还没有寄出感谢卡
            </Typography>
          ) : (
            <Grid container spacing={1.5}>
              {(showAllSent ? sentCards : sentCards.slice(0, 2)).map((card, index) => (
                <Grid key={index} size={{ xs: 12, md: 6 }}>
                  <PostCard
                    from={card.from}
                    to={(card as any).to ?? '...'}
                    message={card.message}
                    stamp={card.stamp}
                    date={card.date}
                    photo={card.photo}
                    isPrivate={card.visibility === 'private'}
                    showVisibility
                    layout="horizontal"
                    eventCtx={card.eventCtx}
                    onToggleVisibility={card.id ? () => toggleCardVisibility(card.id!, card.visibility) : undefined}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={Boolean(snackMsg)}
        autoHideDuration={4000}
        onClose={() => setSnackMsg('')}
        message={snackMsg}
      />
    </Stack>
  );
}
