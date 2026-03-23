import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { fetchCommentsApi, addComment, fetchMembersApi } from '@/lib/domainApi';
import RichTextEditor, { RichTextViewer, type MentionMember } from '@/components/RichTextEditor';
import { firstNonEmoji } from '@/components/Atoms';

interface CommentSectionProps {
  entityType: string;
  entityId: string;
}

interface CommentItem {
  name: string;
  avatar?: string;
  html: string;
  date: string;
}

function isEmptyHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').trim().length === 0;
}

export default function CommentSection({ entityType, entityId }: CommentSectionProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [members, setMembers] = useState<MentionMember[]>([]);
  const [canSend, setCanSend] = useState(false);
  const editorRef = useRef<{ clear: () => void; getHTML: () => string; insertImage: (src: string) => void } | null>(null);

  // Load comments
  useEffect(() => {
    if (!entityId) return;
    fetchCommentsApi(entityType, entityId)
      .then((list) => {
        if (Array.isArray(list)) {
          setComments(
            list.map((c: any) => ({
              name: c.author?.name ?? '匿名',
              avatar: c.author?.avatar ?? undefined,
              html: c.content ?? '',
              date: c.createdAt
                ? new Date(c.createdAt).toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })
                : '',
            })),
          );
        }
      })
      .catch(() => {});
  }, [entityType, entityId]);

  // Load members for @mention
  useEffect(() => {
    fetchMembersApi()
      .then((list) => {
        if (Array.isArray(list)) {
          setMembers(
            list
              .filter((m: any) => m.userStatus === 'approved')
              .sort((a: any, b: any) => {
                const ta = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
                const tb = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
                return tb - ta;
              })
              .map((m: any) => ({
                id: m.id,
                name: m.name ?? '',
                avatar: m.avatar ?? undefined,
              })),
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleSend = async () => {
    const html = editorRef.current?.getHTML() ?? '';
    if (!user?.id || !entityId || isEmptyHtml(html)) return;
    // Optimistic update
    setComments((prev) => [...prev, { name: user.name ?? '我', html, date: '刚刚' }]);
    editorRef.current?.clear();
    setCanSend(false);
    try {
      await addComment({
        entityType,
        entityId,
        authorId: user.id,
        content: html,
      });
    } catch {
      setComments((prev) => prev.slice(0, -1));
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
          💬 讨论 ({comments.length})
        </Typography>

        {/* Comment list */}
        {comments.length > 0 ? (
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            {comments.map((cm, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                <Avatar
                  src={cm.avatar}
                  sx={{ width: 28, height: 28, fontSize: 12, cursor: 'pointer', mt: 0.25 }}
                  onClick={() => navigate(`/members/${encodeURIComponent(cm.name)}`)}
                >
                  {firstNonEmoji(cm.name)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="baseline">
                    <Typography variant="body2" fontWeight={700}>{cm.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{cm.date}</Typography>
                  </Stack>
                  <RichTextViewer html={cm.html} />
                </Box>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            暂无讨论，来说点什么吧！
          </Typography>
        )}

        {/* Input */}
        {user ? (
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Avatar src={user.avatar || undefined} sx={{ width: 28, height: 28, fontSize: 12, mt: 0.5 }}>
              {firstNonEmoji(user.name ?? 'U')}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <RichTextEditor
                content=""
                onChange={(html) => setCanSend(!isEmptyHtml(html))}
                placeholder="说点什么... 输入 @ 提及成员"
                members={members}
                editorRef={editorRef}
              />
            </Box>
            <Button
              variant="contained"
              size="small"
              disabled={!canSend}
              onClick={handleSend}
              sx={{ mt: 0.5 }}
            >
              发送
            </Button>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            登录后可参与讨论
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
