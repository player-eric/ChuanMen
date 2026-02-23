import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { createProposal } from '@/lib/domainApi';

const RichTextEditor = lazy(() => import('@/components/RichTextEditor'));

export default function ProposalCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [descHtml, setDescHtml] = useState('');
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

  const onSubmit = async () => {
    if (!user?.id) {
      setError('请先登录后再提交创意');
      return;
    }
    if (!title.trim()) {
      setError('请填写创意标题');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await createProposal({
        title: title.trim(),
        description: descHtml,
        authorId: user.id,
      });
      navigate('/events');
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={700}>添加创意</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="创意标题" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          <div>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>创意描述</Typography>
            <Suspense fallback={<div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>加载编辑器...</div>}>
              <RichTextEditor content={descHtml} onChange={setDescHtml} placeholder="描述你的活动创意..." />
            </Suspense>
          </div>
          <Button variant="contained" onClick={onSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '提交创意'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
