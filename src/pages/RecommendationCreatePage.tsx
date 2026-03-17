import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useAuth } from '@/auth/AuthContext';
import { createRecommendation, createMovie, type RecommendationCategory } from '@/lib/domainApi';
import { ImageUpload } from '@/components/ImageUpload';

const categoryMap: Record<string, string> = {
  movie: '电影',
  book: '图书',
  recipe: '菜谱',
  music: '音乐',
  place: '好店',
  external_event: '演出与展览',
};

function isCategory(value: string | undefined): value is RecommendationCategory {
  return value === 'movie' || value === 'book' || value === 'recipe' || value === 'music' || value === 'place' || value === 'external_event';
}

export default function RecommendationCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { category } = useParams();
  const currentCategory = isCategory(category) ? category : 'book';
  const categoryName = useMemo(() => categoryMap[currentCategory], [currentCategory]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [navigate, user]);

  if (!user) {
    return null;
  }

  const isBook = currentCategory === 'book';

  const onSubmit = async () => {
    if (!user?.id) {
      setError('请先登录后再发布推荐');
      return;
    }
    if (!title.trim()) {
      setError(`请填写${categoryName}标题`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const tags = tagsText
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      if (currentCategory === 'movie') {
        const movie = await createMovie({
          title: title.trim(),
          synopsis: description.trim(),
          recommendedById: user.id,
        });
        navigate(`/discover/movies/${String((movie as any).id ?? '')}`);
      } else {
        const recommendation = await createRecommendation({
          category: currentCategory,
          title: title.trim(),
          description: description.trim(),
          sourceUrl: sourceUrl.trim(),
          coverUrl: coverUrl || undefined,
          tags,
          authorId: user.id,
        });
        navigate(`/discover/${currentCategory}/${String((recommendation as any).id ?? '')}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '发布失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={() => navigate('/discover')} size="small"><ArrowBackRoundedIcon /></IconButton>
            <Typography variant="h5" fontWeight={700}>添加{categoryName}</Typography>
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField label="标题" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth placeholder={isBook ? '书名' : undefined} />
          <TextField label="描述" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={4} fullWidth placeholder={isBook ? '作者、推荐理由…' : undefined} />

          {/* Link field */}
          <TextField label={isBook ? '豆瓣/商品链接（可选）' : '链接（可选）'} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} fullWidth />

          <TextField label="标签（逗号分隔）" value={tagsText} onChange={(e) => setTagsText(e.target.value)} fullWidth />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>封面图（可选）</Typography>
            <ImageUpload
              value={coverUrl}
              onChange={setCoverUrl}
              category="recommendation"
              ownerId={user.id}
              width="100%"
              height={160}
              shape="rect"
              maxSize={10 * 1024 * 1024}
            />
          </Box>

          <Button variant="contained" onClick={onSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '发布推荐'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
