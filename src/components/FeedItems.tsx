import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/auth/AuthContext';
import { signupEvent, cancelSignup, addComment, fetchCommentsApi, fetchMembersApi, fetchEventTasks, claimEventTask, volunteerEventTask } from '@/lib/domainApi';
import type { EventTaskData } from '@/types';
import TaskClaimDialog from '@/components/TaskClaimDialog';
import type { FeedComment } from '@/types';
import RichTextEditor, { RichTextViewer, type MentionMember } from './RichTextEditor';
import FavoriteBorderRounded from '@mui/icons-material/FavoriteBorderRounded';
import FavoriteRounded from '@mui/icons-material/FavoriteRounded';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import { Ava, AvaStack, Card } from './Atoms';
import { Poster } from './Poster';
import ConfirmDialog from './ConfirmDialog';

/** Extract event ID from navTarget like '/events/xxx' */
function extractEventId(navTarget?: string): string | undefined {
  if (!navTarget) return undefined;
  const m = navTarget.match(/^\/events\/([^/]+)$/);
  return m?.[1];
}

/** Extract entityType + entityId from navTarget for comment persistence */
function extractEntity(navTarget?: string): { entityType: string; entityId: string } | undefined {
  if (!navTarget) return undefined;
  let m = navTarget.match(/^\/events\/proposals\/([^/]+)$/);
  if (m) return { entityType: 'proposal', entityId: m[1] };
  m = navTarget.match(/^\/events\/([^/]+)$/);
  if (m) return { entityType: 'event', entityId: m[1] };
  m = navTarget.match(/^\/discover\/movies\/([^/]+)$/);
  if (m) return { entityType: 'movie', entityId: m[1] };
  return undefined;
}
import { PostCard } from './PostCard';
import { ScenePhoto } from './ScenePhoto';

/* ═══════════════════════════════════════════════════════════
 * Font-size scale (aligned with MUI Typography defaults)
 *   12 = caption   — timestamps, metadata
 *   14 = body2     — body text, buttons, comments
 *   15 = subtitle  — card titles (bold)
 *   16 = body1     — main titles (bold)
 *   11 = micro     — overlay badges only
 *   28 = hero      — milestone emoji
 * ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
 * Shared interaction props — every feed card receives these
 * ═══════════════════════════════════════════════════════════ */
interface InteractionProps {
  likes: number;
  likedBy: string[];
  comments: FeedComment[];
  newComments?: number;
  commentCount?: number;
}

/* ═══ Shared members cache for @mention in feed ═══ */
let _membersCache: MentionMember[] | null = null;
let _membersFetching = false;
function useFeedMembers() {
  const [members, setMembers] = useState<MentionMember[]>(_membersCache ?? []);
  useEffect(() => {
    if (_membersCache) { setMembers(_membersCache); return; }
    if (_membersFetching) return;
    _membersFetching = true;
    fetchMembersApi().then((list) => {
      if (Array.isArray(list)) {
        _membersCache = list
          .filter((m: any) => m.userStatus === 'approved')
          .map((m: any) => ({ id: m.id, name: m.name ?? '', avatar: m.avatar ?? undefined }));
        setMembers(_membersCache);
      }
    }).catch(() => {}).finally(() => { _membersFetching = false; });
  }, []);
  return members;
}

/* ═══ FeedActions (shared like + comment bar) ═══ */
export function FeedActions({ likes = 0, likedBy = [], comments = [], compact, newComments, commentCount: commentCountProp, entityType, entityId, defaultExpanded, liked: likedProp, onLike }: InteractionProps & { compact?: boolean; newComments?: number; commentCount?: number; entityType?: string; entityId?: string; defaultExpanded?: boolean; liked?: boolean; onLike?: () => void }) {
  const c = useColors();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [likedLocal, setLikedLocal] = useState(false);
  const liked = likedProp ?? likedLocal;
  const setLiked = onLike ?? (() => setLikedLocal((v) => !v));
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const [localComments, setLocalComments] = useState(comments ?? []);
  const [canSend, setCanSend] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const editorRef = useRef<{ clear: () => void; getHTML: () => string } | null>(null);
  const members = useFeedMembers();

  // Load persisted comments from API when section is first expanded
  useEffect(() => {
    if (expanded && !loaded && entityType && entityId) {
      setLoaded(true);
      fetchCommentsApi(entityType, entityId).then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setLocalComments(list.map((c: any) => ({ name: c.author?.name ?? '匿名', text: c.content ?? '', date: c.createdAt ? new Date(c.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '' })));
        }
      }).catch(() => {});
    }
  }, [expanded, loaded, entityType, entityId]);

  const likeCount = likes + (liked ? 1 : 0);
  const px = compact ? 10 : 14;

  const isEmptyHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim().length === 0;

  const handleSubmit = async () => {
    const html = editorRef.current?.getHTML() ?? '';
    if (isEmptyHtml(html) || !user) return;
    setLocalComments(prev => [...prev, { name: user.name, text: html, date: '刚刚' }]);
    editorRef.current?.clear();
    setCanSend(false);
    if (entityType && entityId) {
      try {
        await addComment({ entityType, entityId, authorId: user.id, content: html });
      } catch { /* optimistic */ }
    }
  };

  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <div onClick={e => e.stopPropagation()}>
      {/* New comment badge */}
      {newComments && newComments > 0 && (
        <div
          onClick={() => setExpanded(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: `5px ${px}px`, cursor: 'pointer',
            fontSize: compact ? 11 : 12, color: c.blue, fontWeight: 600,
          }}
        >
          💬 {newComments} 条新评论
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: c.line + '30', margin: `0 ${px}px` }} />

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 16, padding: `7px ${px}px` }}>
        <button
          onClick={() => setLiked()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontSize: compact ? 12 : 14, color: liked ? c.warm : c.text3,
          }}
        >
          {liked
            ? <FavoriteRounded sx={{ fontSize: compact ? 16 : 18 }} />
            : <FavoriteBorderRounded sx={{ fontSize: compact ? 16 : 18 }} />
          }
          {likeCount > 0 ? ` ${likeCount}` : ''}
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontSize: compact ? 12 : 14, color: expanded ? c.warm : c.text3,
          }}
        >
          <ChatBubbleOutlineRounded sx={{ fontSize: compact ? 16 : 18 }} />
          {Math.max(commentCountProp ?? 0, localComments.length) > 0 ? ` ${Math.max(commentCountProp ?? 0, localComments.length)}` : ''}
        </button>
      </div>

      {/* Liked-by summary */}
      {likedBy.length > 0 && !expanded && (
        <div style={{ padding: `0 ${px}px 6px`, fontSize: 12, color: c.text3 }}>
          {likedBy.slice(0, 3).join('、')}{likedBy.length > 3 ? ` 等 ${likedBy.length} 人` : ''} 觉得不错
        </div>
      )}

      {/* Expanded comment list */}
      {expanded && (
        <div style={{ padding: `0 ${px}px ${compact ? 8 : 10}px` }}>
          <style>{`.mention, span[data-type="mention"] { color: ${c.blue}; font-weight: 600; cursor: pointer; background: ${c.blue}15; padding: 1px 4px; border-radius: 4px; }`}</style>
          {localComments.length === 0 && (
            <div style={{ fontSize: 12, color: c.text3, marginBottom: 8 }}>暂无评论，来说两句吧</div>
          )}
          {localComments.map((cm, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Ava name={cm.name} size={compact ? 20 : 24} onTap={() => goMember(cm.name)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12 }}>
                  <b onClick={() => goMember(cm.name)} style={{ cursor: 'pointer' }}>{cm.name}</b>
                  <span style={{ color: c.text3, marginLeft: 6 }}>{cm.date}</span>
                </div>
                <div
                  style={{ fontSize: compact ? 13 : 14, color: c.text2, marginTop: 1 }}
                  dangerouslySetInnerHTML={{ __html: cm.text }}
                  onClick={(e) => {
                    const el = (e.target as HTMLElement).closest('[data-type="mention"]') as HTMLElement | null;
                    if (!el) return;
                    e.stopPropagation();
                    const label = el.getAttribute('data-label') || el.textContent?.replace(/^@/, '') || '';
                    if (label) goMember(label);
                  }}
                />
              </div>
            </div>
          ))}

          {/* Comment input */}
          {user && (
            <div style={{ display: 'flex', gap: 8, marginTop: localComments.length > 0 ? 4 : 0, alignItems: 'flex-start' }}>
              <Ava name={user.name} size={compact ? 20 : 24} />
              <div style={{ flex: 1 }}>
                <RichTextEditor
                  content=""
                  onChange={(html) => setCanSend(!isEmptyHtml(html))}
                  placeholder="写评论... 输入 @ 提及成员"
                  members={members}
                  compact
                  editorRef={editorRef}
                />
              </div>
              {canSend && (
                <button
                  onClick={handleSubmit}
                  style={{
                    padding: '5px 12px', borderRadius: 6, flexShrink: 0,
                    background: c.warm, border: 'none',
                    color: c.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    marginTop: 4,
                  }}
                >
                  发送
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══ FeedTime ═══ */
export function FeedTime({ label }: { label: string }) {
  const c = useColors();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <div style={{ flex: 1, height: 1, background: c.line + '60' }} />
      <span style={{ fontSize: 12, color: c.text3, fontWeight: 500, letterSpacing: '0.03em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: c.line + '60' }} />
    </div>
  );
}

/* ═══ FeedActivity ═══ */
interface FeedTaskSummary {
  role: string;
  claimerName?: string;
}

interface FeedActivityProps extends InteractionProps {
  name: string; title: string; date: string; location: string;
  spots: number; total?: number; people: string[]; signupUserIds?: string[]; film?: string; filmPoster?: string; scene?: string;
  navTarget?: string;
  /** 'feed' = full card with signup/actions (default); 'list' = compact list card for EventsPage */
  mode?: 'feed' | 'list';
  phase?: string;
  isHomeEvent?: boolean;
  isPrivate?: boolean;
  houseRules?: string;
  photoCount?: number;
  commentCount?: number;
  hostId?: string;
  waitlistCount?: number;
  socialHint?: { name: string; count: number };
  time?: string;
  activityHint?: string;
  activityHintUser?: string;
  taskSummary?: FeedTaskSummary[];
}

export function FeedActivity({ name, title, date, location, spots, total, people, signupUserIds, film, filmPoster, scene, navTarget, likes, likedBy, comments, newComments, mode = 'feed', phase, isHomeEvent, isPrivate, houseRules, photoCount, commentCount, hostId, waitlistCount, socialHint, time, activityHint, activityHintUser, taskSummary }: FeedActivityProps) {
  const c = useColors();
  const { user } = useAuth();
  const [joined, setJoined] = useState(() => Boolean(user?.id && signupUserIds?.includes(user.id)));
  const [cancelOpen, setCancelOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimTasks, setClaimTasks] = useState<EventTaskData[]>([]);
  const navigate = useNavigate();
  const goNav = navTarget ? () => navigate(navTarget) : undefined;
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);
  const eventId = extractEventId(navTarget);
  const isList = mode === 'list';
  const isCancelled = phase === 'cancelled';
  const isEnded = phase === 'ended';
  const isHost = Boolean(user?.id && hostId && user.id === hostId);

  // Sync signup state when data refreshes
  useEffect(() => {
    setJoined(Boolean(user?.id && signupUserIds?.includes(user.id)));
  }, [user, signupUserIds]);

  const handleSignup = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!eventId || !user?.id) {
      if (goNav) goNav();
      return;
    }
    if (joined) {
      if (!isEnded) setCancelOpen(true);
      return;
    }
    try {
      await signupEvent(eventId, user.id);
      setJoined(true);
      // Fetch tasks and show claim dialog if any exist
      if (!isEnded) {
        try {
          const tasks = await fetchEventTasks(eventId);
          if (tasks.length > 0) {
            setClaimTasks(tasks);
            setClaimOpen(true);
          }
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  };

  const confirmCancel = async () => {
    setCancelOpen(false);
    if (!eventId || !user?.id) return;
    try {
      await cancelSignup(eventId, user.id);
      setJoined(false);
    } catch { /* ignore */ }
  };

  /* Phase chip config (list mode only) */
  const phaseConfig: Record<string, { label: string; bg: string; fg: string }> = {
    invite:    { label: '🔒 邀请', bg: c.warm + '20', fg: c.warm },
    open:      { label: '报名中', bg: c.green + '20', fg: c.green },
    closed:    { label: '报名结束', bg: c.text3 + '20', fg: c.text3 },
    cancelled: { label: '已取消', bg: c.red + '20', fg: c.red },
    ended:     { label: '已结束', bg: c.text3 + '20', fg: c.text3 },
  };
  const pc = phase ? phaseConfig[phase] : undefined;

  return (
    <Card>
      <div onClick={goNav} style={{ cursor: goNav ? 'pointer' : 'default', opacity: isList && isCancelled ? 0.6 : 1 }}>
      {scene && (
          <ScenePhoto scene={scene} h={90}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(transparent, rgba(0,0,0,0.45))' }} />
            <div style={{ position: 'absolute', top: 8, right: 10, display: 'flex', gap: 6 }}>
              {isList && pc ? (
                <div style={{ padding: '3px 8px', background: `${pc.bg}`, backdropFilter: 'blur(8px)', borderRadius: 5, fontSize: 11, fontWeight: 600, color: pc.fg }}>{pc.label}</div>
              ) : (
                <div style={{ padding: '3px 8px', background: `${c.s2}cc`, backdropFilter: 'blur(8px)', borderRadius: 5, fontSize: 11, color: c.text2 }}>{date}</div>
              )}
              {isPrivate && (
                <div style={{ padding: '3px 8px', background: `${c.warm}25`, backdropFilter: 'blur(8px)', borderRadius: 5, fontSize: 11, fontWeight: 600, color: c.warm }}>🔒 私密</div>
              )}
            </div>
            {film && <div style={{ position: 'absolute', bottom: 8, left: 10 }}>{filmPoster ? <img src={filmPoster} alt={film} style={{ width: 32, height: 44, borderRadius: 4, objectFit: 'cover' }} /> : <Poster title={film} w={32} h={44} />}</div>}
          </ScenePhoto>
      )}
      <div style={{ padding: 14 }}>
        {/* Feed mode: author header */}
        {!isList && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <span onClick={(e) => { e.stopPropagation(); goMember(name); }}><Ava name={name} size={32} badge="🏠" /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14 }}>
                <b onClick={(e) => { e.stopPropagation(); goMember(name); }} style={{ cursor: 'pointer' }}>{name}</b>
                {' '}{activityHint === 'comment' && activityHintUser
                  ? <>的活动 · <b onClick={(e) => { e.stopPropagation(); goMember(activityHintUser); }} style={{ cursor: 'pointer' }}>{activityHintUser}</b> 评论了 💬</>
                  : activityHint === 'signup' && activityHintUser
                  ? <>的活动 · <b onClick={(e) => { e.stopPropagation(); goMember(activityHintUser); }} style={{ cursor: 'pointer' }}>{activityHintUser}</b> 报名了 👋</>
                  : activityHint === 'comment' ? '的活动有新评论 💬'
                  : activityHint === 'signup' ? '的活动有新报名 👋'
                  : activityHint === 'photo' ? '的活动有新照片 📷'
                  : activityHint === 'update' ? '的活动有更新' : '发起了活动'}
              </div>
              {time && <div style={{ fontSize: 12, color: c.text3 }}>{time}</div>}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>{title}</div>
          {isHomeEvent && (
            <div style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.warmDim, color: c.warm, flexShrink: 0 }}>🏠 在家</div>
          )}
          {isList && !scene && pc && (
            <div style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: pc.bg, color: pc.fg, flexShrink: 0 }}>{pc.label}</div>
          )}
        </div>
        {!scene && <div style={{ fontSize: 13, color: c.text2, marginBottom: 8 }}>{date} · {location}</div>}
        {scene && <div style={{ fontSize: 13, color: c.text2, marginBottom: 8 }}>{isList ? `${date} · ${location}` : location}</div>}
        {!scene && film && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: c.s2, borderRadius: 6, marginBottom: 8 }}>
            {filmPoster ? <img src={filmPoster} alt={film} style={{ width: 20, height: 28, borderRadius: 3, objectFit: 'cover' }} /> : <Poster title={film} w={20} h={28} />}<span style={{ fontSize: 12, color: c.text2 }}>放映 {film}</span>
          </div>
        )}
        {isList && houseRules && (
          <div style={{ fontSize: 12, color: c.text3, fontStyle: 'italic', marginBottom: 8 }}>🏠 {houseRules}</div>
        )}
        {/* List mode: host row */}
        {isList && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
            <Ava name={name} size={22} onTap={() => goMember(name)} />
            <span onClick={(e) => { e.stopPropagation(); goMember(name); }} style={{ fontSize: 12, color: c.text3, cursor: 'pointer' }}>{name} Host</span>
          </div>
        )}
        {/* People + spots (both modes) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <AvaStack names={people} />
          {isEnded ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {photoCount != null && photoCount > 0 && <span style={{ fontSize: 12, color: c.text3 }}>📷 {photoCount}</span>}
            </div>
          ) : !isCancelled && (
            <span style={{ fontSize: 12, color: spots > 0 ? c.green : c.red }}>{spots > 0 ? `${total ? `${total - spots}/${total}人 · ` : ''}还剩 ${spots} 位` : (waitlistCount ?? 0) > 0 ? `已满 · ${waitlistCount}人等位` : '已满'}</span>
          )}
        </div>
        {/* Task summary */}
        {taskSummary && taskSummary.length > 0 && !isCancelled && (
          <div style={{ fontSize: 12, color: c.text3, marginBottom: 8, lineHeight: 1.6 }}>
            分工：{taskSummary.map((t, i) => (
              <span key={i}>
                {i > 0 && ' · '}
                {t.role}{' '}
                <span style={{ color: t.claimerName ? c.text2 : c.warm, fontWeight: t.claimerName ? 400 : 600 }}>
                  {t.claimerName || '待认领'}
                </span>
              </span>
            ))}
          </div>
        )}
        {/* Ended event: show passive label if user joined */}
        {isEnded && !isCancelled && user && joined && (
          <div style={{
            width: '100%', padding: '9px 0', borderRadius: 8, textAlign: 'center',
            background: c.s2, border: `1px solid ${c.green}20`,
            color: c.green, fontSize: 14, fontWeight: 700, opacity: 0.7,
          }}>
            ✓ 已参与
          </div>
        )}
        {/* Social hint + signup (skip for ended/cancelled and host) */}
        {!isEnded && !isCancelled && (
          <>
            {socialHint && (
              <div style={{ background: c.warmDim, borderRadius: 6, padding: '5px 10px', marginBottom: 10, fontSize: 12, color: c.warm }}>
                {'💡'} {socialHint.name}也报名了（你们一起参加过 {socialHint.count} 次活动）
              </div>
            )}
            {isHost ? (
              <div style={{
                width: '100%', padding: '9px 0', borderRadius: 8, textAlign: 'center',
                background: c.s2, border: `1px solid ${c.warm}20`,
                color: c.warm, fontSize: 14, fontWeight: 700, opacity: 0.7,
              }}>
                我的活动
              </div>
            ) : (
              <button
                onClick={handleSignup}
                style={{
                  width: '100%', padding: '9px 0', borderRadius: 8,
                  background: joined ? c.s2 : c.warm,
                  border: joined ? `1px solid ${c.green}30` : 'none',
                  color: joined ? c.green : c.bg,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {joined ? '✓ 已报名' : '报名参加'}
              </button>
            )}
          </>
        )}
      </div>
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} commentCount={commentCount} {...extractEntity(navTarget)} />
      <ConfirmDialog
        open={cancelOpen}
        title="取消报名"
        message="确定要取消报名这个活动吗？"
        confirmLabel="取消报名"
        cancelLabel="再想想"
        confirmColor="error"
        onConfirm={confirmCancel}
        onCancel={() => setCancelOpen(false)}
      />
      {claimOpen && eventId && (
        <TaskClaimDialog
          open={claimOpen}
          onClose={() => setClaimOpen(false)}
          tasks={claimTasks}
          onClaim={async (taskId) => {
            if (!eventId || !user?.id) return;
            await claimEventTask(eventId, taskId, user.id);
          }}
          onVolunteer={async (role, description) => {
            if (!eventId || !user?.id) return;
            await volunteerEventTask(eventId, user.id, role, description);
          }}
        />
      )}
    </Card>
  );
}

/* ═══ FeedCard ═══ */
interface FeedCardProps extends InteractionProps {
  from: string; to: string; message: string; photo?: string; navTarget?: string;
  time?: string; visibility?: string;
}

export function FeedCard({ from, to, message, photo, navTarget, likes, likedBy, comments, newComments, commentCount, time, visibility }: FeedCardProps) {
  const c = useColors();
  const navigate = useNavigate();
  const goNav = navTarget ? () => navigate(navTarget) : undefined;
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <Card glow>
      <div onClick={goNav} style={{ padding: 14, cursor: goNav ? 'pointer' : 'default' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Ava name={from} size={32} onTap={() => goMember(from)} />
          <div>
            <div style={{ fontSize: 14 }}>
              <b onClick={(e) => { e.stopPropagation(); goMember(from); }} style={{ cursor: 'pointer' }}>{from}</b> 给{' '}
              <b onClick={(e) => { e.stopPropagation(); goMember(to); }} style={{ cursor: 'pointer' }}>{to}</b> 寄了一张感谢卡
            </div>
            {time && <div style={{ fontSize: 12, color: c.text3 }}>{time}{visibility === 'public' ? ' · 🌐 公开' : visibility === 'private' ? ' · 🔒 私密' : ''}</div>}
          </div>
        </div>
        <PostCard from={from} to={to} message={message} stamp="🎬" photo={photo} layout="horizontal" />
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} commentCount={commentCount} {...extractEntity(navTarget)} />
    </Card>
  );
}

/* ═══ FeedMovie ═══ */
interface FeedMovieProps extends InteractionProps {
  name: string; title: string; year: string; dir: string; votes: number;
  navTarget?: string; time?: string;
}

export function FeedMovie({ name, title, year, dir, votes: initV, navTarget, likes, likedBy, comments, newComments, commentCount, time }: FeedMovieProps) {
  const c = useColors();
  const [v, setV] = useState(false);
  const navigate = useNavigate();
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);
  const goNav = navTarget ? () => navigate(navTarget) : undefined;

  return (
    <Card>
      <div style={{ padding: 14, cursor: goNav ? 'pointer' : undefined }} onClick={goNav}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Ava name={name} size={32} onTap={() => goMember(name)} />
          <div>
            <div style={{ fontSize: 14 }}><b onClick={() => goMember(name)} style={{ cursor: 'pointer' }}>{name}</b> 推荐了一部电影</div>
            {time && <div style={{ fontSize: 12, color: c.text3 }}>{time}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Poster title={title} w={52} h={72} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 12, color: c.text3, marginTop: 2 }}>{year}  {dir}</div>
            <div style={{ marginTop: 6 }}>
              <button
                onClick={(e) => { e.stopPropagation(); setV(!v); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 12px', borderRadius: 6,
                  background: v ? c.warm + '15' : c.s2,
                  border: `1px solid ${v ? c.warm + '40' : c.line}`,
                  color: v ? c.warm : c.text2,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                ▲ {initV + (v ? 1 : 0)}
              </button>
            </div>
          </div>
        </div>
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} commentCount={commentCount} />
    </Card>
  );
}

/* ═══ FeedMilestone ═══ */
interface FeedMilestoneProps extends InteractionProps {
  text: string; emoji: string;
}

export function FeedMilestone({ text, emoji, likes, likedBy, comments, newComments, commentCount }: FeedMilestoneProps) {
  return (
    <Card glow>
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>{emoji}</div>
        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{text}</div>
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} commentCount={commentCount} />
    </Card>
  );
}

/* ═══ FeedProposal ═══ */
interface FeedProposalProps extends InteractionProps {
  name: string; title: string; votes: number; interested: string[];
  navTarget?: string; time?: string;
}

export function FeedProposal({ name, title, votes: initV, interested, navTarget, likes, likedBy, comments, newComments, commentCount, time }: FeedProposalProps) {
  const c = useColors();
  const [v, setV] = useState(false);
  const navigate = useNavigate();
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);
  const goNav = navTarget ? () => navigate(navTarget) : undefined;

  return (
    <Card>
      <div style={{ padding: 14, cursor: goNav ? 'pointer' : undefined }} onClick={goNav}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Ava name={name} size={32} onTap={() => goMember(name)} />
          <div>
            <div style={{ fontSize: 14 }}><b onClick={() => goMember(name)} style={{ cursor: 'pointer' }}>{name}</b> 提了一个活动创意</div>
            {time && <div style={{ fontSize: 12, color: c.text3 }}>{time}</div>}
          </div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{'💡'} {title}</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <AvaStack names={interested} size={18} />
          <span style={{ fontSize: 12, color: c.text3 }}>{interested.length} 人感兴趣</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setV(!v); }}
          style={{
            padding: '6px 16px', borderRadius: 6,
            background: v ? c.blue + '15' : c.s2,
            border: `1px solid ${v ? c.blue + '40' : c.line}`,
            color: v ? c.blue : c.text2,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {v ? '✓ 我也感兴趣' : '我感兴趣'} · {initV + (v ? 1 : 0)}
        </button>
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} commentCount={commentCount} />
    </Card>
  );
}

/* ═══ FeedCompactMovie ═══ */
interface FeedCompactMovieProps extends InteractionProps {
  name: string; title: string; year: string; dir: string;
  votes: number; time: string; navTarget?: string;
}

export function FeedCompactMovie({ name, title, year, dir, votes: initV, time, navTarget, likes, likedBy, comments, newComments, commentCount }: FeedCompactMovieProps) {
  const c = useColors();
  const [v, setV] = useState(false);
  const navigate = useNavigate();
  const goNav = navTarget ? () => navigate(navTarget) : undefined;
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <div style={{ background: c.s1, borderRadius: 10, border: `1px solid ${c.line}`, overflow: 'hidden' }}>
      <div onClick={goNav} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: goNav ? 'pointer' : 'default' }}>
        <Poster title={title} w={36} h={50} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 12, color: c.text3, marginTop: 1 }}>{year}  {dir}</div>
          <div style={{ fontSize: 11, color: c.text3, marginTop: 2 }}>
            <span onClick={(e) => { e.stopPropagation(); goMember(name); }} style={{ cursor: 'pointer' }}>{name}</span> 推荐 · {time}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setV(!v); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 6, flexShrink: 0,
            background: v ? c.warm + '15' : c.s2,
            border: `1px solid ${v ? c.warm + '40' : c.line}`,
            color: v ? c.warm : c.text2, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          ▲ {initV + (v ? 1 : 0)}
        </button>
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} commentCount={commentCount} compact {...extractEntity(navTarget)} />
    </div>
  );
}

/* ═══ FeedCompactProposal ═══ */
interface FeedCompactProposalProps extends InteractionProps {
  name: string; title: string; votes: number;
  interested: string[]; time: string; navTarget?: string;
}

export function FeedCompactProposal({ name, title, votes: initV, interested, time, navTarget, likes, likedBy, comments, newComments, commentCount }: FeedCompactProposalProps) {
  const c = useColors();
  const [v, setV] = useState(false);
  const navigate = useNavigate();
  const goNav = navTarget ? () => navigate(navTarget) : undefined;
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <div style={{ background: c.s1, borderRadius: 10, border: `1px solid ${c.line}`, overflow: 'hidden' }}>
      <div onClick={goNav} style={{ padding: '10px 12px', cursor: goNav ? 'pointer' : 'default' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>{'💡'} {title}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Ava name={name} size={18} onTap={() => goMember(name)} />
            <span onClick={(e) => { e.stopPropagation(); goMember(name); }} style={{ fontSize: 12, color: c.text3, cursor: 'pointer' }}>{name}</span>
            <span style={{ fontSize: 12, color: c.text3 }}>· {time}</span>
            <AvaStack names={interested} size={16} />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setV(!v); }}
            style={{
              padding: '3px 10px', borderRadius: 5,
              background: v ? c.blue + '15' : c.s2,
              border: `1px solid ${v ? c.blue + '40' : c.line}`,
              color: v ? c.blue : c.text3, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {v ? '✓' : '🙋'} {initV + (v ? 1 : 0)}
          </button>
        </div>
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} commentCount={commentCount} compact {...extractEntity(navTarget)} />
    </div>
  );
}

/* ═══ FeedRecommendation (compact) ═══ */
interface FeedRecommendationProps extends InteractionProps {
  name: string; title: string; category: string; categoryIcon: string;
  votes: number; time: string; navTarget?: string;
}

export function FeedRecommendation({ name, title, category, categoryIcon, votes: initV, time, navTarget, likes, likedBy, comments, newComments, commentCount }: FeedRecommendationProps) {
  const c = useColors();
  const [v, setV] = useState(false);
  const navigate = useNavigate();
  const goNav = navTarget ? () => navigate(navTarget) : undefined;
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <div style={{ background: c.s1, borderRadius: 10, border: `1px solid ${c.line}`, overflow: 'hidden' }}>
      <div onClick={goNav} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: goNav ? 'pointer' : 'default' }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: c.s2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          {categoryIcon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          <div style={{ fontSize: 11, color: c.text3, marginTop: 2 }}>
            <span onClick={(e) => { e.stopPropagation(); goMember(name); }} style={{ cursor: 'pointer' }}>{name}</span> 推荐 · {time}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setV(!v); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 6, flexShrink: 0,
            background: v ? c.warm + '15' : c.s2,
            border: `1px solid ${v ? c.warm + '40' : c.line}`,
            color: v ? c.warm : c.text2, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          ▲ {initV + (v ? 1 : 0)}
        </button>
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} commentCount={commentCount} compact />
    </div>
  );
}

/* ═══ FeedBook ═══ */
interface FeedBookProps extends InteractionProps {
  name: string; title: string; year: string; author: string; votes: number;
  navTarget?: string; time?: string;
}

export function FeedBook({ name, title, year, author, votes: initV, navTarget, likes, likedBy, comments, newComments, commentCount, time }: FeedBookProps) {
  const c = useColors();
  const [v, setV] = useState(false);
  const navigate = useNavigate();
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);
  const goNav = navTarget ? () => navigate(navTarget) : undefined;

  return (
    <Card>
      <div style={{ padding: 14, cursor: goNav ? 'pointer' : undefined }} onClick={goNav}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Ava name={name} size={32} onTap={() => goMember(name)} />
          <div>
            <div style={{ fontSize: 14 }}><b onClick={() => goMember(name)} style={{ cursor: 'pointer' }}>{name}</b> 推荐了一本书</div>
            {time && <div style={{ fontSize: 12, color: c.text3 }}>{time}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Poster title={title} w={52} h={72} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 12, color: c.text3, marginTop: 2 }}>{year} · {author}</div>
            <div style={{ marginTop: 6 }}>
              <button
                onClick={(e) => { e.stopPropagation(); setV(!v); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 12px', borderRadius: 6,
                  background: v ? c.warm + '15' : c.s2,
                  border: `1px solid ${v ? c.warm + '40' : c.line}`,
                  color: v ? c.warm : c.text2,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                ▲ {initV + (v ? 1 : 0)}
              </button>
            </div>
          </div>
        </div>
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} commentCount={commentCount} />
    </Card>
  );
}

/* ═══ FeedSmallGroup ═══ */
interface FeedSmallGroupProps extends InteractionProps {
  name: string; title: string; date: string; location: string;
  weekNumber: number; people: string[]; signupUserIds?: string[]; capacity: number;
  description?: string; isHome?: boolean; isPrivate?: boolean; navTarget?: string;
}

export function FeedSmallGroup({ name, title, date, location, weekNumber, people, signupUserIds, capacity, isPrivate, navTarget, likes, likedBy, comments, newComments, commentCount }: FeedSmallGroupProps) {
  const c = useColors();
  const { user } = useAuth();
  const [joined, setJoined] = useState(() => Boolean(user?.id && signupUserIds?.includes(user.id)));
  const [cancelOpen, setCancelOpen] = useState(false);
  const navigate = useNavigate();
  const goNav = navTarget ? () => navigate(navTarget) : undefined;
  const eventId = extractEventId(navTarget);

  useEffect(() => {
    setJoined(Boolean(user?.id && signupUserIds?.includes(user.id)));
  }, [user, signupUserIds]);

  const handleSignup = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!eventId || !user?.id) { if (goNav) goNav(); return; }
    if (joined) { setCancelOpen(true); return; }
    try {
      await signupEvent(eventId, user.id);
      setJoined(true);
    } catch { /* ignore */ }
  };

  const confirmCancel = async () => {
    setCancelOpen(false);
    if (!eventId || !user?.id) return;
    try {
      await cancelSignup(eventId, user.id);
      setJoined(false);
    } catch { /* ignore */ }
  };
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  if (isPrivate) {
    return (
      <Card>
        <div style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Ava name={name} size={32} onTap={() => goMember(name)} />
            <div>
              <div style={{ fontSize: 14 }}><b onClick={() => goMember(name)} style={{ cursor: 'pointer' }}>{name}</b> 发起了私密局</div>
              <div style={{ fontSize: 12, color: c.text3 }}>{date}</div>
            </div>
          </div>
        </div>
        <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} commentCount={commentCount} {...extractEntity(navTarget)} />
      </Card>
    );
  }

  return (
    <Card>
      <div onClick={goNav} style={{ cursor: goNav ? 'pointer' : 'default', padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <span onClick={(e) => { e.stopPropagation(); goMember(name); }}><Ava name={name} size={32} badge="🎲" /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14 }}><b onClick={(e) => { e.stopPropagation(); goMember(name); }} style={{ cursor: 'pointer' }}>{name}</b> 发起了小聚</div>
            <div style={{ fontSize: 12, color: c.text3 }}>Host · {date}</div>
          </div>
          <div style={{
            padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: c.warmDim, color: c.warm, alignSelf: 'flex-start',
          }}>
            🎲 第 {weekNumber} 期
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: c.text2, marginBottom: 8 }}>📍 {location}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <AvaStack names={people} />
          <span style={{ fontSize: 12, color: people.length < capacity ? c.green : c.red }}>{people.length}/{capacity}</span>
        </div>
        <button
          onClick={handleSignup}
          style={{
            width: '100%', padding: '9px 0', borderRadius: 8,
            background: joined ? c.s2 : c.warm,
            border: joined ? `1px solid ${c.green}30` : 'none',
            color: joined ? c.green : c.bg,
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {joined ? '✓ 已报名' : '🎲 我要参加'}
        </button>
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} commentCount={commentCount} {...extractEntity(navTarget)} />
      <ConfirmDialog
        open={cancelOpen}
        title="取消报名"
        message="确定要取消报名这个小聚吗？"
        confirmLabel="取消报名"
        cancelLabel="再想想"
        confirmColor="error"
        onConfirm={confirmCancel}
        onCancel={() => setCancelOpen(false)}
      />
    </Card>
  );
}

/* ═══ FeedCompactSmallGroup ═══ */
interface FeedCompactSmallGroupProps extends InteractionProps {
  name: string; title: string; date: string; location: string;
  weekNumber: number; people: string[]; signupUserIds?: string[]; capacity: number;
  time: string; isPrivate?: boolean; navTarget?: string;
}

export function FeedCompactSmallGroup({ name, title, date, location, weekNumber, people, signupUserIds, capacity, time, isPrivate, navTarget, likes, likedBy, comments, newComments, commentCount }: FeedCompactSmallGroupProps) {
  const c = useColors();
  const { user } = useAuth();
  const [joined, setJoined] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const navigate = useNavigate();
  const goNav = navTarget ? () => navigate(navTarget) : undefined;
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);
  const eventId = extractEventId(navTarget);

  useEffect(() => {
    if (user?.id && signupUserIds?.includes(user.id)) setJoined(true);
  }, [user, signupUserIds]);

  const handleSignup = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!eventId || !user?.id) { if (goNav) goNav(); return; }
    if (joined) { setCancelOpen(true); return; }
    try {
      await signupEvent(eventId, user.id);
      setJoined(true);
    } catch { /* ignore */ }
  };

  const confirmCancel = async () => {
    setCancelOpen(false);
    if (!eventId || !user?.id) return;
    try {
      await cancelSignup(eventId, user.id);
      setJoined(false);
    } catch { /* ignore */ }
  };

  if (isPrivate) {
    return (
      <div style={{ background: c.s1, borderRadius: 10, border: `1px solid ${c.line}`, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 13, color: c.text2 }}>
            <span onClick={() => goMember(name)} style={{ cursor: 'pointer', fontWeight: 600 }}>{name}</span> 发起了私密局 · {time}
          </div>
        </div>
        <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} commentCount={commentCount} compact {...extractEntity(navTarget)} />
      </div>
    );
  }

  return (
    <div style={{ background: c.s1, borderRadius: 10, border: `1px solid ${c.line}`, overflow: 'hidden' }}>
      <div onClick={goNav} style={{ padding: '10px 12px', cursor: goNav ? 'pointer' : 'default' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>🎲 {title}</div>
          <div style={{
            padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: c.warmDim, color: c.warm, flexShrink: 0, marginLeft: 8,
          }}>
            第 {weekNumber} 期
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Ava name={name} size={18} onTap={() => goMember(name)} />
            <span onClick={(e) => { e.stopPropagation(); goMember(name); }} style={{ fontSize: 12, color: c.text3, cursor: 'pointer' }}>{name}</span>
            <span style={{ fontSize: 12, color: c.text3 }}>· {time}</span>
            <AvaStack names={people} size={16} />
          </div>
          <button
            onClick={handleSignup}
            style={{
              padding: '3px 10px', borderRadius: 5,
              background: joined ? c.warm + '15' : c.s2,
              border: `1px solid ${joined ? c.warm + '40' : c.line}`,
              color: joined ? c.warm : c.text3, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {joined ? '✓' : '🎲'} {people.length}/{capacity}
          </button>
        </div>
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} commentCount={commentCount} compact {...extractEntity(navTarget)} />
      <ConfirmDialog
        open={cancelOpen}
        title="取消报名"
        message="确定要取消报名这个小聚吗？"
        confirmLabel="取消报名"
        cancelLabel="再想想"
        confirmColor="error"
        onConfirm={confirmCancel}
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  );
}

/* ═══ FeedCompactBook ═══ */
interface FeedCompactBookProps extends InteractionProps {
  name: string; title: string; year: string; author: string;
  votes: number; time: string; navTarget?: string;
}

export function FeedCompactBook({ name, title, year, author, votes: initV, time, navTarget, likes, likedBy, comments, newComments, commentCount }: FeedCompactBookProps) {
  const c = useColors();
  const [v, setV] = useState(false);
  const navigate = useNavigate();
  const goNav = navTarget ? () => navigate(navTarget) : undefined;
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <div style={{ background: c.s1, borderRadius: 10, border: `1px solid ${c.line}`, overflow: 'hidden' }}>
      <div onClick={goNav} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: goNav ? 'pointer' : 'default' }}>
        <Poster title={title} w={36} h={50} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 12, color: c.text3, marginTop: 1 }}>{year} · {author}</div>
          <div style={{ fontSize: 11, color: c.text3, marginTop: 2 }}>
            <span onClick={(e) => { e.stopPropagation(); goMember(name); }} style={{ cursor: 'pointer' }}>{name}</span> 推荐 · {time}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setV(!v); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 6, flexShrink: 0,
            background: v ? c.warm + '15' : c.s2,
            border: `1px solid ${v ? c.warm + '40' : c.line}`,
            color: v ? c.warm : c.text2, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          ▲ {initV + (v ? 1 : 0)}
        </button>
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} commentCount={commentCount} compact />
    </div>
  );
}

/* ═══ FeedCommentNotice ═══ */
interface FeedCommentNoticeProps extends InteractionProps {
  name: string; text: string; targetTitle: string;
  targetType: string; time: string; navTarget?: string;
}

/* ═══ FeedActionNotice ═══ */
type ActionNoticeAction = 'event_join' | 'photo_upload' | 'movie_nominate' | 'movie_vote'
  | 'book_vote' | 'task_claim' | 'host_help' | 'interest_express' | 'film_select'
  | 'mention' | 'event_invite' | 'task_assign'
  | 'postcard_received' | 'waitlist_offered' | 'waitlist_approved'
  | 'proposal_realized';

interface FeedActionNoticeProps extends InteractionProps {
  action: ActionNoticeAction;
  name: string;
  targetTitle: string;
  time: string;
  detail?: string;
  photoUrls?: string[];
  navTarget?: string;
}

const actionConfig: Record<ActionNoticeAction, { emoji: string; text: (p: FeedActionNoticeProps) => string }> = {
  event_join:       { emoji: '🙋', text: p => `${p.name} 加入了「${p.targetTitle}」` },
  photo_upload:     { emoji: '📷', text: p => `${p.name} 上传了 ${p.detail} 到「${p.targetTitle}」` },
  movie_nominate:   { emoji: '🎬', text: p => `${p.name} 提名了「${p.detail}」到「${p.targetTitle}」` },
  movie_vote:       { emoji: '▲',  text: p => `${p.name} 投票了「${p.targetTitle}」` },
  book_vote:        { emoji: '▲',  text: p => `${p.name} 投票了「${p.targetTitle}」` },
  task_claim:       { emoji: '✋', text: p => `${p.name} 认领了「${p.targetTitle}」的分工：${p.detail}` },
  host_help:        { emoji: '🙋', text: p => `${p.name} 添加了分工：${p.detail}` },
  interest_express: { emoji: '💡', text: p => `${p.name} 对「${p.targetTitle}」感兴趣` },
  film_select:      { emoji: '🎬', text: p => `${p.name} 选定了「${p.detail}」为「${p.targetTitle}」的放映` },
  mention:          { emoji: '💬', text: p => `${p.name} 在「${p.targetTitle}」中提到了你` },
  event_invite:     { emoji: '📩', text: p => `${p.name} 邀请你参加「${p.targetTitle}」` },
  task_assign:      { emoji: '📋', text: p => `你在「${p.targetTitle}」中被安排了分工${p.detail ? `：${p.detail}` : ''}` },
  postcard_received:{ emoji: '✉️', text: p => `${p.name} 给你寄了一张感谢卡` },
  waitlist_offered: { emoji: '🎉', text: p => `「${p.targetTitle}」有名额了，请在 24 小时内确认` },
  waitlist_approved:{ emoji: '✅', text: p => `你已被接纳参加「${p.targetTitle}」` },
  proposal_realized:{ emoji: '💡', text: p => `你感兴趣的创意「${p.targetTitle}」变成活动了` },
};

export function FeedActionNotice(props: FeedActionNoticeProps) {
  const { action, name, time, photoUrls, navTarget, likes, likedBy, comments, newComments, commentCount } = props;
  const c = useColors();
  const navigate = useNavigate();
  const goNav = navTarget ? () => navigate(navTarget) : undefined;
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);
  const cfg = actionConfig[action];

  return (
    <div style={{ background: c.s1, borderRadius: 10, border: `1px solid ${c.line}`, overflow: 'hidden' }}>
      <div onClick={goNav} style={{ display: 'flex', gap: 8, padding: '10px 12px', cursor: goNav ? 'pointer' : 'default', alignItems: 'flex-start' }}>
        <Ava name={name} size={24} onTap={() => goMember(name)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13 }}>
            {cfg.emoji}{' '}{cfg.text(props)}
            <span style={{ color: c.text3, marginLeft: 6 }}>{time}</span>
          </div>
          {action === 'photo_upload' && photoUrls && photoUrls.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {photoUrls.slice(0, 3).map((url, i) => (
                <div key={i} style={{ width: 36, height: 36, borderRadius: 4, background: url, overflow: 'hidden' }} />
              ))}
              {photoUrls.length > 3 && (
                <div style={{
                  width: 36, height: 36, borderRadius: 4, background: c.s2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: c.text3, fontWeight: 600,
                }}>
                  +{photoUrls.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} commentCount={commentCount} compact />
    </div>
  );
}

/* ═══ FeedNewMember (introducing / welcomed) ═══ */
interface FeedNewMemberProps {
  phase: 'introducing' | 'welcomed';
  id: string;
  name: string;
  bio: string;
  location: string;
  selfAsFriend: string;
  idealFriend: string;
  participationPlan: string;
  announcedAt: string;
  announcedEndAt: string;
  approvedAt?: string;
  avatar?: string;
  likes: number;
  likedBy: string[];
}

export function FeedNewMember({ phase, id, name, bio, location, selfAsFriend, participationPlan, avatar, likes: initLikes, likedBy: initLikedBy }: FeedNewMemberProps) {
  const c = useColors();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initLikes);
  const [likedNames, setLikedNames] = useState(initLikedBy);

  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  const handleLike = async () => {
    if (!user?.id) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);
    if (!wasLiked && user.name && !likedNames.includes(user.name)) {
      setLikedNames(prev => [...prev, user.name]);
    }
    try {
      const { toggleLike } = await import('@/lib/domainApi');
      await toggleLike('user', id, user.id);
    } catch { /* optimistic */ }
  };

  const isIntroducing = phase === 'introducing';
  const emoji = isIntroducing ? '👋' : '🎉';
  const headline = isIntroducing
    ? <><b style={{ cursor: 'pointer' }} onClick={() => goMember(name)}>{name}</b> 即将加入串门儿</>
    : <>欢迎 <b style={{ cursor: 'pointer' }} onClick={() => goMember(name)}>{name}</b> 加入串门儿！</>;

  return (
    <Card glow>
      <div style={{ padding: 16, cursor: 'pointer' }} onClick={() => goMember(name)}>
        {/* Header: emoji + headline */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{emoji}</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{headline}</div>
          {location && (
            <div style={{ fontSize: 12, color: c.text3, marginTop: 4 }}>📍 {location}</div>
          )}
        </div>

        {/* Avatar (if available) */}
        {avatar && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Ava name={name} src={avatar} size={56} onTap={() => goMember(name)} />
          </div>
        )}

        {/* Bio block */}
        {bio && (
          <div style={{
            background: c.s2,
            borderRadius: 8,
            padding: 12,
            marginBottom: 10,
            fontSize: 14,
            color: c.text2,
            lineHeight: 1.6,
          }}>
            {bio}
          </div>
        )}

        {/* Extra info */}
        {selfAsFriend && (
          <div style={{ fontSize: 13, color: c.text2, marginBottom: 6 }}>
            <span style={{ fontWeight: 600, color: c.text }}>作为朋友：</span>{selfAsFriend}
          </div>
        )}
        {participationPlan && (
          <div style={{ fontSize: 13, color: c.text2, marginBottom: 6 }}>
            <span style={{ fontWeight: 600, color: c.text }}>参与计划：</span>{participationPlan}
          </div>
        )}
      </div>

      {/* Like bar (no comments) */}
      <div>
        <div style={{ height: 1, background: c.line + '30', margin: '0 14px' }} />
        <div style={{ display: 'flex', gap: 16, padding: '7px 14px' }}>
          <button
            onClick={handleLike}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontSize: 14, color: liked ? c.warm : c.text3,
            }}
          >
            {liked
              ? <FavoriteRounded sx={{ fontSize: 18 }} />
              : <FavoriteBorderRounded sx={{ fontSize: 18 }} />
            }
            {' '}欢迎{likeCount > 0 ? ` ${likeCount}` : ''}
          </button>
        </div>
        {likedNames.length > 0 && (
          <div style={{ padding: '0 14px 8px', fontSize: 12, color: c.text3 }}>
            {likedNames.slice(0, 3).join('、')}{likedNames.length > 3 ? ` 等 ${likedNames.length} 人` : ''} 欢迎
          </div>
        )}
      </div>
    </Card>
  );
}

/* ═══ FeedBirthday ═══ */
interface FeedBirthdayProps extends InteractionProps {
  id: string;
  name: string;
  avatar?: string;
  birthday: string;
}

export function FeedBirthday({ id, name, avatar, likes, likedBy, comments, newComments, commentCount }: FeedBirthdayProps) {
  const c = useColors();
  const navigate = useNavigate();
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <Card glow>
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>🎂</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <Ava name={name} src={avatar} size={48} badge="🎂" onTap={() => goMember(name)} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          今天是 <b style={{ cursor: 'pointer' }} onClick={() => goMember(name)}>{name}</b> 的生日！
        </div>
        <div style={{ fontSize: 13, color: c.text3, marginTop: 4 }}>祝 ta 生日快乐 🎉</div>
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} commentCount={commentCount} entityType="user" entityId={id} />
    </Card>
  );
}

export function FeedCommentNotice({ name, text, targetTitle, time, navTarget, likes, likedBy, comments, newComments, commentCount }: FeedCommentNoticeProps) {
  const c = useColors();
  const navigate = useNavigate();
  const goNav = navTarget ? () => navigate(navTarget) : undefined;
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <div style={{ background: c.s1, borderRadius: 10, border: `1px solid ${c.line}`, overflow: 'hidden' }}>
      <div onClick={goNav} style={{ display: 'flex', gap: 8, padding: '10px 12px', cursor: goNav ? 'pointer' : 'default', alignItems: 'flex-start' }}>
        <Ava name={name} size={24} onTap={() => goMember(name)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13 }}>
            <b onClick={(e) => { e.stopPropagation(); goMember(name); }} style={{ cursor: 'pointer' }}>{name}</b>
            {' '}评论了{' '}
            <span style={{ fontWeight: 600 }}>「{targetTitle}」</span>
            <span style={{ color: c.text3, marginLeft: 6 }}>{time}</span>
          </div>
          <div style={{
            fontSize: 13, color: c.text2, marginTop: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            💬 {text}
          </div>
        </div>
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} commentCount={commentCount} compact />
    </div>
  );
}
