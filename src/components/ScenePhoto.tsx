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
  coffee: {
    bg: 'linear-gradient(150deg, #14100a 0%, #221a10 25%, #302416 45%, #281c0e 70%, #18100a 100%)',
    lights: [
      { x: '45%', y: '40%', w: 80, h: 60, color: 'rgba(180,140,80,0.15)', blur: 25 },
      { x: '45%', y: '40%', w: 30, h: 25, color: 'rgba(220,180,120,0.2)', blur: 10 },
      { x: '60%', y: '55%', w: 50, h: 30, color: 'rgba(160,120,70,0.12)', blur: 15 },
      { x: '30%', y: '65%', w: 18, h: 26, color: 'rgba(212,165,116,0.2)', blur: 7 },
    ],
    shapes: [
      { x: '45%', y: '42%', w: 22, h: 16, r: 3, color: 'rgba(120,80,40,0.4)' },
      { x: '45%', y: '48%', w: 8, h: 12, r: 2, color: 'rgba(100,70,35,0.3)' },
    ],
  },
  sports: {
    bg: 'linear-gradient(160deg, #0a1518 0%, #142830 20%, #1e3a42 40%, #183028 60%, #122520 80%, #0a1518 100%)',
    lights: [
      { x: '50%', y: '35%', w: 120, h: 80, color: 'rgba(200,220,255,0.1)', blur: 30 },
      { x: '50%', y: '30%', w: 60, h: 40, color: 'rgba(255,255,255,0.06)', blur: 15 },
      { x: '30%', y: '70%', w: 25, h: 35, color: 'rgba(80,180,120,0.15)', blur: 8 },
      { x: '70%', y: '65%', w: 20, h: 30, color: 'rgba(80,160,120,0.12)', blur: 7 },
    ],
    shapes: [
      { x: '50%', y: '55%', w: 100, h: 3, r: 2, color: 'rgba(255,255,255,0.15)' },
      { x: '50%', y: '55%', w: 3, h: 60, r: 2, color: 'rgba(255,255,255,0.1)' },
    ],
  },
  nature: {
    bg: 'linear-gradient(170deg, #0e1a10 0%, #1a3018 20%, #254a28 40%, #1e3a20 60%, #162e18 80%, #0e1a10 100%)',
    lights: [
      { x: '55%', y: '20%', w: 70, h: 70, color: 'rgba(255,230,160,0.12)', blur: 25 },
      { x: '35%', y: '75%', w: 30, h: 40, color: 'rgba(80,160,80,0.18)', blur: 10 },
      { x: '65%', y: '70%', w: 25, h: 35, color: 'rgba(60,140,80,0.15)', blur: 8 },
    ],
    shapes: [
      { x: '25%', y: '65%', w: 50, h: 70, r: 0, color: 'rgba(20,60,30,0.45)', tri: true },
      { x: '70%', y: '58%', w: 65, h: 80, r: 0, color: 'rgba(25,55,30,0.35)', tri: true },
    ],
  },
};

interface ScenePhotoProps {
  scene?: string;
  h?: number;
  children?: ReactNode;
  style?: CSSProperties;
  objectFit?: 'cover' | 'contain';
}

/** Check if a string is an image URL (absolute or relative) rather than a scene key */
export function isImageUrl(s?: string | null): s is string {
  if (!s) return false;
  return s.startsWith('http') || s.startsWith('/api/media/');
}

export function ScenePhoto({ scene = 'movieNight', h = 190, children, style = {}, objectFit = 'cover' }: ScenePhotoProps) {
  // If scene is a URL, render as an image with a dark fallback background
  if (isImageUrl(scene)) {
    return (
      <div style={{ width: '100%', height: h, borderRadius: 8, background: '#1a1225', position: 'relative', overflow: 'hidden', ...style }}>
        <img src={scene} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(20px) brightness(0.4)', transform: 'scale(1.1)' }} />
        <img src={scene} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit }} />
        {children}
      </div>
    );
  }

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
