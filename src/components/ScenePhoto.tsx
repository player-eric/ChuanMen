import type { ReactNode, CSSProperties } from 'react';

interface Light {
  x: string; y: string; w: number; h: number; color: string; blur: number;
}
interface Shape {
  x: string; y: string; w: number; h: number; r: number; color: string; tri?: boolean;
}
interface SceneDef {
  bg: string;
  lights: Light[];
  shapes: Shape[];
}

const scenes: Record<string, SceneDef> = {
  movieNight: {
    bg: 'linear-gradient(165deg, #0d0810 0%, #1a1225 20%, #261a30 45%, #1d1528 70%, #100a18 100%)',
    lights: [
      { x: '50%', y: '30%', w: 120, h: 80, color: 'rgba(80,60,160,0.18)', blur: 30 },
      { x: '50%', y: '35%', w: 60, h: 40, color: 'rgba(200,180,255,0.08)', blur: 15 },
      { x: '20%', y: '65%', w: 20, h: 30, color: 'rgba(212,165,116,0.25)', blur: 8 },
      { x: '35%', y: '68%', w: 16, h: 24, color: 'rgba(212,165,116,0.2)', blur: 6 },
      { x: '55%', y: '63%', w: 18, h: 28, color: 'rgba(212,165,116,0.22)', blur: 7 },
      { x: '72%', y: '66%', w: 14, h: 22, color: 'rgba(212,165,116,0.18)', blur: 6 },
    ],
    shapes: [{ x: '50%', y: '28%', w: 90, h: 55, r: 4, color: 'rgba(60,50,100,0.4)' }],
  },
  potluck: {
    bg: 'linear-gradient(150deg, #141008 0%, #221a0e 25%, #302414 45%, #281e10 70%, #18120a 100%)',
    lights: [
      { x: '50%', y: '40%', w: 140, h: 100, color: 'rgba(212,165,116,0.15)', blur: 35 },
      { x: '30%', y: '50%', w: 40, h: 25, color: 'rgba(255,200,120,0.2)', blur: 10 },
      { x: '55%', y: '45%', w: 50, h: 30, color: 'rgba(255,180,100,0.15)', blur: 12 },
      { x: '70%', y: '55%', w: 35, h: 20, color: 'rgba(255,220,150,0.18)', blur: 8 },
      { x: '25%', y: '70%', w: 20, h: 30, color: 'rgba(212,165,116,0.25)', blur: 6 },
      { x: '75%', y: '72%', w: 18, h: 26, color: 'rgba(212,165,116,0.2)', blur: 6 },
    ],
    shapes: [{ x: '50%', y: '42%', w: 110, h: 18, r: 60, color: 'rgba(80,60,30,0.5)' }],
  },
  hike: {
    bg: 'linear-gradient(175deg, #0e1820 0%, #142838 20%, #1a3848 40%, #2a5868 60%, #183040 80%, #0e1820 100%)',
    lights: [
      { x: '60%', y: '15%', w: 80, h: 80, color: 'rgba(255,230,180,0.12)', blur: 25 },
      { x: '30%', y: '80%', w: 30, h: 40, color: 'rgba(80,160,80,0.15)', blur: 10 },
      { x: '70%', y: '75%', w: 25, h: 35, color: 'rgba(80,140,80,0.12)', blur: 8 },
    ],
    shapes: [
      { x: '20%', y: '60%', w: 60, h: 80, r: 0, color: 'rgba(20,50,30,0.5)', tri: true },
      { x: '65%', y: '55%', w: 80, h: 90, r: 0, color: 'rgba(25,55,35,0.4)', tri: true },
    ],
  },
  cozy: {
    bg: 'linear-gradient(155deg, #14100a 0%, #221a10 25%, #302416 45%, #281c0e 70%, #18100a 100%)',
    lights: [
      { x: '35%', y: '35%', w: 60, h: 60, color: 'rgba(255,180,80,0.2)', blur: 20 },
      { x: '35%', y: '35%', w: 30, h: 30, color: 'rgba(255,200,120,0.15)', blur: 10 },
      { x: '65%', y: '60%', w: 100, h: 60, color: 'rgba(212,165,116,0.08)', blur: 25 },
      { x: '25%', y: '70%', w: 16, h: 24, color: 'rgba(212,165,116,0.2)', blur: 6 },
      { x: '60%', y: '68%', w: 18, h: 28, color: 'rgba(212,165,116,0.18)', blur: 7 },
    ],
    shapes: [{ x: '33%', y: '30%', w: 22, h: 35, r: 3, color: 'rgba(180,120,50,0.3)' }],
  },
};

interface ScenePhotoProps {
  scene?: string;
  h?: number;
  children?: ReactNode;
  style?: CSSProperties;
}

export function ScenePhoto({ scene = 'movieNight', h = 190, children, style = {} }: ScenePhotoProps) {
  const s = scenes[scene] || scenes.movieNight;
  return (
    <div style={{ width: '100%', height: h, borderRadius: 8, background: s.bg, position: 'relative', overflow: 'hidden', ...style }}>
      {s.shapes.map((sh, i) => (
        <div
          key={`sh${i}`}
          style={{
            position: 'absolute', left: sh.x, top: sh.y, transform: 'translate(-50%,-50%)',
            width: sh.w, height: sh.h, borderRadius: sh.r || 0,
            background: sh.color,
            ...(sh.tri ? { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' } : {}),
          }}
        />
      ))}
      {s.lights.map((l, i) => (
        <div
          key={`l${i}`}
          style={{
            position: 'absolute', left: l.x, top: l.y, transform: 'translate(-50%,-50%)',
            width: l.w, height: l.h, borderRadius: '50%',
            background: `radial-gradient(circle, ${l.color}, transparent 70%)`,
            filter: `blur(${l.blur}px)`,
          }}
        />
      ))}
      {/* grain */}
      <div
        style={{
          position: 'absolute', inset: 0, opacity: 0.12, mixBlendMode: 'screen',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
        }}
      />
      {children}
    </div>
  );
}
