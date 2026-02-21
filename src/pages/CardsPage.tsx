import { useState } from 'react';
import { useLoaderData, useNavigate, useOutletContext } from 'react-router';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Grid,
  LinearProgress,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import type { CardsPageData } from '@/types';

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
  const data = useLoaderData() as CardsPageData;
  const [step, setStep] = useState(0);
  const [who, setWho] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [sent, setSent] = useState(false);
  const [isPrivate, setIsPrivate] = useState(true);
  const [showAll, setShowAll] = useState(true);

  const { people, quickMessages, myCards } = data;

  const reset = () => {
    setStep(0);
    setWho(null);
    setMsg('');
    setHasPhoto(false);
    setSent(false);
    setIsPrivate(true);
  };

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">本月还能寄 <b>2 / 4</b> 张</Typography>
            <Typography variant="caption" color="text.secondary">月底清零</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={50} />
        </CardContent>
      </Card>

      {!sent ? (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>寄一张感谢卡</Typography>
            <Stepper activeStep={step} alternativeLabel sx={{ mb: 2 }}>
              {['选人', '写话+拍照', '寄出'].map((label) => (
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
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar>{who[0]}</Avatar>
                  <Box>
                    <Typography fontWeight={700}>给 {who}</Typography>
                    <Typography variant="caption" color="text.secondary">02.15 电影夜</Typography>
                  </Box>
                </Stack>

                <FormControlLabel
                  control={<Switch checked={hasPhoto} onChange={() => setHasPhoto(!hasPhoto)} />}
                  label={hasPhoto ? '已附加照片' : '添加照片（可选）'}
                />

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {quickMessages.map((quick, index) => (
                    <Chip
                      key={index}
                      label={quick}
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
                />

                <RadioGroup row value={isPrivate ? 'private' : 'public'} onChange={(event) => setIsPrivate(event.target.value === 'private')}>
                  <FormControlLabel value="private" control={<Radio size="small" />} label="🔒 仅彼此可见" />
                  <FormControlLabel value="public" control={<Radio size="small" />} label="🌐 公开到动态流" />
                </RadioGroup>

                <Stack direction="row" spacing={1}>
                  <Button
                    onClick={() => {
                      setStep(0);
                      setWho(null);
                      setMsg('');
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
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="caption" color="text.secondary">TO: {who}</Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>{msg}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip size="small" label="🎬" />
                    {hasPhoto && <Chip size="small" label="📷 含照片" />}
                    <Chip size="small" label={isPrivate ? '🔒 私密' : '🌐 公开'} />
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button onClick={() => setStep(1)} variant="outlined" fullWidth>改一改</Button>
                    <Button onClick={() => setSent(true)} variant="contained" fullWidth>✉ 寄出</Button>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography color="success.main" fontWeight={700}>✓ 已寄出</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{who} 会收到通知</Typography>
            <Button onClick={reset} sx={{ mt: 1.5 }}>再寄一张</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>收到的感谢卡 · {myCards.length} 张</Typography>
            <Button size="small" onClick={() => setShowAll(!showAll)}>{showAll ? '收起' : '展开'}</Button>
          </Stack>

          <Stack spacing={1}>
            {(showAll ? myCards : myCards.slice(0, 2)).map((card, index) => (
              <Card key={index} variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="start">
                    <Box>
                      <Typography variant="caption" color="text.secondary">FROM: {card.from}</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{card.msg}</Typography>
                    </Box>
                    <Stack spacing={0.5} alignItems="flex-end">
                      <Chip size="small" label={card.stamp} />
                      <Typography variant="caption" color="text.secondary">{card.date}</Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
