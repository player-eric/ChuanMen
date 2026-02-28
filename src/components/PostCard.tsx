import { Box, Stack, Typography } from '@mui/material';
import { useColors } from '@/hooks/useColors';
import { useTitleDefs } from '@/hooks/useTitleDefs';
import { Ava, Stamp } from './Atoms';

interface PostCardProps {
  from: string;
  to: string;
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

const defaultBg = 'linear-gradient(145deg, #1c1814 0%, #2a2018 25%, #3a2a20 50%, #2a2218 75%, #1c1814 100%)';

export function PostCard({ from, to, message, stamp = '✉', date, photo, isPrivate = false, showVisibility = false, layout = 'vertical', eventCtx, onToggleVisibility }: PostCardProps) {
  const c = useColors();
  // Normalize photo: raw URLs → CSS background; already-formatted values pass through
  const photoBg = photo && !photo.startsWith('url(') && !photo.startsWith('linear-gradient')
    ? `url(${photo}) center/cover no-repeat`
    : photo;
  const titleDefs = useTitleDefs();
  const horiz = layout === 'horizontal';

  const bannerDecor = (
    <>
      <div style={{ position: 'absolute', top: '10%', left: '25%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,165,116,0.15), transparent 70%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: '15%', width: 20, height: 35, borderRadius: '8px 8px 0 0', background: 'rgba(0,0,0,0.2)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: '25%', width: 18, height: 30, borderRadius: '8px 8px 0 0', background: 'rgba(0,0,0,0.15)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: '60%', width: 22, height: 38, borderRadius: '8px 8px 0 0', background: 'rgba(0,0,0,0.18)' }} />
      <div style={{ position: 'absolute', top: '5%', right: '12%', width: '30%', height: '45%', borderRadius: 3, background: 'rgba(180,200,220,0.06)', boxShadow: '0 0 20px rgba(180,200,220,0.08)' }} />
      <div style={{ position: 'absolute', top: '18%', left: '70%', width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,220,180,0.12)' }} />
      <div style={{ position: 'absolute', top: '40%', left: '10%', width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,200,150,0.1)' }} />
    </>
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

  const contentArea = (
    <Box sx={{ p: '12px 14px 14px', position: 'relative', flex: horiz ? 1 : undefined, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
      <Box>
        {stamp && <Box sx={{ position: 'absolute', top: 8, right: 10 }}><Stamp emoji={stamp} size={22} tooltip={titleDefs.find((t: any) => t.stampEmoji === stamp)?.name} /></Box>}
        <Typography variant="overline" sx={{ color: c.inkLight }}>TO: {to}</Typography>
        <Typography variant="body2" sx={{ color: c.ink, fontStyle: 'italic', lineHeight: 1.7, maxWidth: '85%', mt: 0.5 }}>{message}</Typography>
      </Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Ava name={from} size={18} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: c.ink }}>{from}</Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          {showVisibility && (
            <Typography
              variant="caption"
              onClick={onToggleVisibility}
              sx={{
                color: isPrivate ? c.inkLight + '80' : c.inkLight + 'a0',
                ...(onToggleVisibility && { cursor: 'pointer', '&:hover': { opacity: 0.7 } }),
              }}
            >
              {isPrivate ? '🔒 仅彼此可见' : '🌐 公开'}
            </Typography>
          )}
          {date && <Typography variant="caption" sx={{ color: c.inkLight + '80' }}>{date}</Typography>}
        </Stack>
      </Stack>
    </Box>
  );

  if (horiz) {
    return (
      <Box sx={{ borderRadius: 2, overflow: 'hidden', background: `linear-gradient(165deg, ${c.paper}, ${c.paperDark})`, boxShadow: `0 2px 8px ${c.bg}30`, display: 'flex', aspectRatio: '3 / 2' }}>
        {/* Left: photo / banner */}
        <div style={{ width: '45%', flexShrink: 0, background: photoBg || defaultBg, position: 'relative', overflow: 'hidden' }}>
          {bannerDecor}
          {eventCtx && (
            <Typography variant="caption" sx={{ position: 'absolute', bottom: 8, left: 10, right: 10, color: '#fff', fontSize: '0.65rem', opacity: 0.85, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
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
    <Box sx={{ borderRadius: 2, overflow: 'hidden', background: `linear-gradient(165deg, ${c.paper}, ${c.paperDark})`, boxShadow: `0 2px 8px ${c.bg}30` }}>
      {/* Banner area */}
      <div style={{ width: '100%', height: 130, background: photoBg || defaultBg, position: 'relative', overflow: 'hidden' }}>
        {bannerDecor}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', background: `linear-gradient(transparent, ${c.paper}dd)` }} />
        {eventCtx && (
          <Typography variant="caption" sx={{ position: 'absolute', bottom: 6, left: 12, color: '#fff', fontSize: '0.65rem', opacity: 0.85, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
            📍 {eventCtx}
          </Typography>
        )}
        {watermark}
      </div>
      {contentArea}
    </Box>
  );
}
