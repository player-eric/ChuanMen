import type { CSSProperties, ReactNode, MouseEventHandler } from 'react';
import { useTheme } from '@mui/material/styles';
import { useColors } from '@/hooks/useColors';
import { hf } from '@/theme';

/* ═══ Avatar ═══ */
interface AvaProps {
  name: string;
  src?: string;
  size?: number;
  border?: boolean;
  badge?: string;
  onTap?: () => void;
}

/** Extract the first non-emoji character from a string for avatar display */
export function firstNonEmoji(str: string): string {
  if (!str) return '?';
  const match = str.match(/[^\p{Extended_Pictographic}\u{FE00}-\u{FE0F}\u{200D}\u{200B}\u{20E3}]/u);
  if (match) return match[0];
  // All emoji — return first full character via spread
  const chars = [...str];
  return chars.length > 0 ? chars[0] : '?';
}

export function Ava({ name: rawName, src, size = 28, border, badge, onTap }: AvaProps) {
  const name = typeof rawName === 'string' ? rawName : String(rawName ?? '?');
  const c = useColors();
  const letter = firstNonEmoji(name);
  return (
    <div style={{ position: 'relative', flexShrink: 0, cursor: onTap ? 'pointer' : undefined }} onClick={onTap}>
      {src ? (
        <img
          src={src}
          alt={name}
          style={{
            width: size, height: size, borderRadius: '50%',
            objectFit: 'cover',
            border: border ? `2px solid ${c.s1}` : 'none',
          }}
        />
      ) : (
        <div
          style={{
            width: size, height: size, borderRadius: '50%',
            background: `hsl(${name.charCodeAt(0) * 37 % 360}, 25%, 22%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.38, color: c.text2, fontWeight: 600,
            border: border ? `2px solid ${c.s1}` : 'none',
          }}
        >
          {letter}
        </div>
      )}
      {badge && (
        <div style={{ position: 'absolute', bottom: -1, right: -1, fontSize: size * 0.35 }}>{badge}</div>
      )}
    </div>
  );
}

/* ═══ AvatarStack ═══ */
interface AvaStackProps {
  names: string[];
  size?: number;
}

export function AvaStack({ names, size = 22 }: AvaStackProps) {
  const c = useColors();
  return (
    <div style={{ display: 'flex' }}>
      {names.slice(0, 5).map((n, i) => (
        <div key={i} style={{ marginLeft: i ? -6 : 0, zIndex: 5 - i }}>
          <Ava name={n} size={size} border />
        </div>
      ))}
      {names.length > 5 && (
        <div
          style={{
            marginLeft: -6, width: size, height: size, borderRadius: '50%',
            background: c.s3, border: `2px solid ${c.s1}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, color: c.text3,
          }}
        >
          +{names.length - 5}
        </div>
      )}
    </div>
  );
}

/* ═══ Stamp ═══ */
export function Stamp({ emoji = '✉', size = 24, tooltip }: { emoji?: string; size?: number; tooltip?: string }) {
  const c = useColors();
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <div
        style={{
          width: size, height: size * 1.22, borderRadius: 2,
          border: `1.5px solid ${c.stamp}`,
          background: `linear-gradient(160deg, ${c.bg}, ${c.stamp}35)`,
          boxShadow: `0 0 0 0.5px ${c.stamp}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.55,
        }}
      >
        {emoji}
      </div>
      {tooltip && <span style={{ fontSize: size * 0.45, color: c.stamp, fontWeight: 600, whiteSpace: 'nowrap' }}>{tooltip}</span>}
    </div>
  );
}

/* ═══ Badge ═══ */
export function Badge({ children, color }: { children: ReactNode; color?: string }) {
  const c = useColors();
  const badgeColor = color ?? c.warm;
  return (
    <span
      style={{
        padding: '2px 7px', background: badgeColor + '18', color: badgeColor,
        fontSize: 9, borderRadius: 4, fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

/* ═══ Button ═══ */
interface BtnProps {
  children: ReactNode;
  filled?: boolean;
  small?: boolean;
  onClick?: MouseEventHandler;
  disabled?: boolean;
}

export function Btn({ children, filled, small, onClick, disabled }: BtnProps) {
  const c = useColors();
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        padding: small ? '5px 12px' : '8px 18px', borderRadius: 7,
        background: filled ? (disabled ? c.s3 : c.warm) : 'transparent',
        border: filled ? 'none' : `1.5px solid ${disabled ? c.line : c.warm}`,
        color: filled ? (disabled ? c.text3 : c.bg) : disabled ? c.text3 : c.warm,
        fontSize: small ? 11 : 12, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

/* ═══ Separator ═══ */
export function Sep() {
  const c = useColors();
  return <div style={{ height: 1, background: c.line, margin: '12px 0' }} />;
}

/* ═══ Section ═══ */
interface SectionProps {
  title: string;
  right?: string;
  children: ReactNode;
}

export function Section({ title, right, children }: SectionProps) {
  const c = useColors();
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '0 2px' }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
        {right && <span style={{ fontSize: 11, color: c.warm, cursor: 'pointer' }}>{right}</span>}
      </div>
      {children}
    </div>
  );
}

/* ═══ Card ═══ */
interface CardProps {
  children: ReactNode;
  glow?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
}

export function Card({ children, glow, style = {}, onClick }: CardProps) {
  const c = useColors();
  const isLight = useTheme().palette.mode === 'light';
  return (
    <div
      onClick={onClick}
      style={{
        background: c.s1, borderRadius: 12,
        border: `1px solid ${glow ? c.warm + '25' : c.line}`,
        boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
        overflow: 'hidden', ...style,
      }}
    >
      {children}
    </div>
  );
}
