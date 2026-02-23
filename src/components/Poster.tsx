import { useColors } from '@/hooks/useColors';
import { posters as posterData } from '@/theme';

interface PosterProps {
  title: string;
  w?: number;
  h?: number;
}

export function Poster({ title, w = 48, h = 66 }: PosterProps) {
  const c = useColors();
  const p = posterData[title] || {
    bg: `linear-gradient(135deg, ${c.s3}, ${c.s2})`,
    accent: c.text3,
    sub: '',
  };
  return (
    <div
      style={{
        width: w, height: h, borderRadius: 4, background: p.bg,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: Math.max(3, w * 0.06), overflow: 'hidden', flexShrink: 0,
        position: 'relative', boxShadow: `0 2px 8px ${c.bg}60`,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.6))' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: Math.max(7, w * 0.15), fontWeight: 800,
            color: p.accent, lineHeight: 1.2,
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}
        >
          {title}
        </div>
        {w > 40 && p.sub && (
          <div style={{ fontSize: Math.max(5, w * 0.08), color: 'rgba(255,255,255,0.4)', marginTop: 1, lineHeight: 1.2 }}>
            {p.sub.split('·')[0]}
          </div>
        )}
      </div>
    </div>
  );
}
