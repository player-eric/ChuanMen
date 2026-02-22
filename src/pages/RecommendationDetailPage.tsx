import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { getRecommendationById, type RecommendationCategory } from '@/lib/domainApi';

function isCategory(value: string | undefined): value is RecommendationCategory {
  return value === 'movie' || value === 'recipe' || value === 'music' || value === 'place';
}

export default function RecommendationDetailPage() {
  const navigate = useNavigate();
  const { category, recommendationId } = useParams();
  const currentCategory = isCategory(category) ? category : 'movie';

  const [item, setItem] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!recommendationId) return;

    const run = async () => {
      try {
        const data = await getRecommendationById(recommendationId);
        setItem(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
      }
    };

    void run();
  }, [recommendationId]);

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!item) {
    return <Typography color="text.secondary">加载中...</Typography>;
  }

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight={700}>{String(item.title ?? '')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {String(item.description ?? '')}
          </Typography>
          {!!item.sourceUrl && (
            <Button sx={{ mt: 1 }} size="small" href={String(item.sourceUrl)} target="_blank" rel="noreferrer">
              打开来源链接
            </Button>
          )}
          <Typography variant="body2" sx={{ mt: 1 }}>投票数：{Number(item.voteCount ?? 0)}</Typography>
        </CardContent>
      </Card>

      <Button variant="outlined" onClick={() => navigate(`/discover/${currentCategory}`)}>
        返回列表
      </Button>
    </Stack>
  );
}
