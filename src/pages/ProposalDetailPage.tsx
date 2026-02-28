import { useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import type { Proposal } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { useColors } from '@/hooks/useColors';
import { Ava, AvaStack } from '@/components/Atoms';
import { FeedActions } from '@/components/FeedItems';
import { RichTextViewer } from '@/components/RichTextEditor';
import { toggleProposalVote, updateProposal } from '@/lib/domainApi';

export default function ProposalDetailPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const c = useColors();
  const raw = useLoaderData() as Proposal | null;

  const interestedList = raw?.interested ?? [];
  const [interested, setInterested] = useState(
    () => !!user?.name && interestedList.includes(user.name)
  );
  const [editing, setEditing] = useState(false);
  const [descHtml, setDescHtml] = useState(raw?.descriptionHtml ?? '');

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

  const isAuthor = user?.name === raw.name;
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
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Ava name={raw.name} size={36} onTap={() => goMember(raw.name)} />
              <Box>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => goMember(raw.name)}
                >
                  {raw.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {raw.time}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Card>

        {/* 2. Description */}
        {(descHtml || isAuthor) && (
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>创意描述</Typography>
                {isAuthor && (
                  <Button
                    size="small"
                    onClick={async () => {
                      if (editing) {
                        try { await updateProposal(String(raw.id), { description: descHtml }); } catch { /* ignore */ }
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
              感兴趣的人 ({interestedList.length + (interested ? 1 : 0)})
            </Typography>

            {interestedList.length > 0 && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <AvaStack names={interestedList} size={28} />
                <Typography variant="body2" color="text.secondary">
                  {interestedList.slice(0, 3).join('、')}{interestedList.length > 3 ? ` 等 ${interestedList.length} 人` : ''}
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
                {interested ? '✓ 取消感兴趣' : '我感兴趣'} · {raw.votes + (interested ? 1 : 0)}
              </button>
              <button
                onClick={() => user && navigate('/events/new', { state: { fromProposal: { title: raw.title, descriptionHtml: descHtml } } })}
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
