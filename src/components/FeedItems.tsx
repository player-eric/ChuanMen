import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/auth/AuthContext';
import type { FeedComment } from '@/types';
import FavoriteBorderRounded from '@mui/icons-material/FavoriteBorderRounded';
import FavoriteRounded from '@mui/icons-material/FavoriteRounded';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import { Ava, AvaStack, Card } from './Atoms';
import { Poster } from './Poster';
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
}

/* ═══ FeedActions (shared like + comment bar) ═══ */
export function FeedActions({ likes, likedBy, comments, compact, newComments }: InteractionProps & { compact?: boolean; newComments?: number }) {
  const c = useColors();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [localComments, setLocalComments] = useState(comments);
  const [input, setInput] = useState('');

  const likeCount = likes + (liked ? 1 : 0);
  const px = compact ? 10 : 14;

  const handleSubmit = () => {
    if (!input.trim() || !user) return;
    setLocalComments(prev => [...prev, { name: user.name, text: input.trim(), date: '刚刚' }]);
    setInput('');
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
          onClick={() => setLiked(!liked)}
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
          {localComments.length > 0 ? ` ${localComments.length}` : ''}
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
                <div style={{ fontSize: compact ? 13 : 14, color: c.text2, marginTop: 1 }}>{cm.text}</div>
              </div>
            </div>
          ))}

          {/* Comment input */}
          {user && (
            <div style={{ display: 'flex', gap: 8, marginTop: localComments.length > 0 ? 4 : 0, alignItems: 'center' }}>
              <Ava name={user.name} size={compact ? 20 : 24} />
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="写评论..."
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 8,
                  background: c.s2, border: `1px solid ${c.line}`,
                  color: c.text, fontSize: compact ? 13 : 14, outline: 'none',
                }}
              />
              {input.trim() && (
                <button
                  onClick={handleSubmit}
                  style={{
                    padding: '5px 12px', borderRadius: 6, flexShrink: 0,
                    background: c.warm, border: 'none',
                    color: c.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer',
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
interface FeedActivityProps extends InteractionProps {
  name: string; title: string; date: string; location: string;
  spots: number; people: string[]; film?: string; scene?: string;
  navTarget?: string;
}

export function FeedActivity({ name, title, date, location, spots, people, film, scene, navTarget, likes, likedBy, comments, newComments }: FeedActivityProps) {
  const c = useColors();
  const [joined, setJoined] = useState(false);
  const navigate = useNavigate();
  const goNav = navTarget ? () => navigate(navTarget) : undefined;
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <Card>
      {scene && (
        <div onClick={goNav} style={{ cursor: goNav ? 'pointer' : 'default' }}>
          <ScenePhoto scene={scene} h={90}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: `linear-gradient(transparent, ${c.s1})` }} />
            <div style={{ position: 'absolute', top: 8, right: 10 }}>
              <div style={{ padding: '3px 8px', background: `${c.s2}cc`, backdropFilter: 'blur(8px)', borderRadius: 5, fontSize: 11, color: c.text2 }}>{date}</div>
            </div>
            {film && <div style={{ position: 'absolute', bottom: 8, left: 10 }}><Poster title={film} w={32} h={44} /></div>}
          </ScenePhoto>
        </div>
      )}
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Ava name={name} size={32} badge="🏠" onTap={() => goMember(name)} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14 }}><b onClick={() => goMember(name)} style={{ cursor: 'pointer' }}>{name}</b> 发起了活动</div>
            <div style={{ fontSize: 12, color: c.text3 }}>2 小时前</div>
          </div>
        </div>
        <div onClick={goNav} style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, cursor: goNav ? 'pointer' : 'default' }}>{title}</div>
        {!scene && <div style={{ fontSize: 13, color: c.text2, marginBottom: 8 }}>{date} · {location}</div>}
        {scene && <div style={{ fontSize: 13, color: c.text2, marginBottom: 8 }}>{location}</div>}
        {!scene && film && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: c.s2, borderRadius: 6, marginBottom: 8 }}>
            <Poster title={film} w={20} h={28} /><span style={{ fontSize: 12, color: c.text2 }}>放映 {film}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <AvaStack names={people} />
          <span style={{ fontSize: 12, color: spots > 0 ? c.green : c.red }}>{spots > 0 ? `还剩 ${spots} 位` : '已满 · 可排队'}</span>
        </div>
        <div style={{ background: c.warmDim, borderRadius: 6, padding: '5px 10px', marginBottom: 10, fontSize: 12, color: c.warm }}>
          {'💡'} 星星也报名了（你们一起参加过 2 次活动）
        </div>
        <button
          onClick={() => setJoined(!joined)}
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
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} />
    </Card>
  );
}

/* ═══ FeedCard ═══ */
interface FeedCardProps extends InteractionProps {
  from: string; to: string; msg: string; photo?: string; navTarget?: string;
}

export function FeedCard({ from, to, msg, photo, navTarget, likes, likedBy, comments, newComments }: FeedCardProps) {
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
            <div style={{ fontSize: 12, color: c.text3 }}>5 小时前 · 🌐 公开</div>
          </div>
        </div>
        <PostCard from={from} to={to} msg={msg} stamp="🎬" photo={photo} />
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} />
    </Card>
  );
}

/* ═══ FeedMovie ═══ */
interface FeedMovieProps extends InteractionProps {
  name: string; title: string; year: string; dir: string; votes: number;
}

export function FeedMovie({ name, title, year, dir, votes: initV, likes, likedBy, comments, newComments }: FeedMovieProps) {
  const c = useColors();
  const [v, setV] = useState(false);
  const navigate = useNavigate();
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <Card>
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Ava name={name} size={32} onTap={() => goMember(name)} />
          <div>
            <div style={{ fontSize: 14 }}><b onClick={() => goMember(name)} style={{ cursor: 'pointer' }}>{name}</b> 推荐了一部电影</div>
            <div style={{ fontSize: 12, color: c.text3 }}>昨天</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Poster title={title} w={52} h={72} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 12, color: c.text3, marginTop: 2 }}>{year} · {dir}</div>
            <div style={{ marginTop: 6 }}>
              <button
                onClick={() => setV(!v)}
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
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} />
    </Card>
  );
}

/* ═══ FeedMilestone ═══ */
interface FeedMilestoneProps extends InteractionProps {
  text: string; emoji: string;
}

export function FeedMilestone({ text, emoji, likes, likedBy, comments, newComments }: FeedMilestoneProps) {
  return (
    <Card glow>
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>{emoji}</div>
        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{text}</div>
      </div>
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} />
    </Card>
  );
}

/* ═══ FeedProposal ═══ */
interface FeedProposalProps extends InteractionProps {
  name: string; title: string; votes: number; interested: string[];
}

export function FeedProposal({ name, title, votes: initV, interested, likes, likedBy, comments, newComments }: FeedProposalProps) {
  const c = useColors();
  const [v, setV] = useState(false);
  const navigate = useNavigate();
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <Card>
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Ava name={name} size={32} onTap={() => goMember(name)} />
          <div>
            <div style={{ fontSize: 14 }}><b onClick={() => goMember(name)} style={{ cursor: 'pointer' }}>{name}</b> 提了一个活动创意</div>
            <div style={{ fontSize: 12, color: c.text3 }}>3 天前</div>
          </div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{'💡'} {title}</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <AvaStack names={interested} size={18} />
          <span style={{ fontSize: 12, color: c.text3 }}>{interested.length} 人感兴趣</span>
        </div>
        <button
          onClick={() => setV(!v)}
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
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} />
    </Card>
  );
}

/* ═══ FeedCompactMovie ═══ */
interface FeedCompactMovieProps extends InteractionProps {
  name: string; title: string; year: string; dir: string;
  votes: number; time: string; navTarget?: string;
}

export function FeedCompactMovie({ name, title, year, dir, votes: initV, time, navTarget, likes, likedBy, comments, newComments }: FeedCompactMovieProps) {
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
          <div style={{ fontSize: 12, color: c.text3, marginTop: 1 }}>{year} · {dir}</div>
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
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} compact />
    </div>
  );
}

/* ═══ FeedCompactProposal ═══ */
interface FeedCompactProposalProps extends InteractionProps {
  name: string; title: string; votes: number;
  interested: string[]; time: string; navTarget?: string;
}

export function FeedCompactProposal({ name, title, votes: initV, interested, time, navTarget, likes, likedBy, comments, newComments }: FeedCompactProposalProps) {
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
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} compact />
    </div>
  );
}

/* ═══ FeedBook ═══ */
interface FeedBookProps extends InteractionProps {
  name: string; title: string; year: string; author: string; votes: number;
}

export function FeedBook({ name, title, year, author, votes: initV, likes, likedBy, comments, newComments }: FeedBookProps) {
  const c = useColors();
  const [v, setV] = useState(false);
  const navigate = useNavigate();
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <Card>
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Ava name={name} size={32} onTap={() => goMember(name)} />
          <div>
            <div style={{ fontSize: 14 }}><b onClick={() => goMember(name)} style={{ cursor: 'pointer' }}>{name}</b> 推荐了一本书</div>
            <div style={{ fontSize: 12, color: c.text3 }}>昨天</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Poster title={title} w={52} h={72} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 12, color: c.text3, marginTop: 2 }}>{year} · {author}</div>
            <div style={{ marginTop: 6 }}>
              <button
                onClick={() => setV(!v)}
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
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} />
    </Card>
  );
}

/* ═══ FeedSmallGroup ═══ */
interface FeedSmallGroupProps extends InteractionProps {
  name: string; title: string; date: string; location: string;
  weekNumber: number; people: string[]; capacity: number;
  description?: string; isHome?: boolean; isPrivate?: boolean; navTarget?: string;
}

export function FeedSmallGroup({ name, title, date, location, weekNumber, people, capacity, isPrivate, navTarget, likes, likedBy, comments, newComments }: FeedSmallGroupProps) {
  const c = useColors();
  const [joined, setJoined] = useState(false);
  const navigate = useNavigate();
  const goNav = navTarget ? () => navigate(navTarget) : undefined;
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
        <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} />
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Ava name={name} size={32} badge="🎲" onTap={() => goMember(name)} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14 }}><b onClick={() => goMember(name)} style={{ cursor: 'pointer' }}>{name}</b> 发起了小局</div>
            <div style={{ fontSize: 12, color: c.text3 }}>做东 · {date}</div>
          </div>
          <div style={{
            padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: c.warmDim, color: c.warm, alignSelf: 'flex-start',
          }}>
            🎲 第 {weekNumber} 期
          </div>
        </div>
        <div onClick={goNav} style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, cursor: goNav ? 'pointer' : 'default' }}>{title}</div>
        <div style={{ fontSize: 13, color: c.text2, marginBottom: 8 }}>📍 {location}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <AvaStack names={people} />
          <span style={{ fontSize: 12, color: people.length < capacity ? c.green : c.red }}>{people.length}/{capacity}</span>
        </div>
        <button
          onClick={() => setJoined(!joined)}
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
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} />
    </Card>
  );
}

/* ═══ FeedCompactSmallGroup ═══ */
interface FeedCompactSmallGroupProps extends InteractionProps {
  name: string; title: string; date: string; location: string;
  weekNumber: number; people: string[]; capacity: number;
  time: string; isPrivate?: boolean; navTarget?: string;
}

export function FeedCompactSmallGroup({ name, title, date, location, weekNumber, people, capacity, time, isPrivate, navTarget, likes, likedBy, comments, newComments }: FeedCompactSmallGroupProps) {
  const c = useColors();
  const [joined, setJoined] = useState(false);
  const navigate = useNavigate();
  const goNav = navTarget ? () => navigate(navTarget) : undefined;
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  if (isPrivate) {
    return (
      <div style={{ background: c.s1, borderRadius: 10, border: `1px solid ${c.line}`, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 13, color: c.text2 }}>
            <span onClick={() => goMember(name)} style={{ cursor: 'pointer', fontWeight: 600 }}>{name}</span> 发起了私密局 · {time}
          </div>
        </div>
        <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} compact />
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
            onClick={(e) => { e.stopPropagation(); setJoined(!joined); }}
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
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} compact />
    </div>
  );
}

/* ═══ FeedCompactBook ═══ */
interface FeedCompactBookProps extends InteractionProps {
  name: string; title: string; year: string; author: string;
  votes: number; time: string; navTarget?: string;
}

export function FeedCompactBook({ name, title, year, author, votes: initV, time, navTarget, likes, likedBy, comments, newComments }: FeedCompactBookProps) {
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
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} compact />
    </div>
  );
}

/* ═══ FeedCommentNotice ═══ */
interface FeedCommentNoticeProps extends InteractionProps {
  name: string; text: string; targetTitle: string;
  targetType: string; time: string; navTarget?: string;
}

export function FeedCommentNotice({ name, text, targetTitle, time, navTarget, likes, likedBy, comments, newComments }: FeedCommentNoticeProps) {
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
      <FeedActions likes={likes} likedBy={likedBy} comments={comments} newComments={newComments} compact />
    </div>
  );
}
