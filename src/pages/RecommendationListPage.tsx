import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import type { RecommendationCategory } from '@/lib/domainApi';
import { searchRecommendations } from '@/lib/domainApi';
import { useAuth } from '@/auth/AuthContext';
import { Poster } from '@/components/Poster';

const categoryMap: Record<RecommendationCategory, { title: string; icon: string }> = {
  movie: { title: '电影推荐', icon: '🎬' },
  book: { title: '图书推荐', icon: '📚' },
  recipe: { title: '菜谱推荐', icon: '🍜' },
  music: { title: '音乐推荐', icon: '🎵' },
  place: { title: '好店推荐', icon: '📍' },
  external_event: { title: '演出和其他', icon: '🎭' },
};

function isCategory(value: string | undefined): value is RecommendationCategory {
  return value === 'movie' || value === 'book' || value === 'recipe' || value === 'music' || value === 'place' || value === 'external_event';
}

export default function RecommendationListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { category } = useParams();
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentCategory = isCategory(category) ? category : 'movie';
  const meta = useMemo(() => categoryMap[currentCategory], [currentCategory]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await searchRecommendations(currentCategory, keyword.trim());
        setItems(result.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : '搜索失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [currentCategory, keyword]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto' }}>
        {(['movie', 'recipe', 'music', 'place', 'external_event'] as RecommendationCategory[]).map((cat) => (
          <Button
            key={cat}
            variant={cat === currentCategory ? 'contained' : 'outlined'}
            onClick={() => navigate(`/discover/${cat}`)}
          >
            {categoryMap[cat].icon} {categoryMap[cat].title}
          </Button>
        ))}
      </Stack>

      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight={700}>{meta.icon} {meta.title}</Typography>
          <TextField
            sx={{ mt: 2 }}
            fullWidth
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={`搜索${meta.title}`}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            sx={{ mt: 1.5 }}
            component={RouterLink}
            to={`/discover/${currentCategory}/add`}
            variant="contained"
            disabled={!user}
          >
            {user ? `添加${meta.title.replace('推荐', '')}` : `登录后可添加${meta.title.replace('推荐', '')}`}
          </Button>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}
      {loading && <Typography color="text.secondary">加载中...</Typography>}

      {!loading && items.length === 0 && <Typography color="text.secondary">暂无数据</Typography>}

      <Stack spacing={1.5}>
        {items.map((item) => {
          const title = String(item.title ?? '');
          const itemId = String(item._id ?? item.id ?? '');
          const href = currentCategory === 'movie'
            ? `/discover/movies/${itemId}`
            : `/discover/${currentCategory}/${itemId}`;
          return (
            <Card key={String(item._id)}>
              <CardActionArea onClick={() => navigate(href)}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    {currentCategory === 'movie' && (
                      <Poster title={title} w={40} h={56} />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={700}>{title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {String(item.description ?? '')}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}
