import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import { useColors } from '@/hooks/useColors';
import { saveSignals, fetchMySignals } from '@/lib/domainApi';
import { ACTIVITY_TAGS, ACTIVITY_TAG_MAP, BUSY_TAG_KEYS } from '@/lib/mappings';
import { getFutureWeekKeys } from '@/lib/weekKey';
import { AvaStack } from '@/components/Atoms';
import type { DemandSignal } from '@/types';

interface Props {
  data: DemandSignal;
  onSnack: (msg: string) => void;
}

const ACTIVITY_TAGS_NORMAL = ACTIVITY_TAGS.filter((t) => !('busy' in t && t.busy));
const ACTIVITY_TAGS_BUSY = ACTIVITY_TAGS.filter((t) => 'busy' in t && t.busy);

export default function ActivitySignalCard({ data, onSnack }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const c = useColors();
  const weekKeys = Object.keys(data.weeks);
  const [activeWeek, setActiveWeek] = useState(0);
  const [mySignals, setMySignals] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const s of data.mySignals) set.add(`${s.weekKey}:${s.tag}`);
    return set;
  });
  const [weeksData, setWeeksData] = useState(data.weeks);

  // SSR renders without userId → mySignals empty. Fetch client-side on mount.
  React.useEffect(() => {
    if (typeof window === 'undefined' || !user?.id) return;
    if (data.mySignals.length > 0) {
      // Loader already had data (client-side navigation)
      const set = new Set<string>();
      for (const s of data.mySignals) set.add(`${s.weekKey}:${s.tag}`);
      setMySignals(set);
      return;
    }
    // SSR case: fetch signals client-side
    fetchMySignals().then((res) => {
      const set = new Set<string>();
      for (const s of res.signals) set.add(`${s.weekKey}:${s.tag}`);
      setMySignals(set);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem('chuanmen.signal.expanded') === '1'; } catch { return false; }
  });
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentWeekKey = weekKeys[activeWeek] ?? weekKeys[0];
  const weekLabel = weeksData[currentWeekKey]?.label ?? currentWeekKey;

  const isSelected = (tag: string) => mySignals.has(`${currentWeekKey}:${tag}`);

  const persistSignals = useCallback((next: Set<string>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const allWeekKeys = getFutureWeekKeys(3);
        const signals = [...next].map((key) => {
          const [wk, tag] = key.split(':');
          return { weekKey: wk, tag };
        });
        await saveSignals(signals, allWeekKeys);
      } catch {
        onSnack('保存失败');
      } finally {
        setSaving(false);
      }
    }, 400);
  }, [onSnack]);

  const toggleTag = (tag: string) => {
    if (!user) return;
    const key = `${currentWeekKey}:${tag}`;
    const adding = !mySignals.has(key);

    setMySignals((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      persistSignals(next);
      return next;
    });

    // Optimistic update for dashboard
    setWeeksData((prev) => {
      const week = { ...prev[currentWeekKey] };
      if (!week.tags) return prev;
      const me = { id: user.id, name: user.name, avatar: user.avatar ?? null };

      if (adding) {
        const existing = week.tags.find((t) => t.key === tag);
        if (existing) {
          const alreadyIn = existing.users.some((u) => u.id === user.id);
          week.tags = week.tags.map((t) =>
            t.key === tag ? { ...t, count: alreadyIn ? t.count : t.count + 1, users: alreadyIn ? t.users : [...t.users, me] } : t
          );
        } else {
          week.tags = [...week.tags, { key: tag, count: 1, users: [me] }];
        }
      } else {
        const existing = week.tags.find((t) => t.key === tag);
        if (existing) {
          const newCount = existing.count - 1;
          week.tags = newCount > 0
            ? week.tags.map((t) => t.key === tag ? { ...t, count: newCount, users: t.users.filter((u) => u.id !== user.id) } : t)
            : week.tags.filter((t) => t.key !== tag);
        }
      }
      week.tags.sort((a, b) => b.count - a.count);
      return { ...prev, [currentWeekKey]: week };
    });
  };

  const toggleExpanded = () => {
    setExpanded((v) => {
      const next = !v;
      try { localStorage.setItem('chuanmen.signal.expanded', next ? '1' : '0'); } catch {}
      return next;
    });
  };

  // Compact summary: my selected non-busy tags across all weeks (deduplicated)
  const mySelectedTagKeys = new Set<string>();
  for (const wk of weekKeys) {
    for (const t of ACTIVITY_TAGS_NORMAL) {
      if (mySignals.has(`${wk}:${t.key}`)) mySelectedTagKeys.add(t.key);
    }
  }
  const myCollapsedTags = ACTIVITY_TAGS_NORMAL.filter((t) => mySelectedTagKeys.has(t.key));

  // Count selected for current week
  const selectedCount = ACTIVITY_TAGS.filter((t) => isSelected(t.key)).length;

  return (
    <Card sx={{ mb: 2, border: `1px solid ${c.line}` }}>
      <CardContent sx={{ pb: '12px !important' }}>
        {/* Collapsed summary row */}
        {!expanded && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            onClick={toggleExpanded}
            sx={{ cursor: 'pointer', py: 0.25 }}
          >
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ flexShrink: 0 }}>
              最近想做什么？
            </Typography>
            {myCollapsedTags.length > 0 ? myCollapsedTags.map((t) => (
              <Chip key={t.key} label={`${t.emoji}${t.label}`} size="small" variant="outlined" sx={{ height: 20, fontSize: 11, '& .MuiChip-label': { px: 0.5 } }} />
            )) : (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                点击选择
              </Typography>
            )}
            <Box sx={{ flex: 1 }} />
            <Chip
              size="small"
              label="展开"
              icon={<ExpandMoreIcon sx={{ fontSize: 14 }} />}
              variant="outlined"
              sx={{ height: 22, fontSize: 11, '& .MuiChip-label': { px: 0.5 } }}
            />
          </Stack>
        )}

        {/* Expanded: picker + dashboard */}
        <Collapse in={expanded} unmountOnExit>
          {/* Header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              最近想做什么？
            </Typography>
            <Chip
              size="small"
              label="收起"
              icon={<ExpandLessIcon sx={{ fontSize: 16 }} />}
              onClick={toggleExpanded}
              variant="outlined"
              sx={{ height: 24, fontSize: 12 }}
            />
          </Stack>

          {/* Week tabs */}
          <Tabs
            value={activeWeek}
            onChange={(_, v) => setActiveWeek(v)}
            variant="scrollable"
            scrollButtons={false}
            sx={{
              minHeight: 32,
              mb: 1,
              '& .MuiTab-root': { minHeight: 32, py: 0.5, px: 1.5, fontSize: 12, textTransform: 'none' },
            }}
          >
            {weekKeys.map((wk) => (
              <Tab key={wk} label={weeksData[wk]?.label ?? wk} />
            ))}
          </Tabs>

          {/* Tag picker — normal tags */}
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
            {ACTIVITY_TAGS_NORMAL.map((t) => (
              <Chip
                key={t.key}
                label={`${t.emoji}${t.label}`}
                size="small"
                onClick={() => toggleTag(t.key)}
                color={isSelected(t.key) ? 'primary' : 'default'}
                variant={isSelected(t.key) ? 'filled' : 'outlined'}
                disabled={!user || saving}
                sx={{ fontSize: 12, mb: 0.5 }}
              />
            ))}
          </Stack>

          {/* Busy tags with divider */}
          <Divider sx={{ my: 0.5, borderColor: c.line }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
              没空
            </Typography>
          </Divider>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
            {ACTIVITY_TAGS_BUSY.map((t) => (
              <Chip
                key={t.key}
                label={`${t.emoji}${t.label}`}
                size="small"
                onClick={() => toggleTag(t.key)}
                color={isSelected(t.key) ? 'default' : 'default'}
                variant={isSelected(t.key) ? 'filled' : 'outlined'}
                disabled={!user || saving}
                sx={{
                  fontSize: 12,
                  mb: 0.5,
                  ...(isSelected(t.key) ? { bgcolor: 'action.selected' } : {}),
                }}
              />
            ))}
          </Stack>

          {selectedCount > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {weekLabel}你选了 {selectedCount} 个意向
            </Typography>
          )}

          {/* Dashboard — always visible when expanded */}
          <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${c.line}` }}>
            {weekKeys.map((wk) => {
              const week = weeksData[wk];
              if (!week) return null;
              const activeTags = week.tags.filter((t) => t.count > 0 && !BUSY_TAG_KEYS.has(t.key));
              const busyTags = week.tags.filter((t) => t.count > 0 && BUSY_TAG_KEYS.has(t.key));
              if (activeTags.length === 0 && busyTags.length === 0) return null;
              return (
                <Box key={wk} sx={{ mb: 1.5 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    {week.label}
                  </Typography>
                  {activeTags.map((tag) => {
                    const def = ACTIVITY_TAG_MAP.get(tag.key);
                    return (
                      <Stack key={tag.key} direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                        <Typography variant="body2" sx={{ minWidth: 80, fontSize: 13 }}>
                          {def?.emoji ?? ''} {def?.label ?? tag.key}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 30 }}>
                          {tag.count}人
                        </Typography>
                        <AvaStack
                          names={tag.users.map((u) => ({ name: u.name, avatar: u.avatar }))}
                          max={5}
                          size={22}
                          tooltips={tag.users.map((u) => u.name)}
                          onClickItem={(i) => {
                            const name = tag.users[i]?.name;
                            if (name) navigate(`/members/${encodeURIComponent(name)}`);
                          }}
                        />
                      </Stack>
                    );
                  })}
                  {busyTags.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: 11 }}>
                      💤 {busyTags.map((t) => {
                        const def = ACTIVITY_TAG_MAP.get(t.key);
                        return `${t.count}人${def?.label ?? t.key}`;
                      }).join(' · ')}
                    </Typography>
                  )}
                </Box>
              );
            })}
            {weekKeys.every((wk) => (weeksData[wk]?.tags ?? []).every((t) => t.count === 0)) && (
              <Typography variant="caption" color="text.secondary">还没有人表达意向</Typography>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}
