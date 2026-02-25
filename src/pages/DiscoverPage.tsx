import { useState, useRef, useCallback, useEffect } from 'react';
import { useLoaderData, useNavigate, useRevalidator } from 'react-router';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  InputAdornment,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import type { DiscoverPageData } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { Poster } from '@/components/Poster';
import { EmptyState } from '@/components/EmptyState';
import { toggleMovieVote, searchExternalMovies, createMovie } from '@/lib/domainApi';
import type { ExternalMovieResult } from '@/lib/domainApi';

/* ═══ DiscoverPage ═══ */
export default function DiscoverPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<'movie' | 'book'>('movie');

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto', pb: 0.5 }}>
        {[
          { key: 'movie' as const, label: '🎬 电影' },
          { key: 'book' as const, label: '📖 读书' },
        ].map((cat) => (
          <Chip
            key={cat.key}
            label={cat.label}
            color={activeCategory === cat.key ? 'primary' : 'default'}
            variant={activeCategory === cat.key ? 'filled' : 'outlined'}
            clickable
            onClick={() => setActiveCategory(cat.key)}
          />
        ))}
        {[
          { key: 'recipe', label: '🍜 菜谱' },
          { key: 'music', label: '🎵 音乐' },
          { key: 'place', label: '📍 好店' },
        ].map((cat) => (
          <Tooltip key={cat.key} title="即将开放" arrow>
            <span>
              <Chip
                label={cat.label}
                variant="outlined"
                disabled
                sx={{ opacity: 0.5 }}
              />
            </span>
          </Tooltip>
        ))}
      </Stack>
      {activeCategory === 'movie' ? <MoviesSection /> : <BooksSection />}
    </Box>
  );
}

function MoviesSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const data = useLoaderData() as DiscoverPageData;
  const revalidator = useRevalidator();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'pool' | 'screened'>('pool');
  const [extResults, setExtResults] = useState<ExternalMovieResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addedTitle, setAddedTitle] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { pool, screened } = data;

  // Track vote toggles: true = voted, false = un-voted, undefined = unchanged
  const [votes, setVotes] = useState<Record<string, boolean>>(() => {
    if (!user?.id) return {};
    const init: Record<string, boolean> = {};
    for (const m of pool) {
      if (m.voterIds.includes(user.id)) init[m.id] = true;
    }
    return init;
  });

  const toggle = async (id: string) => {
    setVotes((v) => ({ ...v, [id]: !v[id] }));
    if (user?.id) {
      try { await toggleMovieVote(id, user.id); } catch { /* optimistic */ }
    }
  };

  // Filter local pool by search keyword
  const q = search.toLowerCase();
  const filteredPool = q
    ? pool.filter((m) => m.title.toLowerCase().includes(q) || m.dir.toLowerCase().includes(q))
    : pool;

  // Debounced external search
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setAddedTitle(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setExtResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchExternalMovies(value);
        setExtResults(res.items ?? []);
      } catch { setExtResults([]); }
      setSearching(false);
    }, 400);
  }, []);

  // Cleanup debounce
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleRecommend = async (ext: ExternalMovieResult) => {
    if (!user?.id) return;
    try {
      await createMovie({
        title: ext.title || ext.originalTitle,
        year: ext.year ? Number(ext.year) : undefined,
        poster: ext.poster,
        synopsis: ext.overview,
        recommendedById: user.id,
      });
      setAddedTitle(ext.title || ext.originalTitle);
      setExtResults([]);
      setSearch('');
      revalidator.revalidate();
    } catch { /* ignore */ }
  };

  return (
    <Box>
      <TextField
        fullWidth
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="搜电影名、导演..."
        autoComplete="off"
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: searching ? (
            <InputAdornment position="end">
              <CircularProgress size={18} />
            </InputAdornment>
          ) : undefined,
        }}
      />
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button variant="contained" onClick={() => navigate('/discover/movie/add')} disabled={!user}>
          {user ? '添加电影' : '登录后可添加电影'}
        </Button>
        <Button variant="outlined" onClick={() => navigate('/discover/movie')}>查看全部电影</Button>
      </Stack>

      {/* External search results from TMDB */}
      {extResults.length > 0 && !addedTitle && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">搜索结果（来自 TMDB）</Typography>
            <Stack spacing={1.2} sx={{ mt: 1 }}>
              {extResults.map((m) => (
                <Stack key={m.tmdbId} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                    {m.poster ? (
                      <img src={m.poster} alt={m.title} style={{ width: 36, height: 52, borderRadius: 4, objectFit: 'cover' }} />
                    ) : (
                      <Poster title={m.title} w={36} h={52} />
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={700} noWrap>{m.title}</Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {m.year}{m.rating != null ? `  ⭐${m.rating}` : ''}
                      </Typography>
                      {m.originalTitle && m.originalTitle !== m.title && (
                        <Typography variant="caption" color="text.secondary" noWrap>{m.originalTitle}</Typography>
                      )}
                    </Box>
                  </Stack>
                  <Button
                    onClick={() => handleRecommend(m)}
                    variant="contained"
                    size="small"
                    disabled={!user}
                    sx={{ ml: 1, flexShrink: 0 }}
                  >
                    {user ? '推荐' : '登录'}
                  </Button>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {addedTitle && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography color="success.main" fontWeight={700}>✓ 已推荐「{addedTitle}」</Typography>
            <Typography variant="body2" color="text.secondary">电影已添加到候选列表</Typography>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1.5 }}>
        <Tab value="pool" label="候选中" />
        <Tab value="screened" label="已放映" />
      </Tabs>

      {tab === 'pool' && (
        filteredPool.length === 0 ? (
          <EmptyState
            icon="🎬"
            title="还没有推荐电影，来添加第一部！"
            description="搜索你喜欢的电影，推荐给大家一起看。"
            action={user ? { label: '添加电影', to: '/discover/movie/add' } : undefined}
          />
        ) : (
          <Grid container spacing={1.5}>
            {filteredPool.map((m) => (
              <Grid key={m.id} size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardActionArea onClick={() => navigate(`/discover/movies/${m.id}`)}>
                    <CardContent>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Poster title={m.title} w={40} h={56} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography fontWeight={700}>{m.title}</Typography>
                              <Typography variant="body2" color="text.secondary">{m.year}  {m.dir}</Typography>
                              <Typography variant="caption" color="text.secondary">{m.by} 推荐</Typography>
                            </Box>
                            <Button
                              onClick={(event) => {
                                event.stopPropagation();
                                toggle(m.id);
                              }}
                              variant={votes[m.id] ? 'contained' : 'outlined'}
                              size="small"
                              disabled={!user}
                            >
                              ▲ {m.v + (votes[m.id] && !m.voterIds.includes(user?.id ?? '') ? 1 : !votes[m.id] && m.voterIds.includes(user?.id ?? '') ? -1 : 0)}
                            </Button>
                          </Stack>
                          {m.status && <Chip sx={{ mt: 1 }} size="small" color="success" label={`✓ ${m.status}`} />}
                        </Box>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )
      )}

      {tab === 'screened' && (
        screened.length === 0 ? (
          <EmptyState
            icon="📽"
            title="还没有放映记录"
            description="电影放映后，记录会出现在这里。"
          />
        ) : (
          <Grid container spacing={1.5}>
            {screened.map((m: any, i: number) => {
              const match = pool.find((p: any) => p.title === m.title);
              return (
                <Grid key={i} size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardActionArea
                      onClick={() => match && navigate(`/discover/movies/${match.id}`)}
                      disabled={!match}
                    >
                      <CardContent>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Poster title={m.title} w={36} h={50} />
                          <Box>
                            <Typography fontWeight={700}>{m.title}</Typography>
                            <Typography variant="body2" color="text.secondary">{m.year}  {m.dir}</Typography>
                            <Typography variant="caption" color="text.secondary">{m.date}  {m.host} Host</Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )
      )}
    </Box>
  );
}

function BooksSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const data = useLoaderData() as DiscoverPageData;
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'pool' | 'read'>('pool');
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [snackMsg, setSnackMsg] = useState('');
  const toggle = (id: string) => {
    setVotes((v) => ({ ...v, [id]: !v[id] }));
    setSnackMsg('投票功能即将开放');
  };

  const q = search.toLowerCase();
  const filteredPool = q
    ? data.bookPool.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
    : data.bookPool;
  const filteredRead = q
    ? data.bookRead.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
    : data.bookRead;

  return (
    <Box>
      <TextField
        fullWidth
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜书名、作者..."
        autoComplete="off"
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button variant="contained" onClick={() => navigate('/discover/book/add')} disabled={!user}>
          {user ? '添加图书' : '登录后可添加图书'}
        </Button>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1.5 }}>
        <Tab value="pool" label="候选中" />
        <Tab value="read" label="已读完" />
      </Tabs>

      {tab === 'pool' && (
        filteredPool.length === 0 ? (
          <EmptyState
            icon="📖"
            title="还没有推荐图书，来添加第一本！"
            description="分享你喜欢的书，推荐给大家一起读。"
            action={user ? { label: '添加图书', to: '/discover/book/add' } : undefined}
          />
        ) : (
          <Grid container spacing={1.5}>
            {filteredPool.map((b) => (
              <Grid key={b.id} size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardActionArea onClick={() => navigate(`/discover/books/${b.id}`)}>
                    <CardContent>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Poster title={b.title} w={40} h={56} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography fontWeight={700}>{b.title}</Typography>
                              <Typography variant="body2" color="text.secondary">{b.year} · {b.author}</Typography>
                              <Typography variant="caption" color="text.secondary">{b.by} 推荐</Typography>
                            </Box>
                            <Button
                              onClick={(event) => {
                                event.stopPropagation();
                                toggle(b.id);
                              }}
                              variant={votes[b.id] ? 'contained' : 'outlined'}
                              size="small"
                              disabled={!user}
                            >
                              ▲ {b.v + (votes[b.id] ? 1 : 0)}
                            </Button>
                          </Stack>
                          {b.status && <Chip sx={{ mt: 1 }} size="small" color="success" label={`✓ ${b.status}`} />}
                        </Box>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )
      )}

      {tab === 'read' && (
        filteredRead.length === 0 ? (
          <EmptyState
            icon="📚"
            title="还没有已读记录"
            description="读书活动结束后，记录会出现在这里。"
          />
        ) : (
          <Grid container spacing={1.5}>
            {filteredRead.map((b, i) => (
              <Grid key={i} size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Poster title={b.title} w={36} h={50} />
                      <Box>
                        <Typography fontWeight={700}>{b.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{b.year} · {b.author}</Typography>
                        <Typography variant="caption" color="text.secondary">{b.date} · {b.host} Host</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )
      )}

      <Snackbar
        open={Boolean(snackMsg)}
        autoHideDuration={3000}
        onClose={() => setSnackMsg('')}
        message={snackMsg}
      />
    </Box>
  );
}
