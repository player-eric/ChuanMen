/**
 * Shared mapping utilities — single source of truth for
 * DB enum ↔ UI label / component key conversions.
 */

/** DB EventTag → ScenePhoto component key */
export const eventTagToScene: Record<string, string> = {
  movie: 'movieNight',
  chuanmen: 'cozy',
  holiday: 'potluck',
  hiking: 'hike',
  outdoor: 'nature',
  small_group: 'coffee',
  other: 'coffee',
};

/** Chinese UI label → DB EventTag */
export const chineseTagToEventTag: Record<string, string> = {
  '电影夜': 'movie',
  '茶话会/分享会': 'chuanmen',
  '户外': 'outdoor',
  '运动': 'outdoor',
  '其他': 'other',
};

/** DB EventTag → Chinese label */
export const eventTagToChinese: Record<string, string> = {
  movie: '电影夜',
  chuanmen: '茶话会/分享会',
  holiday: '节日',
  hiking: '徒步',
  outdoor: '户外',
  small_group: '小聚',
  other: '其他',
};

/** DB role value → Chinese display label */
export const roleLabelMap: Record<string, string> = {
  admin: '管理员',
  host: 'Host',
  member: '成员',
};

/** Activity signal tag definitions */
export const ACTIVITY_TAGS = [
  { key: 'movie',     label: '看电影',   emoji: '🎬' },
  { key: 'chuanmen',  label: '茶话会',   emoji: '🍵' },
  { key: 'outdoor',   label: '户外',    emoji: '🏕️' },
  { key: 'eat',       label: '吃饭',    emoji: '🍜' },
  { key: 'boardgame', label: '桌游',    emoji: '🎲' },
  { key: 'drink',     label: '喝酒',    emoji: '🍻' },
  { key: 'show',      label: '看演出',   emoji: '🎭' },
  { key: 'deeptalk',  label: '谈谈心',   emoji: '💬' },
  { key: 'reading',   label: '读书',    emoji: '📖' },
  { key: 'music',     label: '听歌',    emoji: '🎵' },
  { key: 'sports',    label: '运动',    emoji: '🏸' },
  { key: 'holiday',   label: '过节',    emoji: '🎉' },
  { key: 'study',     label: '学习',    emoji: '📚',  busy: true },
  { key: 'overtime',  label: '加班',    emoji: '💼',  busy: true },
  { key: 'travel',    label: '出门旅游', emoji: '✈️',  busy: true },
  { key: 'other',     label: '别的安排', emoji: '📌',  busy: true },
] as const;

/** "没空" tag keys — not counted as activity interest in dashboard */
export const BUSY_TAG_KEYS = new Set(['study', 'overtime', 'travel', 'other']);

/** Tag key → tag definition lookup */
export const ACTIVITY_TAG_MAP = new Map<string, typeof ACTIVITY_TAGS[number]>(ACTIVITY_TAGS.map((t) => [t.key, t]));

/** Host milestone badge tier shape */
export type HostBadgeTier = { min: number; emoji: string; label: string };

/** Default host badge tiers — used as fallback when SiteConfig is unavailable */
export const DEFAULT_HOST_BADGE_TIERS: HostBadgeTier[] = [
  { min: 20, emoji: '👑', label: 'Host 传奇' },
  { min: 10, emoji: '🔥', label: 'Host 大神' },
  { min: 5, emoji: '⭐', label: 'Host 之星' },
  { min: 1, emoji: '🏠', label: 'Host' },
];

/** Get host milestone badge emoji + label for a given host count */
export function hostMilestoneBadge(count: number, tiers?: HostBadgeTier[]): { emoji: string; label: string } | undefined {
  return (tiers ?? DEFAULT_HOST_BADGE_TIERS).find((t) => count >= t.min);
}
