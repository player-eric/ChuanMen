// ── Email configuration types (aligned with SiteConfig stored values) ──

export interface DigestSourceConfig {
  key: string;
  label: string;
  enabled: boolean;
  sortOrder: number;
  maxItems: number;
}

export interface DigestConfig {
  maxTotalItems: number;
  sendTime: string;          // "HH:mm" format
  timezone: string;          // IANA timezone, e.g. "America/New_York"
  frequency: 'daily' | 'weekdays' | 'custom';
  customDays: boolean[];     // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  skipIfEmpty: boolean;
  minItems: number;
  personalized: boolean;
  dedupeWindowHours: number;
  subjectTemplate: string;
  headerText: string;
  footerText: string;
  ctaLabel: string;
  ctaUrl: string;
  sources: DigestSourceConfig[];
}

export interface GlobalEmailConfig {
  systemPaused: boolean;
  maxDailyPerUser: number;
  /** Max non-critical emails per calendar day (UTC-5). Login codes bypass this. Default 80. */
  dailyBudget: number;
  // Other fields exist (fromEmail, replyTo, etc.) but are not consumed by backend
}

// ── Defaults (match seed.ts values) ──

export const DEFAULT_DIGEST_CONFIG: DigestConfig = {
  maxTotalItems: 10,
  sendTime: '12:00',
  timezone: 'America/New_York',
  frequency: 'custom',
  customDays: [false, false, true, false, false, true, false], // Tue + Fri
  skipIfEmpty: true,
  minItems: 3,
  personalized: true,
  dedupeWindowHours: 84,           // ~3.5 days to cover gap between Tue→Fri
  subjectTemplate: '串门儿 · {date} 社区近况',
  headerText: '嘿 {userName}，这是最近的串门儿动态：',
  footerText: '— 串门儿团队',
  ctaLabel: '查看更多动态',
  ctaUrl: 'https://chuanmener.club/',
  sources: [
    { key: 'new_events', label: '新活动发布', enabled: true, sortOrder: 0, maxItems: 3 },
    { key: 'signups', label: '即将开始', enabled: true, sortOrder: 1, maxItems: 2 },
    { key: 'postcards', label: '新感谢卡(公开)', enabled: true, sortOrder: 2, maxItems: 2 },
    { key: 'announcements', label: '社群公告', enabled: true, sortOrder: 3, maxItems: 1 },
    { key: 'movies', label: '新电影推荐', enabled: true, sortOrder: 4, maxItems: 2 },
    { key: 'proposals', label: '新提案', enabled: true, sortOrder: 5, maxItems: 1 },
    { key: 'new_members', label: '新成员加入', enabled: true, sortOrder: 6, maxItems: 1 },
  ],
};

export const DEFAULT_GLOBAL_CONFIG: GlobalEmailConfig = {
  systemPaused: false,
  maxDailyPerUser: 1,
  dailyBudget: 80,
};

// ── Helpers ──

/**
 * Load digest config from SiteConfig, falling back to defaults.
 */
export function parseDigestConfig(raw: unknown): DigestConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_DIGEST_CONFIG;
  return { ...DEFAULT_DIGEST_CONFIG, ...(raw as Partial<DigestConfig>) };
}

/**
 * Load global email config from SiteConfig, falling back to defaults.
 */
export function parseGlobalConfig(raw: unknown): GlobalEmailConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_GLOBAL_CONFIG;
  return { ...DEFAULT_GLOBAL_CONFIG, ...(raw as Partial<GlobalEmailConfig>) };
}

/**
 * Check if `now` is within ±30 minutes of the configured send time (in the configured timezone).
 * Window is 30 min because agent tick runs every 10 min — 15 min was too tight and could miss.
 */
export function isWithinSendWindow(
  sendTime: string,
  timezone: string,
  now: Date = new Date(),
): boolean {
  const [hours, minutes] = sendTime.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return true; // invalid config → don't block

  // Get current time in the configured timezone
  // Use hourCycle h23 to ensure midnight = 0 (not 24)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(now);
  const nowHour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const nowMin = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0');

  const nowTotalMin = nowHour * 60 + nowMin;
  const targetTotalMin = hours * 60 + minutes;
  const diff = Math.abs(nowTotalMin - targetTotalMin);

  // Handle midnight wrap-around (e.g. now=23:50, target=00:10 → diff should be 20, not 1420)
  const WINDOW = 30;
  return diff <= WINDOW || (1440 - diff) <= WINDOW;
}

/**
 * Check if today (in the configured timezone) is a send day per frequency config.
 */
export function isSendDay(
  frequency: DigestConfig['frequency'],
  customDays: boolean[],
  timezone: string,
  now: Date = new Date(),
): boolean {
  // Get day of week in the configured timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  });
  const dayStr = formatter.format(now);
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = dayMap[dayStr] ?? now.getDay();

  switch (frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return day >= 1 && day <= 5;
    case 'custom':
      return customDays[day] ?? true;
    default:
      return true;
  }
}
