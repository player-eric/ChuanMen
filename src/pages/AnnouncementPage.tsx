import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { marked } from 'marked';
import { fetchAnnouncementByIdApi } from '@/lib/domainApi';

export default function AnnouncementPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<{ title: string; body: string; type: string; createdAt: string; author?: { name: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) { setLoading(false); setError(true); return; }
    fetchAnnouncementByIdApi(slug)
      .then((res: any) => {
        if (res?.title) setData(res);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  if (error || !data) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
        <Typography variant="h6">未找到该公告</Typography>
        <Button variant="outlined" onClick={() => navigate('/')}>
          返回首页
        </Button>
      </Stack>
    );
  }

  const dateStr = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const bodyHtml = marked.parse(data.body) as string;

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Chip label={data.type || '公告'} size="small" color="primary" variant="outlined" />
            {dateStr && (
              <Typography variant="caption" color="text.secondary">
                {dateStr}
              </Typography>
            )}
            {data.author?.name && (
              <Typography variant="caption" color="text.secondary">
                · {data.author.name}
              </Typography>
            )}
          </Stack>
          <Typography variant="h5" fontWeight={700}>
            {data.title}
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box
            sx={{
              '& h1, & h2, & h3': { mt: 2, mb: 1, fontWeight: 700 },
              '& p': { mb: 1.5, color: 'text.secondary', lineHeight: 1.8 },
              '& ul, & ol': { pl: 3, mb: 1.5, color: 'text.secondary' },
              '& li': { mb: 0.5 },
              '& blockquote': { borderLeft: '3px solid', borderColor: 'divider', pl: 2, ml: 0, fontStyle: 'italic', color: 'text.secondary' },
              '& a': { color: 'primary.main' },
            }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </CardContent>
      </Card>

      <Box textAlign="center">
        <Button variant="text" onClick={() => navigate('/')}>
          ← 返回动态
        </Button>
      </Box>
    </Stack>
  );
}
