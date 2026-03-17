import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import { useColors } from '@/hooks/useColors';
import { Ava } from '@/components/Atoms';
import { Poster } from '@/components/Poster';
import {
  submitDailyAnswer,
  fetchRandomDailyQuestion,
  searchRecommendations,
  searchExternalMovies,
  searchExternalBooks,
  searchExternalMusic,
  createRecommendation,
  createMovie,
  toggleRecommendationVote,
  type ExternalMovieResult,
  type ExternalBookResult,
  type ExternalMusicResult,
  type RecommendationCategory,
} from '@/lib/domainApi';
import type { DailyQuestionData } from '@/types';

interface Props {
  data: DailyQuestionData;
  onSnack: (msg: string) => void;
}

function isDismissedToday(questionId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('chuanmen.dailyQ.dismissed');
    if (!raw) return false;
    const { id, date } = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    return id === questionId && date === today;
  } catch { return false; }
}

function dismissToday(questionId: string) {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem('chuanmen.dailyQ.dismissed', JSON.stringify({ id: questionId, date: today }));
}

// ── Categories with external search ──
const HAS_EXTERNAL_SEARCH = new Set<string>(['movie', 'book', 'music']);

const searchPlaceholders: Record<string, string> = {
  movie: '搜电影名...',
  book: '搜书名、作者...',
  music: '搜歌名、歌手...',
  recipe: '搜菜名...',
  place: '搜店名...',
  external_event: '搜演出/展览名...',
};

// ── RecommendationInput: search → pick existing / create new ──
function RecommendationInput({
  category,
  questionId,
  userId,
  onDone,
  onSnack,
}: {
  category: string;
  questionId: string;
  userId: string;
  onDone: (title: string) => void;
  onSnack: (msg: string) => void;
}) {
  const c = useColors();
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [existingResults, setExistingResults] = useState<{ id: string; title: string; authorName?: string; coverUrl?: string }[]>([]);
  const [extMovies, setExtMovies] = useState<ExternalMovieResult[]>([]);
  const [extBooks, setExtBooks] = useState<ExternalBookResult[]>([]);
  const [extMusic, setExtMusic] = useState<ExternalMusicResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasExternal = HAS_EXTERNAL_SEARCH.has(category);
  const hasAnyResults = existingResults.length > 0 || extMovies.length > 0 || extBooks.length > 0 || extMusic.length > 0;

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setExistingResults([]); setExtMovies([]); setExtBooks([]); setExtMusic([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        // 1. Search existing recommendations first
        const existing = await searchRecommendations(category as RecommendationCategory, value);
        const items = (existing.items ?? []).map((r: any) => ({
          id: r.id, title: r.title, authorName: r.author?.name ?? r.authorName, coverUrl: r.coverUrl,
        }));
        setExistingResults(items);

        // 2. Only search external sources if no existing results
        if (items.length === 0 && hasExternal) {
          if (category === 'movie') {
            const ext = await searchExternalMovies(value);
            setExtMovies(ext.items ?? []);
          } else if (category === 'book') {
            const ext = await searchExternalBooks(value);
            setExtBooks(ext.items ?? []);
          } else if (category === 'music') {
            const ext = await searchExternalMusic(value);
            setExtMusic(ext.items ?? []);
          }
        } else {
          setExtMovies([]); setExtBooks([]); setExtMusic([]);
        }
      } catch { /* ignore */ }
      setSearching(false);
    }, 400);
  }, [category]);

  // Vote for existing recommendation
  const handleVoteExisting = async (recId: string, title: string) => {
    setSubmitting(true);
    try {
      await toggleRecommendationVote(recId, userId);
      onDone(title);
      onSnack(`已投票「${title}」`);
    } catch {
      onSnack('操作失败');
    } finally { setSubmitting(false); }
  };

  // Create from external movie result
  const handlePickMovie = async (ext: ExternalMovieResult) => {
    setSubmitting(true);
    try {
      await createMovie({
        title: ext.title || ext.originalTitle,
        year: ext.year ? Number(ext.year) : undefined,
        poster: ext.poster,
        synopsis: ext.overview,
        recommendedById: userId,
        tmdbId: ext.tmdbId,
      });
      onDone(ext.title || ext.originalTitle);
      onSnack(`已推荐「${ext.title || ext.originalTitle}」`);
    } catch {
      onSnack('推荐失败');
    } finally { setSubmitting(false); }
  };

  // Create from external book result
  const handlePickBook = async (ext: ExternalBookResult) => {
    setSubmitting(true);
    try {
      await createRecommendation({
        category: 'book',
        title: ext.title,
        description: ext.description,
        sourceUrl: ext.infoLink,
        coverUrl: ext.cover || undefined,
        tags: [ext.authors, ext.year].filter(Boolean),
        authorId: userId,
      });
      onDone(ext.title);
      onSnack(`已推荐「${ext.title}」`);
    } catch {
      onSnack('推荐失败');
    } finally { setSubmitting(false); }
  };

  // Create from external music result
  const handlePickMusic = async (ext: ExternalMusicResult) => {
    setSubmitting(true);
    try {
      await createRecommendation({
        category: 'music',
        title: ext.title,
        description: `${ext.artist}`,
        coverUrl: ext.cover || undefined,
        tags: [ext.artist],
        authorId: userId,
      });
      onDone(ext.title);
      onSnack(`已推荐「${ext.title}」`);
    } catch {
      onSnack('推荐失败');
    } finally { setSubmitting(false); }
  };

  // Manual create (for categories without external search or when no results match)
  const handleManualCreate = async () => {
    if (!search.trim()) return;
    setSubmitting(true);
    try {
      if (category === 'movie') {
        await createMovie({ title: search.trim(), recommendedById: userId });
      } else {
        await createRecommendation({
          category: category as RecommendationCategory,
          title: search.trim(),
          description: '',
          authorId: userId,
        });
      }
      onDone(search.trim());
      onSnack(`已推荐「${search.trim()}」`);
    } catch {
      onSnack('推荐失败');
    } finally { setSubmitting(false); }
  };

  return (
    <Box>
      <TextField
        fullWidth
        size="small"
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={searchPlaceholders[category] ?? '搜索...'}
        autoComplete="off"
        disabled={submitting}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && search.trim() && !hasAnyResults) {
            e.preventDefault();
            handleManualCreate();
          }
        }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>,
          endAdornment: searching ? <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment> : undefined,
        }}
      />

      {/* Existing recommendations */}
      {existingResults.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">已有推荐</Typography>
          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
            {existingResults.slice(0, 4).map((r) => (
              <Stack key={r.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.3 }}>
                <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                  {r.title}
                  {r.authorName && <Box component="span" sx={{ color: c.text3, ml: 0.5 }}>· {r.authorName}</Box>}
                </Typography>
                <Button size="small" variant="outlined" onClick={() => handleVoteExisting(r.id, r.title)} disabled={submitting} sx={{ ml: 1, flexShrink: 0 }}>
                  投票
                </Button>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {/* External movie results */}
      {extMovies.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">搜索结果（TMDB）</Typography>
          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
            {extMovies.slice(0, 4).map((m) => (
              <Stack key={m.tmdbId} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                  {m.poster ? <img src={m.poster} alt={m.title} style={{ width: 28, height: 40, borderRadius: 3, objectFit: 'cover' }} /> : <Poster title={m.title} w={28} h={40} />}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{m.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{m.year}{m.rating != null ? ` · ${m.rating}` : ''}</Typography>
                  </Box>
                </Stack>
                <Button size="small" variant="contained" onClick={() => handlePickMovie(m)} disabled={submitting} sx={{ ml: 1, flexShrink: 0 }}>推荐</Button>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {/* External book results */}
      {extBooks.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">搜索结果（Open Library）</Typography>
          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
            {extBooks.slice(0, 4).map((b) => (
              <Stack key={b.openLibraryKey} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                  {b.cover ? <img src={b.cover} alt={b.title} style={{ width: 28, height: 40, borderRadius: 3, objectFit: 'cover' }} /> : <Poster title={b.title} w={28} h={40} />}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{b.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{b.authors}{b.year ? ` · ${b.year}` : ''}</Typography>
                  </Box>
                </Stack>
                <Button size="small" variant="contained" onClick={() => handlePickBook(b)} disabled={submitting} sx={{ ml: 1, flexShrink: 0 }}>推荐</Button>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {/* External music results */}
      {extMusic.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">搜索结果（iTunes）</Typography>
          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
            {extMusic.slice(0, 4).map((m) => (
              <Stack key={m.itunesId} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                  {m.cover ? <img src={m.cover} alt={m.title} style={{ width: 28, height: 28, borderRadius: 3, objectFit: 'cover' }} /> : null}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{m.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{m.artist}</Typography>
                  </Box>
                </Stack>
                <Button size="small" variant="contained" onClick={() => handlePickMusic(m)} disabled={submitting} sx={{ ml: 1, flexShrink: 0 }}>推荐</Button>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {/* Manual create fallback */}
      {search.trim().length >= 2 && !searching && !hasAnyResults && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">没有找到结果</Typography>
          <Button size="small" variant="contained" onClick={handleManualCreate} disabled={submitting}>
            添加「{search.trim()}」
          </Button>
        </Stack>
      )}
      {search.trim().length >= 2 && !searching && hasAnyResults && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.5 }}>
          <Button size="small" onClick={handleManualCreate} disabled={submitting} sx={{ fontSize: 12 }}>
            都不是？手动添加「{search.trim()}」
          </Button>
        </Stack>
      )}
    </Box>
  );
}

// ── Main Card ──
export default function DailyQuestionCard({ data, onSnack }: Props) {
  const { user } = useAuth();
  const c = useColors();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [current, setCurrent] = useState(data);
  const [myAnswer, setMyAnswer] = useState('');

  const { question, targetEvent, answers, myAnswerId } = current;
  const isRecommendation = question.targetType === 'recommendation' && question.targetCategory;

  useEffect(() => {
    if (isDismissedToday(question.id)) {
      setHidden(true);
    } else if (myAnswerId) {
      setCollapsed(true);
      const mine = answers.find(a => a.id === myAnswerId);
      if (mine) setMyAnswer(mine.text);
    }
  }, [question.id, myAnswerId, answers]);

  if (hidden) return null;

  const buttonLabel =
    question.targetType === 'recommendation' ? '推荐' :
    question.targetType === 'proposal' ? '提议' : '发表';

  const actionHint =
    question.targetType === 'recommendation' ? '回答将发布为一条推荐' :
    question.targetType === 'proposal' ? '回答将发布为一条活动提案' :
    '回答将发布为一条评论';

  // Submit for proposal/comment types (non-recommendation)
  const handleSubmit = async () => {
    if (!user?.id || !input.trim()) return;
    setSubmitting(true);
    try {
      await submitDailyAnswer(question.id, input.trim(), user.id);
      setMyAnswer(input.trim());
      setCollapsed(true);
      setInput('');
      onSnack('回答成功！');
    } catch {
      onSnack('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // Called by RecommendationInput when done
  const handleRecDone = (title: string) => {
    setMyAnswer(title);
    setCollapsed(true);
  };

  const handleSwap = async () => {
    try {
      const res = await fetchRandomDailyQuestion(question.id, user?.id);
      if (res.question) {
        setCurrent({
          question: res.question,
          answers: res.answers ?? [],
          myAnswerId: undefined,
          targetEvent: res.targetEvent,
          targetRecommendation: res.targetRecommendation,
        });
        setInput('');
        setMyAnswer('');
        setCollapsed(false);
      }
    } catch { /* ignore */ }
  };

  // ── Collapsed state ──
  if (collapsed) {
    return (
      <Card sx={{ mb: 2, border: `1px solid ${c.line}` }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ flexShrink: 0 }}>
                今日话题
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                {question.text}
              </Typography>
              {myAnswer && (
                <Chip label={myAnswer} size="small" variant="outlined" sx={{ maxWidth: 200 }} />
              )}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
              <Box
                component="span"
                onClick={() => setCollapsed(false)}
                sx={{ fontSize: 12, color: c.text3, cursor: 'pointer', px: 0.5, '&:hover': { color: c.text }, whiteSpace: 'nowrap' }}
              >
                展开
              </Box>
              <Box
                component="span"
                onClick={handleSwap}
                sx={{ fontSize: 12, color: c.text3, cursor: 'pointer', px: 0.5, '&:hover': { color: c.text }, whiteSpace: 'nowrap' }}
              >
                换一题
              </Box>
              <Box
                component="span"
                onClick={() => { dismissToday(question.id); setHidden(true); }}
                sx={{ fontSize: 12, color: c.text3, cursor: 'pointer', px: 0.5, '&:hover': { color: c.text } }}
              >
                ✕
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // ── Expanded state ──
  return (
    <Card sx={{ mb: 2, border: `1px solid ${c.line}` }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            今日话题
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              component="span"
              onClick={handleSwap}
              sx={{ fontSize: 12, color: c.text3, cursor: 'pointer', px: 0.5, '&:hover': { color: c.text } }}
            >
              换一题
            </Box>
            <Box
              component="span"
              onClick={() => { dismissToday(question.id); setHidden(true); }}
              sx={{ fontSize: 12, color: c.text3, cursor: 'pointer', px: 0.5, '&:hover': { color: c.text } }}
            >
              ✕
            </Box>
          </Stack>
        </Stack>
        <Typography variant="body1" fontWeight={600} sx={{ mb: 1.5 }}>
          {question.text}
        </Typography>

        {targetEvent && (
          <Chip
            label={`活动：${targetEvent.title}`}
            size="small"
            onClick={() => navigate(`/events/${targetEvent.id}`)}
            sx={{ mb: 1.5, cursor: 'pointer' }}
          />
        )}

        {/* Recommendation: search + pick flow */}
        {isRecommendation && user?.id ? (
          <RecommendationInput
            category={question.targetCategory!}
            questionId={question.id}
            userId={user.id}
            onDone={handleRecDone}
            onSnack={onSnack}
          />
        ) : (
          /* Proposal / Comment: plain text input */
          <>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                fullWidth
                size="small"
                placeholder={
                  question.targetType === 'proposal' ? '你的想法...' : '说点什么...'
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!user || submitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleSubmit}
                disabled={!input.trim() || submitting || !user}
                sx={{ minWidth: 64, textTransform: 'none', whiteSpace: 'nowrap' }}
              >
                {submitting ? '...' : buttonLabel}
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {actionHint}
            </Typography>
          </>
        )}

        {/* Other people's answers */}
        {answers.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              已有 {answers.length} 人{question.targetType === 'recommendation' ? '推荐' : question.targetType === 'proposal' ? '提议' : '回答'}
            </Typography>
            <Stack spacing={0.75}>
              {answers.slice(0, 5).map((a) => (
                <Stack key={a.id} direction="row" spacing={1} alignItems="center">
                  <Ava name={a.userName} src={a.userAvatar} size={24} />
                  <Typography variant="body2" sx={{ fontSize: 13 }}>
                    <Box component="span" fontWeight={600}>{a.userName}</Box>
                    ：{a.text}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
