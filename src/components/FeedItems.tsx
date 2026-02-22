import { useState } from 'react';
import { useNavigate } from 'react-router';
import { c } from '@/theme';
import { Ava, AvaStack, Card, Btn } from './Atoms';
import { Poster } from './Poster';
import { PostCard } from './PostCard';
import { ScenePhoto } from './ScenePhoto';

/* ═══ FeedTime ═══ */
export function FeedTime({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <div style={{ flex: 1, height: 1, background: c.line + '60' }} />
      <span style={{ fontSize: 10, color: c.text3, fontWeight: 500, letterSpacing: '0.03em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: c.line + '60' }} />
    </div>
  );
}

/* ═══ FeedActivity ═══ */
interface FeedActivityProps {
  name: string; title: string; date: string; location: string;
  spots: number; people: string[]; film?: string; scene?: string;
  navTarget?: string;
}

export function FeedActivity({ name, title, date, location, spots, people, film, scene, navTarget }: FeedActivityProps) {
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
              <div style={{ padding: '3px 8px', background: `${c.s2}cc`, backdropFilter: 'blur(8px)', borderRadius: 5, fontSize: 9, color: c.text2 }}>{date}</div>
            </div>
            {film && <div style={{ position: 'absolute', bottom: 8, left: 10 }}><Poster title={film} w={32} h={44} /></div>}
          </ScenePhoto>
        </div>
      )}
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Ava name={name} size={32} badge="🏠" onTap={() => goMember(name)} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12 }}><b onClick={() => goMember(name)} style={{ cursor: 'pointer' }}>{name}</b> 发起了活动</div>
            <div style={{ fontSize: 10, color: c.text3 }}>2 小时前</div>
          </div>
        </div>
        <div onClick={goNav} style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, cursor: goNav ? 'pointer' : 'default' }}>{title}</div>
        {!scene && <div style={{ fontSize: 11, color: c.text2, marginBottom: 8 }}>{date} · {location}</div>}
        {scene && <div style={{ fontSize: 11, color: c.text2, marginBottom: 8 }}>{location}</div>}
        {!scene && film && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: c.s2, borderRadius: 6, marginBottom: 8 }}>
            <Poster title={film} w={20} h={28} /><span style={{ fontSize: 10, color: c.text2 }}>放映 {film}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <AvaStack names={people} />
          <span style={{ fontSize: 10, color: spots > 0 ? c.green : c.red }}>{spots > 0 ? `还剩 ${spots} 位` : '已满 · 可排队'}</span>
        </div>
        <div style={{ background: c.warmDim, borderRadius: 6, padding: '5px 10px', marginBottom: 10, fontSize: 10, color: c.warm }}>
          {'💡'} 星星也报名了（你们一起参加过 2 次活动）
        </div>
        <button
          onClick={() => setJoined(!joined)}
          style={{
            width: '100%', padding: '9px 0', borderRadius: 8,
            background: joined ? c.s2 : c.warm,
            border: joined ? `1px solid ${c.green}30` : 'none',
            color: joined ? c.green : c.bg,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {joined ? '✓ 已报名' : '报名参加'}
        </button>
      </div>
    </Card>
  );
}

/* ═══ FeedCard ═══ */
interface FeedCardProps {
  from: string; to: string; msg: string; photo?: string; navTarget?: string;
}

export function FeedCard({ from, to, msg, photo, navTarget }: FeedCardProps) {
  const navigate = useNavigate();
  const goNav = navTarget ? () => navigate(navTarget) : undefined;
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <Card glow>
      <div onClick={goNav} style={{ padding: 14, cursor: goNav ? 'pointer' : 'default' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Ava name={from} size={32} onTap={() => goMember(from)} />
          <div>
            <div style={{ fontSize: 12 }}>
              <b onClick={(e) => { e.stopPropagation(); goMember(from); }} style={{ cursor: 'pointer' }}>{from}</b> 给{' '}
              <b onClick={(e) => { e.stopPropagation(); goMember(to); }} style={{ cursor: 'pointer' }}>{to}</b> 寄了一张感谢卡
            </div>
            <div style={{ fontSize: 10, color: c.text3 }}>5 小时前 · 🌐 公开</div>
          </div>
        </div>
        <PostCard from={from} to={to} msg={msg} stamp="🎬" photo={photo} />
      </div>
    </Card>
  );
}

/* ═══ FeedMovie ═══ */
interface FeedMovieProps {
  name: string; title: string; year: string; dir: string; votes: number;
}

export function FeedMovie({ name, title, year, dir, votes: initV }: FeedMovieProps) {
  const [v, setV] = useState(false);
  const navigate = useNavigate();
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <Card>
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Ava name={name} size={32} onTap={() => goMember(name)} />
          <div>
            <div style={{ fontSize: 12 }}><b onClick={() => goMember(name)} style={{ cursor: 'pointer' }}>{name}</b> 推荐了一部电影</div>
            <div style={{ fontSize: 10, color: c.text3 }}>昨天</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Poster title={title} w={52} h={72} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 11, color: c.text3, marginTop: 2 }}>{year} · {dir}</div>
            <div style={{ marginTop: 6 }}>
              <button
                onClick={() => setV(!v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 12px', borderRadius: 6,
                  background: v ? c.warm + '15' : c.s2,
                  border: `1px solid ${v ? c.warm + '40' : c.line}`,
                  color: v ? c.warm : c.text2,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                ▲ {initV + (v ? 1 : 0)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ═══ FeedMilestone (v2.1: "系统横幅" not "Agent 横幅") ═══ */
export function FeedMilestone({ text, emoji }: { text: string; emoji: string }) {
  return (
    <Card glow>
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>{emoji}</div>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{text}</div>
      </div>
    </Card>
  );
}

/* ═══ FeedProposal ═══ */
interface FeedProposalProps {
  name: string; title: string; votes: number; interested: string[];
}

export function FeedProposal({ name, title, votes: initV, interested }: FeedProposalProps) {
  const [v, setV] = useState(false);
  const navigate = useNavigate();
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <Card>
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Ava name={name} size={32} onTap={() => goMember(name)} />
          <div>
            <div style={{ fontSize: 12 }}><b onClick={() => goMember(name)} style={{ cursor: 'pointer' }}>{name}</b> 提了一个活动想法</div>
            <div style={{ fontSize: 10, color: c.text3 }}>3 天前</div>
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{'💡'} {title}</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <AvaStack names={interested} size={18} />
          <span style={{ fontSize: 10, color: c.text3 }}>{interested.length} 人感兴趣</span>
        </div>
        <button
          onClick={() => setV(!v)}
          style={{
            padding: '6px 16px', borderRadius: 6,
            background: v ? c.blue + '15' : c.s2,
            border: `1px solid ${v ? c.blue + '40' : c.line}`,
            color: v ? c.blue : c.text2,
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {v ? '✓ 我也感兴趣' : '我感兴趣'} · {initV + (v ? 1 : 0)}
        </button>
      </div>
    </Card>
  );
}

/* ═══ FeedSeed: removed in v2.1 (moved to V2) ═══ */

/* ═══ FeedDiscussion: removed from feed in v2.1 (moved to V2) ═══ */

/* ═══ FeedCompactMovie ═══ */
interface FeedCompactMovieProps {
  name: string; title: string; year: string; dir: string;
  votes: number; time: string; navTarget?: string;
}

export function FeedCompactMovie({ name, title, year, dir, votes: initV, time, navTarget }: FeedCompactMovieProps) {
  const [v, setV] = useState(false);
  const navigate = useNavigate();
  const goNav = navTarget ? () => navigate(navTarget) : undefined;
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <div onClick={goNav} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: c.s1, borderRadius: 10, border: `1px solid ${c.line}`, cursor: goNav ? 'pointer' : 'default' }}>
      <Poster title={title} w={36} h={50} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 10, color: c.text3, marginTop: 1 }}>{year} · {dir}</div>
        <div style={{ fontSize: 9, color: c.text3, marginTop: 2 }}>
          <span onClick={(e) => { e.stopPropagation(); goMember(name); }} style={{ cursor: 'pointer' }}>{name}</span> 推荐 · {time}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); setV(!v); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 6, flexShrink: 0,
          background: v ? c.warm + '15' : c.s2,
          border: `1px solid ${v ? c.warm + '40' : c.line}`,
          color: v ? c.warm : c.text2, fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}
      >
        ▲ {initV + (v ? 1 : 0)}
      </button>
    </div>
  );
}

/* ═══ FeedCompactProposal ═══ */
interface FeedCompactProposalProps {
  name: string; title: string; votes: number;
  interested: string[]; time: string; navTarget?: string;
}

export function FeedCompactProposal({ name, title, votes: initV, interested, time, navTarget }: FeedCompactProposalProps) {
  const [v, setV] = useState(false);
  const navigate = useNavigate();
  const goNav = navTarget ? () => navigate(navTarget) : undefined;
  const goMember = (n: string) => navigate(`/members/${encodeURIComponent(n)}`);

  return (
    <div onClick={goNav} style={{ padding: '10px 12px', background: c.s1, borderRadius: 10, border: `1px solid ${c.line}`, cursor: goNav ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{'💡'} {title}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Ava name={name} size={18} onTap={() => goMember(name)} />
          <span onClick={(e) => { e.stopPropagation(); goMember(name); }} style={{ fontSize: 10, color: c.text3, cursor: 'pointer' }}>{name}</span>
          <span style={{ fontSize: 10, color: c.text3 }}>· {time}</span>
          <AvaStack names={interested} size={16} />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setV(!v); }}
          style={{
            padding: '3px 10px', borderRadius: 5,
            background: v ? c.blue + '15' : c.s2,
            border: `1px solid ${v ? c.blue + '40' : c.line}`,
            color: v ? c.blue : c.text3, fontSize: 10, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {v ? '✓' : '🙋'} {initV + (v ? 1 : 0)}
        </button>
      </div>
    </div>
  );
}
