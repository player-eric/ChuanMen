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
