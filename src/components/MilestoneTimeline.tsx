import { Box, Stack, Typography } from '@mui/material';
import { useColors } from '@/hooks/useColors';
import type { MilestoneItem } from '@/types';

function pickEmoji(title: string, type: string): string {
  if (type === 'host_tribute') return '🌟';
  if (/活动|聚会/.test(title)) return '🎉';
  if (/成员|加入/.test(title)) return '👥';
  if (/电影|观影/.test(title)) return '🎬';
  if (/参与|人次/.test(title)) return '🙌';
  return '🎉';
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}.${m}`;
}

export default function MilestoneTimeline({ items }: { items: MilestoneItem[] }) {
  const c = useColors();

  if (!items.length) return null;

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
        成长足迹
      </Typography>
      <Box sx={{ position: 'relative', pl: 3 }}>
        {/* Vertical line */}
        <Box
          sx={{
            position: 'absolute',
            left: 8,
            top: 6,
            bottom: 6,
            width: 2,
            bgcolor: c.line,
            borderRadius: 1,
          }}
        />
        <Stack spacing={2}>
          {items.map((item) => {
            const dotColor = item.type === 'host_tribute' ? c.green : c.warm;
            const emoji = pickEmoji(item.title, item.type);
            return (
              <Box key={item.id} sx={{ position: 'relative' }}>
                {/* Dot */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: -19,
                    top: 6,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: dotColor,
                  }}
                />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {emoji} {item.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatMonth(item.createdAt)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}
