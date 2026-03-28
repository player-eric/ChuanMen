import { useEffect, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { Autocomplete, Box, Button, Card, CardContent, Chip, IconButton, Stack, TextField, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import type { Proposal } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { useColors } from '@/hooks/useColors';
import { Ava, AvaStack } from '@/components/Atoms';
import { FeedActions } from '@/components/FeedItems';
import { RichTextViewer } from '@/components/RichTextEditor';
import { toggleProposalVote, updateProposal, fetchMembersApi } from '@/lib/domainApi';

export default function ProposalDetailPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const c = useColors();
  const raw = useLoaderData() as Proposal | null;

  const serverList: { name: string; avatar?: string }[] = (raw?.interested ?? []).map((v: any) =>
    typeof v === 'string' ? { name: v } : v,
  );
  const [interested, setInterested] = useState(
    () => !!user?.name && serverList.some((v) => v.name === user.name)
  );
  const [editing, setEditing] = useState(false);
  const [descHtml, setDescHtml] = useState(raw?.descriptionHtml ?? '');
  const authorAvatar = (raw as any)?.authorAvatar ?? '';

  // Build display list: add/remove current user optimistically
  const interestedList = (() => {
    const base = serverList.filter((v) => v.name !== user?.name);
    if (interested && user?.name) base.push({ name: user.name, avatar: user.avatar ?? '' });
    return base;
  })();

  if (!raw) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">创意不存在</Typography>
          <Button sx={{ mt: 1 }} onClick={() => navigate('/events')}>返回活动页</Button>
        </CardContent>
      </Card>
    );
  }

  const isAuthor = user?.id === raw.authorId || user?.name === raw.name;
  const isAdmin = user?.role === 'admin';
  const canEdit = isAuthor || isAdmin;
  const canEditStatus = isAuthor || isAdmin;

  // Admin: change author
  const [members, setMembers] = useState<{ id: string; name: string; avatar: string | null }[]>([]);
  const [editAuthor, setEditAuthor] = useState<{ id: string; name: string; avatar: string | null } | null>(null);
  const [authorName, setAuthorName] = useState(raw.name);

  useEffect(() => {
    if (!isAdmin) return;
    fetchMembersApi().then((list) => {
      const mapped = (list as { id: string; name: string; avatar?: string | null }[]).map((m) => ({
        id: m.id, name: m.name, avatar: m.avatar ?? null,
      }));
      setMembers(mapped);
      const current = mapped.find((m) => m.id === raw.authorId);
      if (current) setEditAuthor(current);
    });
  }, [isAdmin, raw.authorId]);
  const [status, setStatus] = useState(raw?.status ?? 'discussing');
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  const handleToggleInterest = async () => {
    if (!user?.id) return;
    const wasInterested = interested;
    setInterested((v) => !v);
    try { await toggleProposalVote(String(raw.id), user.id); } catch { setInterested(wasInterested); }
  };

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      <Stack spacing={2}>
        <IconButton onClick={() => navigate('/events')} size="small" sx={{ alignSelf: 'flex-start' }}><ArrowBackRoundedIcon /></IconButton>
        {/* 1. Hero Header */}
        <Card sx={{ overflow: 'hidden' }}>
          <Box
            sx={{
              position: 'relative',
              py: 4,
              px: 3,
              background: `linear-gradient(135deg, ${c.warm}18, ${c.warm}08)`,
            }}
          >
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1.5 }}>
              {'💡'} {raw.title}
            </Typography>
            {/* Status chips */}
            <Stack direction="row" spacing={0.75} sx={{ mb: 1.5 }}>
              {([['discussing', '讨论中'], ['scheduled', '已排期'], ['completed', '已完成'], ['cancelled', '已取消']] as const).map(([key, label]) => (
                <Chip
                  key={key}
                  label={label}
                  size="small"
                  color={status === key ? ({ discussing: 'warning', scheduled: 'success', completed: 'default', cancelled: 'error' } as const)[key] : 'default'}
                  variant={status === key ? 'filled' : 'outlined'}
                  clickable={canEditStatus}
                  onClick={canEditStatus ? async () => {
                    setStatus(key);
                    try { await updateProposal(String(raw.id), { status: key }); } catch { setStatus(status); }
                  } : undefined}
                  sx={!canEditStatus && status !== key ? { display: 'none' } : undefined}
                />
              ))}
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Ava name={authorName} src={authorAvatar} size={36} onTap={() => goMember(authorName)} />
              <Box>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => goMember(authorName)}
                >
                  {authorName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {raw.time}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Card>

        {/* 2. Description */}
        {(descHtml || canEdit) && (
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>创意描述</Typography>
                {canEdit && (
                  <Button
                    size="small"
                    onClick={async () => {
                      if (editing) {
                        const payload: Parameters<typeof updateProposal>[1] = { description: descHtml };
                        if (isAdmin && editAuthor) {
                          payload.authorId = editAuthor.id;
                          setAuthorName(editAuthor.name);
                        }
                        try { await updateProposal(String(raw.id), payload); } catch { /* ignore */ }
                        setEditing(false);
                      } else {
                        setEditing(true);
                      }
                    }}
                  >
                    {editing ? '保存' : '编辑'}
                  </Button>
                )}
              </Stack>

              {editing && isAdmin && (
                <Autocomplete
                  options={members}
                  value={editAuthor}
                  onChange={(_, v) => setEditAuthor(v)}
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
                  renderInput={(params) => <TextField {...params} label="发起人" />}
                  sx={{ mb: 2 }}
                />
              )}

              {editing ? (
                <EditorLazy content={descHtml} onChange={setDescHtml} />
              ) : (
                <RichTextViewer html={descHtml} />
              )}
            </CardContent>
          </Card>
        )}

        {/* 3. Interested People */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              感兴趣的人 ({interestedList.length})
            </Typography>

            {interestedList.length > 0 && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <AvaStack names={interestedList.map((v) => ({ name: v.name, avatar: v.avatar }))} size={28} />
                <Typography variant="body2" color="text.secondary">
                  {interestedList.slice(0, 3).map((v) => v.name).join('、')}{interestedList.length > 3 ? ` 等 ${interestedList.length} 人` : ''}
                </Typography>
              </Stack>
            )}

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <button
                onClick={handleToggleInterest}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  background: interested ? c.blue + '15' : c.s2,
                  border: `1px solid ${interested ? c.blue + '40' : c.line}`,
                  color: !user ? c.text3 : interested ? c.blue : c.text2,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: user ? 'pointer' : 'default',
                  opacity: user ? 1 : 0.5,
                }}
              >
                {interested ? '✓ 取消感兴趣' : '我感兴趣'}
              </button>
              <button
                onClick={() => user && navigate('/events/new', { state: { fromProposal: { id: String(raw.id), title: raw.title, descriptionHtml: descHtml } } })}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  background: c.warm,
                  border: 'none',
                  color: c.bg,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: user ? 'pointer' : 'default',
                  opacity: user ? 1 : 0.5,
                }}
              >
                🏠 我来组织
              </button>
            </Stack>
          </CardContent>
        </Card>

        {/* 4. Like + Comment bar */}
        <Card>
          <FeedActions
            likes={raw.likes ?? 0}
            likedBy={raw.likedBy ?? []}
            comments={raw.comments ?? []}
            entityType="proposal"
            entityId={String(raw.id)}
            defaultExpanded
            liked={interested}
            onLike={handleToggleInterest}
          />
        </Card>
      </Stack>
    </Box>
  );
}

/* ═══ Lazy-loaded editor to avoid loading Tiptap in read-only view ═══ */
import { lazy, Suspense } from 'react';
const RichTextEditorLazy = lazy(() => import('@/components/RichTextEditor'));

function EditorLazy({ content, onChange }: { content: string; onChange: (html: string) => void }) {
  return (
    <Suspense fallback={<div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>加载编辑器...</div>}>
      <RichTextEditorLazy content={content} onChange={onChange} placeholder="描述你的活动创意..." />
    </Suspense>
  );
}
