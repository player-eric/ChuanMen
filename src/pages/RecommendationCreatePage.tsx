import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { createRecommendation, type RecommendationCategory } from '@/lib/domainApi';

const categoryMap: Record<RecommendationCategory, string> = {
  movie: '电影',
  recipe: '菜谱',
  music: '音乐',
  place: '好店',
};

function isCategory(value: string | undefined): value is RecommendationCategory {
  return value === 'movie' || value === 'recipe' || value === 'music' || value === 'place';
}

export default function RecommendationCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { category } = useParams();
  const currentCategory = isCategory(category) ? category : 'movie';
  const categoryName = useMemo(() => categoryMap[currentCategory], [currentCategory]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

      const recommendation = await createRecommendation({
        category: currentCategory,
        title: title.trim(),
        description: description.trim(),
        sourceUrl: sourceUrl.trim(),
        tags,
        authorId: user.id,
      });

      navigate(`/discover/${currentCategory}/${String(recommendation._id)}`);
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
          <Typography variant="h5" fontWeight={700}>添加{categoryName}</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="标题" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          <TextField label="描述" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={4} fullWidth />
          <TextField label="链接（可选）" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} fullWidth />
          <TextField label="标签（逗号分隔）" value={tagsText} onChange={(e) => setTagsText(e.target.value)} fullWidth />
          <Button variant="contained" onClick={onSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '发布推荐'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
