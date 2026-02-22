import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { createProposal } from '@/lib/domainApi';

export default function ProposalCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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
      setError('请先登录后再提交想法');
      return;
    }
    if (!title.trim()) {
      setError('请填写想法标题');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await createProposal({
        title: title.trim(),
        description: description.trim(),
        authorId: user.id,
      });
      navigate('/events/proposals');
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
          <Typography variant="h5" fontWeight={700}>添加想法</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="想法标题" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          <TextField
            label="想法描述"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={4}
            fullWidth
          />
          <Button variant="contained" onClick={onSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '提交想法'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
