import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Autocomplete, Button, Card, CardContent, IconButton, Stack, TextField, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useAuth } from '@/auth/AuthContext';
import { createProposal, fetchMembersApi } from '@/lib/domainApi';
import { Ava } from '@/components/Atoms';

const RichTextEditor = lazy(() => import('@/components/RichTextEditor'));

export default function ProposalCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [descHtml, setDescHtml] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Admin: pick author on behalf of another member
  const isAdmin = user?.role === 'admin';
  const [members, setMembers] = useState<{ id: string; name: string; avatar: string | null }[]>([]);
  const [selectedAuthor, setSelectedAuthor] = useState<{ id: string; name: string; avatar: string | null } | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetchMembersApi().then((list) => {
      const mapped = (list as { id: string; name: string; avatar?: string | null }[]).map((m) => ({
        id: m.id,
        name: m.name,
        avatar: m.avatar ?? null,
      }));
      setMembers(mapped);
      if (user) {
        const me = mapped.find((m) => m.id === user.id);
        if (me) setSelectedAuthor(me);
      }
    });
  }, [isAdmin, user]);

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
        authorId: (isAdmin && selectedAuthor?.id) || user.id,
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
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={() => navigate('/events')} size="small"><ArrowBackRoundedIcon /></IconButton>
            <Typography variant="h5" fontWeight={700}>添加创意</Typography>
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}

          {isAdmin && (
            <Autocomplete
              options={members}
              value={selectedAuthor}
              onChange={(_, v) => setSelectedAuthor(v)}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Ava name={option.name} src={option.avatar ?? undefined} size={24} />
                    <span>{option.name}</span>
                  </Stack>
                </li>
              )}
              renderInput={(params) => <TextField {...params} label="代谁发" />}
            />
          )}

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
