import { useState, useEffect, useRef } from "react";

/*
  串门儿 · 终极完整版 Demo v2
  
  Aligned with PRD v2.1.
  Updated: About page welcome text, apply CTA.
  Bottom nav + hamburger drawer. Dark lofi palette.
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

      <div style={{ height: 8 }} />
      <FeedTime label="更早" />
      <div style={{ height: 8 }} />

      {/* Activity - tier 2 */}
      <FeedActivity name="Tiffy" title="Potluck · 来我家吃火锅" date="2.28 周五 6pm" location="Tiffy 家" spots={2} people={["Tiffy","大橙子","星星"]} scene="potluck" onTap={() => onNav && onNav("events")} onViewMember={onViewMember} />
    </div>
  );
}

/* ═══ PAGE: EVENTS ═══ */
function PageEvents({ onViewMovie }) {
  const [tab, setTab] = useState("signup");
  const [detailIdx, setDetailIdx] = useState(null);
  const [detailType, setDetailType] = useState("signup"); // which list the detail came from
  const [showCreate, setShowCreate] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [commentText, setCommentText] = useState("");

  const signupEvents = [
    { id: 1, title: "周六电影夜 · 花样年华", host: "白开水", date: "2.22 周六 7pm", location: "白开水家", scene: "movieNight", film: "花样年华", spots: 4, total: 8, people: ["白开水","Yuan","大橙子","星星"], phase: "open", desc: "王家卫经典。灯光调暗，坐在地下室沙发上，一起感受六十年代的香港。", houseRules: "请换鞋入内 · 10pm 前结束 · Potluck 每人带一道菜", recorder: "星星", helpers: ["需要人帮忙带投影幕布","谁能带一箱气泡水？"], nominees: [{title:"花样年华",v:12,by:"Yuan"},{title:"重庆森林",v:8,by:"白开水"},{title:"春光乍泄",v:6,by:"Yuan"}], chosenFilm: "花样年华" },
    { id: 2, title: "Potluck · 来我家吃火锅", host: "Tiffy", date: "2.28 周五 6pm", location: "Tiffy 家", scene: "potluck", spots: 2, total: 8, people: ["Tiffy","大橙子","星星"], phase: "open", desc: "铜锅涮肉！食材 AA，Tiffy 准备锅底和蘸料。", houseRules: "请换鞋 · 有猫，介意的请提前说", recorder: "大橙子" },
    { id: 3, title: "Spring Hike · Delaware Water Gap", host: "大橙子", date: "3.08 周六 9am", location: "Delaware Water Gap", scene: "hike", spots: 6, total: 10, people: ["大橙子","Yuan"], phase: "invite", invitedBy: "大橙子", desc: "春季徒步，中等难度，来回大约 3 小时。拼车从 Jersey City 出发。" },
  ];

  const liveEvents = [
    { id: 10, title: "棋盘游戏夜", host: "Leo", date: "今天 3pm - 进行中", location: "Leo 家", scene: "cozy", spots: 0, total: 6, people: ["Leo","Yuan","星星","白开水","Tiffy","小鱼"], phase: "live", desc: "Catan + Codenames。目前正在玩第二轮 Catan，Yuan 在赢。", startedAt: "3:00 PM", elapsed: "2h 15min" },
  ];

  const pastEvents = [
    { id: 20, title: "电影夜 · 寄生虫", host: "白开水", date: "02.08", location: "白开水家", scene: "movieNight", film: "寄生虫", people: ["白开水","Yuan","大橙子","星星","Tiffy","Leo","小鱼","CC"], desc: "寄生虫放映夜，看完讨论到快 12 点。", photos: 6, comments: [
      { name: "星星", text: "半地下室那段太震撼了，看完沉默了好久", time: "02.08", filmRef: true },
      { name: "大橙子", text: "白开水做的芝士年糕太好吃了，比电影里的还好", time: "02.09" },
      { name: "Yuan", text: "这是第一次看完电影大家自发讨论到这么晚", time: "02.09", filmRef: true, edited: true },
    ]},
    { id: 21, title: "新年饭局 Potluck", host: "Yuan", date: "01.25", location: "Yuan 家", scene: "potluck", people: ["Yuan","白开水","大橙子","星星","Tiffy","Leo","小鱼","CC","Kiki","Alex"], desc: "新年第一顿，十个人的大长桌。", photos: 12, comments: [
      { name: "Tiffy", text: "Yuan 家的投影 setup 真的太舒服了", time: "01.26" },
      { name: "CC", text: "红烧肉 YYDS", time: "01.25" },
    ]},
    { id: 22, title: "电影夜 · 千与千寻", host: "Yuan", date: "01.18", location: "Yuan 家", scene: "movieNight", film: "千与千寻", people: ["Yuan","白开水","星星","Tiffy","Leo","小鱼","CC"], desc: "千与千寻重映，有人是第一次在大屏幕上看。", photos: 4, comments: [
      { name: "小鱼", text: "从来没在这么大的屏幕上看过千寻，感觉完全不一样", time: "01.18", filmRef: true },
    ]},
    { id: 23, title: "High Point 徒步", host: "大橙子", date: "01.12", location: "High Point State Park", scene: "hike", people: ["大橙子","Yuan","白开水","星星","Leo","Tiffy"], desc: "新泽西最高点，冬天的风景意外地好。", photos: 8 },
  ];

  const proposals = [
    { name: "Tiffy", title: "周末一起去爬 High Point？", votes: 5, interested: ["星星","大橙子","白开水"], time: "3 天前" },
    { name: "星星", title: "找个周末一起去 MOMA？", votes: 3, interested: ["Yuan","Tiffy"], time: "5 天前" },
    { name: "小鱼", title: "有人想打羽毛球吗", votes: 8, interested: ["Leo","大橙子","白开水","Yuan"], time: "1 周前" },
  ];

  const getList = () => detailType === "signup" ? signupEvents : detailType === "live" ? liveEvents : pastEvents;
  const sel = detailIdx !== null ? getList().find(e => e.id === detailIdx) : null;
  const isPast = detailType === "past";
  const isLive = detailType === "live";

  /* ── Event Detail View ── */
  if (sel) return (
    <div>
      <button onClick={() => setDetailIdx(null)} style={{ background: "none", border: "none", color: c.text3, fontSize: 11, cursor: "pointer", marginBottom: 10 }}>← 返回活动列表</button>
      <Card>
        <ScenePhoto scene={sel.scene} h={130}>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: `linear-gradient(transparent, ${c.s1})` }} />
          {sel.film && <div style={{ position: "absolute", bottom: 8, left: 10 }}><Poster title={sel.film} w={36} h={50} /></div>}
          {sel.phase === "invite" && (
            <div style={{ position: "absolute", top: 8, left: 10, padding: "3px 8px", background: `${c.warm}cc`, borderRadius: 5, fontSize: 9, color: c.bg, fontWeight: 700 }}>🔒 Host 专属邀请</div>
          )}
          {isLive && (
            <div style={{ position: "absolute", top: 8, left: 10, padding: "3px 8px", background: `${c.green}cc`, borderRadius: 5, fontSize: 9, color: c.bg, fontWeight: 700 }}>● 进行中 · {sel.elapsed}</div>
          )}
          {isPast && (
            <div style={{ position: "absolute", top: 8, left: 10, padding: "3px 8px", background: `${c.s2}cc`, backdropFilter: "blur(6px)", borderRadius: 5, fontSize: 9, color: c.text2 }}>已结束</div>
          )}
          {isPast && sel.photos && (
            <div style={{ position: "absolute", top: 8, right: 10, padding: "3px 8px", background: `${c.s2}cc`, backdropFilter: "blur(6px)", borderRadius: 5, fontSize: 9, color: c.text2 }}>📷 {sel.photos} 张照片</div>
          )}
        </ScenePhoto>
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{sel.title}</div>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: c.text2, marginBottom: 12, flexWrap: "wrap" }}>
            <span>📅 {sel.date}</span>
            <span>📍 {sel.location}{sel.location.includes("家") && !isPast && <span style={{ fontSize: 9, color: c.text3 }}> · 报名后可见完整地址</span>}</span>
            {isLive && <span style={{ color: c.green }}>⏱ 开始于 {sel.startedAt}</span>}
          </div>

          {/* Host info */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 0", borderTop: `1px solid ${c.line}`, borderBottom: `1px solid ${c.line}`, marginBottom: 12 }}>
            <Ava name={sel.host} size={32} badge="🏠" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12 }}><b>{sel.host}</b> · Host</div>
              <div style={{ fontSize: 10, color: c.text3 }}>已 Host {sel.host === "白开水" ? 8 : sel.host === "Tiffy" ? 2 : sel.host === "Leo" ? 1 : 5} 次</div>
            </div>
            {sel.recorder && <div style={{ fontSize: 9, color: c.text3, padding: "2px 6px", background: c.s2, borderRadius: 4 }}>📷 {sel.recorder} 记录</div>}
          </div>

          {/* Description */}
          <div style={{ fontSize: 12, color: c.text2, lineHeight: 1.7, marginBottom: 14 }}>{sel.desc}</div>

          {/* House rules */}
          {sel.houseRules && (
            <div style={{ background: c.s2, borderRadius: 8, padding: 10, marginBottom: 12, border: `1px solid ${c.line}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: c.text2, marginBottom: 4 }}>🏡 House Rules</div>
              <div style={{ fontSize: 11, color: c.text2, lineHeight: 1.6 }}>{sel.houseRules}</div>
            </div>
          )}

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

          {/* ═══ Bi-directional link: Movie card (for movie night events) ═══ */}
          {sel.film && (
            <div style={{ background: c.s2, borderRadius: 10, padding: 12, marginBottom: 12, border: `1px solid ${c.line}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: c.text3, marginBottom: 8 }}>🎬 {isPast ? "放映电影" : "本场放映"}</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Poster title={sel.film} w={48} h={66} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{sel.film}</div>
                  <div style={{ fontSize: 10, color: c.text3, marginTop: 2 }}>
                    {sel.film === "花样年华" ? "2000 · 王家卫 · ⭐ 8.6" : sel.film === "寄生虫" ? "2019 · 奉俊昊 · ⭐ 8.7" : sel.film === "千与千寻" ? "2001 · 宫崎骏 · ⭐ 9.4" : ""}
                  </div>
                  <div style={{ fontSize: 10, color: c.text3, marginTop: 2 }}>
                    {sel.film === "花样年华" ? "Yuan 推荐 · 12 人想看" : sel.film === "寄生虫" ? "白开水 推荐 · 9 人想看" : sel.film === "千与千寻" ? "星星 推荐 · 11 人想看" : ""}
                  </div>
                </div>
              </div>
              {/* Bi-directional link hint */}
              <div onClick={() => onViewMovie && onViewMovie(sel.film)} style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 8, cursor: "pointer" }}>
                <span style={{ fontSize: 10, color: c.warm }}>查看电影详情</span>
                <span style={{ fontSize: 10, color: c.warm }}>→</span>
              </div>
            </div>
          )}

          {/* Candidate movies (for upcoming movie nights with nominees) */}
          {sel.nominees && !isPast && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: c.text3, marginBottom: 8 }}>🎬 候选电影（Host 选片中）</div>
              {sel.nominees.map((n, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < sel.nominees.length - 1 ? `1px solid ${c.line}` : "none" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Poster title={n.title} w={28} h={38} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: n.title === sel.chosenFilm ? 700 : 400, color: n.title === sel.chosenFilm ? c.warm : c.text }}>{n.title} {n.title === sel.chosenFilm && <span style={{ fontSize: 9, color: c.green }}>✓ 已选</span>}</div>
                      <div style={{ fontSize: 9, color: c.text3 }}>{n.by} 推荐</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: c.text2 }}>▲ {n.v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Host help area */}
          {sel.helpers && sel.helpers.length > 0 && (
            <div style={{ background: `${c.warm}08`, borderRadius: 8, padding: 10, marginBottom: 12, border: `1px solid ${c.warm}15` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: c.warm, marginBottom: 6 }}>🙋 Host 需要帮忙</div>
              {sel.helpers.map((h, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                  <span style={{ fontSize: 11, color: c.text2 }}>• {h}</span>
                  <button style={{ padding: "2px 8px", borderRadius: 4, background: c.s3, border: `1px solid ${c.line}`, color: c.text3, fontSize: 9, cursor: "pointer" }}>我可以！</button>
                </div>
              ))}
            </div>
          )}

          {/* Contribution roles (for past events) */}
          {isPast && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: c.text3, marginBottom: 8 }}>🤝 贡献角色</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", background: c.s2, borderRadius: 6, border: `1px solid ${c.line}` }}>
                  <Ava name={sel.host} size={16} badge="🏠" /><span style={{ fontSize: 10, color: c.text2 }}>{sel.host} · Host</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", background: c.s2, borderRadius: 6, border: `1px solid ${c.line}` }}>
                  <Ava name="星星" size={16} /><span style={{ fontSize: 10, color: c.text2 }}>星星 · 📷 记录</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", background: c.s2, borderRadius: 6, border: `1px solid ${c.line}` }}>
                  <Ava name="Yuan" size={16} /><span style={{ fontSize: 10, color: c.text2 }}>Yuan · 🔧 设备</span>
                </div>
              </div>
            </div>
          )}

          {/* Photo gallery placeholder (past events) */}
          {isPast && sel.photos && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: c.text3 }}>📷 活动照片 · {sel.photos} 张</span>
                <span style={{ fontSize: 9, color: c.warm, cursor: "pointer" }}>上传照片 +</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[sel.scene, "cozy", "potluck"].slice(0, 3).map((s, i) => (
                  <div key={i} style={{ flex: 1, height: 64, borderRadius: 6, overflow: "hidden", position: "relative" }}>
                    <ScenePhoto scene={s} h={64} />
                    {i === 2 && sel.photos > 3 && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: c.text }}>+{sel.photos - 3}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participants */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: c.text3, marginBottom: 4 }}>{isPast ? "参与者" : "报名情况"} · {sel.people.length}/{sel.total}</div>
              <AvaStack names={sel.people} />
            </div>
            {!isPast && !isLive && (
              <span style={{ fontSize: 11, color: sel.spots > 0 ? c.green : c.text3 }}>
                {sel.spots > 0 ? `还剩 ${sel.spots} 位` : "已满 · 可排队"}
              </span>
            )}
          </div>

          {/* Comments / Memories section */}
          {isPast && sel.comments && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: c.text3, marginBottom: 8 }}>💬 回忆与评论 · {sel.comments.length}</div>
              {sel.comments.map((cm, i) => (
                <div key={i} style={{ padding: "8px 0", borderTop: `1px solid ${c.line}` }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                    <Ava name={cm.name} size={20} />
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{cm.name}</span>
                    <span style={{ fontSize: 9, color: c.text3 }}>{cm.time}</span>
                    {cm.edited && <span style={{ fontSize: 8, color: c.text3, fontStyle: "italic" }}>· 已编辑</span>}
                    {cm.name === "Yuan" && (
                      <span style={{ marginLeft: "auto", fontSize: 9, color: c.text3, cursor: "pointer" }}>✏️ · 🗑</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: c.text2, lineHeight: 1.6, paddingLeft: 26 }}>{cm.text}</div>
                  {/* ═══ Bi-directional link: comment references movie ═══ */}
                  {cm.filmRef && sel.film && (
                    <div style={{ marginLeft: 26, marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: c.s2, borderRadius: 4, border: `1px solid ${c.line}`, cursor: "pointer" }}>
                      <span style={{ fontSize: 9, color: c.text3 }}>🎬</span>
                      <span style={{ fontSize: 9, color: c.warm }}>也评论了「{sel.film}」→</span>
                    </div>
                  )}
                </div>
              ))}
              {/* Add comment */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0", borderTop: `1px solid ${c.line}` }}>
                <Ava name="Yuan" size={20} />
                <div style={{ flex: 1, padding: "6px 10px", background: c.s2, borderRadius: 6, border: `1px solid ${c.line}`, fontSize: 11, color: c.text3, cursor: "pointer" }}>写点回忆...</div>
              </div>
            </div>
          )}

          {/* Action button */}
          {!isPast && !isLive && (
            <button style={{ width: "100%", padding: "11px 0", borderRadius: 8, background: c.warm, border: "none", color: c.bg, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {sel.phase === "invite" ? "接受邀请" : "报名参加"}
            </button>
          )}
          {isLive && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: `${c.green}10`, border: `1px solid ${c.green}30`, textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: c.green }}>● 活动进行中</div>
              <div style={{ fontSize: 10, color: c.text3, marginTop: 2 }}>已开始 {sel.elapsed}</div>
            </div>
          )}
          {isPast && (
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: c.warm, border: "none", color: c.bg, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✉ 发感谢卡</button>
              <button style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: c.s2, border: `1px solid ${c.line}`, color: c.text2, fontSize: 12, cursor: "pointer" }}>📷 上传照片</button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  /* ── List View ── */
  return (
    <div style={{ position: "relative" }}>
      {/* Sub tabs - 3 states */}
      <div style={{ display: "flex", gap: 0, marginBottom: 14, background: c.s1, borderRadius: 8, padding: 2, border: `1px solid ${c.line}` }}>
        {[["signup", `报名中 (${signupEvents.length})`], ["live", `进行中 (${liveEvents.length})`], ["past", "已结束"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 11, fontWeight: tab === k ? 700 : 400, background: tab === k ? c.s3 : "transparent", color: tab === k ? c.text : c.text3, border: "none", cursor: "pointer" }}>{l}</button>
        ))}
      </div>

      {/* ── 报名中 Tab ── */}
      {tab === "signup" && (
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

          {signupEvents.map((evt) => (
            <Card key={evt.id}>
              <div onClick={() => { setDetailIdx(evt.id); setDetailType("signup"); }} style={{ cursor: "pointer" }}>
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
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, cursor: "pointer" }} onClick={() => { setDetailIdx(evt.id); setDetailType("signup"); }}>{evt.title}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <AvaStack names={evt.people} />
                  <span style={{ fontSize: 10, color: evt.spots > 0 ? c.green : c.text3 }}>还剩 {evt.spots} 位</span>
                </div>
              </div>
            </Card>
          ))}

          {/* Proposals section */}
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

      {/* ── 进行中 Tab ── */}
      {tab === "live" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {liveEvents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>☕</div>
              <div style={{ fontSize: 13, color: c.text3 }}>当前没有进行中的活动</div>
            </div>
          ) : liveEvents.map((evt) => (
            <Card key={evt.id}>
              <div onClick={() => { setDetailIdx(evt.id); setDetailType("live"); }} style={{ cursor: "pointer" }}>
                <ScenePhoto scene={evt.scene} h={80}>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: `linear-gradient(transparent, ${c.s1})` }} />
                  <div style={{ position: "absolute", top: 6, left: 8, padding: "3px 8px", background: `${c.green}cc`, borderRadius: 5, fontSize: 9, color: c.bg, fontWeight: 700 }}>● 进行中</div>
                  <div style={{ position: "absolute", top: 6, right: 8 }}>
                    <div style={{ padding: "2px 7px", background: `${c.s2}cc`, backdropFilter: "blur(8px)", borderRadius: 4, fontSize: 9, color: c.text2 }}>{evt.elapsed}</div>
                  </div>
                </ScenePhoto>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <Ava name={evt.host} size={22} badge="🏠" />
                  <span style={{ fontSize: 10, color: c.text3 }}>{evt.host} · {evt.location}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, cursor: "pointer" }} onClick={() => { setDetailIdx(evt.id); setDetailType("live"); }}>{evt.title}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <AvaStack names={evt.people} />
                  <span style={{ fontSize: 10, color: c.green }}>⏱ {evt.elapsed}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── 已结束 Tab ── */}
      {tab === "past" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {pastEvents.map((evt) => (
            <Card key={evt.id}>
              <div onClick={() => { setDetailIdx(evt.id); setDetailType("past"); }} style={{ display: "flex", gap: 10, padding: 12, alignItems: "center", cursor: "pointer" }}>
                <div style={{ width: 56, height: 56, borderRadius: 8, overflow: "hidden", flexShrink: 0, position: "relative" }}>
                  <ScenePhoto scene={evt.scene} h={56} />
                  {evt.film && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Poster title={evt.film} w={24} h={33} /></div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{evt.title}</div>
                  <div style={{ fontSize: 10, color: c.text3, marginTop: 2 }}>{evt.date} · {evt.host} Host · {evt.people.length} 人</div>
                  {evt.photos && <div style={{ fontSize: 9, color: c.text3, marginTop: 2 }}>📷 {evt.photos} · 💬 {evt.comments ? evt.comments.length : 0}</div>}
                </div>
                <span style={{ fontSize: 10, color: c.text3 }}>→</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* FAB */}
      {!sel && (
        <div style={{ position: "relative", display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          {showCreate && (
            <div style={{ position: "absolute", bottom: 48, right: 0, width: 280, animation: "fadeIn 0.15s ease" }}>
              <Card>
                <div style={{ padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>🏠 发起活动</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ padding: "7px 10px", borderRadius: 6, background: c.s2, border: `1px solid ${c.line}`, fontSize: 11, color: c.text3 }}>活动名称...</div>
                    <div style={{ padding: "7px 10px", borderRadius: 6, background: c.s2, border: `1px solid ${c.line}`, fontSize: 11, color: c.text3 }}>日期和时间...</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                      <span style={{ fontSize: 11 }}>📍 在我家</span>
                      <div style={{ width: 36, height: 20, borderRadius: 10, padding: 2, background: c.green }}>
                        <div style={{ width: 16, height: 16, borderRadius: 8, background: "#fff", transform: "translateX(16px)" }} />
                      </div>
                    </div>
                    <div style={{ padding: "6px 10px", borderRadius: 6, background: `${c.warm}08`, border: `1px solid ${c.warm}15`, fontSize: 10, color: c.text2, lineHeight: 1.5 }}>
                      <div style={{ fontSize: 9, color: c.warm, fontWeight: 600, marginBottom: 3 }}>🏡 House Rules · 已自动填入</div>
                      请换鞋入内 · 有猫 · 10pm 前结束
                    </div>
                    <div style={{ fontSize: 9, color: c.text3, lineHeight: 1.4 }}>ℹ️ 完整地址仅报名成功的参与者可见</div>
                    <button style={{ padding: "9px 0", borderRadius: 8, background: c.warm, border: "none", color: c.bg, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>创建活动</button>
                  </div>
                  <div style={{ textAlign: "center", marginTop: 8 }}>
                    <span onClick={() => setShowCreate(false)} style={{ fontSize: 10, color: c.text3, cursor: "pointer" }}>💡 或者先提一个想法</span>
                  </div>
                </div>
              </Card>
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
function PageDiscover({ onViewMovie }) {
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
      <PageMovies onViewMovie={onViewMovie} />
    </div>
  );
}

/* ═══ PAGE: MOVIES ═══ */
function PageMovies({ onViewMovie }) {
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
          <div onClick={() => onViewMovie && onViewMovie(m.title)} style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", flex: 1 }}>
            <Poster title={m.title} w={40} h={56} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title} {m.status && <Badge color={c.green}>{"✓"} {m.status}</Badge>}</div>
              <div style={{ fontSize: 10, color: c.text3, marginTop: 1 }}>{m.year} · {m.dir} · <span style={{ color: c.text2 }}>{m.by} 推荐</span></div>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); toggle(m.id); }} style={{
            display: "flex", alignItems: "center", gap: 3, padding: "4px 12px", borderRadius: 6,
            background: votes[m.id] ? c.warm + "15" : c.s2,
            border: `1px solid ${votes[m.id] ? c.warm + "40" : c.line}`,
            color: votes[m.id] ? c.warm : c.text2, fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>▲ {m.v + (votes[m.id] ? 1 : 0)}</button>
        </div>
      ))}

      {tab === "screened" && screened.map((m, i) => (
        <div key={i} onClick={() => onViewMovie && onViewMovie(m.title)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 2px", borderBottom: `1px solid ${c.line}`, cursor: "pointer" }}>
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

/* ═══ PAGE: MOVIE DETAIL ═══ */
function PageMovieDetail({ movieTitle, onBack }) {
  const movieData = {
    "花样年华": { year: "2000", dir: "王家卫", rating: "8.6", genre: "剧情 / 爱情", duration: "98 min", by: "Yuan", votes: 12, voters: ["Yuan","白开水","大橙子","星星","Tiffy","Leo","小鱼","CC","Kiki","Alex","Emily","James"], synopsis: "1962 年的香港，周慕云和苏丽珍是邻居。他们发现各自的配偶背着他们有了婚外情，二人于是开始在失落中建立起一段微妙的感情。", screenings: [{ date: "02.22", host: "白开水", event: "周六电影夜 · 花样年华", location: "白开水家", people: 8, status: "即将放映" }], status: "本周放映" },
    "惊魂记": { year: "1960", dir: "希区柯克", rating: "8.9", genre: "悬疑 / 惊悚", duration: "109 min", by: "白开水", votes: 9, voters: ["白开水","Yuan","大橙子","星星","Tiffy","Leo","小鱼","CC","Kiki"], synopsis: "菲尼克斯城女秘书玛丽恩偷了一笔钱后驾车出逃。暴风雨之夜她来到一家偏僻的汽车旅馆，旅馆由年轻的诺曼·贝茨管理。", screenings: [{ date: "10.28", host: "白开水", event: "万圣节电影夜 · 惊魂记", location: "白开水家", people: 5, status: "已结束" }] },
    "永恒和一日": { year: "1998", dir: "安哲罗普洛斯", rating: "8.6", genre: "剧情", duration: "137 min", by: "Yuan", votes: 7, voters: ["Yuan","白开水","星星","Tiffy","小鱼","CC","Leo"], synopsis: "年迈的诗人亚历山大在生命的最后一天里，带着一个阿尔巴尼亚流浪儿穿越了希腊的城市和边界。", screenings: [] },
    "东京物语": { year: "1953", dir: "小津安二郎", rating: "9.2", genre: "剧情 / 家庭", duration: "136 min", by: "星星", votes: 6, voters: ["星星","Yuan","白开水","大橙子","Tiffy","Leo"], synopsis: "住在尾道的老夫妇到东京探望已经成家立业的儿女，却发现儿女们各有各的忙碌。", screenings: [] },
    "燃烧女子的肖像": { year: "2019", dir: "瑟琳·席安玛", rating: "8.6", genre: "剧情 / 爱情", duration: "122 min", by: "Tiffy", votes: 5, voters: ["Tiffy","星星","大橙子","Yuan","CC"], synopsis: "十八世纪的法国布列塔尼，女画家玛丽安接到一个委托：为年轻女子埃洛伊丝画一幅肖像画。", screenings: [] },
    "寄生虫": { year: "2019", dir: "奉俊昊", rating: "8.7", genre: "剧情 / 喜剧", duration: "132 min", by: "白开水", votes: 9, voters: ["白开水","Yuan","大橙子","星星","Tiffy","Leo","小鱼","CC","Kiki"], synopsis: "住在半地下室的一家四口，偶然间全部进入富裕的朴社长家工作。两个阶层的碰撞引发了一连串意想不到的事件。", screenings: [{ date: "02.08", host: "白开水", event: "电影夜 · 寄生虫", location: "白开水家", people: 8, status: "已结束" }] },
    "千与千寻": { year: "2001", dir: "宫崎骏", rating: "9.4", genre: "动画 / 奇幻", duration: "125 min", by: "星星", votes: 11, voters: ["星星","Yuan","白开水","大橙子","Tiffy","Leo","小鱼","CC","Kiki","Alex","Emily"], synopsis: "十岁女孩千寻随父母搬家途中误入一个奇幻世界，在那里她必须工作来拯救变成猪的父母。", screenings: [{ date: "01.18", host: "Yuan", event: "电影夜 · 千与千寻", location: "Yuan 家", people: 7, status: "已结束" }] },
    "春光乍泄": { year: "1997", dir: "王家卫", rating: "8.9", genre: "剧情 / 爱情", duration: "96 min", by: "白开水", votes: 8, voters: ["白开水","Yuan","星星","Tiffy","大橙子","Leo","CC","小鱼"], synopsis: "黎耀辉和何宝荣到阿根廷旅行，在布宜诺斯艾利斯的异国他乡，两人的关系经历了分分合合。", screenings: [{ date: "01.25", host: "白开水", event: "新年电影夜 · 春光乍泄", location: "白开水家", people: 6, status: "已结束" }] },
    "重庆森林": { year: "1994", dir: "王家卫", rating: "8.8", genre: "剧情 / 爱情", duration: "103 min", by: "Yuan", votes: 7, voters: ["Yuan","白开水","星星","大橙子","Tiffy","Leo","CC"], synopsis: "两个失恋警察的故事交织在香港的霓虹灯下。凤梨罐头的保质期和加州梦想，关于遗忘和重新开始。", screenings: [] },
  };

  const movie = movieData[movieTitle] || movieData["花样年华"];
  const comments = [
    { name: "星星", text: "这部片子的留白太美了，看完久久不能平静", time: "02.10", eventRef: movie.screenings.length > 0 ? movie.screenings[0].event : null },
    { name: "白开水", text: "配乐是神来之笔，梅林茂的 Yumeji's Theme", time: "02.08" },
    { name: "Yuan", text: "每次看都有新的感受，推荐给所有人", time: "01.20", eventRef: movie.screenings.length > 0 ? movie.screenings[0].event : null },
  ];

  return (
    <div>
      {/* Movie hero */}
      <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
        <Poster title={movieTitle} w={100} h={140} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{movieTitle}</div>
          <div style={{ fontSize: 11, color: c.text2, lineHeight: 1.6 }}>
            {movie.year} · {movie.dir}<br/>
            {movie.genre} · {movie.duration}<br/>
            ⭐ 豆瓣 {movie.rating}
          </div>
          {movie.status && (
            <div style={{ display: "inline-block", marginTop: 6, padding: "2px 8px", background: `${c.green}15`, border: `1px solid ${c.green}30`, borderRadius: 4, fontSize: 10, color: c.green, fontWeight: 600 }}>✓ {movie.status}</div>
          )}
        </div>
      </div>

      {/* Synopsis */}
      <div style={{ fontSize: 12, color: c.text2, lineHeight: 1.7, marginBottom: 16 }}>{movie.synopsis}</div>

      {/* Recommender + votes */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Ava name={movie.by} size={24} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{movie.by} 推荐</div>
              </div>
            </div>
            <button style={{ display: "flex", alignItems: "center", gap: 3, padding: "5px 14px", borderRadius: 6, background: c.warm + "15", border: `1px solid ${c.warm}40`, color: c.warm, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>▲ {movie.votes} 想看</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <AvaStack names={movie.voters.slice(0, 8)} size={20} />
            {movie.voters.length > 8 && <span style={{ fontSize: 9, color: c.text3 }}>+{movie.voters.length - 8}</span>}
          </div>
        </div>
      </Card>

      {/* ═══ Bi-directional link: Screening records → Activity ═══ */}
      {movie.screenings.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: c.text3, marginBottom: 8 }}>📅 放映记录</div>
          {movie.screenings.map((s, i) => (
            <Card key={i} style={{ marginBottom: 6 }}>
              <div style={{ padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Ava name={s.host} size={22} badge="🏠" />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{s.event}</div>
                      <div style={{ fontSize: 10, color: c.text3 }}>{s.date} · {s.location} · {s.people} 人</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: s.status === "即将放映" ? `${c.green}15` : c.s2, color: s.status === "即将放映" ? c.green : c.text3 }}>{s.status}</span>
                </div>
                {/* Bi-directional link hint */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, cursor: "pointer" }}>
                  <span style={{ fontSize: 10, color: c.warm }}>查看活动详情</span>
                  <span style={{ fontSize: 10, color: c.warm }}>→</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {movie.screenings.length === 0 && (
        <div style={{ marginBottom: 14, padding: 12, background: c.s1, borderRadius: 10, border: `1px solid ${c.line}`, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: c.text3 }}>还没有放映过</div>
          <button style={{ marginTop: 6, padding: "5px 14px", borderRadius: 6, background: c.warm + "15", border: `1px solid ${c.warm}30`, color: c.warm, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>🎬 提名到下次电影夜</button>
        </div>
      )}

      {/* Comments section */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: c.text3, marginBottom: 8 }}>💬 讨论 · {comments.length}</div>
        {comments.map((cm, i) => (
          <div key={i} style={{ padding: "8px 0", borderTop: `1px solid ${c.line}` }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
              <Ava name={cm.name} size={20} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>{cm.name}</span>
              <span style={{ fontSize: 9, color: c.text3 }}>{cm.time}</span>
            </div>
            <div style={{ fontSize: 12, color: c.text2, lineHeight: 1.6, paddingLeft: 26 }}>{cm.text}</div>
            {/* ═══ Bi-directional link: comment references activity ═══ */}
            {cm.eventRef && (
              <div style={{ marginLeft: 26, marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: c.s2, borderRadius: 4, border: `1px solid ${c.line}`, cursor: "pointer" }}>
                <span style={{ fontSize: 9, color: c.text3 }}>📅</span>
                <span style={{ fontSize: 9, color: c.warm }}>来自「{cm.eventRef}」→</span>
              </div>
            )}
          </div>
        ))}
        {/* Add comment */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0", borderTop: `1px solid ${c.line}` }}>
          <Ava name="Yuan" size={20} />
          <div style={{ flex: 1, padding: "6px 10px", background: c.s2, borderRadius: 6, border: `1px solid ${c.line}`, fontSize: 11, color: c.text3, cursor: "pointer" }}>说点什么...</div>
        </div>
      </div>
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
  const [isPrivate, setIsPrivate] = useState(false);
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
  const reset = () => { setStep(0); setWho(null); setMsg(""); setHasPhoto(false); setSent(false); setIsPrivate(false); };

  return (
    <div>
      {/* Balance */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, padding: "8px 12px", background: c.s1, borderRadius: 8, border: `1px solid ${c.line}` }}>
        <span style={{ fontSize: 12 }}>✉</span>
        <span style={{ fontSize: 11, color: c.text2 }}>可寄</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: c.warm }}>4</span>
        <span style={{ fontSize: 11, color: c.text3 }}>张</span>
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
                    { val: false, icon: "🌐", label: "公开到动态流" },
                    { val: true, icon: "🔒", label: "仅彼此可见" },
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

      {/* 本月贡献 */}
      <Section title="本月贡献">
        <Card>
          <div style={{ padding: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                { icon: "🏠", label: "Host 1 次" },
                { icon: "📅", label: "参加 4 场活动" },
                { icon: "🎬", label: "推荐 3 部电影" },
                { icon: "✉", label: "收到 5 张感谢卡" },
                { icon: "💌", label: "寄出 3 张感谢卡" },
              ].map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "5px 10px", borderRadius: 6,
                  background: c.s2, border: `1px solid ${c.line}`,
                }}>
                  <span style={{ fontSize: 12 }}>{item.icon}</span>
                  <span style={{ fontSize: 11, color: c.text2 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
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
              <div style={{ fontSize: 10, color: c.text3, marginTop: 2 }}>📧 {sel.name.toLowerCase().replace(/\s/g,"")}@email.com</div>
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
              <span style={{ fontSize: 9, color: c.text3 }}>{m.name.toLowerCase().replace(/\s/g,"")}@email.com</span>
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
      {/* Hero - Welcome */}
      <div style={{ padding: "20px 0 10px" }}>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, textAlign: "center" }}>串门儿</div>
        <div style={{ background: c.s1, borderRadius: 12, border: `1px solid ${c.line}`, padding: "20px 18px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.warm, marginBottom: 12 }}>你好，欢迎来串门儿！</div>
          <div style={{ fontSize: 12, color: c.text2, lineHeight: 1.8, marginBottom: 14 }}>
            串门儿是一个重建真实联结的计划，是个申请制的共创社区，欢迎你的加入！
          </div>
          {[
            ["相比对这个世界的不满，", "我们更希望通过自己做一些事，让这个世界更接近我们想要的样子"],
            ["相比萍水相逢，", "我们更希望能够有深度的交流和长久的联系"],
            ["相比一起吃喝玩乐，", "我们更希望能真诚的在乎彼此，提供力所能及的帮助"],
            ["相比其乐融融，", "我们更希望礼貌但真诚的表达和沟通"],
          ].map(([dim, bright], i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 12, lineHeight: 1.7 }}>
              <span style={{ color: c.warm, flexShrink: 0, marginTop: 1 }}>·</span>
              <div><span style={{ color: c.text3 }}>{dim}</span><span style={{ color: c.text }}>{bright}</span></div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16 }}>
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
          "相互支持 > 社交隔绝",
          "客厅 > 写字楼",
          "真诚 > 客气",
        ].map((v, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: i > 0 ? `1px solid ${c.line}40` : "none" }}>
            <span style={{ fontSize: 11, color: c.warm }}>·</span>
            <span style={{ fontSize: 12, color: c.text2 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Apply CTA */}
      <button style={{
        width: "100%", padding: "14px 0", borderRadius: 10,
        background: c.warm, border: "none", color: c.bg,
        fontSize: 14, fontWeight: 700, cursor: "pointer",
        marginTop: 4,
      }}>申请加入串门儿 →</button>
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

/* ═══ PAGE: SETTINGS ═══ */
function PageSettings() {
  const [activeSection, setActiveSection] = useState(null);

  const SettingRow = ({ icon, label, desc, right, onClick }) => (
    <div onClick={onClick} style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "14px 0", borderBottom: `1px solid ${c.line}50`, cursor: onClick ? "pointer" : "default",
    }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
          {desc && <div style={{ fontSize: 10, color: c.text3, marginTop: 2 }}>{desc}</div>}
        </div>
      </div>
      {right || (onClick && <span style={{ fontSize: 12, color: c.text3 }}>→</span>)}
    </div>
  );

  const Toggle = ({ on }) => (
    <div style={{
      width: 36, height: 20, borderRadius: 10, padding: 2, cursor: "pointer",
      background: on ? c.green : c.s3, transition: "background 0.2s",
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: 8, background: "#fff",
        transform: on ? "translateX(16px)" : "translateX(0)", transition: "transform 0.2s",
      }} />
    </div>
  );

  return (
    <div>
      {/* Profile section */}
      <Section title="个人信息">
        <Card>
          <div style={{ padding: 14 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
              <div style={{ position: "relative" }}>
                <Ava name="Y" size={52} />
                <div style={{
                  position: "absolute", bottom: -2, right: -2,
                  width: 18, height: 18, borderRadius: 9, background: c.s2,
                  border: `2px solid ${c.s1}`, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9,
                }}>✏️</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Yuan</div>
                <div style={{ fontSize: 10, color: c.text3 }}>点击修改头像</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "昵称", value: "Yuan" },
                { label: "个人简介", value: "喜欢做饭和看电影的产品经理" },
                { label: "城市", value: "New Jersey" },
                { label: "家庭地址", value: "123 Main St, Edison, NJ", hint: "仅在你 Host 在家活动时，对已报名成员可见" },
                { label: "我家的 House Rules", value: "请换鞋入内 · 有猫 · 10pm 前结束", hint: "Host 发起在家活动时自动填入" },
              ].map((f, i) => (
                <div key={i}>
                  <div style={{ fontSize: 10, color: c.text3, marginBottom: 3 }}>{f.label}</div>
                  <div style={{
                    padding: "8px 10px", borderRadius: 6, background: c.s2,
                    border: `1px solid ${c.line}`, fontSize: 12, color: c.text,
                  }}>{f.value}</div>
                  {f.hint && <div style={{ fontSize: 9, color: c.text3, marginTop: 3, lineHeight: 1.4 }}>ℹ️ {f.hint}</div>}
                </div>
              ))}
            </div>
            <button style={{
              marginTop: 12, width: "100%", padding: "10px 0", borderRadius: 8,
              background: c.warm, border: "none", color: c.bg,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>保存修改</button>
          </div>
        </Card>
      </Section>

      {/* Notification preferences */}
      <Section title="通知偏好">
        <Card>
          <div style={{ padding: "4px 14px" }}>
            <SettingRow icon="📬" label="Daily Email" desc="每天早上 9 点收到活动汇总" right={<Toggle on={true} />} />
            <SettingRow icon="📨" label="活动邀请通知" desc="Host 定向邀请时即时发送" right={<Toggle on={true} />} />
            <SettingRow icon="✉" label="感谢卡通知" desc="收到感谢卡时即时发送" right={<Toggle on={true} />} />
            <SettingRow icon="📅" label="活动变更通知" desc="已报名活动取消或改时间" right={<Toggle on={true} />} />
            <SettingRow icon="⏰" label="活动提醒" desc="活动前 24 小时提醒" right={<Toggle on={true} />} />
            <SettingRow icon="📢" label="社群公告" desc="运营公告和里程碑通知" right={<Toggle on={true} />} />
            <SettingRow icon="💡" label="运营引导" desc="参与活动后的感谢建议等" right={<Toggle on={true} />} />
            <div style={{ padding: "14px 0" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>🌙</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>免打扰时段</div>
                  <div style={{ fontSize: 10, color: c.text3, marginTop: 2 }}>此时段内不发送非紧急邮件</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", paddingLeft: 26 }}>
                <div style={{ padding: "6px 12px", borderRadius: 6, background: c.s2, border: `1px solid ${c.line}`, fontSize: 12 }}>22:00</div>
                <span style={{ fontSize: 11, color: c.text3 }}>至</span>
                <div style={{ padding: "6px 12px", borderRadius: 6, background: c.s2, border: `1px solid ${c.line}`, fontSize: 12 }}>08:00</div>
              </div>
            </div>
          </div>
        </Card>
      </Section>

      {/* Privacy */}
      <Section title="隐私">
        <Card>
          <div style={{ padding: "4px 14px" }}>
            <SettingRow icon="📧" label="成员墙显示 Email" desc="其他成员可以在成员墙/详情页看到你的 Email" right={<Toggle on={true} />} />
            <SettingRow icon="👁" label="参与记录可见" desc="其他成员能看到你参加了哪些活动" right={<Toggle on={true} />} />
            <SettingRow icon="📊" label="贡献统计可见" desc="在个人页面显示活动次数等数据" right={<Toggle on={true} />} />
            <SettingRow icon="🏷" label="显示称号" desc="在头像旁展示社群称号" right={<Toggle on={true} />} />
          </div>
        </Card>
      </Section>

      {/* Account */}
      <Section title="账号">
        <Card>
          <div style={{ padding: "4px 14px" }}>
            <SettingRow icon="✉" label="登录邮箱" desc="yuan@chuanmen.co" />
            <div style={{ padding: "14px 0", borderBottom: `1px solid ${c.line}50` }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 16 }}>🔗</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Google 账号</div>
                  <div style={{ fontSize: 10, color: c.green, marginTop: 2 }}>✓ 已绑定 yuan@gmail.com</div>
                </div>
                <span style={{ fontSize: 10, color: c.text3, cursor: "pointer" }}>解绑</span>
              </div>
            </div>
            <div style={{ padding: "14px 0", borderBottom: `1px solid ${c.line}50` }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 16 }}>✨</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Magic Link 登录</div>
                  <div style={{ fontSize: 10, color: c.text3, marginTop: 2 }}>无需密码，每次通过邮件链接登录</div>
                </div>
              </div>
            </div>
            <SettingRow icon="📤" label="导出我的数据" desc="下载你的活动记录和感谢卡" onClick={() => {}} />
          </div>
        </Card>
      </Section>

      {/* Danger zone */}
      <div style={{ marginTop: 16, textAlign: "center", paddingBottom: 20 }}>
        <span style={{ fontSize: 11, color: c.text3, cursor: "pointer" }}>注销账号</span>
        <div style={{ fontSize: 9, color: c.text3 + "80", marginTop: 4 }}>删除所有数据，此操作不可撤销</div>
      </div>
    </div>
  );
}

/* ═══ PAGE: ADMIN ═══ */
function PageAdmin() {
  return (
    <div>
      <div style={{ padding: "8px 0 16px" }}>
        <div style={{ fontSize: 11, color: c.text3, lineHeight: 1.6 }}>
          社群管理工具。仅管理员可见。
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 16 }}>
        {[
          { n: "186", l: "总成员", trend: "+12 本月" },
          { n: "62", l: "总活动", trend: "+4 本月" },
          { n: "73%", l: "打开率", trend: "Daily Email" },
        ].map((s, i) => (
          <div key={i} style={{ background: c.s1, borderRadius: 8, padding: "10px 8px", textAlign: "center", border: `1px solid ${c.line}` }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: c.warm }}>{s.n}</div>
            <div style={{ fontSize: 9, color: c.text3, marginTop: 1 }}>{s.l}</div>
            <div style={{ fontSize: 8, color: c.green, marginTop: 2 }}>{s.trend}</div>
          </div>
        ))}
      </div>

      {/* Admin modules */}
      <Section title="管理功能">
        {[
          { icon: "👥", label: "成员管理", desc: "查看/编辑成员、审核申请、管理角色" },
          { icon: "📅", label: "活动管理", desc: "创建/编辑活动、管理报名、活动审核" },
          { icon: "📋", label: "内容管理", desc: "电影库、提案、评论审核" },
          { icon: "✉", label: "感谢卡管理", desc: "查看卡片、额度配置、购买统计" },
          { icon: "🏷", label: "称号管理", desc: "创建/分配称号、阈值配置" },
          { icon: "📧", label: "Email 推送管理", desc: "规则管理、模板编辑、发送记录" },
          { icon: "📊", label: "数据看板", desc: "社群概览、活动供给、成员活跃度" },
          { icon: "📢", label: "公告与里程碑", desc: "发布公告、里程碑、Host 致敬" },
          { icon: "📝", label: "社群信息编辑", desc: "串门原则、Host 指南、关于页文案" },
        ].map((item, i) => (
          <Card key={i}>
            <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: c.text3, marginTop: 2 }}>{item.desc}</div>
                </div>
              </div>
              <span style={{ fontSize: 12, color: c.text3 }}>→</span>
            </div>
          </Card>
        ))}
      </Section>
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [viewingMovie, setViewingMovie] = useState(null);

  const navTo = (p) => { setViewingMember(null); setPage(p); setDrawerOpen(false); };
  const viewMember = (name, from) => { setPrevPage(from || page); setViewingMember(name); setPage("member-detail"); setDrawerOpen(false); };
  const viewMovie = (title) => { setPrevPage(page); setViewingMovie(title); setPage("movie-detail"); setDrawerOpen(false); };

  /* ═══ DRAWER ═══ */
  const Drawer = () => (
    <>
      {/* Backdrop */}
      <div onClick={() => setDrawerOpen(false)} style={{
        position: "fixed", inset: 0, background: "#000000aa", zIndex: 200,
        opacity: drawerOpen ? 1 : 0, pointerEvents: drawerOpen ? "auto" : "none",
        transition: "opacity 0.25s ease",
      }} />
      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 280,
        background: c.s1, zIndex: 201, padding: "0",
        transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
        display: "flex", flexDirection: "column",
        borderRight: `1px solid ${c.line}`,
      }}>
        {/* Close */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 14px 0" }}>
          <button onClick={() => setDrawerOpen(false)} style={{ background: "none", border: "none", color: c.text3, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        {/* User section */}
        <div style={{ padding: "12px 20px 20px" }}>
          {isLoggedIn ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Ava name="Y" size={40} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Yuan</div>
                <div style={{ fontSize: 10, color: c.text3 }}>yuan@chuanmen.co</div>
              </div>
            </div>
          ) : (
            <button onClick={() => { setIsLoggedIn(true); }} style={{
              width: "100%", padding: "12px 0", borderRadius: 10,
              background: c.warm, border: "none", color: c.bg,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>登录 / 注册</button>
          )}
        </div>

        <div style={{ height: 1, background: c.line, margin: "0 20px" }} />

        {/* Navigation */}
        <div style={{ padding: "12px 10px" }}>
          <div style={{ fontSize: 9, color: c.text3, padding: "4px 10px", fontWeight: 600, letterSpacing: 1 }}>导航</div>
          {[
            ...(isLoggedIn ? [{ icon: "👥", label: "成员墙", page: "members" }] : []),
            { icon: "📖", label: "关于串门儿", page: "about" },
          ].map((item, i) => (
            <div key={i} onClick={() => navTo(item.page)} style={{
              display: "flex", gap: 10, alignItems: "center",
              padding: "10px 10px", borderRadius: 8, cursor: "pointer",
              background: page === item.page ? c.s2 : "transparent",
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: page === item.page ? 600 : 400 }}>{item.label}</span>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: c.line, margin: "0 20px" }} />

        {/* Settings & Admin (only when logged in) */}
        {isLoggedIn && (
          <div style={{ padding: "12px 10px" }}>
            <div style={{ fontSize: 9, color: c.text3, padding: "4px 10px", fontWeight: 600, letterSpacing: 1 }}>设置</div>
            <div onClick={() => navTo("settings")} style={{
              display: "flex", gap: 10, alignItems: "center",
              padding: "10px 10px", borderRadius: 8, cursor: "pointer",
              background: page === "settings" ? c.s2 : "transparent",
            }}>
              <span style={{ fontSize: 14 }}>⚙️</span>
              <span style={{ fontSize: 13, fontWeight: page === "settings" ? 600 : 400 }}>账号设置</span>
            </div>
            <div onClick={() => navTo("admin")} style={{
              display: "flex", gap: 10, alignItems: "center",
              padding: "10px 10px", borderRadius: 8, cursor: "pointer",
              background: page === "admin" ? c.s2 : "transparent",
            }}>
              <span style={{ fontSize: 14 }}>🛠</span>
              <span style={{ fontSize: 13, fontWeight: page === "admin" ? 600 : 400 }}>管理后台</span>
            </div>
          </div>
        )}

        {/* Bottom: logout / demo toggle */}
        <div style={{ marginTop: "auto", padding: "16px 20px", borderTop: `1px solid ${c.line}` }}>
          {isLoggedIn && (
            <div onClick={() => setIsLoggedIn(false)} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0", cursor: "pointer" }}>
              <span style={{ fontSize: 14 }}>🚪</span>
              <span style={{ fontSize: 12, color: c.text3 }}>退出登录</span>
            </div>
          )}
          {/* Demo toggle kept for prototype */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 8, borderTop: isLoggedIn ? `1px solid ${c.line}50` : "none" }}>
            <button onClick={() => setIsEmpty(!isEmpty)} style={{
              padding: "4px 10px", borderRadius: 4, fontSize: 9, fontWeight: 600,
              background: isEmpty ? c.warm + "20" : c.s2,
              color: isEmpty ? c.warm : c.text3,
              border: `1px solid ${isEmpty ? c.warm + "40" : c.line}`,
              cursor: "pointer",
            }}>{isEmpty ? "🆕 新用户视角" : "👤 老用户视角"}</button>
            <button onClick={() => setIsLoggedIn(!isLoggedIn)} style={{
              padding: "4px 10px", borderRadius: 4, fontSize: 9, fontWeight: 600,
              background: c.s2, color: c.text3,
              border: `1px solid ${c.line}`, cursor: "pointer",
            }}>{isLoggedIn ? "模拟未登录" : "模拟已登录"}</button>
          </div>
        </div>
      </div>
    </>
  );

  const pages = [
    { id: "feed", icon: "🏠", label: "动态" },
    { id: "discover", icon: "👍", label: "推荐" },
    { id: "events", icon: "📅", label: "活动" },
    { id: "cards", icon: "✉", label: "感谢卡" },
    { id: "profile", icon: "👤", label: "我" },
  ];

  const titles = { feed: "串门儿", events: "活动", discover: "推荐", cards: "感谢卡", profile: "我的页面", members: "成员墙", about: "关于串门儿", settings: "账号设置", admin: "管理后台", "member-detail": viewingMember || "成员", "movie-detail": viewingMovie || "电影" };

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
        {/* Drawer */}
        <Drawer />

        {/* Top bar */}
        <div style={{
          position: "sticky", top: 0, zIndex: 100,
          background: `${c.bg}dd`, backdropFilter: "blur(12px)",
          padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: `1px solid ${c.line}50`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Hamburger — always visible */}
            <button onClick={() => setDrawerOpen(true)} style={{ background: "none", border: "none", color: c.text2, fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}>☰</button>

            {(page === "about" || page === "members" || page === "member-detail" || page === "movie-detail" || page === "settings" || page === "admin") ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => navTo(page === "member-detail" ? prevPage : page === "movie-detail" ? prevPage : page === "members" ? "feed" : "feed")} style={{ background: "none", border: "none", color: c.text3, fontSize: 14, cursor: "pointer" }}>←</button>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{page === "member-detail" ? viewingMember : page === "movie-detail" ? viewingMovie : titles[page]}</span>
              </div>
            ) : (
              <span style={{ fontSize: 16, fontWeight: 800 }}>{titles[page]}</span>
            )}
          </div>
          {page === "feed" && !isEmpty && isLoggedIn && (
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.warm, boxShadow: `0 0 6px ${c.warm}` }} />
          )}
        </div>

        {/* Content */}
        <div style={{ padding: "12px 16px", animation: "fadeIn 0.2s ease" }} key={page + String(isEmpty) + String(isLoggedIn) + (viewingMember || "")}>
          {/* About page — always accessible */}
          {page === "about" && <PageAbout onNav={navTo} />}

          {/* Logged-in content */}
          {isLoggedIn && page === "feed" && (isEmpty ? <EmptyFeed onNav={navTo} /> : <PageFeed onNav={navTo} onViewMember={viewMember} />)}
          {isLoggedIn && page === "events" && <PageEvents onViewMovie={viewMovie} />}
          {isLoggedIn && page === "discover" && <PageDiscover onViewMovie={viewMovie} />}
          {isLoggedIn && page === "cards" && (isEmpty ? <EmptyCards onNav={navTo} /> : <PageCards />)}
          {isLoggedIn && page === "profile" && <PageProfile onNav={navTo} />}
          {isLoggedIn && page === "members" && <PageMembers onViewMember={viewMember} />}
          {isLoggedIn && page === "member-detail" && viewingMember && <MemberDetail name={viewingMember} onBack={() => navTo(prevPage)} backLabel="" />}
          {isLoggedIn && page === "movie-detail" && viewingMovie && <PageMovieDetail movieTitle={viewingMovie} onBack={() => navTo(prevPage)} />}
          {isLoggedIn && page === "settings" && <PageSettings />}
          {isLoggedIn && page === "admin" && <PageAdmin />}

          {/* Logged-out gate (for any page except about) */}
          {!isLoggedIn && page !== "about" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚪</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>先进来再说</div>
              <div style={{ fontSize: 12, color: c.text3, lineHeight: 1.7, marginBottom: 24, maxWidth: 260 }}>
                串门儿是一个小型社群，登录后才能看到活动、成员和感谢卡。
              </div>
              <button onClick={() => setIsLoggedIn(true)} style={{
                padding: "12px 32px", borderRadius: 10,
                background: c.warm, border: "none", color: c.bg,
                fontSize: 14, fontWeight: 700, cursor: "pointer",
                marginBottom: 12,
              }}>登录 / 注册</button>
              <div onClick={() => navTo("about")} style={{ fontSize: 11, color: c.text3, cursor: "pointer", textDecoration: "underline" }}>
                先了解一下串门儿是什么 →
              </div>
            </div>
          )}
        </div>

        {/* Bottom nav — hidden when logged out */}
        {isLoggedIn && (
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
              color: (page === p.id) ? c.warm : c.text3,
              position: "relative",
            }}>
              {p.id === "cards" && !isEmpty && <div style={{ position: "absolute", top: -2, right: "28%", width: 6, height: 6, borderRadius: "50%", background: c.warm }} />}
              <span style={{ fontSize: 18 }}>{p.icon}</span>
              <span style={{ fontSize: 9, fontWeight: (page === p.id) ? 700 : 400 }}>{p.label}</span>
            </button>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
