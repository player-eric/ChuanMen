import { useState, useEffect, useRef } from "react";

/*
  串门儿 · 终极完整版 Demo
  
  This is what the full product looks like.
  Every module from the PRD. Real app feel.
  Bottom nav, pages, transitions, rich data.
*/

const c = {
  bg: "#0C0C0E", s1: "#141416", s2: "#1C1C1F", s3: "#262629",
  line: "#2A2A2F", text: "#E8E6E2", text2: "#9A9894", text3: "#5A5854",
  warm: "#D4A574", warmDim: "#D4A57412", warmGlow: "#D4A57425",
  paper: "#F5F0E8", paperDark: "#E8E0D4",
  ink: "#2C2420", inkLight: "#5C5248",
  green: "#6BCB77", blue: "#5B8DEF", red: "#E85D5D", stamp: "#C4442A",
};
const f = "'PingFang SC','Noto Sans SC',-apple-system,sans-serif";
const hf = "'Georgia','Noto Serif SC',serif";

/* ═══ POSTERS & PHOTOS ═══ */
const posters = {
  "花样年华": { bg: "linear-gradient(160deg, #1a0a0a 0%, #4a1528 35%, #8b2252 65%, #2a0a1a 100%)", accent: "#e8a0b0", sub: "In the Mood for Love · 2000" },
  "重庆森林": { bg: "linear-gradient(150deg, #0a1a2a 0%, #1a4a3a 30%, #2a8a5a 55%, #0a2a1a 100%)", accent: "#7ed4a0", sub: "Chungking Express · 1994" },
  "惊魂记": { bg: "linear-gradient(170deg, #1a1a1a 0%, #2a2a3a 40%, #4a3a5a 70%, #0a0a1a 100%)", accent: "#b0a0d0", sub: "Psycho · 1960" },
  "永恒和一日": { bg: "linear-gradient(145deg, #1a1a0a 0%, #3a3a1a 35%, #6a6a2a 60%, #1a1a0a 100%)", accent: "#d4d490", sub: "Eternity and a Day · 1998" },
  "东京物语": { bg: "linear-gradient(155deg, #0a0a0a 0%, #2a1a0a 40%, #5a3a1a 65%, #1a0a0a 100%)", accent: "#d4a870", sub: "Tokyo Story · 1953" },
  "燃烧女子的肖像": { bg: "linear-gradient(165deg, #0a0a1a 0%, #1a1a4a 35%, #3a2a6a 60%, #0a0a2a 100%)", accent: "#a0a0e8", sub: "Portrait of a Lady on Fire · 2019" },
  "寄生虫": { bg: "linear-gradient(140deg, #0a1a0a 0%, #1a3a1a 30%, #2a5a2a 55%, #0a1a0a 100%)", accent: "#80c880", sub: "Parasite · 2019" },
  "千与千寻": { bg: "linear-gradient(155deg, #1a0a1a 0%, #3a1a4a 35%, #5a2a7a 60%, #1a0a2a 100%)", accent: "#c890d8", sub: "Spirited Away · 2001" },
  "春光乍泄": { bg: "linear-gradient(160deg, #2a1a0a 0%, #5a3a0a 35%, #8a5a1a 55%, #2a1a0a 100%)", accent: "#e8c870", sub: "Happy Together · 1997" },
};

const photos = {
  movieNight: "linear-gradient(135deg, #1a1520 0%, #2a2035 20%, #3a2530 40%, #4a2838 55%, #2a1825 75%, #1a1018 100%)",
  potluck: "linear-gradient(140deg, #1a1810 0%, #2a2818 20%, #4a4028 40%, #3a3520 60%, #282518 80%, #1a1810 100%)",
  hike: "linear-gradient(130deg, #0a1a20 0%, #1a3040 20%, #204a58 40%, #286050 55%, #1a3040 75%, #0a1a20 100%)",
  cozy: "linear-gradient(145deg, #201510 0%, #352518 20%, #4a3525 40%, #3a2a20 60%, #302015 80%, #201510 100%)",
};

function Poster({ title, w = 48, h = 66 }) {
  const p = posters[title] || { bg: `linear-gradient(135deg, ${c.s3}, ${c.s2})`, accent: c.text3, sub: "" };
  return (
    <div style={{
      width: w, height: h, borderRadius: 4, background: p.bg,
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      padding: Math.max(3, w * 0.06), overflow: "hidden", flexShrink: 0,
      position: "relative", boxShadow: `0 2px 8px ${c.bg}60`,
    }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 40%, rgba(0,0,0,0.6))" }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: Math.max(7, w * 0.15), fontWeight: 800, color: p.accent, lineHeight: 1.2, textShadow: `0 1px 3px rgba(0,0,0,0.5)` }}>{title}</div>
        {w > 40 && p.sub && <div style={{ fontSize: Math.max(5, w * 0.08), color: "rgba(255,255,255,0.4)", marginTop: 1, lineHeight: 1.2 }}>{p.sub.split("·")[0]}</div>}
      </div>
    </div>
  );
}

/* Scene photo — multi-layered fake photograph */
function ScenePhoto({ scene = "movieNight", h = 190, children, style = {} }) {
  const scenes = {
    movieNight: {
      bg: "linear-gradient(165deg, #0d0810 0%, #1a1225 20%, #261a30 45%, #1d1528 70%, #100a18 100%)",
      lights: [
        { x: "50%", y: "30%", w: 120, h: 80, color: "rgba(80,60,160,0.18)", blur: 30 },
        { x: "50%", y: "35%", w: 60, h: 40, color: "rgba(200,180,255,0.08)", blur: 15 },
        { x: "20%", y: "65%", w: 20, h: 30, color: "rgba(212,165,116,0.25)", blur: 8 },
        { x: "35%", y: "68%", w: 16, h: 24, color: "rgba(212,165,116,0.2)", blur: 6 },
        { x: "55%", y: "63%", w: 18, h: 28, color: "rgba(212,165,116,0.22)", blur: 7 },
        { x: "72%", y: "66%", w: 14, h: 22, color: "rgba(212,165,116,0.18)", blur: 6 },
      ],
      shapes: [
        { x: "50%", y: "28%", w: 90, h: 55, r: 4, color: "rgba(60,50,100,0.4)" },
      ],
    },
    potluck: {
      bg: "linear-gradient(150deg, #141008 0%, #221a0e 25%, #302414 45%, #281e10 70%, #18120a 100%)",
      lights: [
        { x: "50%", y: "40%", w: 140, h: 100, color: "rgba(212,165,116,0.15)", blur: 35 },
        { x: "30%", y: "50%", w: 40, h: 25, color: "rgba(255,200,120,0.2)", blur: 10 },
        { x: "55%", y: "45%", w: 50, h: 30, color: "rgba(255,180,100,0.15)", blur: 12 },
        { x: "70%", y: "55%", w: 35, h: 20, color: "rgba(255,220,150,0.18)", blur: 8 },
        { x: "25%", y: "70%", w: 20, h: 30, color: "rgba(212,165,116,0.25)", blur: 6 },
        { x: "75%", y: "72%", w: 18, h: 26, color: "rgba(212,165,116,0.2)", blur: 6 },
      ],
      shapes: [
        { x: "50%", y: "42%", w: 110, h: 18, r: 60, color: "rgba(80,60,30,0.5)" },
      ],
    },
    hike: {
      bg: "linear-gradient(175deg, #0e1820 0%, #142838 20%, #1a3848 40%, #2a5868 60%, #183040 80%, #0e1820 100%)",
      lights: [
        { x: "60%", y: "15%", w: 80, h: 80, color: "rgba(255,230,180,0.12)", blur: 25 },
        { x: "30%", y: "80%", w: 30, h: 40, color: "rgba(80,160,80,0.15)", blur: 10 },
        { x: "70%", y: "75%", w: 25, h: 35, color: "rgba(80,140,80,0.12)", blur: 8 },
      ],
      shapes: [
        { x: "20%", y: "60%", w: 60, h: 80, r: 0, color: "rgba(20,50,30,0.5)", tri: true },
        { x: "65%", y: "55%", w: 80, h: 90, r: 0, color: "rgba(25,55,35,0.4)", tri: true },
      ],
    },
    cozy: {
      bg: "linear-gradient(155deg, #14100a 0%, #221a10 25%, #302416 45%, #281c0e 70%, #18100a 100%)",
      lights: [
        { x: "35%", y: "35%", w: 60, h: 60, color: "rgba(255,180,80,0.2)", blur: 20 },
        { x: "35%", y: "35%", w: 30, h: 30, color: "rgba(255,200,120,0.15)", blur: 10 },
        { x: "65%", y: "60%", w: 100, h: 60, color: "rgba(212,165,116,0.08)", blur: 25 },
        { x: "25%", y: "70%", w: 16, h: 24, color: "rgba(212,165,116,0.2)", blur: 6 },
        { x: "60%", y: "68%", w: 18, h: 28, color: "rgba(212,165,116,0.18)", blur: 7 },
      ],
      shapes: [
        { x: "33%", y: "30%", w: 22, h: 35, r: 3, color: "rgba(180,120,50,0.3)" },
      ],
    },
  };
  const s = scenes[scene] || scenes.movieNight;
  return (
    <div style={{ width: "100%", height: h, borderRadius: 8, background: s.bg, position: "relative", overflow: "hidden", ...style }}>
      {s.shapes.map((sh, i) => (
        <div key={`sh${i}`} style={{
          position: "absolute", left: sh.x, top: sh.y, transform: "translate(-50%,-50%)",
          width: sh.w, height: sh.h, borderRadius: sh.r || 0,
          background: sh.color,
          ...(sh.tri ? { clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" } : {}),
        }} />
      ))}
      {s.lights.map((l, i) => (
        <div key={`l${i}`} style={{
          position: "absolute", left: l.x, top: l.y, transform: "translate(-50%,-50%)",
          width: l.w, height: l.h, borderRadius: "50%",
          background: `radial-gradient(circle, ${l.color}, transparent 70%)`,
          filter: `blur(${l.blur}px)`,
        }} />
      ))}
      {/* grain */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.12, mixBlendMode: "screen", backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, backgroundSize: "128px 128px" }} />
      {children}
    </div>
  );
}

/* ═══ ATOMS ═══ */
function Ava({ name, size = 28, border, badge, onTap }) {
  const el = (
    <div style={{ position: "relative", flexShrink: 0, cursor: onTap ? "pointer" : undefined }} onClick={onTap}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `hsl(${name.charCodeAt(0) * 37 % 360}, 25%, 22%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, color: c.text2, fontWeight: 600,
        border: border ? `2px solid ${c.s1}` : "none",
      }}>{name[0]}</div>
      {badge && <div style={{ position: "absolute", bottom: -1, right: -1, fontSize: size * 0.35 }}>{badge}</div>}
    </div>
  );
  return el;
}

function AvaStack({ names, size = 22 }) {
  return (
    <div style={{ display: "flex" }}>
      {names.slice(0, 5).map((n, i) => <div key={i} style={{ marginLeft: i ? -6 : 0, zIndex: 5 - i }}><Ava name={n} size={size} border /></div>)}
      {names.length > 5 && <div style={{ marginLeft: -6, width: size, height: size, borderRadius: "50%", background: c.s3, border: `2px solid ${c.s1}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: c.text3 }}>+{names.length - 5}</div>}
    </div>
  );
}

/* ═══ SHARED MEMBERS DATA ═══ */
const membersData = [
  { name: "白开水", role: "核心 Host", host: 8, badge: "🏠", titles: ["🍳 厨神", "🔥 氛围担当"],
    mutual: { movies: ["花样年华", "春光乍泄", "惊魂记"], events: ["02.08 电影夜", "01.25 新年饭局", "01.18 电影夜", "01.05 Potluck"], evtCount: 8, cards: 3 } },
  { name: "大橙子", role: "运营", host: 5, badge: "🏠", titles: ["📸 首席摄影"],
    mutual: { movies: ["寄生虫", "燃烧女子的肖像"], events: ["02.08 电影夜", "01.12 徒步"], evtCount: 4, cards: 1 } },
  { name: "星星", role: "", host: 0, titles: ["🧊 破冰王"],
    mutual: { movies: ["东京物语"], events: ["02.08 电影夜"], evtCount: 2, cards: 2 } },
  { name: "Tiffy", role: "", host: 2, badge: "🏠", titles: ["🍳 厨神"],
    mutual: { movies: ["花样年华", "千与千寻", "惊魂记"], events: ["02.08 电影夜", "01.25 新年饭局"], evtCount: 5, cards: 2 } },
  { name: "小鱼", role: "", host: 0, titles: [],
    mutual: { movies: [], events: ["01.12 徒步"], evtCount: 1, cards: 0 } },
  { name: "Leo", role: "", host: 1, titles: [],
    mutual: { movies: ["重庆森林"], events: ["01.25 新年饭局"], evtCount: 2, cards: 0 } },
  { name: "Mia", role: "新成员", host: 0, titles: [],
    mutual: { movies: [], events: [], evtCount: 0, cards: 0 } },
];

function Stamp({ emoji = "✉", size = 24 }) {
  return (
    <div style={{
      width: size, height: size * 1.22, borderRadius: 2,
      border: `1.5px solid ${c.stamp}`,
      background: `linear-gradient(160deg, #FFF8F0, ${c.paperDark})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.55, flexShrink: 0,
    }}>{emoji}</div>
  );
}

function Badge({ children, color = c.warm }) {
  return <span style={{ padding: "2px 7px", background: color + "18", color, fontSize: 9, borderRadius: 4, fontWeight: 600 }}>{children}</span>;
}

function PostCard({ from, to, msg, stamp = "✉", date, photo, isPrivate = false, showVisibility = false }) {
  return (
    <div style={{ borderRadius: 8, overflow: "hidden", background: `linear-gradient(165deg, ${c.paper}, ${c.paperDark})`, boxShadow: `0 2px 8px ${c.bg}30` }}>
      {photo ? (
        <div style={{ width: "100%", height: 130, background: photo, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "10%", left: "25%", width: "50%", height: "50%", borderRadius: "50%", background: "radial-gradient(circle, rgba(212,165,116,0.15), transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: "15%", width: 20, height: 35, borderRadius: "8px 8px 0 0", background: "rgba(0,0,0,0.2)" }} />
          <div style={{ position: "absolute", bottom: 0, left: "25%", width: 18, height: 30, borderRadius: "8px 8px 0 0", background: "rgba(0,0,0,0.15)" }} />
          <div style={{ position: "absolute", bottom: 0, left: "60%", width: 22, height: 38, borderRadius: "8px 8px 0 0", background: "rgba(0,0,0,0.18)" }} />
          <div style={{ position: "absolute", top: "5%", right: "12%", width: "30%", height: "45%", borderRadius: 3, background: "rgba(180,200,220,0.06)", boxShadow: "0 0 20px rgba(180,200,220,0.08)" }} />
          <div style={{ position: "absolute", top: "18%", left: "70%", width: 6, height: 6, borderRadius: "50%", background: "rgba(255,220,180,0.12)" }} />
          <div style={{ position: "absolute", top: "40%", left: "10%", width: 4, height: 4, borderRadius: "50%", background: "rgba(255,200,150,0.1)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "35%", background: `linear-gradient(transparent, ${c.paper}dd)` }} />
        </div>
      ) : (
        /* Logo + date placeholder for no-photo cards */
        <div style={{ height: 56, background: `linear-gradient(135deg, ${c.paperDark}ee, ${c.paper}ee)`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", borderBottom: `1px solid ${c.ink}08` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: c.ink + "0a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: c.ink + "30", fontFamily: hf }}>串</div>
            <div style={{ fontSize: 9, color: c.ink + "35", fontWeight: 600, letterSpacing: "0.08em" }}>串门儿 CHUANMEN</div>
          </div>
          {date && <div style={{ fontSize: 11, color: c.ink + "25", fontWeight: 700, fontFamily: hf }}>{date}</div>}
        </div>
      )}
      <div style={{ padding: "10px 12px 12px", position: "relative" }}>
        {!photo && <div style={{ position: "absolute", top: 8, right: "38%", bottom: 8, borderRight: `1px dashed ${c.ink}10` }} />}
        <div style={{ position: "absolute", top: 6, right: 8 }}><Stamp emoji={stamp} size={18} /></div>
        <div style={{ fontSize: 7, color: c.inkLight, letterSpacing: "0.06em" }}>TO: {to}</div>
        <div style={{ fontSize: 12, color: c.ink, fontFamily: hf, fontStyle: "italic", lineHeight: 1.7, maxWidth: photo ? "80%" : "52%", marginTop: 4 }}>{msg}</div>
        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Ava name={from} size={12} />
            <span style={{ fontSize: 9, color: c.ink, fontWeight: 600 }}>{from}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {showVisibility && <span style={{ fontSize: 8, color: isPrivate ? c.inkLight + "60" : c.inkLight + "80" }}>{isPrivate ? "🔒 仅彼此可见" : "🌐 公开"}</span>}
            {date && <span style={{ fontSize: 8, color: c.inkLight + "60" }}>{date}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Btn({ children, filled, small, onClick, disabled }) {
  return <button onClick={disabled ? undefined : onClick} style={{
    padding: small ? "5px 12px" : "8px 18px", borderRadius: 7,
    background: filled ? (disabled ? c.s3 : c.warm) : "transparent",
    border: filled ? "none" : `1.5px solid ${disabled ? c.line : c.warm}`,
    color: filled ? (disabled ? c.text3 : c.bg) : (disabled ? c.text3 : c.warm),
    fontSize: small ? 11 : 12, fontWeight: 600, cursor: disabled ? "default" : "pointer",
  }}>{children}</button>;
}

function Sep() { return <div style={{ height: 1, background: c.line, margin: "12px 0" }} />; }

function Section({ title, right, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 2px" }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
        {right && <span style={{ fontSize: 11, color: c.warm, cursor: "pointer" }}>{right}</span>}
      </div>
      {children}
    </div>
  );
}

function Card({ children, glow, style = {} }) {
  return <div style={{ background: c.s1, borderRadius: 12, border: `1px solid ${glow ? c.warm + "25" : c.line}`, overflow: "hidden", ...style }}>{children}</div>;
}

/* ═══ FEED ITEMS ═══ */
function FeedActivity({ name, title, date, location, spots, people, film, scene, onTap, onViewMember }) {
  const [joined, setJoined] = useState(false);
  return (
    <Card>
      {scene && (
        <div onClick={onTap} style={{ cursor: onTap ? "pointer" : "default" }}>
        <ScenePhoto scene={scene} h={90}>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: `linear-gradient(transparent, ${c.s1})` }} />
          <div style={{ position: "absolute", top: 8, right: 10 }}>
            <div style={{ padding: "3px 8px", background: `${c.s2}cc`, backdropFilter: "blur(8px)", borderRadius: 5, fontSize: 9, color: c.text2 }}>{date}</div>
          </div>
          {film && <div style={{ position: "absolute", bottom: 8, left: 10 }}><Poster title={film} w={32} h={44} /></div>}
        </ScenePhoto>
        </div>
      )}
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <Ava name={name} size={32} badge="🏠" onTap={onViewMember ? () => onViewMember(name) : undefined} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12 }}><b onClick={onViewMember ? () => onViewMember(name) : undefined} style={{ cursor: onViewMember ? "pointer" : "default" }}>{name}</b> 发起了活动</div>
            <div style={{ fontSize: 10, color: c.text3 }}>2 小时前</div>
          </div>
        </div>
        <div onClick={onTap} style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, cursor: onTap ? "pointer" : "default" }}>{title}</div>
        {!scene && <div style={{ fontSize: 11, color: c.text2, marginBottom: 8 }}>{date} · {location}</div>}
        {scene && <div style={{ fontSize: 11, color: c.text2, marginBottom: 8 }}>{location}</div>}
        {!scene && film && <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", background: c.s2, borderRadius: 6, marginBottom: 8 }}><Poster title={film} w={20} h={28} /><span style={{ fontSize: 10, color: c.text2 }}>放映 {film}</span></div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <AvaStack names={people} />
          <span style={{ fontSize: 10, color: spots > 0 ? c.green : c.red }}>{spots > 0 ? `还剩 ${spots} 位` : "已满 · 可排队"}</span>
        </div>
        <div style={{ background: c.warmDim, borderRadius: 6, padding: "5px 10px", marginBottom: 10, fontSize: 10, color: c.warm }}>
          {"💡"} 星星也报名了（你们一起参加过 2 次活动）
        </div>
        <button onClick={() => setJoined(!joined)} style={{
          width: "100%", padding: "9px 0", borderRadius: 8,
          background: joined ? c.s2 : c.warm,
          border: joined ? `1px solid ${c.green}30` : "none",
          color: joined ? c.green : c.bg,
          fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>{joined ? "✓ 已报名" : "报名参加"}</button>
      </div>
    </Card>
  );
}

function FeedCard({ from, to, msg, photo, onTap, onViewMember }) {
  return (
    <Card glow>
      <div onClick={onTap} style={{ padding: 14, cursor: onTap ? "pointer" : "default" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <Ava name={from} size={32} onTap={onViewMember ? () => onViewMember(from) : undefined} />
          <div><div style={{ fontSize: 12 }}><b onClick={onViewMember ? (e) => { e.stopPropagation(); onViewMember(from); } : undefined} style={{ cursor: onViewMember ? "pointer" : "default" }}>{from}</b> 给 <b onClick={onViewMember ? (e) => { e.stopPropagation(); onViewMember(to); } : undefined} style={{ cursor: onViewMember ? "pointer" : "default" }}>{to}</b> 寄了一张感谢卡</div><div style={{ fontSize: 10, color: c.text3 }}>5 小时前 · 🌐 公开</div></div>
        </div>
        <PostCard from={from} to={to} msg={msg} stamp="🎬" photo={photo} />
      </div>
    </Card>
  );
}

function FeedMovie({ name, title, year, dir, votes: initV, onViewMember }) {
  const [v, setV] = useState(false);
  return (
    <Card>
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <Ava name={name} size={32} onTap={onViewMember ? () => onViewMember(name) : undefined} />
          <div><div style={{ fontSize: 12 }}><b onClick={onViewMember ? () => onViewMember(name) : undefined} style={{ cursor: onViewMember ? "pointer" : "default" }}>{name}</b> 推荐了一部电影</div><div style={{ fontSize: 10, color: c.text3 }}>昨天</div></div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Poster title={title} w={52} h={72} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 11, color: c.text3, marginTop: 2 }}>{year} · {dir}</div>
            <div style={{ marginTop: 6 }}>
              <button onClick={() => setV(!v)} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "4px 12px", borderRadius: 6,
                background: v ? c.warm + "15" : c.s2,
                border: `1px solid ${v ? c.warm + "40" : c.line}`,
                color: v ? c.warm : c.text2,
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>▲ {initV + (v ? 1 : 0)}</button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function FeedMilestone({ text, emoji }) {
  return (
    <Card glow>
      <div style={{ padding: 16, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>{emoji}</div>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.6 }}>{text}</div>
      </div>
    </Card>
  );
}

function FeedProposal({ name, title, votes: initV, interested, onViewMember }) {
  const [v, setV] = useState(false);
  return (
    <Card>
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <Ava name={name} size={32} onTap={onViewMember ? () => onViewMember(name) : undefined} />
          <div><div style={{ fontSize: 12 }}><b onClick={onViewMember ? () => onViewMember(name) : undefined} style={{ cursor: onViewMember ? "pointer" : "default" }}>{name}</b> 提了一个活动想法</div><div style={{ fontSize: 10, color: c.text3 }}>3 天前</div></div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{"💡"} {title}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <AvaStack names={interested} size={18} />
          <span style={{ fontSize: 10, color: c.text3 }}>{interested.length} 人感兴趣</span>
        </div>
        <button onClick={() => setV(!v)} style={{
          padding: "6px 16px", borderRadius: 6,
          background: v ? c.blue + "15" : c.s2,
          border: `1px solid ${v ? c.blue + "40" : c.line}`,
          color: v ? c.blue : c.text2,
          fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>{v ? "✓ 我也感兴趣" : "我感兴趣"} · {initV + (v ? 1 : 0)}</button>
      </div>
    </Card>
  );
}

function FeedSeed({ name, project, update, collaborators, onTap, onViewMember }) {
  return (
    <Card>
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <Ava name={name} size={32} onTap={onViewMember ? () => onViewMember(name) : undefined} />
          <div><div style={{ fontSize: 12 }}><b onClick={onViewMember ? () => onViewMember(name) : undefined} style={{ cursor: onViewMember ? "pointer" : "default" }}>{name}</b> 更新了种子计划</div><div style={{ fontSize: 10, color: c.text3 }}>昨天</div></div>
        </div>
        <div onClick={onTap} style={{ cursor: onTap ? "pointer" : "default" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 6 }}><span style={{ fontSize: 12 }}>{"🌱"}</span><span style={{ fontSize: 13, fontWeight: 700 }}>{project}</span></div>
          <div style={{ fontSize: 12, color: c.text2, lineHeight: 1.6, marginBottom: 8 }}>{update}</div>
        </div>
        {/* Collaborators */}
        {collaborators && collaborators.length > 0 && (
          <div style={{ padding: "8px 10px", background: c.s2, borderRadius: 6, marginBottom: 8, border: `1px solid ${c.line}` }}>
            <div style={{ fontSize: 9, color: c.text3, marginBottom: 6, letterSpacing: "0.04em" }}>协作者</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {collaborators.map((col, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Ava name={col.name} size={18} />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{col.name}</span>
                  <span style={{ fontSize: 9, color: c.text3, padding: "1px 6px", background: c.s3, borderRadius: 3 }}>{col.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <Btn small>{"👏"} 加油</Btn>
          <Btn small>💬 留言</Btn>
          <Btn small>🤝 参与协作</Btn>
        </div>
      </div>
    </Card>
  );
}

function FeedDiscussion({ name, topic, body, replies, replyPreviews, onTap, onViewMember }) {
  const [showReply, setShowReply] = useState(false);
  return (
    <Card>
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <Ava name={name} size={32} onTap={onViewMember ? () => onViewMember(name) : undefined} />
          <div><div style={{ fontSize: 12 }}><b onClick={onViewMember ? () => onViewMember(name) : undefined} style={{ cursor: onViewMember ? "pointer" : "default" }}>{name}</b> 发起了话题</div><div style={{ fontSize: 10, color: c.text3 }}>3 小时前</div></div>
        </div>
        <div onClick={onTap} style={{ cursor: onTap ? "pointer" : "default" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{topic}</div>
          <div style={{ fontSize: 12, color: c.text2, lineHeight: 1.6, marginBottom: 10 }}>{body}</div>
        </div>
        {/* Reply previews */}
        {replyPreviews && replyPreviews.length > 0 && (
          <div style={{ borderTop: `1px solid ${c.line}`, paddingTop: 8, marginBottom: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {replyPreviews.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                <Ava name={r.name} size={18} onTap={onViewMember ? () => onViewMember(r.name) : undefined} />
                <div style={{ flex: 1 }}>
                  <span onClick={onViewMember ? () => onViewMember(r.name) : undefined} style={{ fontSize: 11, fontWeight: 600, cursor: onViewMember ? "pointer" : "default" }}>{r.name}</span>
                  <span style={{ fontSize: 11, color: c.text2, marginLeft: 4 }}>{r.text}</span>
                </div>
              </div>
            ))}
            {replies > replyPreviews.length && (
              <div style={{ fontSize: 10, color: c.warm, cursor: "pointer", paddingLeft: 24 }}>查看全部 {replies} 条回复 →</div>
            )}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <Btn small filled onClick={() => setShowReply(!showReply)}>💬 回复</Btn>
          <Btn small>{"👍"} {(replies || 0) + 3}</Btn>
        </div>
        {showReply && (
          <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
            <div style={{ flex: 1, background: c.s2, borderRadius: 6, padding: "6px 10px", border: `1px solid ${c.line}` }}>
              <input type="text" placeholder="说点什么..." style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: c.text, fontSize: 11 }} />
            </div>
            <button style={{ padding: "6px 12px", borderRadius: 6, background: c.warm, border: "none", color: c.bg, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>发送</button>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ═══ PAGE: FEED ═══ */
function FeedTime({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <div style={{ flex: 1, height: 1, background: c.line + "60" }} />
      <span style={{ fontSize: 10, color: c.text3, fontWeight: 500, letterSpacing: "0.03em" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: c.line + "60" }} />
    </div>
  );
}

function FeedCompactMovie({ name, title, year, dir, votes: initV, time, onTap, onViewMember }) {
  const [v, setV] = useState(false);
  return (
    <div onClick={onTap} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: c.s1, borderRadius: 10, border: `1px solid ${c.line}`, cursor: onTap ? "pointer" : "default" }}>
      <Poster title={title} w={36} h={50} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 10, color: c.text3, marginTop: 1 }}>{year} · {dir}</div>
        <div style={{ fontSize: 9, color: c.text3, marginTop: 2 }}><span onClick={onViewMember ? (e) => { e.stopPropagation(); onViewMember(name); } : undefined} style={{ cursor: onViewMember ? "pointer" : "default" }}>{name}</span> 推荐 · {time}</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); setV(!v); }} style={{
        display: "flex", alignItems: "center", gap: 3, padding: "4px 10px", borderRadius: 6, flexShrink: 0,
        background: v ? c.warm + "15" : c.s2,
        border: `1px solid ${v ? c.warm + "40" : c.line}`,
        color: v ? c.warm : c.text2, fontSize: 11, fontWeight: 700, cursor: "pointer",
      }}>▲ {initV + (v ? 1 : 0)}</button>
    </div>
  );
}

function FeedCompactProposal({ name, title, votes: initV, interested, time, onTap, onViewMember }) {
  const [v, setV] = useState(false);
  return (
    <div onClick={onTap} style={{ padding: "10px 12px", background: c.s1, borderRadius: 10, border: `1px solid ${c.line}`, cursor: onTap ? "pointer" : "default" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{"💡"} {title}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Ava name={name} size={18} onTap={onViewMember ? () => onViewMember(name) : undefined} />
          <span onClick={onViewMember ? (e) => { e.stopPropagation(); onViewMember(name); } : undefined} style={{ fontSize: 10, color: c.text3, cursor: onViewMember ? "pointer" : "default" }}>{name}</span>
          <span style={{ fontSize: 10, color: c.text3 }}>· {time}</span>
          <AvaStack names={interested} size={16} />
        </div>
        <button onClick={(e) => { e.stopPropagation(); setV(!v); }} style={{
          padding: "3px 10px", borderRadius: 5,
          background: v ? c.blue + "15" : c.s2,
          border: `1px solid ${v ? c.blue + "40" : c.line}`,
          color: v ? c.blue : c.text3, fontSize: 10, fontWeight: 600, cursor: "pointer",
        }}>{v ? "✓" : "🙋"} {initV + (v ? 1 : 0)}</button>
      </div>
    </div>
  );
}

function PageFeed({ onNav, onViewMember }) {
  const vm = (name) => (e) => { e.stopPropagation(); onViewMember && onViewMember(name); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Agent banner - tier 1: action-oriented, always on top */}
      <div onClick={() => onNav && onNav("events")} style={{ background: `linear-gradient(135deg, ${c.warm}08, ${c.s1})`, borderRadius: 12, padding: "10px 14px", border: `1px solid ${c.warm}15`, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <span style={{ fontSize: 20 }}>{"🤖"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600 }}>你投的「花样年华」被选中了</div>
          <div style={{ fontSize: 10, color: c.text3 }}>这周六在白开水家放映，要不要来？</div>
        </div>
        <Btn small filled>看看</Btn>
      </div>

      <div style={{ height: 14 }} />

      {/* Milestone - tier 1: celebration, full width glow */}
      <FeedMilestone emoji="🎉" text={"串门第 50 场活动！\n从去年 10 月到现在，一起看了 32 部电影，吃了 18 顿饭，走了 6 次路"} />

      <div style={{ height: 8 }} />
      <FeedTime label="今天" />
      <div style={{ height: 8 }} />

      {/* Activity card - tier 2: primary content, full card */}
      <FeedActivity name="白开水" title="周六电影夜 · 花样年华" date="2.22 周六 7pm" location="白开水家" spots={4} people={["白开水","Yuan","大橙子","星星","Tiffy"]} film="花样年华" scene="movieNight" onTap={() => onNav && onNav("events")} onViewMember={onViewMember} />

      <div style={{ height: 10 }} />

      {/* Postcard - tier 2: special warm material */}
      <FeedCard from="Yuan" to="白开水" msg="谢谢你每次都把地下室收拾得像个小影院" photo={photos.movieNight} onTap={() => onNav && onNav("cards")} onViewMember={onViewMember} />

      <div style={{ height: 8 }} />
      <FeedTime label="本周" />
      <div style={{ height: 8 }} />

      {/* Activity recap - tier 2 */}
      <Card>
        <div onClick={() => onNav && onNav("events")} style={{ cursor: "pointer", padding: 14 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>📸</span>
            <div><div style={{ fontSize: 12, fontWeight: 600 }}>电影夜 · 寄生虫 回顾</div><div style={{ fontSize: 10, color: c.text3 }}>02.08 · 白开水家 · 8 人参加</div></div>
          </div>
          <div style={{ height: 80, borderRadius: 6, background: photos.movieNight, marginBottom: 8, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "10%", left: "30%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, rgba(212,165,116,0.12), transparent 70%)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: `linear-gradient(transparent, ${c.bg}cc)` }} />
            <div style={{ position: "absolute", bottom: 6, left: 8, display: "flex" }}>
              {["白开水","Yuan","大橙子","星星","Tiffy"].map((n, i) => (
                <div key={n} style={{ marginLeft: i ? -6 : 0, zIndex: 5 - i }} onClick={vm(n)}><Ava name={n} size={20} border /></div>
              ))}
              <div style={{ marginLeft: -6, width: 20, height: 20, borderRadius: "50%", background: c.s3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: c.text3, border: `1.5px solid ${c.bg}` }}>+3</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
            <Poster title="寄生虫" w={28} h={38} />
            <div style={{ fontSize: 11, color: c.text2 }}>放映了<b style={{ color: c.text }}> 寄生虫</b>，讨论到快 12 点</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small>{"❤️"} 12</Btn>
            <Btn small>💬 留言</Btn>
          </div>
        </div>
      </Card>

      <div style={{ height: 10 }} />

      {/* Compact cluster: movie recs - tier 3: lightweight, grouped */}
      <div style={{ fontSize: 10, color: c.text3, fontWeight: 600, padding: "0 2px 4px", letterSpacing: "0.03em" }}>🎬 新片推荐</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <FeedCompactMovie name="大橙子" title="重庆森林" year="1994" dir="王家卫" votes={7} time="昨天" onTap={() => onNav && onNav("discover")} onViewMember={onViewMember} />
        <FeedCompactMovie name="Yuan" title="永恒和一日" year="1998" dir="安哲罗普洛斯" votes={4} time="3 天前" onTap={() => onNav && onNav("discover")} onViewMember={onViewMember} />
      </div>

      <div style={{ height: 14 }} />

      {/* Compact: proposal - tier 3 */}
      <FeedCompactProposal name="Tiffy" title="周末一起去爬 High Point？" votes={5} interested={["星星","大橙子","白开水"]} time="3 天前" onTap={() => onNav && onNav("events")} onViewMember={onViewMember} />

      <div style={{ height: 14 }} />

      {/* Discussion - tier 2: interactive */}
      <FeedDiscussion name="白开水" topic="大家觉得下次 potluck 要不要搞主题？" body="上次大家各带各的，虽然好吃但有点重复。在想要不要每次定个主题，比如「川菜之夜」「东南亚」之类的？" replies={7} replyPreviews={[
        { name: "大橙子", text: "好主意！我投川菜，我可以做水煮鱼" },
        { name: "Tiffy", text: "东南亚 +1，我会做冬阴功" },
      ]} onTap={() => onNav && onNav("discover")} onViewMember={onViewMember} />

      <div style={{ height: 14 }} />

      {/* Seed - tier 2: project card */}
      <FeedSeed name="星星" project="学日语" update="N3 模拟考过了！下一步挑战 N2。感谢大橙子推荐的 podcast，真的有用。" collaborators={[
        { name: "星星", role: "发起人" },
        { name: "大橙子", role: "学习搭子" },
        { name: "Tiffy", role: "口语陪练" },
      ]} onTap={() => onNav && onNav("discover")} onViewMember={onViewMember} />

      <div style={{ height: 8 }} />
      <FeedTime label="更早" />
      <div style={{ height: 8 }} />

      {/* Activity - tier 2 */}
      <FeedActivity name="Tiffy" title="Potluck · 来我家吃火锅" date="2.28 周五 6pm" location="Tiffy 家" spots={2} people={["Tiffy","大橙子","星星"]} scene="potluck" onTap={() => onNav && onNav("events")} onViewMember={onViewMember} />
    </div>
  );
}

/* ═══ PAGE: EVENTS ═══ */
function PageEvents() {
  const [tab, setTab] = useState("upcoming");
  const [detailIdx, setDetailIdx] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showFab, setShowFab] = useState(false);

  const upcoming = [
    { id: 1, title: "周六电影夜 · 花样年华", host: "白开水", date: "2.22 周六 7pm", location: "白开水家", scene: "movieNight", film: "花样年华", spots: 4, total: 8, people: ["白开水","Yuan","大橙子","星星"], phase: "open", desc: "王家卫经典。灯光调暗，坐在地下室沙发上，一起感受六十年代的香港。" },
    { id: 2, title: "Potluck · 来我家吃火锅", host: "Tiffy", date: "2.28 周五 6pm", location: "Tiffy 家", scene: "potluck", spots: 2, total: 8, people: ["Tiffy","大橙子","星星"], phase: "open", desc: "铜锅涮肉！食材 AA，Tiffy 准备锅底和蘸料。" },
    { id: 3, title: "Spring Hike · Delaware Water Gap", host: "大橙子", date: "3.08 周六 9am", location: "Delaware Water Gap", scene: "hike", spots: 6, total: 10, people: ["大橙子","Yuan"], phase: "invite", invitedBy: "大橙子", desc: "春季徒步，中等难度，来回大约 3 小时。拼车从 Jersey City 出发。" },
  ];

  const proposals = [
    { name: "Tiffy", title: "周末一起去爬 High Point？", votes: 5, interested: ["星星","大橙子","白开水"], time: "3 天前" },
    { name: "星星", title: "找个周末一起去 MOMA？", votes: 3, interested: ["Yuan","Tiffy"], time: "5 天前" },
    { name: "小鱼", title: "有人想打羽毛球吗", votes: 8, interested: ["Leo","大橙子","白开水","Yuan"], time: "1 周前" },
  ];

  const past = [
    { title: "电影夜 · 寄生虫", host: "白开水", date: "02.08", people: 8, scene: "movieNight", film: "寄生虫" },
    { title: "新年饭局 Potluck", host: "Yuan", date: "01.25", people: 10, scene: "potluck" },
    { title: "电影夜 · 千与千寻", host: "Yuan", date: "01.18", people: 7, scene: "movieNight", film: "千与千寻" },
    { title: "High Point 徒步", host: "大橙子", date: "01.12", people: 6, scene: "hike" },
  ];

  const sel = detailIdx !== null ? upcoming[detailIdx] : null;

  if (sel) return (
    <div>
      <button onClick={() => setDetailIdx(null)} style={{ background: "none", border: "none", color: c.text3, fontSize: 11, cursor: "pointer", marginBottom: 10 }}>← 返回活动列表</button>
      <Card>
        <ScenePhoto scene={sel.scene} h={120}>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: `linear-gradient(transparent, ${c.s1})` }} />
          {sel.film && <div style={{ position: "absolute", bottom: 8, left: 10 }}><Poster title={sel.film} w={36} h={50} /></div>}
          {sel.phase === "invite" && (
            <div style={{ position: "absolute", top: 8, left: 10, padding: "3px 8px", background: `${c.warm}cc`, borderRadius: 5, fontSize: 9, color: c.bg, fontWeight: 700 }}>🔒 Host 专属邀请</div>
          )}
        </ScenePhoto>
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{sel.title}</div>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: c.text2, marginBottom: 12 }}>
            <span>📅 {sel.date}</span>
            <span>📍 {sel.location}</span>
          </div>

          {/* Host info */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 0", borderTop: `1px solid ${c.line}`, borderBottom: `1px solid ${c.line}`, marginBottom: 12 }}>
            <Ava name={sel.host} size={32} badge="🏠" />
            <div>
              <div style={{ fontSize: 12 }}><b>{sel.host}</b> · Host</div>
              <div style={{ fontSize: 10, color: c.text3 }}>已 Host {sel.host === "白开水" ? 8 : sel.host === "Tiffy" ? 2 : 5} 次</div>
            </div>
          </div>

          {/* Description */}
          <div style={{ fontSize: 12, color: c.text2, lineHeight: 1.7, marginBottom: 14 }}>{sel.desc}</div>

          {/* Two-phase invite indicator */}
          {sel.phase === "invite" && (
            <div style={{ background: c.warmDim, borderRadius: 8, padding: 10, marginBottom: 12, border: `1px solid ${c.warm}15` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: c.warm, marginBottom: 4 }}>🔒 Host 专属邀请阶段</div>
              <div style={{ fontSize: 10, color: c.text2, lineHeight: 1.5 }}>
                {sel.invitedBy} 邀请了你。目前只有被邀请的人能看到这个活动。<br/>
                <span style={{ color: c.text3 }}>3 天后将对所有成员开放报名。</span>
              </div>
            </div>
          )}

          {/* Social context */}
          <div style={{ background: c.warmDim, borderRadius: 8, padding: 10, marginBottom: 14, border: `1px solid ${c.warm}10` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: c.warm, marginBottom: 6 }}>💡 社交上下文</div>
            <div style={{ fontSize: 10, color: c.text2, lineHeight: 1.6 }}>
              星星也报名了（你们一起参加过 2 次活动）<br/>
              大橙子上次活动后给你寄了感谢卡
            </div>
          </div>

          {/* Spots */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <AvaStack names={sel.people} />
            <span style={{ fontSize: 11, color: sel.spots > 0 ? c.green : c.text3 }}>
              {sel.spots > 0 ? `还剩 ${sel.spots}/${sel.total} 位` : "已满 · 可排队"}
            </span>
          </div>

          <button style={{ width: "100%", padding: "11px 0", borderRadius: 8, background: c.warm, border: "none", color: c.bg, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {sel.phase === "invite" ? "接受邀请" : "报名参加"}
          </button>
        </div>
      </Card>
    </div>
  );

  return (
    <div style={{ position: "relative" }}>
      {/* Sub tabs - 2 tabs only */}
      <div style={{ display: "flex", gap: 0, marginBottom: 14, background: c.s1, borderRadius: 8, padding: 2, border: `1px solid ${c.line}` }}>
        {[["upcoming", `即将到来 (${upcoming.length})`], ["past", "过往"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 11, fontWeight: tab === k ? 700 : 400, background: tab === k ? c.s3 : "transparent", color: tab === k ? c.text : c.text3, border: "none", cursor: "pointer" }}>{l}</button>
        ))}
      </div>

      {/* Upcoming + proposals inline */}
      {tab === "upcoming" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* 本周小局 lottery card */}
          <div style={{ background: `linear-gradient(135deg, ${c.s1}, ${c.s2})`, borderRadius: 12, padding: 14, border: `1px solid ${c.warm}20`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -10, right: -10, fontSize: 60, opacity: 0.04 }}>🎲</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>🎲</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>本周小局</span>
              </div>
              <span style={{ fontSize: 9, color: c.text3 }}>每周抽签 · 第 12 期</span>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
              <Ava name="星星" size={36} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>星星</div>
                <div style={{ fontSize: 10, color: c.warm }}>轮到你做东了！</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: c.text2, lineHeight: 1.6, marginBottom: 12 }}>
              约谁、做什么、几个人，你说了算。咖啡、饭局、逛街、遛公园都行。
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ flex: 1, padding: "7px 0", borderRadius: 6, background: c.warm, border: "none", color: c.bg, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🏠 发起小局</button>
              <button style={{ padding: "7px 12px", borderRadius: 6, background: c.s3, border: `1px solid ${c.line}`, color: c.text3, fontSize: 11, cursor: "pointer" }}>历史</button>
            </div>
          </div>

          {upcoming.map((evt, i) => (
            <Card key={evt.id}>
              <div onClick={() => setDetailIdx(i)} style={{ cursor: "pointer" }}>
                <ScenePhoto scene={evt.scene} h={80}>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: `linear-gradient(transparent, ${c.s1})` }} />
                  <div style={{ position: "absolute", top: 6, right: 8 }}>
                    <div style={{ padding: "2px 7px", background: `${c.s2}cc`, backdropFilter: "blur(8px)", borderRadius: 4, fontSize: 9, color: c.text2 }}>{evt.date}</div>
                  </div>
                  {evt.phase === "invite" && (
                    <div style={{ position: "absolute", top: 6, left: 8, padding: "2px 7px", background: `${c.warm}cc`, borderRadius: 4, fontSize: 9, color: c.bg, fontWeight: 600 }}>🔒 邀请</div>
                  )}
                  {evt.film && <div style={{ position: "absolute", bottom: 6, left: 8 }}><Poster title={evt.film} w={28} h={38} /></div>}
                </ScenePhoto>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <Ava name={evt.host} size={22} badge="🏠" />
                  <span style={{ fontSize: 10, color: c.text3 }}>{evt.host} · {evt.location}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, cursor: "pointer" }} onClick={() => setDetailIdx(i)}>{evt.title}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <AvaStack names={evt.people} />
                  <span style={{ fontSize: 10, color: evt.spots > 0 ? c.green : c.text3 }}>还剩 {evt.spots} 位</span>
                </div>
              </div>
            </Card>
          ))}

          {/* Proposals section - inline below upcoming */}
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 11, color: c.text3, fontWeight: 600, marginBottom: 8, letterSpacing: "0.03em" }}>💡 大家的想法 · {proposals.length} 个</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {proposals.map((p, i) => (
                <div key={i} style={{ padding: "10px 12px", background: c.s1, borderRadius: 10, border: `1px solid ${c.line}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{p.title}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <Ava name={p.name} size={18} />
                      <span style={{ fontSize: 10, color: c.text3 }}>{p.name} · {p.time}</span>
                      <AvaStack names={p.interested} size={16} />
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button style={{ padding: "3px 8px", borderRadius: 5, background: c.s2, border: `1px solid ${c.line}`, color: c.text3, fontSize: 10, cursor: "pointer" }}>🙋 {p.votes}</button>
                      <button style={{ padding: "3px 8px", borderRadius: 5, background: c.warm + "15", border: `1px solid ${c.warm}30`, color: c.warm, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>🏠 我来组织</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Past events */}
      {tab === "past" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {past.map((evt, i) => (
            <Card key={i}>
              <div style={{ display: "flex", gap: 10, padding: 12, alignItems: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                  <ScenePhoto scene={evt.scene} h={48} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{evt.title}</div>
                  <div style={{ fontSize: 10, color: c.text3, marginTop: 2 }}>{evt.date} · {evt.host} Host · {evt.people} 人</div>
                </div>
                <span style={{ fontSize: 10, color: c.text3 }}>→</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Unified FAB */}
      {!sel && (
        <div style={{ position: "relative", display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          {showCreate && (
            <div style={{ position: "absolute", bottom: 48, display: "flex", flexDirection: "column", gap: 6, animation: "fadeIn 0.15s ease" }}>
              <button onClick={() => setShowCreate(false)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, background: c.warm, border: "none", color: c.bg, fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 16px ${c.warm}30`, whiteSpace: "nowrap" }}>
                🏠 发起活动
              </button>
              <button onClick={() => setShowCreate(false)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, background: c.s2, border: `1px solid ${c.line}`, color: c.text2, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                💡 提一个想法
              </button>
            </div>
          )}
          <button onClick={() => setShowCreate(!showCreate)} style={{
            width: 44, height: 44, borderRadius: 22, background: showCreate ? c.s3 : c.warm,
            border: showCreate ? `1px solid ${c.line}` : "none",
            color: showCreate ? c.text3 : c.bg,
            fontSize: 22, fontWeight: 300, cursor: "pointer",
            boxShadow: showCreate ? "none" : `0 4px 20px ${c.warm}40`,
            transition: "all 0.2s ease",
            transform: showCreate ? "rotate(45deg)" : "none",
          }}>+</button>
        </div>
      )}
    </div>
  );
}

/* ═══ PAGE: DISCOVER ═══ */
function PageDiscover() {
  return (
    <div>
      {/* Category pills - 电影 is active, others are "coming soon" hints */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }}>
        {[
          { key: "movies", label: "🎬 电影", active: true },
          { key: "food", label: "🍜 菜谱", active: false },
          { key: "music", label: "🎵 音乐", active: false },
          { key: "places", label: "📍 好店", active: false },
        ].map(cat => (
          <button key={cat.key} style={{
            padding: "6px 14px", borderRadius: 16, fontSize: 11, fontWeight: cat.active ? 700 : 400,
            background: cat.active ? c.s3 : "transparent",
            color: cat.active ? c.text : c.text3,
            border: `1px solid ${cat.active ? c.line : c.line + "60"}`,
            cursor: cat.active ? "default" : "default", whiteSpace: "nowrap",
            opacity: cat.active ? 1 : 0.5,
          }}>{cat.label}</button>
        ))}
      </div>
      <PageMovies />
    </div>
  );
}

/* ═══ PAGE: MOVIES ═══ */
function PageMovies() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("pool");
  const [results, setResults] = useState(false);
  const [added, setAdded] = useState(false);
  const [votes, setVotes] = useState({});
  const toggle = id => setVotes(v => ({ ...v, [id]: !v[id] }));

  const pool = [
    { id: 1, title: "花样年华", year: "2000", dir: "王家卫", v: 12, status: "本周放映", by: "Yuan" },
    { id: 2, title: "惊魂记", year: "1960", dir: "希区柯克", v: 9, by: "白开水" },
    { id: 3, title: "永恒和一日", year: "1998", dir: "安哲罗普洛斯", v: 7, by: "Yuan" },
    { id: 4, title: "东京物语", year: "1953", dir: "小津安二郎", v: 6, by: "星星" },
    { id: 5, title: "燃烧女子的肖像", year: "2019", dir: "瑟琳·席安玛", v: 5, by: "Tiffy" },
  ];
  const screened = [
    { title: "寄生虫", year: "2019", dir: "奉俊昊", date: "02.08", host: "白开水" },
    { title: "千与千寻", year: "2001", dir: "宫崎骏", date: "02.01", host: "Yuan" },
    { title: "春光乍泄", year: "1997", dir: "王家卫", date: "01.25", host: "白开水" },
  ];

  return (
    <div>
      {/* Search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: c.s2, borderRadius: 8, padding: "8px 10px", border: `1px solid ${search ? c.warm + "40" : c.line}` }}>
          <span style={{ fontSize: 12, color: c.text3 }}>{"🔍"}</span>
          <input value={search} onChange={e => { setSearch(e.target.value); setResults(e.target.value.length > 1); setAdded(false); }} placeholder="搜电影名、导演..."
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: c.text, fontSize: 12 }} />
          {search && <span onClick={() => { setSearch(""); setResults(false); setAdded(false); }} style={{ fontSize: 10, color: c.text3, cursor: "pointer" }}>×</span>}
        </div>
      </div>

      {results && !added && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ padding: "6px 12px", borderBottom: `1px solid ${c.line}`, fontSize: 9, color: c.text3 }}>搜索结果</div>
          {[{ title: "重庆森林", year: "1994", dir: "王家卫", rating: "8.8" }, { title: "重庆", year: "2023", dir: "徐磊", rating: "6.2" }].map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, borderTop: i ? `1px solid ${c.line}` : "none" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Poster title={m.title} w={30} h={42} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{m.title}</div>
                  <div style={{ fontSize: 10, color: c.text3 }}>{m.year} · {m.dir} · ⭐{m.rating}</div>
                </div>
              </div>
              <button onClick={() => { if (i === 0) setAdded(true); }} style={{ padding: "4px 12px", borderRadius: 6, background: c.warm, border: "none", color: c.bg, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>推荐</button>
            </div>
          ))}
          <div style={{ padding: "8px 12px", borderTop: `1px solid ${c.line}`, textAlign: "center", fontSize: 10, color: c.text2 }}>找不到？<span style={{ color: c.warm }}>手动添加 →</span></div>
        </Card>
      )}

      {added && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: c.green + "10", border: `1px solid ${c.green}30`, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>✓</span>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: c.green }}>已推荐「重庆森林」</div><div style={{ fontSize: 10, color: c.text3 }}>信息已自动填好</div></div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 12, background: c.s1, borderRadius: 8, padding: 2, border: `1px solid ${c.line}` }}>
        {[["pool", "候选中"], ["screened", "已放映"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 11, fontWeight: tab === k ? 700 : 400, background: tab === k ? c.s3 : "transparent", color: tab === k ? c.text : c.text3, border: "none", cursor: "pointer" }}>{l}</button>
        ))}
      </div>

      {tab === "pool" && pool.map(m => (
        <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 2px", borderBottom: `1px solid ${c.line}` }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Poster title={m.title} w={40} h={56} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title} {m.status && <Badge color={c.green}>{"✓"} {m.status}</Badge>}</div>
              <div style={{ fontSize: 10, color: c.text3, marginTop: 1 }}>{m.year} · {m.dir} · <span style={{ color: c.text2 }}>{m.by} 推荐</span></div>
            </div>
          </div>
          <button onClick={() => toggle(m.id)} style={{
            display: "flex", alignItems: "center", gap: 3, padding: "4px 12px", borderRadius: 6,
            background: votes[m.id] ? c.warm + "15" : c.s2,
            border: `1px solid ${votes[m.id] ? c.warm + "40" : c.line}`,
            color: votes[m.id] ? c.warm : c.text2, fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>▲ {m.v + (votes[m.id] ? 1 : 0)}</button>
        </div>
      ))}

      {tab === "screened" && screened.map((m, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 2px", borderBottom: `1px solid ${c.line}` }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Poster title={m.title} w={36} h={50} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</div>
              <div style={{ fontSize: 10, color: c.text3, marginTop: 1 }}>{m.year} · {m.dir}</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: c.text2 }}>{m.date}</div>
            <div style={{ fontSize: 9, color: c.text3 }}>{m.host} Host</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══ PAGE: CARDS ═══ */
function PageCards() {
  const [step, setStep] = useState(0);
  const [who, setWho] = useState(null);
  const [msg, setMsg] = useState("");
  const [hasPhoto, setHasPhoto] = useState(false);
  const [sent, setSent] = useState(false);
  const [isPrivate, setIsPrivate] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const people = [
    { name: "白开水", ctx: "电影夜 Host", badge: "🏠" },
    { name: "大橙子", ctx: "一起参加了电影夜" },
    { name: "星星", ctx: "第一次来串门" },
    { name: "Tiffy", ctx: "一起参加了电影夜" },
  ];
  const quick = ["谢谢你的招待 🏠", "你做的菜太好吃了 🍳", "和你聊天很开心 💬", "下次还想见到你 👋"];
  const demoPhoto = photos.movieNight;
  const myCards = [
    { from: "白开水", msg: "谢谢你每次都把地下室收拾得像个小影院", stamp: "🎬", date: "02.08", photo: photos.movieNight, priv: false },
    { from: "Tiffy", msg: "氛围超棒，下次还来你家！", stamp: "🍳", date: "02.01", priv: true },
    { from: "大橙子", msg: "你选的片子太好了", stamp: "🎬", date: "01.25", photo: photos.cozy, priv: false },
    { from: "星星", msg: "第一次来就感觉像老朋友", stamp: "☕", date: "01.18", priv: true },
  ];
  const reset = () => { setStep(0); setWho(null); setMsg(""); setHasPhoto(false); setSent(false); setIsPrivate(true); };

  return (
    <div>
      {/* Balance bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, padding: "8px 12px", background: c.s1, borderRadius: 8, border: `1px solid ${c.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12 }}>✉</span>
          <span style={{ fontSize: 11, color: c.text2 }}>本月还能寄</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: c.warm }}>2</span>
          <span style={{ fontSize: 11, color: c.text3 }}>/ 4 张</span>
        </div>
        <span style={{ fontSize: 9, color: c.text3 }}>月底清零</span>
      </div>

      {/* Send section */}
      {!sent ? (
        <Card>
          <div style={{ padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>寄一张感谢卡</div>
            <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
              {["选人", "写话+拍照", "寄出"].map((l, i) => (
                <div key={l} style={{ flex: 1, textAlign: "center", paddingBottom: 6, borderBottom: `2px solid ${i <= step ? c.warm : c.line}` }}>
                  <span style={{ fontSize: 10, color: i <= step ? c.warm : c.text3, fontWeight: 600 }}>{l}</span>
                </div>
              ))}
            </div>

            {step === 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {people.map((p, i) => (
                  <div key={i} onClick={() => { setWho(p.name); setStep(1); }} style={{ padding: 12, borderRadius: 8, background: c.s2, border: `1.5px solid ${c.line}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <Ava name={p.name} size={34} badge={p.badge} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</span>
                    <span style={{ fontSize: 8, color: c.text3 }}>{p.ctx}</span>
                  </div>
                ))}
              </div>
            )}

            {step === 1 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Ava name={who} size={28} />
                  <div><div style={{ fontSize: 13, fontWeight: 600 }}>给 {who}</div><div style={{ fontSize: 9, color: c.text3 }}>02.15 电影夜</div></div>
                </div>
                <div onClick={() => setHasPhoto(!hasPhoto)} style={{ marginBottom: 10, borderRadius: 8, border: `1.5px dashed ${hasPhoto ? c.warm + "50" : c.line}`, cursor: "pointer", background: hasPhoto ? c.warmDim : c.s2, overflow: "hidden" }}>
                  {hasPhoto ? (
                    <div><ScenePhoto scene={demoPhoto} h={70}><div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 20, opacity: 0.5 }}>📸</span></div></ScenePhoto><div style={{ padding: "5px 10px", display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 10, color: c.warm }}>📷 照片已添加</span><span style={{ fontSize: 9, color: c.text3 }}>× 移除</span></div></div>
                  ) : (
                    <div style={{ padding: "14px 0", textAlign: "center" }}><div style={{ fontSize: 16 }}>📷</div><div style={{ fontSize: 10, color: c.text2, marginTop: 2 }}>添加照片（可选）</div></div>
                  )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                  {quick.map((q, i) => <button key={i} onClick={() => setMsg(q)} style={{ padding: "4px 10px", borderRadius: 14, background: msg === q ? c.warm + "18" : c.s2, border: `1px solid ${msg === q ? c.warm + "40" : c.line}`, color: msg === q ? c.warm : c.text2, fontSize: 10, cursor: "pointer" }}>{q}</button>)}
                </div>
                <div style={{ background: c.s2, borderRadius: 8, padding: 10, marginBottom: 10, border: `1px solid ${c.line}` }}>
                  <textarea value={msg} onChange={e => setMsg(e.target.value.slice(0, 80))} placeholder="或者自己写..." style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: c.text, fontSize: 12, fontFamily: hf, fontStyle: "italic", resize: "none", height: 36, lineHeight: 1.5 }} />
                  <div style={{ textAlign: "right", fontSize: 9, color: c.text3 }}>{msg.length}/80</div>
                </div>
                <div style={{ display: "flex", gap: 0, marginBottom: 10, background: c.s2, borderRadius: 8, padding: 2, border: `1px solid ${c.line}` }}>
                  {[
                    { val: true, icon: "🔒", label: "仅彼此可见" },
                    { val: false, icon: "🌐", label: "公开到动态流" },
                  ].map(opt => (
                    <button key={String(opt.val)} onClick={() => setIsPrivate(opt.val)} style={{
                      flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 10,
                      fontWeight: isPrivate === opt.val ? 700 : 400,
                      background: isPrivate === opt.val ? c.s3 : "transparent",
                      color: isPrivate === opt.val ? c.text : c.text3,
                      border: "none", cursor: "pointer",
                    }}>{opt.icon} {opt.label}</button>
                  ))}
                </div>
                <div style={{ fontSize: 9, color: c.text3, marginBottom: 10, paddingLeft: 2 }}>
                  {isPrivate ? "只有你和收件人看得到这张卡" : "这张卡会出现在社群动态流里"}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setStep(0); setWho(null); setMsg(""); setHasPhoto(false); }} style={{ flex: 1, padding: "8px", borderRadius: 6, background: c.s2, border: `1px solid ${c.line}`, color: c.text2, fontSize: 11, cursor: "pointer" }}>返回</button>
                  <button onClick={() => { if (msg) setStep(2); }} style={{ flex: 2, padding: "8px", borderRadius: 6, background: msg ? c.warm : c.s3, border: "none", color: msg ? c.bg : c.text3, fontSize: 11, fontWeight: 700, cursor: msg ? "pointer" : "default" }}>预览 →</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <PostCard from="我" to={who} msg={msg} stamp="🎬" date="02.15" photo={hasPhoto ? demoPhoto : null} isPrivate={isPrivate} showVisibility />
                <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                  <button onClick={() => setStep(1)} style={{ flex: 1, padding: "8px", borderRadius: 6, background: c.s2, border: `1px solid ${c.line}`, color: c.text2, fontSize: 11, cursor: "pointer" }}>改一改</button>
                  <button onClick={() => setSent(true)} style={{ flex: 2, padding: "8px", borderRadius: 6, background: c.warm, border: "none", color: c.bg, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✉ 寄出</button>
                </div>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card glow>
          <div style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: c.green, marginBottom: 4 }}>✓ 已寄出</div>
            <div style={{ fontSize: 11, color: c.text3 }}>{who} 会收到通知</div>
            <button onClick={reset} style={{ marginTop: 12, background: "none", border: "none", color: c.warm, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>再寄一张</button>
          </div>
        </Card>
      )}

      {/* Received cards */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>收到的感谢卡 · {myCards.length} 张</span>
          <button onClick={() => setExpanded(!expanded)} style={{ background: c.s2, border: `1px solid ${c.line}`, borderRadius: 5, padding: "3px 10px", fontSize: 10, color: c.text2, cursor: "pointer" }}>{expanded ? "叠起来" : "展开"}</button>
        </div>
        {expanded ? myCards.map((cd, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <PostCard from={cd.from} to="Yuan" msg={cd.msg} stamp={cd.stamp} date={cd.date} photo={cd.photo} isPrivate={cd.priv} showVisibility />
          </div>
        )) : (
          <div style={{ position: "relative", height: myCards.length * 12 + 110 }}>
            {myCards.slice(0, 4).map((cd, i) => (
              <div key={i} style={{ position: i === 0 ? "relative" : "absolute", top: i * 12, left: i * 2, right: i * 2, zIndex: 4 - i, transform: `rotate(${i % 2 === 0 ? 0 : 0.6}deg)` }}>
                <div style={{ background: `linear-gradient(165deg, ${c.paper}, ${c.paperDark})`, borderRadius: 8, padding: 10, position: "relative" }}>
                  <div style={{ position: "absolute", top: 6, right: 6 }}><Stamp emoji={cd.stamp} size={18} /></div>
                  <div style={{ fontSize: 7, color: c.inkLight }}>TO: Yuan</div>
                  <div style={{ fontSize: 11, color: c.ink, fontFamily: hf, fontStyle: "italic", lineHeight: 1.6, maxWidth: "52%" }}>{cd.msg}</div>
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 3 }}><Ava name={cd.from} size={12} /><span style={{ fontSize: 9, color: c.ink }}>{cd.from}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ PAGE: PROFILE ═══ */
function PageProfile({ onNav }) {
  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <Ava name="Y" size={56} />
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>Yuan</div>
        <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 6 }}>
          <Badge color={c.warm}>🏠 Host ×3</Badge>
          <Badge color={c.blue}>🎬 选片人</Badge>
          <Badge color={c.green}>🔥 氛围担当</Badge>
        </div>
        <div style={{ fontSize: 10, color: c.text3, marginTop: 6 }}>加入串门儿 142 天</div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 16 }}>
        {[{ n: "18", l: "活动" }, { n: "3", l: "Host" }, { n: "12", l: "推荐" }, { n: "36", l: "投票" }].map((s, i) => (
          <div key={i} style={{ background: c.s1, borderRadius: 8, padding: "10px 0", textAlign: "center", border: `1px solid ${c.line}` }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: c.warm }}>{s.n}</div>
            <div style={{ fontSize: 9, color: c.text3, marginTop: 1 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Cards received */}
      <Section title="收到的感谢卡" right="12 张">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <PostCard from="白开水" to="Yuan" msg="地下室像个小影院" stamp="🎬" date="02.08" photo={photos.movieNight} isPrivate={false} showVisibility />
          <PostCard from="Tiffy" to="Yuan" msg="氛围超棒！" stamp="🍳" date="02.01" isPrivate={true} showVisibility />
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}><span style={{ fontSize: 10, color: c.warm, cursor: "pointer" }}>查看全部 12 张 →</span></div>
      </Section>

      {/* Contribution tracking */}
      <Section title="贡献记录">
        <Card>
          <div style={{ padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: c.green }}>贡献者 · 本月免费</span>
              <Badge color={c.green}>✓ 活跃贡献</Badge>
            </div>
            <div style={{ fontSize: 10, color: c.text3, lineHeight: 1.6 }}>
              本月 Host 1 次 · 收到 5 张感谢卡 · 推荐 3 部电影
            </div>
            <div style={{ marginTop: 8, height: 4, background: c.s3, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: "85%", background: c.green, borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 9, color: c.text3, marginTop: 4 }}>贡献度 85% · 超过 90% 的成员</div>
          </div>
        </Card>
      </Section>

      {/* Membership */}
      <Section title="会员状态">
        <Card glow>
          <div style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>贡献者会员</div>
                <div style={{ fontSize: 10, color: c.green, marginTop: 2 }}>你的贡献已覆盖本月会费 ✓</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: c.warm }}>$0</div>
                <div style={{ fontSize: 9, color: c.text3, textDecoration: "line-through" }}>$20/月</div>
              </div>
            </div>
            <div style={{ height: 1, background: c.line, margin: "10px 0" }} />
            <div style={{ fontSize: 10, color: c.text2, lineHeight: 1.6, marginBottom: 10 }}>
              串门的规则很简单：<b style={{ color: c.text }}>贡献的人不花钱</b>。Host、推荐电影、寄感谢卡、帮忙组织活动——这些贡献让你自动获得免费会员。
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { icon: "🏠", label: "Host 1次+", done: true },
                { icon: "✉", label: "收到 3张+感谢卡", done: true },
                { icon: "🎬", label: "推荐电影", done: true },
                { icon: "💬", label: "活跃参与", done: true },
              ].map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 5,
                  background: item.done ? c.green + "12" : c.s2,
                  border: `1px solid ${item.done ? c.green + "30" : c.line}`,
                }}>
                  <span style={{ fontSize: 10 }}>{item.icon}</span>
                  <span style={{ fontSize: 9, color: item.done ? c.green : c.text3 }}>{item.label}</span>
                  {item.done && <span style={{ fontSize: 8, color: c.green }}>✓</span>}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* What passive members see (示意) */}
        <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: c.s1, border: `1px dashed ${c.line}` }}>
          <div style={{ fontSize: 9, color: c.text3, textAlign: "center", marginBottom: 6 }}>被动会员看到的↓</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 6, background: c.s2, border: `1px solid ${c.line}` }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600 }}>普通会员</div>
              <div style={{ fontSize: 9, color: c.text3 }}>$20/月 · 支持社群运营</div>
            </div>
            <button style={{ padding: "5px 14px", borderRadius: 6, background: c.warm, border: "none", color: c.bg, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>订阅</button>
          </div>
          <div style={{ fontSize: 9, color: c.text3, textAlign: "center", marginTop: 6, lineHeight: 1.5 }}>
            或者——参加活动、推荐电影、寄感谢卡，<br/>贡献够了自动免费
          </div>
        </div>
      </Section>

      {/* Recent activity */}
      <Section title="最近参加" right="全部 →">
        {[
          { name: "电影夜 · 寄生虫", date: "02.08", role: "Host", emoji: "🎬" },
          { name: "Potluck · 新年饭局", date: "01.25", emoji: "🍳" },
          { name: "电影夜 · 千与千寻", date: "01.18", role: "Host", emoji: "🎬" },
          { name: "High Point 徒步", date: "01.12", emoji: "🥾" },
        ].map((a, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: i ? `1px solid ${c.line}` : "none" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 14 }}>{a.emoji}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{a.name}</div>
                <div style={{ fontSize: 10, color: c.text3 }}>{a.date}</div>
              </div>
            </div>
            {a.role && <Badge color={c.warm}>🏠 {a.role}</Badge>}
          </div>
        ))}
      </Section>

      {/* Seed project */}
      <Section title="种子计划">
        <Card>
          <div style={{ padding: 12 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>🌱</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>串门儿社群平台</span>
            </div>
            <div style={{ fontSize: 11, color: c.text2, lineHeight: 1.5, marginBottom: 6 }}>为华人移民社群打造的社交基础设施</div>
            <div style={{ fontSize: 10, color: c.text3 }}>最近更新：2 天前 · 3 人关注</div>
          </div>
        </Card>
      </Section>
    </div>
  );
}

/* ═══ PAGE: MEMBERS ═══ */
/* ═══ MEMBER DETAIL (standalone, reusable) ═══ */
function MemberDetail({ name, onBack, backLabel = "← 返回" }) {
  const sel = membersData.find(m => m.name === name);
  if (!sel) return <div style={{ textAlign: "center", padding: 40, color: c.text3 }}>找不到这个人</div>;
  return (
    <div>
      {backLabel && <button onClick={onBack} style={{ background: "none", border: "none", color: c.text3, fontSize: 11, cursor: "pointer", marginBottom: 10 }}>{backLabel}</button>}
      <Card>
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
            <Ava name={sel.name} size={48} badge={sel.badge} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{sel.name}</div>
              {sel.role && <div style={{ fontSize: 10, color: c.text3, marginTop: 2 }}>{sel.role}</div>}
              {sel.titles.length > 0 && (
                <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                  {sel.titles.map((t, j) => <span key={j} style={{ fontSize: 8, color: c.warm, background: c.warmDim, padding: "1px 5px", borderRadius: 3 }}>{t}</span>)}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[
              { n: sel.mutual.evtCount, l: "一起参加" },
              { n: sel.mutual.movies.length, l: "共同投片" },
              { n: sel.mutual.cards, l: "互寄卡片" },
              ...(sel.host > 0 ? [{ n: sel.host, l: "Host" }] : []),
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: c.s2, borderRadius: 6, padding: "8px 0", textAlign: "center", border: `1px solid ${c.line}` }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: c.warm }}>{s.n}</div>
                <div style={{ fontSize: 8, color: c.text3 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ background: c.warmDim, borderRadius: 8, padding: 12, marginBottom: 10, border: `1px solid ${c.warm}10` }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: c.warm }}>你和 {sel.name} 的共同经历</div>
            {sel.mutual.movies.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: c.text3, marginBottom: 4 }}>🎬 共同品味</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {sel.mutual.movies.map((m, i) => <span key={i} style={{ padding: "2px 8px", background: c.s2, borderRadius: 4, fontSize: 10, color: c.text2 }}>{m}</span>)}
                </div>
              </div>
            )}
            {sel.mutual.events.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: c.text3, marginBottom: 4 }}>📅 一起参加的活动</div>
                {sel.mutual.events.map((e, i) => (
                  <div key={i} style={{ fontSize: 10, color: c.text2, padding: "3px 0", borderTop: i ? `1px solid ${c.line}50` : "none" }}>{e}</div>
                ))}
                {sel.mutual.evtCount > sel.mutual.events.length && (
                  <div style={{ fontSize: 9, color: c.text3, marginTop: 4 }}>还有 {sel.mutual.evtCount - sel.mutual.events.length} 次...</div>
                )}
              </div>
            )}
            {sel.mutual.movies.length === 0 && sel.mutual.events.length === 0 && (
              <div style={{ fontSize: 11, color: c.text3, textAlign: "center", padding: "8px 0" }}>还没有共同经历 — 也许下次活动会遇到 TA？</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn small filled>✉ 寄张感谢卡</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PageMembers({ onViewMember }) {
  const members = membersData;
  return (
    <div>
      <div style={{ fontSize: 12, color: c.text3, marginBottom: 12 }}>{members.length} 位成员 · {members.filter(m => m.host > 0).length} 位 Host</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {members.map((m, i) => (
          <Card key={i}>
            <div onClick={() => onViewMember && onViewMember(m.name)} style={{ padding: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
              <Ava name={m.name} size={36} badge={m.badge} />
              <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</div>
              {m.role && <span style={{ fontSize: 9, color: c.text3 }}>{m.role}</span>}
              {m.titles.length > 0 && (
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" }}>
                  {m.titles.map((t, j) => <span key={j} style={{ fontSize: 8, color: c.warm, background: c.warmDim, padding: "1px 5px", borderRadius: 3 }}>{t}</span>)}
                </div>
              )}
              {m.host > 0 && <span style={{ fontSize: 9, color: c.text3 }}>Host ×{m.host}</span>}
              {m.mutual.evtCount > 0 && <span style={{ fontSize: 8, color: c.warm }}>一起 {m.mutual.evtCount} 次</span>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══ PAGE: ABOUT ═══ */
function PageAbout({ onNav }) {
  const items = [
    { icon: "👥", title: "成员", desc: `${membersData.length} 位成员 · ${membersData.filter(m => m.host > 0).length} 位 Host`, color: c.warm, action: () => onNav && onNav("members") },
    { icon: "📖", title: "串门原则", desc: "我们怎么定义这个社群", color: c.warm },
    { icon: "🏠", title: "Host 手册", desc: "如何在家里办一场串门", color: c.blue },
    { icon: "✉", title: "串门来信", desc: "写给还没来串门的你", color: c.green },
    { icon: "💬", title: "关于我们", desc: "串门儿是怎么开始的", color: c.text2 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>串门儿</div>
        <div style={{ fontSize: 12, color: c.text2, lineHeight: 1.7 }}>
          一群住在新泽西的中国人，<br/>试着把陌生人变成邻居，把邻居变成朋友。
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12 }}>
          {[{ n: "42", l: "成员" }, { n: "50", l: "活动" }, { n: "8", l: "个月" }].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: c.warm }}>{s.n}</div>
              <div style={{ fontSize: 9, color: c.text3 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      {items.map((item, i) => (
        <Card key={i}>
          <div onClick={item.action} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, cursor: item.action ? "pointer" : "default" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: item.color + "12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{item.title}</div>
              <div style={{ fontSize: 11, color: c.text3, marginTop: 2 }}>{item.desc}</div>
            </div>
            <span style={{ fontSize: 12, color: c.text3 }}>→</span>
          </div>
        </Card>
      ))}

      {/* Values */}
      <div style={{ marginTop: 6, padding: "14px 16px", background: c.s1, borderRadius: 12, border: `1px solid ${c.line}` }}>
        <div style={{ fontSize: 10, color: c.text3, fontWeight: 600, letterSpacing: "0.04em", marginBottom: 10 }}>串门的信念</div>
        {[
          "对的人 > 更多人",
          "贡献的人不花钱",
          "客厅 > 写字楼",
          "真诚 > 客气",
        ].map((v, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: i > 0 ? `1px solid ${c.line}40` : "none" }}>
            <span style={{ fontSize: 11, color: c.warm }}>·</span>
            <span style={{ fontSize: 12, color: c.text2 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ EMPTY STATES ═══ */
function EmptyState({ icon, title, desc, action, actionLabel, onAction }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: c.text3, lineHeight: 1.7, marginBottom: 16 }}>{desc}</div>
      {actionLabel && (
        <button onClick={onAction} style={{ padding: "10px 24px", borderRadius: 10, background: c.warm, border: "none", color: c.bg, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{actionLabel}</button>
      )}
    </div>
  );
}

function EmptyFeed({ onNav }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Welcome agent */}
      <div style={{ background: `linear-gradient(135deg, ${c.warm}08, ${c.s1})`, borderRadius: 12, padding: "16px 14px", border: `1px solid ${c.warm}15` }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 20 }}>{"🤖"}</span>
          <div style={{ fontSize: 13, fontWeight: 700 }}>欢迎来到串门儿！</div>
        </div>
        <div style={{ fontSize: 11, color: c.text2, lineHeight: 1.7 }}>
          串门儿是一群住在新泽西的朋友，通过小型聚会认识彼此。
          先看看最近有什么活动，或者去推荐页选一部想看的电影？
        </div>
      </div>

      {/* Quick actions for new user */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { icon: "📅", label: "看看活动", desc: "最近有什么好玩的", page: "events" },
          { icon: "🎬", label: "推荐电影", desc: "投票选下次看什么", page: "discover" },
          { icon: "📖", label: "了解串门", desc: "我们是谁、怎么玩", page: "about" },
          { icon: "✉", label: "寄感谢卡", desc: "给朋友说声谢谢", page: "cards" },
        ].map((a, i) => (
          <div key={i} onClick={() => onNav && onNav(a.page)} style={{ padding: 14, borderRadius: 10, background: c.s1, border: `1px solid ${c.line}`, cursor: "pointer" }}>
            <span style={{ fontSize: 20 }}>{a.icon}</span>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{a.label}</div>
            <div style={{ fontSize: 10, color: c.text3, marginTop: 2 }}>{a.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div style={{ fontSize: 11, color: c.text3 }}>动态流会随着你参加活动慢慢丰富起来 ✨</div>
      </div>
    </div>
  );
}

function EmptyCards({ onNav }) {
  return (
    <div>
      <EmptyState
        icon="✉"
        title="还没有感谢卡"
        desc={"参加一次活动后，就可以给同行的人寄一张感谢卡。\n你的卡片和收到的卡片都会出现在这里。"}
        actionLabel="看看最近的活动"
        onAction={() => onNav && onNav("events")}
      />
    </div>
  );
}

function EmptyEvents() {
  return (
    <EmptyState
      icon="📅"
      title="暂时没有活动"
      desc="新活动会在这里出现。你也可以点下面的 + 提一个想法！"
    />
  );
}

/* ═══ MAIN APP ═══ */
export default function ChuanmenFull() {
  const [page, setPage] = useState("feed");
  const [isEmpty, setIsEmpty] = useState(false);
  const [viewingMember, setViewingMember] = useState(null);
  const [prevPage, setPrevPage] = useState("feed");

  const navTo = (p) => { setViewingMember(null); setPage(p); };
  const viewMember = (name, from) => { setPrevPage(from || page); setViewingMember(name); setPage("member-detail"); };

  const pages = [
    { id: "feed", icon: "🏠", label: "动态" },
    { id: "events", icon: "📅", label: "活动" },
    { id: "discover", icon: "👍", label: "推荐" },
    { id: "cards", icon: "✉", label: "感谢卡" },
    { id: "profile", icon: "👤", label: "我" },
  ];

  const titles = { feed: "串门儿", events: "活动", discover: "推荐", cards: "感谢卡", profile: "我的页面", members: "成员墙", about: "关于串门儿", "member-detail": viewingMember || "成员" };

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text, fontFamily: f }}>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        textarea::placeholder { color:${c.text3}; font-style:italic; }
        input::placeholder { color:${c.text3}; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-track { background:${c.bg}; }
        ::-webkit-scrollbar-thumb { background:${c.s3}; border-radius:2px; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{ maxWidth: 440, margin: "0 auto", paddingBottom: 70 }}>
        {/* Top bar */}
        <div style={{
          position: "sticky", top: 0, zIndex: 100,
          background: `${c.bg}dd`, backdropFilter: "blur(12px)",
          padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: `1px solid ${c.line}50`,
        }}>
          {page === "about" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => navTo("feed")} style={{ background: "none", border: "none", color: c.text3, fontSize: 14, cursor: "pointer" }}>←</button>
              <span style={{ fontSize: 16, fontWeight: 800 }}>{titles[page]}</span>
            </div>
          ) : page === "members" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => navTo("about")} style={{ background: "none", border: "none", color: c.text3, fontSize: 14, cursor: "pointer" }}>←</button>
              <span style={{ fontSize: 16, fontWeight: 800 }}>{titles[page]}</span>
            </div>
          ) : page === "member-detail" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => navTo(prevPage)} style={{ background: "none", border: "none", color: c.text3, fontSize: 14, cursor: "pointer" }}>←</button>
              <span style={{ fontSize: 16, fontWeight: 800 }}>{viewingMember}</span>
            </div>
          ) : (
            <div onClick={() => navTo("about")} style={{ fontSize: 16, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              {titles[page]}
              {page === "feed" && <span style={{ fontSize: 10, color: c.text3, fontWeight: 400 }}>ⓘ</span>}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Demo toggle */}
            <button onClick={() => setIsEmpty(!isEmpty)} style={{
              padding: "2px 8px", borderRadius: 4, fontSize: 8, fontWeight: 600,
              background: isEmpty ? c.warm + "20" : c.s2,
              color: isEmpty ? c.warm : c.text3,
              border: `1px solid ${isEmpty ? c.warm + "40" : c.line}`,
              cursor: "pointer",
            }}>{isEmpty ? "新用户" : "老用户"}</button>
            {page === "feed" && !isEmpty && <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.warm, boxShadow: `0 0 6px ${c.warm}` }} />}
            <Ava name="Y" size={24} />
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "12px 16px", animation: "fadeIn 0.2s ease" }} key={page + String(isEmpty) + (viewingMember || "")}>
          {page === "feed" && (isEmpty ? <EmptyFeed onNav={navTo} /> : <PageFeed onNav={navTo} onViewMember={viewMember} />)}
          {page === "events" && <PageEvents />}
          {page === "discover" && <PageDiscover />}
          {page === "cards" && (isEmpty ? <EmptyCards onNav={navTo} /> : <PageCards />)}
          {page === "profile" && <PageProfile onNav={navTo} />}
          {page === "members" && <PageMembers onViewMember={viewMember} />}
          {page === "member-detail" && viewingMember && <MemberDetail name={viewingMember} onBack={() => navTo(prevPage)} backLabel="" />}
          {page === "about" && <PageAbout onNav={navTo} />}
        </div>

        {/* Bottom nav */}
        <div style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 440,
          background: `${c.s1}ee`, backdropFilter: "blur(12px)",
          borderTop: `1px solid ${c.line}`,
          display: "flex", padding: "6px 0 10px",
          zIndex: 100,
        }}>
          {pages.map(p => (
            <button key={p.id} onClick={() => setPage(p.id)} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              background: "none", border: "none", cursor: "pointer",
              color: (page === p.id || (page === "members" && p.id === "feed") || (page === "member-detail" && p.id === "feed") || (page === "about" && p.id === "feed")) ? c.warm : c.text3,
              position: "relative",
            }}>
              {p.id === "cards" && !isEmpty && <div style={{ position: "absolute", top: -2, right: "28%", width: 6, height: 6, borderRadius: "50%", background: c.warm }} />}
              <span style={{ fontSize: 18 }}>{p.icon}</span>
              <span style={{ fontSize: 9, fontWeight: (page === p.id || (page === "members" && p.id === "feed") || (page === "member-detail" && p.id === "feed") || (page === "about" && p.id === "feed")) ? 700 : 400 }}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}