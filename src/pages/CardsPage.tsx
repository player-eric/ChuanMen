import { useState } from 'react';
import { useLoaderData, useNavigate, useOutletContext } from 'react-router';
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
import { titleDefinitions } from '@/mock/data';

function EmptyCards() {
  const navigate = useNavigate();
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Typography variant="h3" sx={{ mb: 1.5 }}>✉</Typography>
      <Typography variant="h6" sx={{ mb: 1 }}>还没有感谢卡</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, whiteSpace: 'pre-line' }}>
        参加一次活动后，就可以给同行的人寄一张感谢卡。{'\n'}你的卡片和收到的卡片都会出现在这里。
      </Typography>
      <Button variant="contained" onClick={() => navigate('/events')}>看看最近的活动</Button>
    </Box>
  );
}

export default function CardsPage() {
  const { isEmpty } = useOutletContext<{ isEmpty: boolean }>();
  if (isEmpty) return <EmptyCards />;
  return <FullCards />;
}

function FullCards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const data = useLoaderData() as CardsPageData;
  const [step, setStep] = useState(0);
  const [who, setWho] = useState<string | null>(null);
  const [stamp, setStamp] = useState('');
  const [msg, setMsg] = useState('');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showCardInfo, setShowCardInfo] = useState(false);
  const [showAll, setShowAll] = useState(true);
  const [showAllSent, setShowAllSent] = useState(true);

  const { people, quickMessages, myCards, sentCards, credits } = data;

  const reset = () => {
    setStep(0);
    setWho(null);
    setStamp('');
    setMsg('');
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setHasPhoto(false);
    setSent(false);
    setIsPrivate(true);
  };

  return (
    <Stack spacing={2}>
      {/* How to earn cards — collapsed by default */}
      <Card
        sx={{ cursor: 'pointer' }}
        onClick={() => setShowCardInfo((v) => !v)}
      >
        <CardContent sx={{ '&:last-child': { pb: showCardInfo ? undefined : 2 } }}>
          <Typography variant="subtitle2" fontWeight={700}>
            ✉ 如何获得感谢卡 {showCardInfo ? '▾' : '▸'}
          </Typography>
          {showCardInfo && (
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">· 每参加一次活动，+2 张感谢卡</Typography>
              <Typography variant="body2" color="text.secondary">· 每次做 Host，额外 +4 张</Typography>
              <Typography variant="body2" color="text.secondary">· 购买感谢卡 · $5/张（不限量）</Typography>
              <Typography variant="body2" color="text.secondary">· 感谢卡不限期，累计不清零</Typography>
            </Stack>
          )}
        </CardContent>
      </Card>

      {!user && (
        <Alert severity="info" action={<Button color="inherit" size="small" onClick={() => navigate('/login')}>去登录</Button>}>
          游客为只读模式，登录后可寄感谢卡。
        </Alert>
      )}

      {/* Credit balance */}
      {user && (
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              ✉ 可寄 {credits} 张
            </Typography>
            <Typography variant="caption" color="text.secondary">
              系统赠送的感谢卡只能寄给一起参加过活动的人，付费感谢卡不限
            </Typography>
          </Box>
          <Button variant="outlined" size="small" disabled>
            购买感谢卡 · 暂未开放
          </Button>
        </Stack>
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
              <Grid container spacing={1.5}>
                {people.map((person, index) => (
                  <Grid key={index} size={{ xs: 6, md: 4 }}>
                    <Card
                      variant="outlined"
                      onClick={() => {
                        setWho(person.name);
                        setStep(1);
                      }}
                      sx={{ p: 1.5, cursor: 'pointer', textAlign: 'center' }}
                    >
                      <Avatar sx={{ mx: 'auto', mb: 1 }}>{person.name[0]}</Avatar>
                      <Typography fontWeight={700}>{person.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{person.ctx}</Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {step === 1 && who && (
              <Stack spacing={2.5}>
                {/* Recipient header */}
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ width: 44, height: 44 }}>{who[0]}</Avatar>
                  <Box>
                    <Typography fontWeight={700} variant="subtitle1">给 {who}</Typography>
                    <Typography variant="caption" color="text.secondary">02.15 电影夜</Typography>
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
                    {titleDefinitions.map((t) => (
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
                            setPhotoPreview(URL.createObjectURL(file));
                            setHasPhoto(true);
                          }
                        }}
                      />
                    </Button>
                    {hasPhoto && (
                      <Button size="small" color="error" onClick={() => {
                        if (photoPreview) URL.revokeObjectURL(photoPreview);
                        setPhotoPreview(null);
                        setHasPhoto(false);
                      }}>
                        移除
                      </Button>
                    )}
                  </Stack>
                  {photoPreview && (
                    <Box
                      component="img"
                      src={photoPreview}
                      alt="预览"
                      sx={{
                        mt: 1.5, width: '100%', maxHeight: 180,
                        objectFit: 'cover', borderRadius: 1.5,
                      }}
                    />
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
                      setPhotoPreview(null);
                      setHasPhoto(false);
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
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary">TO: {who}</Typography>
                        <Typography variant="body2" sx={{ mt: 0.25 }}>{msg}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          FROM: {user.name ?? '我'} · {isPrivate ? '🔒 仅彼此可见' : '🌐 公开'}
                        </Typography>
                      </Box>
                      <Chip label={stamp} size="small" variant="outlined" sx={{ ml: 1, flexShrink: 0 }} />
                    </Stack>
                  </CardContent>
                </Card>
                <Stack direction="row" spacing={1}>
                  <Button onClick={() => setStep(1)} variant="outlined" fullWidth>改一改</Button>
                  <Button
                    onClick={async () => {
                      if (!user?.id || !who) return;
                      try {
                        const { sendPostcard } = await import('@/lib/domainApi');
                        // Find recipient user ID — for now use name-based lookup
                        // TODO: resolve real user ID from `who` name
                        await sendPostcard({
                          fromId: user.id,
                          toId: who, // will need resolution
                          message: msg,
                          visibility: isPrivate ? 'private' : 'public',
                          tags: stamp ? [stamp] : [],
                        });
                      } catch { /* still show sent UI */ }
                      setSent(true);
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
            <Button size="small" onClick={() => setShowAll(!showAll)}>{showAll ? '收起' : '展开'}</Button>
          </Stack>

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
                />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Sent cards */}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>寄出的感谢卡 · {sentCards.length} 张</Typography>
            <Button size="small" onClick={() => setShowAllSent(!showAllSent)}>{showAllSent ? '收起' : '展开'}</Button>
          </Stack>

          <Grid container spacing={1.5}>
            {(showAllSent ? sentCards : sentCards.slice(0, 2)).map((card, index) => (
              <Grid key={index} size={{ xs: 12, md: 6 }}>
                <PostCard
                  from={card.from}
                  to="..."
                  message={card.message}
                  stamp={card.stamp}
                  date={card.date}
                  photo={card.photo}
                  isPrivate={card.visibility === 'private'}
                  showVisibility
                />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  );
}
