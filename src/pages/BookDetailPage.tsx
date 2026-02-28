import { useEffect, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import type { EventComment, BookDetailData, BookPool } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { posters } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { addComment, fetchCommentsApi, toggleRecommendationVote, updateRecommendation } from '@/lib/domainApi';
import { RichTextViewer } from '@/components/RichTextEditor';
import { firstNonEmoji } from '@/components/Atoms';

export default function BookDetailPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const c = useColors();
  const raw = useLoaderData() as BookDetailData | BookPool | null;
  const [voted, setVoted] = useState(() => {
    if (!user?.id || !raw) return false;
    const voters = (raw as any).voterIds ?? (raw as any).voters ?? [];
    return Array.isArray(voters) && voters.includes(user.id);
  });
  const [comments, setComments] = useState<EventComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [editingLink, setEditingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  useEffect(() => {
    const bookId = raw && 'id' in raw ? (raw as any).id : null;
    if (!bookId) return;
    fetchCommentsApi('recommendation', String(bookId)).then((list) => {
      if (Array.isArray(list)) {
        setComments(list.map((c: any) => ({ name: c.author?.name ?? '匿名', text: c.content ?? '', date: c.createdAt ? new Date(c.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '' })));
      }
    }).catch(() => {});
  }, [raw]);

  if (!raw) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">书籍不存在</Typography>
          <Button sx={{ mt: 1 }} onClick={() => navigate('/discover')}>返回推荐页</Button>
        </CardContent>
      </Card>
    );
  }

  const isDetail = 'voters' in raw;
  const book = raw as BookDetailData;
  const basic = raw as BookPool;
  const title = isDetail ? book.title : basic.title;
  const year = isDetail ? book.year : basic.year;
  const author = isDetail ? book.author : basic.author;
  const by = isDetail ? book.by : basic.by;
  const status = isDetail ? book.status : basic.status;
  const v = isDetail ? book.v : basic.v;
  const authorId = (raw as any).authorId ?? '';
  const bookId = (raw as any).id ?? '';

  const canEditLink = user && (
    (authorId && authorId === user.id) || user.role === 'admin'
  );

  useEffect(() => {
    setSourceUrl((raw as any).sourceUrl ?? '');
  }, [raw]);

  // Poster gradient data
  const poster = posters[title] || { bg: `linear-gradient(135deg, ${c.s3}, ${c.s2})`, accent: c.text3, sub: '' };

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      <Stack spacing={2}>
        <IconButton onClick={() => navigate('/discover')} size="small" sx={{ alignSelf: 'flex-start' }}><ArrowBackRoundedIcon /></IconButton>
        {/* 1. Hero Poster Header */}
        <Card sx={{ overflow: 'hidden' }}>
          <Box
            sx={{
              position: 'relative',
              height: 280,
              background: poster.bg,
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.7) 100%)',
              }}
            />
            <Box sx={{ position: 'absolute', bottom: 20, left: 20, right: 20, zIndex: 1 }}>
              <Typography
                variant="h4"
                fontWeight={800}
                sx={{
                  color: poster.accent,
                  textShadow: '0 2px 12px rgba(0,0,0,0.6)',
                  lineHeight: 1.2,
                }}
              >
                {title}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255,255,255,0.6)',
                  mt: 0.5,
                  textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                }}
              >
                {year} · {author}
              </Typography>
              {poster.sub && (
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255,255,255,0.35)', display: 'block', mt: 0.25 }}
                >
                  {poster.sub}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Chips bar below hero */}
          <CardContent sx={{ pt: 1.5, pb: 1.5 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {isDetail && book.genre && <Chip size="small" variant="outlined" label={book.genre} />}
              {isDetail && book.pages && <Chip size="small" variant="outlined" label={book.pages} />}
              {isDetail && book.rating && <Chip size="small" variant="outlined" label={`⭐ ${book.rating}`} />}
              {status && <Chip size="small" color="success" label={`✓ ${status}`} />}
              {sourceUrl && !editingLink && (
                <Chip size="small" variant="outlined" label="🔗 查看链接" clickable
                  component="a" href={sourceUrl} target="_blank" rel="noreferrer" />
              )}
              {canEditLink && !editingLink && (
                <Chip size="small" variant="outlined"
                  label={sourceUrl ? '编辑链接' : '+ 添加链接'}
                  onClick={() => { setLinkDraft(sourceUrl); setEditingLink(true); }}
                />
              )}
            </Stack>
            {editingLink && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <TextField size="small" fullWidth placeholder="https://..." value={linkDraft}
                  onChange={(e) => setLinkDraft(e.target.value)} />
                <Button size="small" variant="contained" disabled={linkDraft === sourceUrl}
                  onClick={async () => {
                    if (!user?.id || !bookId) return;
                    try {
                      await updateRecommendation(bookId, user.id, { sourceUrl: linkDraft });
                      setSourceUrl(linkDraft);
                      setEditingLink(false);
                    } catch { /* ignore */ }
                  }}>保存</Button>
                <Button size="small" onClick={() => setEditingLink(false)}>取消</Button>
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* 2. Synopsis */}
        {isDetail && book.synopsis && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>简介</Typography>
              <RichTextViewer html={book.synopsis} />
            </CardContent>
          </Card>
        )}

        {/* 3. Recommender */}
        <Card>
          <CardActionArea onClick={() => navigate(`/members/${encodeURIComponent(by)}`)}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>推荐人</Typography>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ width: 36, height: 36 }}>{by[0]}</Avatar>
                <Typography variant="body1">{by}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto !important' }}>查看主页 →</Typography>
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>

        {/* 4. Vote + Voters */}
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                投票 ({v + (voted ? 1 : 0)})
              </Typography>
              <Button
                variant={voted ? 'contained' : 'outlined'}
                size="small"
                onClick={async () => {
                  setVoted(!voted);
                  if (user?.id && bookId) {
                    try { await toggleRecommendationVote(bookId, user.id); } catch { /* optimistic */ }
                  }
                }}
              >
                ▲ {voted ? '已投票' : '我想读'}
              </Button>
            </Stack>
            {isDetail && book.voters.length > 0 && (
              <AvatarGroup max={10} sx={{ justifyContent: 'flex-start' }}>
                {book.voters.map((name) => (
                  <Avatar
                    key={name}
                    sx={{ width: 32, height: 32, cursor: 'pointer' }}
                    onClick={() => navigate(`/members/${encodeURIComponent(name)}`)}
                  >
                    {firstNonEmoji(name)}
                  </Avatar>
                ))}
              </AvatarGroup>
            )}
          </CardContent>
        </Card>

        {/* 5. Reading history (discussions) */}
        {isDetail && book.discussions.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>阅读记录</Typography>
              <Stack spacing={1}>
                {book.discussions.map((item, i) => (
                  <Card key={i} variant="outlined">
                    <CardActionArea
                      onClick={() => item.eventId && navigate(`/events/${item.eventId}`)}
                      disabled={!item.eventId}
                    >
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="body2" fontWeight={600}>{item.eventTitle}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.date} · {item.host} Host
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* 6. Comments */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              💬 讨论 ({comments.length})
            </Typography>
            {comments.length > 0 && (
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                {comments.map((cm, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                    <Avatar
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
                      <Typography variant="body2" color="text.secondary">{cm.text}</Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            )}
            {user ? (
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Avatar sx={{ width: 28, height: 28, fontSize: 12, mt: 0.5 }}>
                  {firstNonEmoji(user.name ?? 'U')}
                </Avatar>
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="说点什么..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && !e.shiftKey && commentText.trim()) {
                      e.preventDefault();
                      const text = commentText.trim();
                      setComments((prev) => [...prev, { name: user.name ?? '我', text, date: '刚刚' }]);
                      setCommentText('');
                      const bookId = raw && 'id' in raw ? (raw as any).id : null;
                      if (bookId && user.id) {
                        try { await addComment({ entityType: 'recommendation', entityId: String(bookId), authorId: user.id, content: text }); } catch { /* optimistic */ }
                      }
                    }
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  disabled={!commentText.trim()}
                  onClick={async () => {
                    if (commentText.trim()) {
                      const text = commentText.trim();
                      setComments((prev) => [...prev, { name: user.name ?? '我', text, date: '刚刚' }]);
                      setCommentText('');
                      const bookId = raw && 'id' in raw ? (raw as any).id : null;
                      if (bookId && user.id) {
                        try { await addComment({ entityType: 'recommendation', entityId: String(bookId), authorId: user.id, content: text }); } catch { /* optimistic */ }
                      }
                    }
                  }}
                  sx={{ mt: 0.5 }}
                >
                  发送
                </Button>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">登录后可参与讨论</Typography>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
