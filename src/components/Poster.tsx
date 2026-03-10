import { useColors } from '@/hooks/useColors';
import { posters as posterData } from '@/theme';

interface PosterProps {
  title: string;
  /** When provided, renders an actual image instead of the gradient placeholder */
  src?: string;
  w?: number;
  h?: number;
  /** Hide the title overlay (useful when title is shown separately) */
  hideTitle?: boolean;
}

export function Poster({ title, src, w = 48, h = 66, hideTitle }: PosterProps) {
  const c = useColors();
  const p = posterData[title] || {
    bg: `linear-gradient(135deg, hsl(${[...title].reduce((a, c) => a + c.charCodeAt(0), 0) % 360}, 30%, 25%), hsl(${([...title].reduce((a, c) => a + c.charCodeAt(0), 0) + 60) % 360}, 25%, 18%))`,
    accent: c.text3,
    sub: '',
  };
  return (
    <div
      style={{
        width: w, height: h, borderRadius: 4, background: src ? c.s3 : p.bg,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: Math.max(3, w * 0.06), overflow: 'hidden', flexShrink: 0,
        position: 'relative', boxShadow: `0 2px 8px ${c.bg}60`,
      }}
    >
      {src && (
        <img
          src={src}
          alt={title}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      {!hideTitle && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.6))' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                fontSize: Math.max(7, w * 0.15), fontWeight: 800,
                color: src ? '#fff' : p.accent, lineHeight: 1.2,
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}
            >
              {title}
            </div>
            {w > 40 && p.sub && !src && (
              <div style={{ fontSize: Math.max(5, w * 0.08), color: 'rgba(255,255,255,0.4)', marginTop: 1, lineHeight: 1.2 }}>
                {p.sub.split('·')[0]}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
