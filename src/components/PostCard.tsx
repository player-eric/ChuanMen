import { c, hf } from '@/theme';
import { Ava, Stamp } from './Atoms';

interface PostCardProps {
  from: string;
  to: string;
  msg: string;
  stamp?: string;
  date?: string;
  photo?: string;
  isPrivate?: boolean;
  showVisibility?: boolean;
}

export function PostCard({ from, to, msg, stamp = '✉', date, photo, isPrivate = false, showVisibility = false }: PostCardProps) {
  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', background: `linear-gradient(165deg, ${c.paper}, ${c.paperDark})`, boxShadow: `0 2px 8px ${c.bg}30` }}>
      {photo ? (
        <div style={{ width: '100%', height: 130, background: photo, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '10%', left: '25%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,165,116,0.15), transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: '15%', width: 20, height: 35, borderRadius: '8px 8px 0 0', background: 'rgba(0,0,0,0.2)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: '25%', width: 18, height: 30, borderRadius: '8px 8px 0 0', background: 'rgba(0,0,0,0.15)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: '60%', width: 22, height: 38, borderRadius: '8px 8px 0 0', background: 'rgba(0,0,0,0.18)' }} />
          <div style={{ position: 'absolute', top: '5%', right: '12%', width: '30%', height: '45%', borderRadius: 3, background: 'rgba(180,200,220,0.06)', boxShadow: '0 0 20px rgba(180,200,220,0.08)' }} />
          <div style={{ position: 'absolute', top: '18%', left: '70%', width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,220,180,0.12)' }} />
          <div style={{ position: 'absolute', top: '40%', left: '10%', width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,200,150,0.1)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', background: `linear-gradient(transparent, ${c.paper}dd)` }} />
        </div>
      ) : (
        <div style={{ height: 56, background: `linear-gradient(135deg, ${c.paperDark}ee, ${c.paper}ee)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', borderBottom: `1px solid ${c.ink}08` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: c.ink + '0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: c.ink + '30', fontFamily: hf }}>串</div>
            <div style={{ fontSize: 9, color: c.ink + '35', fontWeight: 600, letterSpacing: '0.08em' }}>串门儿 CHUANMEN</div>
          </div>
          {date && <div style={{ fontSize: 11, color: c.ink + '25', fontWeight: 700, fontFamily: hf }}>{date}</div>}
        </div>
      )}
      <div style={{ padding: '10px 12px 12px', position: 'relative' }}>
        {!photo && <div style={{ position: 'absolute', top: 8, right: '38%', bottom: 8, borderRight: `1px dashed ${c.ink}10` }} />}
        <div style={{ position: 'absolute', top: 6, right: 8 }}><Stamp emoji={stamp} size={18} /></div>
        <div style={{ fontSize: 7, color: c.inkLight, letterSpacing: '0.06em' }}>TO: {to}</div>
        <div style={{ fontSize: 12, color: c.ink, fontFamily: hf, fontStyle: 'italic', lineHeight: 1.7, maxWidth: photo ? '80%' : '52%', marginTop: 4 }}>{msg}</div>
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Ava name={from} size={12} />
            <span style={{ fontSize: 9, color: c.ink, fontWeight: 600 }}>{from}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {showVisibility && (
              <span style={{ fontSize: 8, color: isPrivate ? c.inkLight + '60' : c.inkLight + '80' }}>
                {isPrivate ? '🔒 仅彼此可见' : '🌐 公开'}
              </span>
            )}
            {date && <span style={{ fontSize: 8, color: c.inkLight + '60' }}>{date}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
