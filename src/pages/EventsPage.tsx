import { useEffect, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import {
  Alert,
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import type { EventData, EventsPageData } from '@/types';
import { searchProposals } from '@/lib/domainApi';
import { useAuth } from '@/auth/AuthContext';
import { useColors } from '@/hooks/useColors';
import { Ava, AvaStack } from '@/components/Atoms';
import { FeedActions } from '@/components/FeedItems';
import { ScenePhoto } from '@/components/ScenePhoto';
import { Poster } from '@/components/Poster';

const phaseChip: Record<string, { label: string; color: 'warning' | 'success' | 'primary' | 'default' | 'error' }> = {
  invite: { label: '🔒 邀请', color: 'warning' },
  open: { label: '报名中', color: 'success' },
  closed: { label: '报名结束', color: 'default' },
  cancelled: { label: '已取消', color: 'error' },
  ended: { label: '已结束', color: 'default' },
};

function EventDetailDialog({ evt, open, onClose }: { evt: EventData | null; open: boolean; onClose: () => void }) {
  if (!evt) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{evt.title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip size="small" label={`📅 ${evt.date}`} />
            <Chip size="small" label={`📍 ${evt.location}`} />
            {evt.phase === 'invite' && <Chip size="small" color="warning" label="邀请阶段" />}
          </Stack>
          <Typography variant="body2" color="text.secondary">{evt.desc}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar>{evt.host[0]}</Avatar>
            <Typography variant="body2">Host：{evt.host}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <AvatarGroup max={5}>
              {evt.people.map((name) => (
                <Avatar key={name}>{name[0]}</Avatar>
              ))}
            </AvatarGroup>
            <Typography variant="body2" color={evt.spots > 0 ? 'success.main' : 'text.secondary'}>
              {evt.spots > 0 ? `还剩 ${evt.spots}/${evt.total} 位` : '已满，可排队'}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
        <Button variant="contained">{evt.phase === 'invite' ? '接受邀请' : '报名参加'}</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Shared event card used in both "即将到来" and "过往活动" tabs */
function EventCard({ evt, navigate }: { evt: EventData; navigate: ReturnType<typeof useNavigate> }) {
  const phase = phaseChip[evt.phase] ?? phaseChip.open;
  const isCancelled = evt.phase === 'cancelled';

  return (
    <Card sx={{ height: '100%', overflow: 'hidden', opacity: isCancelled ? 0.6 : 1 }}>
      <CardActionArea onClick={() => navigate(`/events/${evt.id}`)}>
        {evt.scene && (
          <Box sx={{ position: 'relative' }}>
            <ScenePhoto scene={evt.scene} h={100} style={{ borderRadius: 0 }}>
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(transparent, rgba(0,0,0,0.5))' }} />
              <Box sx={{ position: 'absolute', top: 8, right: 10 }}>
                <Chip size="small" color={phase.color} label={phase.label} sx={{ height: 22, fontSize: '0.7rem' }} />
              </Box>
              {evt.film && (
                <Box sx={{ position: 'absolute', bottom: 8, left: 10 }}>
                  <Poster title={evt.film} w={28} h={40} />
                </Box>
              )}
            </ScenePhoto>
          </Box>
        )}
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">{evt.title}</Typography>
              {!evt.scene && <Chip size="small" color={phase.color} label={phase.label} />}
              {evt.isHomeEvent && <Chip size="small" variant="outlined" label="🏠 在家" />}
            </Stack>
            <Typography variant="body2" color="text.secondary">{evt.date} · {evt.location}</Typography>
            {evt.isHomeEvent && evt.phase === 'open' && (
              <Typography variant="caption" color="text.secondary">📍 报名后可见完整地址</Typography>
            )}
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar sx={{ width: 26, height: 26 }}>{evt.host[0]}</Avatar>
              <Typography variant="body2" color="text.secondary">{evt.host} Host</Typography>
            </Stack>
            {evt.houseRules && (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                🏠 {evt.houseRules}
              </Typography>
            )}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <AvatarGroup max={4}>
                {evt.people.map((name) => (
                  <Avatar key={name}>{name[0]}</Avatar>
                ))}
              </AvatarGroup>
              {evt.phase !== 'ended' && evt.phase !== 'cancelled' && (
                <Typography variant="body2" color={evt.spots > 0 ? 'success.main' : 'text.secondary'}>
                  {evt.spots > 0 ? `还剩 ${evt.spots} 位` : '已满'}
                </Typography>
              )}
              {(evt.phase === 'ended') && (
                <Stack direction="row" spacing={0.5}>
                  {evt.photoCount && <Chip size="small" variant="outlined" label={`📷 ${evt.photoCount}`} />}
                  {evt.commentCount && <Chip size="small" variant="outlined" label={`💬 ${evt.commentCount}`} />}
                </Stack>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" onClick={() => navigate(`/events/${evt.id}`)}>查看详情</Button>
      </CardActions>
    </Card>
  );
}

export default function EventsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const c = useColors();
  const data = useLoaderData() as EventsPageData;
  const [tab, setTab] = useState<'upcoming' | 'ideas' | 'past'>('upcoming');
  const [selected, setSelected] = useState<EventData | null>(null);
  const [snackMsg, setSnackMsg] = useState('');
  const canInteract = Boolean(user);

  // Proposal search state
  const [keyword, setKeyword] = useState('');
  const [searchedItems, setSearchedItems] = useState<Record<string, unknown>[]>([]);
  const [searchError, setSearchError] = useState('');
  const [interested, setInterested] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (tab !== 'ideas') return;
    const run = async () => {
      if (!keyword.trim()) {
        setSearchedItems([]);
        setSearchError('');
        return;
      }
      try {
        const result = await searchProposals(keyword.trim());
        setSearchedItems(result.items);
        setSearchError('');
      } catch (error) {
        setSearchError(error instanceof Error ? error.message : '搜索失败，请稍后重试');
      }
    };
    void run();
  }, [keyword, tab]);

  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  /* Split events by phase */
  const upcomingEvents = data.upcoming.filter((e) => e.phase === 'invite' || e.phase === 'open' || e.phase === 'closed' || e.phase === 'cancelled');
  const pastEvents = data.upcoming.filter((e) => e.phase === 'ended');

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
        <Tab value="upcoming" label={`即将到来 (${upcomingEvents.length})`} />
        <Tab value="ideas" label={`创意孵化中 (${data.proposals.length})`} />
        <Tab value="past" label={`过往活动 (${pastEvents.length + data.past.length})`} />
      </Tabs>

      {tab === 'upcoming' && (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            {upcomingEvents.map((evt) => (
              <Grid key={evt.id} size={{ xs: 12, md: 6 }}>
                <EventCard evt={evt} navigate={navigate} />
              </Grid>
            ))}
          </Grid>
        </Stack>
      )}

      {tab === 'ideas' && (
        <Stack spacing={2}>
          <TextField
            placeholder="搜索创意"
            size="small"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ textAlign: 'right' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<LightbulbOutlinedIcon />}
              onClick={() => navigate('/events/proposals/new')}
              disabled={!canInteract}
            >
              添加创意
            </Button>
          </Box>

          {searchError && <Alert severity="error">{searchError}</Alert>}

          {searchedItems.map((item) => (
            <Card key={String(item._id)} sx={{ borderRadius: 2 }}>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{String(item.title ?? '')}</div>
                <div style={{ fontSize: 14, color: c.text2, marginTop: 4 }}>{String(item.description ?? '')}</div>
              </div>
            </Card>
          ))}

          {!!keyword.trim() && searchedItems.length === 0 && !searchError && (
            <Typography variant="body2" color="text.secondary">没有匹配创意</Typography>
          )}

          {data.proposals.map((proposal) => {
            const v = interested[proposal.id] ?? false;
            return (
              <Card key={proposal.id} sx={{ borderRadius: 2 }}>
                <div style={{ padding: '10px 14px' }}>
                  {/* Author + time */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                    <Ava name={proposal.name} size={24} onTap={() => goMember(proposal.name)} />
                    <b onClick={() => goMember(proposal.name)} style={{ cursor: 'pointer', fontSize: 13 }}>{proposal.name}</b>
                    <span style={{ fontSize: 12, color: c.text3 }}>· {proposal.time}</span>
                  </div>

                  {/* Title — clickable to detail */}
                  <div
                    style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, cursor: 'pointer' }}
                    onClick={() => navigate(`/events/proposals/${proposal.id}`)}
                  >{'💡'} {proposal.title}</div>

                  {/* Interested people + action buttons on one row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <AvaStack names={proposal.interested} size={18} />
                      <span style={{ fontSize: 12, color: c.text3 }}>{proposal.interested.length} 人感兴趣</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => user && setInterested((prev) => ({ ...prev, [proposal.id]: !prev[proposal.id] }))}
                        style={{
                          padding: '4px 12px', borderRadius: 6,
                          background: v ? c.blue + '15' : c.s2,
                          border: `1px solid ${v ? c.blue + '40' : c.line}`,
                          color: !user ? c.text3 : v ? c.blue : c.text2,
                          fontSize: 13, fontWeight: 600, cursor: user ? 'pointer' : 'default',
                          opacity: user ? 1 : 0.5,
                        }}
                      >
                        {v ? '✓ 感兴趣' : '感兴趣'} · {proposal.votes + (v ? 1 : 0)}
                      </button>
                      <button
                        onClick={() => user && navigate('/events/new', { state: { fromProposal: { title: proposal.title, descriptionHtml: proposal.descriptionHtml ?? '' } } })}
                        style={{
                          padding: '4px 12px', borderRadius: 6,
                          background: c.warm,
                          border: 'none',
                          color: c.bg,
                          fontSize: 13, fontWeight: 600, cursor: user ? 'pointer' : 'default',
                          opacity: user ? 1 : 0.5,
                        }}
                      >
                        我来组织
                      </button>
                    </div>
                  </div>
                </div>

                {/* Like + comment bar */}
                <FeedActions
                  likes={proposal.likes ?? 0}
                  likedBy={proposal.likedBy ?? []}
                  comments={proposal.comments ?? []}
                />
              </Card>
            );
          })}
        </Stack>
      )}

      {tab === 'past' && (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            {/* EventData items with phase='ended' — full rich card */}
            {pastEvents.map((evt) => (
              <Grid key={evt.id} size={{ xs: 12, md: 6 }}>
                <EventCard evt={evt} navigate={navigate} />
              </Grid>
            ))}
            {/* Older PastEvent items — same visual style */}
            {data.past.map((evt, idx) => (
              <Grid key={`past-${idx}`} size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: '100%', overflow: 'hidden' }}>
                  {evt.scene && (
                    <Box sx={{ position: 'relative' }}>
                      <ScenePhoto scene={evt.scene} h={100} style={{ borderRadius: 0 }}>
                        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(transparent, rgba(0,0,0,0.5))' }} />
                        {evt.film && (
                          <Box sx={{ position: 'absolute', bottom: 8, left: 10 }}>
                            <Poster title={evt.film} w={28} h={40} />
                          </Box>
                        )}
                      </ScenePhoto>
                    </Box>
                  )}
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Typography variant="h6">{evt.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{evt.date} · {evt.host} Host</Typography>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">{evt.people} 人参加</Typography>
                        <Stack direction="row" spacing={0.5}>
                          {evt.photoCount && <Chip size="small" variant="outlined" label={`📷 ${evt.photoCount}`} />}
                          {evt.commentCount && <Chip size="small" variant="outlined" label={`💬 ${evt.commentCount}`} />}
                        </Stack>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Stack>
      )}

      <Stack spacing={1} sx={{ position: 'fixed', right: { xs: 16, md: 32 }, bottom: { xs: 84, md: 24 }, alignItems: 'stretch' }}>
        <Button variant="contained" size="small" onClick={() => navigate('/events/new')} disabled={!canInteract}
          sx={{ borderRadius: 6, textTransform: 'none', px: 2, py: 0.8, fontSize: 13, fontWeight: 600, justifyContent: 'flex-start' }}>
          + 发起活动
        </Button>
        <Button variant="outlined" size="small" onClick={() => navigate('/events/proposals/new')} disabled={!canInteract}
          sx={{ borderRadius: 6, textTransform: 'none', px: 2, py: 0.8, fontSize: 13, fontWeight: 600, justifyContent: 'flex-start', bgcolor: 'background.paper' }}>
          💡 提创意
        </Button>
      </Stack>

      <Snackbar
        open={Boolean(snackMsg)}
        autoHideDuration={3000}
        onClose={() => setSnackMsg('')}
        message={snackMsg}
      />

      <EventDetailDialog evt={selected} open={Boolean(selected)} onClose={() => setSelected(null)} />
    </Box>
  );
}
