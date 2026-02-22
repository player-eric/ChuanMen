import { useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import type { DiscoverPageData } from '@/types';

/* ═══ DiscoverPage ═══ */
export default function DiscoverPage() {
  const navigate = useNavigate();
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto', pb: 0.5 }}>
        {[
          { key: 'movie', label: '🎬 电影', active: true },
          { key: 'recipe', label: '🍜 菜谱', active: false },
          { key: 'music', label: '🎵 音乐', active: false },
          { key: 'place', label: '📍 好店', active: false },
        ].map((cat) => (
          <Chip
            key={cat.key}
            label={cat.label}
            color={cat.active ? 'primary' : 'default'}
            variant={cat.active ? 'filled' : 'outlined'}
            clickable
            onClick={() => navigate(`/discover/${cat.key}`)}
            sx={{ opacity: cat.active ? 1 : 0.65 }}
          />
        ))}
      </Stack>
      <MoviesSection />
    </Box>
  );
}

function MoviesSection() {
  const navigate = useNavigate();
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
        <Button variant="contained" onClick={() => navigate('/discover/movie/add')}>添加电影</Button>
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
                <Button onClick={() => { if (i === 0) setAdded(true); }} variant="contained" size="small">推荐</Button>
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
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography fontWeight={700} sx={{ cursor: 'pointer' }} onClick={() => navigate(`/discover/movies/${m.id}`)}>{m.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{m.year} · {m.dir}</Typography>
                      <Typography variant="caption" color="text.secondary">{m.by} 推荐</Typography>
                    </Box>
                    <Button
                      onClick={() => toggle(m.id)}
                      variant={votes[m.id] ? 'contained' : 'outlined'}
                      size="small"
                    >
                      ▲ {m.v + (votes[m.id] ? 1 : 0)}
                    </Button>
                  </Stack>
                  {m.status && <Chip sx={{ mt: 1 }} size="small" color="success" label={`✓ ${m.status}`} />}
                  <Button sx={{ mt: 1 }} size="small" onClick={() => navigate(`/discover/movies/${m.id}`)}>查看电影详情</Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 'screened' && (
        <Grid container spacing={1.5}>
          {screened.map((m, i) => (
            <Grid key={i} size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography fontWeight={700}>{m.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{m.year} · {m.dir}</Typography>
                  <Typography variant="caption" color="text.secondary">{m.date} · {m.host} Host</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
