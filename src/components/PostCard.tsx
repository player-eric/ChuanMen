import { Box, Stack, Typography } from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import { useColors } from '@/hooks/useColors';
import { useTitleDefs } from '@/hooks/useTitleDefs';
import { useNavigate } from 'react-router';
import { Ava, Stamp } from './Atoms';

interface PostCardProps {
  from: string;
  to: string;
  fromAvatar?: string;
  toAvatar?: string;
  message: string;
  stamp?: string;
  date?: string;
  photo?: string;
  isPrivate?: boolean;
  showVisibility?: boolean;
  /** 'vertical' (default, image on top) or 'horizontal' (image left, text right — postcard style) */
  layout?: 'vertical' | 'horizontal';
  /** Event context, e.g. "圣诞电影夜" */
  eventCtx?: string;
  /** Called when user clicks visibility to toggle it */
  onToggleVisibility?: () => void;
}

export function PostCard({ from, to, fromAvatar, toAvatar, message, stamp = '✉', date, photo, isPrivate = false, showVisibility = false, layout = 'vertical', eventCtx, onToggleVisibility }: PostCardProps) {
  const c = useColors();
  const navigate = useNavigate();
  const defaultBg = 'linear-gradient(135deg, #D4A574 0%, #C4915A 40%, #B07D48 100%)';
  // Normalize photo: raw URLs → CSS background; already-formatted values pass through
  const photoBg = photo && !photo.startsWith('url(') && !photo.startsWith('linear-gradient')
    ? `url(${photo}) center/cover no-repeat`
    : photo;
  const titleDefs = useTitleDefs();
  const horiz = layout === 'horizontal';
  const goMember = (name: string) => navigate(`/members/${encodeURIComponent(name)}`);

  const bannerDecor = !photoBg && (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(135deg, #D4A574 0%, #C4915A 40%, #B07D48 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.4, mixBlendMode: 'overlay',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat', backgroundSize: '100px 100px',
      }} />
      <span style={{
        fontFamily: "Georgia, 'Noto Serif SC', serif",
        fontSize: 20, fontStyle: 'italic', fontWeight: 600,
        color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em',
        position: 'relative',
      }}>
        Thank You
      </span>
    </div>
  );

  const watermark = !photoBg && (
    <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', bottom: eventCtx ? 26 : 10, right: 12, opacity: 0.25, alignItems: 'center' }}>
      <Box sx={{ width: 16, height: 16, borderRadius: 1, background: c.ink + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" sx={{ fontSize: '0.5rem', fontWeight: 800, color: c.ink + '60', lineHeight: 1 }}>串</Typography>
      </Box>
      <Typography variant="caption" sx={{ color: c.ink + '50', fontWeight: 600, letterSpacing: '0.06em' }}>CHUANMEN</Typography>
      {date && <Typography variant="caption" sx={{ color: c.ink + '40', fontWeight: 600 }}>{date}</Typography>}
    </Stack>
  );

  // stamp can be an emoji ("☀️") or a title name ("温暖") — resolve both
  const stampDef = titleDefs.find((t: any) => t.stampEmoji === stamp || t.name === stamp);
  // If no match and stamp looks like text (not emoji), fall back to ✉
  const stampEmoji = stampDef?.stampEmoji ?? (stamp.length > 2 ? '✉' : stamp);

  const contentArea = (
    <Box sx={{ p: '12px 14px 14px', position: 'relative', flex: horiz ? 1 : undefined, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography
            variant="overline"
            onClick={() => goMember(to)}
            sx={{ color: c.inkLight, cursor: 'pointer', '&:hover': { color: c.warm } }}
          >
            TO: {to}
          </Typography>
          {stamp && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
              <Stamp emoji={stampEmoji} size={22} />
              {(stampDef?.name || stamp.length > 2) && <Typography variant="caption" sx={{ fontSize: '0.6rem', color: c.stamp, fontWeight: 600, whiteSpace: 'nowrap' }}>{stampDef?.name ?? stamp}</Typography>}
            </Stack>
          )}
        </Stack>
        <Typography variant="body2" sx={{ color: c.ink, fontStyle: 'italic', lineHeight: 1.7, mt: 0.5 }}>{message}</Typography>
      </Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
        <Stack
          direction="row" spacing={0.5} alignItems="center"
          onClick={() => goMember(from)}
          sx={{ cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
        >
          <Ava name={from} src={fromAvatar} size={18} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: c.ink }}>{from}</Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          {showVisibility && (
            <Box
              onClick={onToggleVisibility}
              sx={{
                display: 'flex', alignItems: 'center',
                color: c.text3,
                ...(onToggleVisibility && { cursor: 'pointer', '&:hover': { opacity: 0.7 } }),
              }}
              title={isPrivate ? '仅彼此可见' : '公开'}
            >
              {isPrivate
                ? <LockRoundedIcon sx={{ fontSize: 14 }} />
                : <PublicRoundedIcon sx={{ fontSize: 14 }} />}
            </Box>
          )}
          {date && <Typography variant="caption" sx={{ color: c.inkLight + '80' }}>{date}</Typography>}
        </Stack>
      </Stack>
    </Box>
  );

  if (horiz) {
    return (
      <Box sx={{ borderRadius: 2, overflow: 'hidden', background: `linear-gradient(165deg, ${c.paper}, ${c.paperDark})`, boxShadow: `0 2px 8px ${c.bg}30`, border: `1px solid ${c.line}`, display: 'flex', aspectRatio: '3 / 2' }}>
        {/* Left: photo / banner */}
        <div style={{ width: '45%', flexShrink: 0, background: photoBg || defaultBg, position: 'relative', overflow: 'hidden' }}>
          {bannerDecor}
          {eventCtx && (
            <Typography variant="caption" sx={{ position: 'absolute', bottom: 8, left: 10, right: 10, color: '#fff', fontSize: '0.65rem', opacity: 0.85, textShadow: '0 1px 4px rgba(0,0,0,0.7)', zIndex: 1 }}>
              📍 {eventCtx}
            </Typography>
          )}
          {watermark}
        </div>
        {/* Right: content */}
        {contentArea}
      </Box>
    );
  }

  return (
    <Box sx={{ borderRadius: 2, overflow: 'hidden', background: `linear-gradient(165deg, ${c.paper}, ${c.paperDark})`, boxShadow: `0 2px 8px ${c.bg}30`, border: `1px solid ${c.line}` }}>
      {/* Banner area */}
      <div style={{ width: '100%', height: 130, background: photoBg || defaultBg, position: 'relative', overflow: 'hidden' }}>
        {bannerDecor}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', background: `linear-gradient(transparent, ${c.paper}dd)` }} />
        {eventCtx && (
          <Typography variant="caption" sx={{ position: 'absolute', bottom: 6, left: 12, color: '#fff', fontSize: '0.65rem', opacity: 0.85, textShadow: '0 1px 4px rgba(0,0,0,0.7)', zIndex: 1 }}>
            📍 {eventCtx}
          </Typography>
        )}
        {watermark}
      </div>
      {contentArea}
    </Box>
  );
}
