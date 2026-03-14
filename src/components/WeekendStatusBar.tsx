import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { useColors } from '@/hooks/useColors';
import { updateUserSettings } from '@/lib/domainApi';
import type { WeekendSummary } from '@/types';

const NOTE_PRESETS = ['hiking', '看电影', '吃饭', '桌游', '散步', '喝酒', 'K歌', '看演出', '读书', '听歌', 'deeptalk', '学习', '加班'];

interface Props {
  data: WeekendSummary;
  onSnack: (msg: string) => void;
}

export default function WeekendStatusBar({ data, onSnack }: Props) {
  const { user } = useAuth();
  const c = useColors();
  const [status, setStatus] = useState<string | null>(data.myStatus ?? null);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(() => {
    // Parse existing note back into selected chips
    const existing = data.myNote ?? '';
    const set = new Set<string>();
    for (const preset of NOTE_PRESETS) {
      if (existing.includes(preset)) set.add(preset);
    }
    return set;
  });
  const [saving, setSaving] = useState(false);

  const saveToServer = useCallback(async (newStatus: string | null, notes: Set<string>) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await updateUserSettings(user.id, {
        weekendStatus: newStatus,
        weekendNote: [...notes].join('、') || undefined,
      });
    } catch {
      onSnack('保存失败');
    } finally {
      setSaving(false);
    }
  }, [user?.id, onSnack]);

  const handleStatusChange = (_: React.MouseEvent, val: string | null) => {
    setStatus(val);
    if (!val || val === 'busy') {
      // Clear notes when busy or deselected
      setSelectedNotes(new Set());
      saveToServer(val, new Set());
    } else {
      saveToServer(val, selectedNotes);
    }
  };

  const toggleNote = (note: string) => {
    setSelectedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(note)) next.delete(note); else next.add(note);
      saveToServer(status, next);
      return next;
    });
  };

  const totalActive = data.freeCount + data.maybeCount;

  return (
    <Card sx={{ mb: 2, border: `1px solid ${c.line}` }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            这周末
          </Typography>
        </Stack>

        <ToggleButtonGroup
          value={status}
          exclusive
          onChange={handleStatusChange}
          size="small"
          disabled={!user || saving}
          sx={{ mb: 1, '& .MuiToggleButton-root': { textTransform: 'none', px: 1.5, py: 0.25, fontSize: 13 } }}
        >
          <ToggleButton value="free">有空</ToggleButton>
          <ToggleButton value="maybe">可能</ToggleButton>
          <ToggleButton value="busy">没空</ToggleButton>
        </ToggleButtonGroup>

        {status && status !== 'busy' && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            {NOTE_PRESETS.map((preset) => (
              <Chip
                key={preset}
                label={preset}
                size="small"
                onClick={() => toggleNote(preset)}
                color={selectedNotes.has(preset) ? 'primary' : 'default'}
                variant={selectedNotes.has(preset) ? 'filled' : 'outlined'}
                disabled={saving}
                sx={{ fontSize: 12 }}
              />
            ))}
          </Stack>
        )}

        {totalActive > 0 && (
          <Typography variant="caption" color="text.secondary">
            {data.freeCount > 0 && <Box component="span" sx={{ color: 'success.main' }}>{data.freeCount}人有空</Box>}
            {data.freeCount > 0 && data.maybeCount > 0 && ' · '}
            {data.maybeCount > 0 && `${data.maybeCount}人可能有空`}
            {data.topNotes.length > 0 && (
              <Box component="span"> · 想{data.topNotes.slice(0, 3).join('、')}</Box>
            )}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
