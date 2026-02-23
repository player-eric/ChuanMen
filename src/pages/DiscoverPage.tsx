import { useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  InputAdornment,
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
import { moviePool, bookPool as bookPoolData } from '@/mock/data';

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
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'pool' | 'screened'>('pool');
  const [results, setResults] = useState(false);
  const [added, setAdded] = useState(false);
  const [votes, setVotes] = useState<Record<number, boolean>>({});
  const toggle = (id: number) => setVotes((v) => ({ ...v, [id]: !v[id] }));

  const { pool, screened } = data;

  return (
    <Box>
      <TextField
        fullWidth
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setResults(e.target.value.length > 1);
          setAdded(false);
        }}
        placeholder="搜电影名、导演..."
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
        <Button variant="contained" onClick={() => navigate('/discover/movie/add')} disabled={!user}>
          {user ? '添加电影' : '登录后可添加电影'}
        </Button>
        <Button variant="outlined" onClick={() => navigate('/discover/movie')}>查看全部电影</Button>
      </Stack>

      {results && !added && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">搜索结果</Typography>
            <Stack spacing={1.2} sx={{ mt: 1 }}>
          {[{ title: '重庆森林', year: '1994', dir: '王家卫', rating: '8.8' }, { title: '重庆', year: '2023', dir: '徐磊', rating: '6.2' }].map((m, i) => (
              <Stack key={i} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                <Box>
                  <Typography fontWeight={700}>{m.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{m.year} · {m.dir} · ⭐{m.rating}</Typography>
                </Box>
                <Button onClick={() => { if (i === 0) setAdded(true); }} variant="contained" size="small" disabled={!user}>
                  {user ? '推荐' : '登录后可推荐'}
                </Button>
              </Stack>
            ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {added && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography color="success.main" fontWeight={700}>✓ 已推荐「重庆森林」</Typography>
            <Typography variant="body2" color="text.secondary">信息已自动填好</Typography>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1.5 }}>
        <Tab value="pool" label="候选中" />
        <Tab value="screened" label="已放映" />
      </Tabs>

      {tab === 'pool' && (
        <Grid container spacing={1.5}>
          {pool.map((m) => (
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
                            <Typography variant="body2" color="text.secondary">{m.year} · {m.dir}</Typography>
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
                            ▲ {m.v + (votes[m.id] ? 1 : 0)}
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
      )}

      {tab === 'screened' && (
        <Grid container spacing={1.5}>
          {screened.map((m, i) => {
            const match = moviePool.find((p) => p.title === m.title);
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
                          <Typography variant="body2" color="text.secondary">{m.year} · {m.dir}</Typography>
                          <Typography variant="caption" color="text.secondary">{m.date} · {m.host} Host</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
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
  const [votes, setVotes] = useState<Record<number, boolean>>({});
  const toggle = (id: number) => setVotes((v) => ({ ...v, [id]: !v[id] }));

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
      )}

      {tab === 'read' && (
        <Grid container spacing={1.5}>
          {filteredRead.map((b, i) => {
            const match = bookPoolData.find((p) => p.title === b.title);
            return (
              <Grid key={i} size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardActionArea
                    onClick={() => match && navigate(`/discover/books/${match.id}`)}
                    disabled={!match}
                  >
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
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
