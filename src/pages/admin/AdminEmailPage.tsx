import { useEffect, useState, useCallback } from 'react';
import {
  CircularProgress,
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuth } from '@/auth/AuthContext';
import {
  fetchEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  previewEmailTemplate,
  fetchMembersApi,
  fetchEventsApi,
  fetchEmailLogs,
  fetchEmailRules,
  updateEmailRule,
  sendAdminEmail,
  type EmailTemplateRow,
  type EmailLogRow,
} from '@/lib/domainApi';

/* ═══════════════════════════════════════════════
   Rule Metadata (static UI constants per rule ID)
   & Placeholder data (no backend models yet)
   ═══════════════════════════════════════════════ */

interface EmailRuleMetadata {
  id: string;
  name: string;
  description: string;
  category: 'txn' | 'daily' | 'digest';
  enabled: boolean;
  cooldownDays: number;
  triggerDescription: string;
  recipientDescription: string;
  userControllable: boolean;
  userToggleLabel?: string;
  disableImpact: string;
  config: Record<string, number | string>;
}

const ruleMetadata: EmailRuleMetadata[] = [
  // TXN
  { id: 'TXN-1', name: '活动取消通知', description: '活动被 Host 或管理员取消时发送', category: 'txn', enabled: true, cooldownDays: 0, triggerDescription: '活动被 Host 或管理员取消时，立即发送', recipientDescription: '该活动所有已报名参与者', userControllable: false, disableImpact: '活动取消后参与者将不会收到任何通知，可能导致参与者在不知情的情况下前往活动地点。', config: {} },
  { id: 'TXN-2', name: '活动变更通知', description: '时间/地点变更时发送', category: 'txn', enabled: true, cooldownDays: 0, triggerDescription: '活动时间或地点发生变更时，立即发送', recipientDescription: '该活动所有已报名参与者', userControllable: false, disableImpact: '参与者不知道活动时间或地点已改变，可能去错时间或地点。', config: {} },
  { id: 'TXN-3', name: '候补转正通知', description: '候补用户被录取时发送', category: 'txn', enabled: true, cooldownDays: 0, triggerDescription: '候补用户被录取时，立即发送', recipientDescription: '被录取的候补用户', userControllable: false, disableImpact: '用户不知道自己已获得名额，可能错过活动。', config: {} },
  { id: 'TXN-4', name: '审批通过欢迎', description: '申请被批准时发送', category: 'txn', enabled: true, cooldownDays: 0, triggerDescription: '用户申请被批准时，立即发送', recipientDescription: '新通过审批的用户', userControllable: false, disableImpact: '新人不知道已通过审批，无法开始使用社群功能。', config: {} },
  { id: 'TXN-5', name: '审批拒绝通知', description: '申请被拒绝时发送', category: 'txn', enabled: true, cooldownDays: 0, triggerDescription: '用户申请被拒绝时，立即发送', recipientDescription: '被拒的申请者', userControllable: false, disableImpact: '申请者持续等待无回复。', config: {} },
  { id: 'TXN-6', name: '抽签结果', description: '每周抽签完成后发送', category: 'txn', enabled: true, cooldownDays: 0, triggerDescription: '每周抽签完成后，立即通知中签者', recipientDescription: '中签者', userControllable: false, disableImpact: '中签者不知道自己中了。', config: {} },
  // Daily P0-P4
  { id: 'P0-A', name: '活动邀请', description: '有新活动且用户被邀请', category: 'daily', enabled: true, cooldownDays: 0, triggerDescription: '有新活动发布且用户被邀请时', recipientDescription: '被邀请的用户', userControllable: true, userToggleLabel: '活动通知', disableImpact: '用户不知道被邀请参加活动。', config: {} },
  { id: 'P0-B', name: '24h 提醒', description: '活动在 24h 内开始', category: 'daily', enabled: true, cooldownDays: 0, triggerDescription: '活动在 24 小时内开始时', recipientDescription: '已报名的参与者', userControllable: true, userToggleLabel: '活动通知', disableImpact: '参与者容易忘记明天的活动。', config: {} },
  { id: 'P0-C', name: '报名确认', description: '用户成功报名', category: 'daily', enabled: true, cooldownDays: 0, triggerDescription: '用户成功报名活动时', recipientDescription: '报名的用户', userControllable: true, userToggleLabel: '活动通知', disableImpact: '用户不确定是否报名成功。', config: {} },
  { id: 'P0-D', name: 'Host 退出通知', description: '有人取消报名', category: 'daily', enabled: true, cooldownDays: 0, triggerDescription: '有参与者取消报名时', recipientDescription: '活动 Host', userControllable: true, userToggleLabel: '活动通知', disableImpact: 'Host 不知道人数变化，影响备餐和安排。', config: {} },
  { id: 'P1', name: '活动推荐', description: '推荐符合偏好的活动', category: 'daily', enabled: true, cooldownDays: 1, triggerDescription: '有符合用户偏好的活动发布时', recipientDescription: '所有 active 用户', userControllable: true, userToggleLabel: '活动通知', disableImpact: '用户可能错过感兴趣的活动。', config: {} },
  { id: 'P2-A', name: '收到感谢卡', description: '有人寄了感谢卡', category: 'daily', enabled: true, cooldownDays: 0, triggerDescription: '有人发送了感谢卡给该用户', recipientDescription: '收卡人', userControllable: true, userToggleLabel: '感谢卡通知', disableImpact: '用户不知道收到了感谢卡。', config: {} },
  { id: 'P2-B', name: '获得新称号', description: '解锁成就', category: 'daily', enabled: true, cooldownDays: 0, triggerDescription: '用户解锁新的称号成就', recipientDescription: '获得称号的用户', userControllable: true, userToggleLabel: '感谢卡通知', disableImpact: '用户不知道获得了称号。', config: {} },
  { id: 'P3-A', name: '新人活动引导', description: '第一次参加活动前', category: 'daily', enabled: true, cooldownDays: 0, triggerDescription: '新用户第一次参加活动前', recipientDescription: '新参与者', userControllable: true, userToggleLabel: '运营引导', disableImpact: '新人缺少活动须知，可能不了解流程。', config: {} },
  { id: 'P3-B', name: '活动后反馈', description: '活动结束后', category: 'daily', enabled: true, cooldownDays: 0, triggerDescription: '活动结束后', recipientDescription: 'Host + Recorder', userControllable: true, userToggleLabel: '运营引导', disableImpact: '照片和反馈不及时收集。', config: {} },
  { id: 'P3-C', name: '新人 Onboarding', description: '注册 ≤14 天', category: 'daily', enabled: true, cooldownDays: 3, triggerDescription: '用户注册 14 天内', recipientDescription: '新用户', userControllable: true, userToggleLabel: '运营引导', disableImpact: '新人不了解社群功能。', config: { cooldownDays: 3 } },
  { id: 'P3-D', name: '鼓励做 Host', description: '活跃但未 Host 过', category: 'daily', enabled: true, cooldownDays: 30, triggerDescription: '活跃参与但从未做过 Host 的用户', recipientDescription: '活跃成员', userControllable: true, userToggleLabel: '运营引导', disableImpact: '少一个潜在 Host。', config: { cooldownDays: 30 } },
  { id: 'P3-E', name: '沉默 Host 召回', description: 'Host 超 60 天未办活动', category: 'daily', enabled: true, cooldownDays: 30, triggerDescription: 'Host 超过 60 天未举办任何活动', recipientDescription: '沉默 Host', userControllable: true, userToggleLabel: '运营引导', disableImpact: 'Host 流失无干预。', config: { thresholdDays: 60, cooldownDays: 30 } },
  { id: 'P3-F', name: '流失用户唤回', description: '超 45 天未参加活动', category: 'daily', enabled: true, cooldownDays: 21, triggerDescription: '超过 45 天未参加任何活动的用户', recipientDescription: '流失用户', userControllable: true, userToggleLabel: '运营引导', disableImpact: '用户彻底流失。', config: { thresholdDays: 45, cooldownDays: 21, maxRecommendations: 3 } },
  { id: 'P4-A', name: '社群里程碑', description: '成员数到整十', category: 'daily', enabled: true, cooldownDays: 0, triggerDescription: '社群成员数达到整十数', recipientDescription: '全体 active 用户', userControllable: true, userToggleLabel: '社群公告', disableImpact: '少了社群凝聚力时刻。', config: {} },
  { id: 'P4-B', name: '新片推荐汇总', description: '≥2 部新推荐', category: 'daily', enabled: true, cooldownDays: 7, triggerDescription: '有 2 部以上新电影推荐时', recipientDescription: '全体 active 用户', userControllable: true, userToggleLabel: '社群公告', disableImpact: '用户不知道有新推荐。', config: { minMovies: 2, cooldownDays: 7 } },
  { id: 'P4-C', name: '月度 Host 感谢', description: '每月 1 日', category: 'daily', enabled: true, cooldownDays: 30, triggerDescription: '每月 1 日', recipientDescription: '当月有举办活动的 Host', userControllable: true, userToggleLabel: '社群公告', disableImpact: 'Host 缺少正向反馈。', config: { cooldownDays: 30 } },
];

interface DigestSourceConfig {
  key: string;
  label: string;
  enabled: boolean;
  sortOrder: number;
  maxItems: number;
}

interface DigestConfig {
  maxTotalItems: number;
  sendTime: string;
  timezone: string;
  frequency: 'daily' | 'weekdays' | 'custom';
  customDays: boolean[];
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

const defaultDigestConfig: DigestConfig = {
  maxTotalItems: 10,
  sendTime: '09:00',
  timezone: 'America/New_York',
  frequency: 'daily',
  customDays: [true, true, true, true, true, false, false],
  skipIfEmpty: false,
  minItems: 3,
  personalized: true,
  dedupeWindowHours: 24,
  subjectTemplate: '串门儿 · {date} 社区动态',
  headerText: '嘿 {userName}，这是今天的串门儿动态：',
  footerText: '— 串门儿团队',
  ctaLabel: '查看更多动态',
  ctaUrl: 'https://chuanmen.co/',
  sources: [
    { key: 'new_events', label: '新活动发布', enabled: true, sortOrder: 0, maxItems: 3 },
    { key: 'signups', label: '活动报名动态', enabled: true, sortOrder: 1, maxItems: 2 },
    { key: 'postcards', label: '新感谢卡(公开)', enabled: true, sortOrder: 2, maxItems: 2 },
    { key: 'announcements', label: '社群公告', enabled: true, sortOrder: 3, maxItems: 1 },
    { key: 'movies', label: '新电影推荐', enabled: true, sortOrder: 4, maxItems: 2 },
    { key: 'proposals', label: '新提案', enabled: true, sortOrder: 5, maxItems: 1 },
    { key: 'new_members', label: '新成员加入', enabled: true, sortOrder: 6, maxItems: 1 },
  ],
};

interface QueuedEmail {
  id: string;
  userName: string;
  userEmail: string;
  ruleId: string;
  scheduledAt: string;
  status: 'queued' | 'paused';
}

const initialQueuedEmails: QueuedEmail[] = [
  { id: 'q1', userName: 'Yuan', userEmail: 'yuan@cm.app', ruleId: 'DIGEST', scheduledAt: '明天 09:00 EST', status: 'queued' },
  { id: 'q2', userName: '星星', userEmail: 'xingxing@gmail.com', ruleId: 'P0-A', scheduledAt: '明天 09:00 EST', status: 'queued' },
  { id: 'q3', userName: 'Nicole', userEmail: 'nicole@gmail.com', ruleId: 'DIGEST', scheduledAt: '(已暂停)', status: 'paused' },
  { id: 'q4', userName: '白开水', userEmail: 'bks@gmail.com', ruleId: 'P0-B', scheduledAt: '明天 09:00 EST', status: 'queued' },
  { id: 'q5', userName: '大橙子', userEmail: 'dachengzi@gmail.com', ruleId: 'DIGEST', scheduledAt: '明天 09:00 EST', status: 'queued' },
];

interface BounceEvent {
  id: string;
  email: string;
  ruleId: string;
  type: 'hard_bounce' | 'soft_bounce' | 'complaint';
  reason: string;
  occurredAt: string;
}

const placeholderBounces: BounceEvent[] = [
  { id: 'b1', email: 'bad@email.com', ruleId: 'DIGEST', type: 'hard_bounce', reason: '地址不存在', occurredAt: '2026-02-18 09:00' },
  { id: 'b2', email: 'full@mail.com', ruleId: 'P0-A', type: 'soft_bounce', reason: '邮箱已满', occurredAt: '2026-02-17 09:00' },
  { id: 'b3', email: 'user@gmail.com', ruleId: 'DIGEST', type: 'complaint', reason: '标记为垃圾邮件', occurredAt: '2026-02-15 09:00' },
];

interface UserEmailStatus {
  id: string;
  name: string;
  email: string;
  role: string;
  emailState: 'active' | 'weekly' | 'stopped' | 'unsubscribed';
  unopenedStreak: number;
  lastDailySentAt?: string;
  createdAt?: string;
}

interface UnsubscribeRecord {
  id: string;
  userName: string;
  email: string;
  reason: string;
  comment?: string;
  unsubscribedAt: string;
}

const placeholderUnsubscribes: UnsubscribeRecord[] = [
  { id: 'us1', userName: '李华', email: 'lihua@gmail.com', reason: '邮件太频繁', comment: '一天一封太多了', unsubscribedAt: '2026-02-15' },
  { id: 'us2', userName: '小明', email: 'xiaoming@outlook.com', reason: '内容不相关', unsubscribedAt: '2026-02-10' },
  { id: 'us3', userName: '张三', email: 'zhangsan@qq.com', reason: '邮件太频繁', unsubscribedAt: '2026-01-28' },
  { id: 'us4', userName: '王五', email: 'wangwu@163.com', reason: '其他', comment: '暂时不需要', unsubscribedAt: '2026-01-15' },
  { id: 'us5', userName: '赵六', email: 'zhaoliu@gmail.com', reason: '邮件太频繁', unsubscribedAt: '2026-01-10' },
];

interface SuppressedEmail {
  id: string;
  email: string;
  reason: string;
  addedAt: string;
  source: 'system' | 'admin';
}

const initialSuppressed: SuppressedEmail[] = [
  { id: 's1', email: 'bad@email.com', reason: '硬弹回(自动)', addedAt: '2026-02-18', source: 'system' },
  { id: 's2', email: 'competitor@x.com', reason: '手动添加', addedAt: '2026-02-10', source: 'admin' },
];

interface GlobalEmailConfig {
  systemPaused: boolean;
  fromEmail: string;
  replyTo: string;
  dailySendTime: string;
  timezone: string;
  maxDailyPerUser: number;
  weeklyDegradeThreshold: number;
  stoppedDegradeThreshold: number;
  weeklySendDay: string;
  orgName: string;
  physicalAddress: string;
  unsubscribeText: string;
  unsubscribeUrl: string;
  unsubscribeReasons: string;
  testEmails: string;
}

const defaultGlobalConfig: GlobalEmailConfig = {
  systemPaused: false,
  fromEmail: 'noreply@chuanmen.co',
  replyTo: 'hi@chuanmen.co',
  dailySendTime: '09:00',
  timezone: 'America/New_York',
  maxDailyPerUser: 1,
  weeklyDegradeThreshold: 3,
  stoppedDegradeThreshold: 6,
  weeklySendDay: '周一',
  orgName: '串门儿',
  physicalAddress: '123 Main St, Edison, NJ 08820',
  unsubscribeText: '不想收到邮件？点此退订',
  unsubscribeUrl: 'https://chuanmen.co/unsubscribe',
  unsubscribeReasons: '邮件太频繁, 内容不相关, 不再参与社群, 其他',
  testEmails: 'admin@chuanmen.co',
};

const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
const timezoneOptions = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Asia/Shanghai', 'UTC'];
const weekdayOptions = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const allRuleIds = ['TXN-1', 'TXN-2', 'TXN-3', 'TXN-4', 'TXN-5', 'TXN-6', 'P0-A', 'P0-B', 'P0-C', 'P0-D', 'P1', 'P2-A', 'P2-B', 'P3-A', 'P3-B', 'P3-C', 'P3-D', 'P3-E', 'P3-F', 'P4-A', 'P4-B', 'P4-C', 'DIGEST'];

const emailStateColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  weekly: 'warning',
  stopped: 'error',
  unsubscribed: 'default',
};
const emailStateLabels: Record<string, string> = {
  active: 'active',
  weekly: 'weekly',
  stopped: 'stopped',
  unsubscribed: 'unsubscribed',
};

/* ═══════════════════════════════════════════════
   Helper Components
   ═══════════════════════════════════════════════ */

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 120 }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h6" fontWeight={700} color={color}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════ */

export default function AdminEmailPage() {
  const { user: authUser } = useAuth();
  // Global state
  const [mainTab, setMainTab] = useState(0);
  const [globalConfig, setGlobalConfig] = useState<GlobalEmailConfig>(defaultGlobalConfig);
  const [rules, setRules] = useState<EmailRuleMetadata[]>(ruleMetadata);
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<EmailTemplateRow | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [digestConfig, setDigestConfig] = useState<DigestConfig>(defaultDigestConfig);
  const [queuedEmails, setQueuedEmails] = useState<QueuedEmail[]>(initialQueuedEmails);
  const [suppressedEmails, setSuppressedEmails] = useState<SuppressedEmail[]>(initialSuppressed);

  // Real data from API
  const [allUsers, setAllUsers] = useState<UserEmailStatus[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLogRow[]>([]);
  const [eventNames, setEventNames] = useState<string[]>([]);

  // Snackbar for send feedback
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [sending, setSending] = useState(false);

  // Dialog states
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const [manualSendOpen, setManualSendOpen] = useState(false);
  const [editRuleOpen, setEditRuleOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<EmailRuleMetadata | null>(null);
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateRow | null>(null);
  const [previewTemplateOpen, setPreviewTemplateOpen] = useState(false);
  const [previewingTemplate, setPreviewingTemplate] = useState<EmailTemplateRow | null>(null);
  const [userPreviewOpen, setUserPreviewOpen] = useState(false);
  const [userPreviewTemplate, setUserPreviewTemplate] = useState<EmailTemplateRow | null>(null);
  const [userPreviewUser, setUserPreviewUser] = useState<UserEmailStatus | null>(null);
  const [addSuppressedOpen, setAddSuppressedOpen] = useState(false);
  const [addSuppressedEmail, setAddSuppressedEmail] = useState('');
  const [addSuppressedReason, setAddSuppressedReason] = useState('');
  const [changeStatusConfirm, setChangeStatusConfirm] = useState<{ user: UserEmailStatus; newState: string } | null>(null);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);

  // Sub-tab states
  const [sendCenterSubTab, setSendCenterSubTab] = useState(0);
  const [subscriptionSubTab, setSubscriptionSubTab] = useState(0);

  // Filter states
  const [templateFilterRuleId, setTemplateFilterRuleId] = useState('');
  const [logFilterRuleId, setLogFilterRuleId] = useState('');
  const [logFilterEvent, setLogFilterEvent] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [queueSearch, setQueueSearch] = useState('');
  const [queueFilterRuleId, setQueueFilterRuleId] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Manual send state
  const [manualSendTarget, setManualSendTarget] = useState('active_all');
  const [manualSendUsers, setManualSendUsers] = useState<UserEmailStatus[]>([]);
  const [manualSendEvent, setManualSendEvent] = useState('');
  const [manualSendTemplateId, setManualSendTemplateId] = useState('');
  const [manualSendSubject, setManualSendSubject] = useState('');
  const [manualSendBody, setManualSendBody] = useState('');

  // Global config expanded sections
  const [domainHealthExpanded, setDomainHealthExpanded] = useState(false);

  // Template editing state
  const [editTplRuleId, setEditTplRuleId] = useState('');
  const [editTplVariant, setEditTplVariant] = useState('default');
  const [editTplSubject, setEditTplSubject] = useState('');
  const [editTplBody, setEditTplBody] = useState('');
  const [editTplActive, setEditTplActive] = useState(true);

  // Rule editing temp state
  const [editRuleCooldown, setEditRuleCooldown] = useState(0);
  const [editRuleEnabled, setEditRuleEnabled] = useState(true);
  const [editRuleThreshold, setEditRuleThreshold] = useState(0);
  const [editRuleMaxRec, setEditRuleMaxRec] = useState(3);

  // Test email rule selector
  const [testRuleId, setTestRuleId] = useState('TXN-4');

  // Load templates from DB
  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const data = await fetchEmailTemplates();
      setTemplates(data);
    } catch (e) {
      console.error('Failed to load templates:', e);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Load real users from API
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const raw = await fetchMembersApi();
      const users: UserEmailStatus[] = raw
        .filter((u: Record<string, unknown>) => u.userStatus === 'approved')
        .map((u: Record<string, unknown>) => {
          const prefs = u.preferences as Record<string, unknown> | null;
          return {
            id: u.id as string,
            name: u.name as string,
            email: u.email as string,
            role: (u.role as string) || 'member',
            emailState: (prefs?.emailState as UserEmailStatus['emailState']) || 'active',
            unopenedStreak: (prefs?.unopenedStreak as number) || 0,
            lastDailySentAt: prefs?.lastDailySentAt ? new Date(prefs.lastDailySentAt as string).toLocaleDateString() : undefined,
            createdAt: u.createdAt as string | undefined,
          };
        });
      setAllUsers(users);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
    loadUsers();
    // Load email logs from API
    fetchEmailLogs().then(setEmailLogs).catch(() => {});
    // Load event names from API
    fetchEventsApi().then((events: any[]) => {
      setEventNames(events.map((e: any) => e.title ?? e.name ?? '').filter(Boolean));
    }).catch(() => {});
    // Merge real DB rule state into UI metadata
    fetchEmailRules().then((dbRules) => {
      setRules(prev => prev.map(r => {
        const db = dbRules.find((d: any) => d.id === r.id);
        return db ? { ...r, enabled: db.enabled, cooldownDays: db.cooldownDays, config: { ...r.config, ...db.config as Record<string, number | string> } } : r;
      }));
    }).catch(() => {});
  }, [loadUsers]);

  // Computed values from real data
  const activeCount = allUsers.filter(u => u.emailState === 'active').length;
  const weeklyCount = allUsers.filter(u => u.emailState === 'weekly').length;
  const stoppedCount = allUsers.filter(u => u.emailState === 'stopped').length;
  const unsubCount = allUsers.filter(u => u.emailState === 'unsubscribed').length;
  const hostCount = allUsers.filter(u => u.role === 'host' || u.role === 'admin').length;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const newMemberCount = allUsers.filter(u => u.createdAt && u.createdAt > thirtyDaysAgo).length;

  const manualSendRecipientCount = (() => {
    switch (manualSendTarget) {
      case 'active_all': return activeCount + weeklyCount;
      case 'active_only': return activeCount;
      case 'hosts': return hostCount;
      case 'new_members': return newMemberCount;
      case 'specific_users': return manualSendUsers.length;
      case 'event_participants': return manualSendEvent ? 8 : 0;
      default: return 0;
    }
  })();

  // Get recipients list based on target selection
  const getRecipients = (): UserEmailStatus[] => {
    switch (manualSendTarget) {
      case 'active_all': return allUsers.filter(u => u.emailState === 'active' || u.emailState === 'weekly');
      case 'active_only': return allUsers.filter(u => u.emailState === 'active');
      case 'hosts': return allUsers.filter(u => u.role === 'host' || u.role === 'admin');
      case 'new_members': return allUsers.filter(u => u.createdAt && u.createdAt > thirtyDaysAgo);
      case 'specific_users': return manualSendUsers;
      default: return [];
    }
  };

  // Handle actual email sending
  const handleSendEmails = async () => {
    const recipients = getRecipients();
    if (recipients.length === 0 || !manualSendSubject || !authUser?.id) return;

    setSending(true);
    setSendConfirmOpen(false);
    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      try {
        await sendAdminEmail(
          { to: recipient.email, subject: manualSendSubject, text: manualSendBody },
          authUser.id,
        );
        successCount++;
      } catch (e) {
        console.error(`Failed to send to ${recipient.email}:`, e);
        failCount++;
      }
    }

    setSending(false);
    setManualSendOpen(false);
    setSnackbar({
      open: true,
      message: failCount === 0
        ? `成功发送 ${successCount} 封邮件`
        : `发送完成：成功 ${successCount}，失败 ${failCount}`,
      severity: failCount === 0 ? 'success' : 'error',
    });
  };

  // Handle test email
  const handleSendTestEmail = async (type: 'template' | 'digest' | 'plain', ruleId?: string) => {
    const testAddresses = globalConfig.testEmails.split(',').map(e => e.trim()).filter(Boolean);
    if (testAddresses.length === 0 || !authUser?.id) {
      setSnackbar({ open: true, message: '请先设置测试邮箱地址', severity: 'error' });
      return;
    }

    setSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const addr of testAddresses) {
      try {
        if (type === 'plain') {
          await sendAdminEmail(
            { to: addr, subject: '串门儿 · 纯文本测试', text: '这是一封来自串门儿邮件系统的纯文本测试邮件。\n\n如果您收到此邮件，说明邮件发送功能正常。' },
            authUser.id,
          );
        } else if (type === 'template' && ruleId) {
          const tpl = templates.find(t => t.ruleId === ruleId && t.isActive);
          if (tpl) {
            const preview = await previewEmailTemplate(tpl.subject, tpl.body, { userName: '测试用户', eventTitle: '测试活动', hostName: 'Admin' });
            await sendAdminEmail({ to: addr, subject: preview.subject, text: preview.text, html: preview.html }, authUser.id);
          } else {
            await sendAdminEmail(
              { to: addr, subject: `串门儿 · 测试 ${ruleId}`, text: `规则 ${ruleId} 的测试邮件（未找到对应模板，发送纯文本）` },
              authUser.id,
            );
          }
        } else if (type === 'digest') {
          const body = `**${digestConfig.headerText.replace('{userName}', '测试用户')}**\n\n• 新活动：电影夜·花样年华\n• 星星 报名了 High Point 徒步\n• 新感谢卡：大橙子 → Yuan\n\n${digestConfig.footerText}`;
          const preview = await previewEmailTemplate('串门儿每日摘要', body, {});
          await sendAdminEmail({ to: addr, subject: preview.subject, text: preview.text, html: preview.html }, authUser.id);
        }
        successCount++;
      } catch (e) {
        console.error(`Failed to send test to ${addr}:`, e);
        failCount++;
      }
    }

    setSending(false);
    setSnackbar({
      open: true,
      message: failCount === 0
        ? `测试邮件已发送到 ${testAddresses.join(', ')}`
        : `发送完成：成功 ${successCount}，失败 ${failCount}`,
      severity: failCount === 0 ? 'success' : 'error',
    });
  };

  // Handlers
  const handleTogglePause = () => {
    if (!globalConfig.systemPaused) {
      setPauseConfirmOpen(true);
    } else {
      setGlobalConfig(c => ({ ...c, systemPaused: false }));
    }
  };

  const handleConfirmPause = () => {
    setGlobalConfig(c => ({ ...c, systemPaused: true }));
    setPauseConfirmOpen(false);
  };

  const handleToggleRule = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    const newEnabled = !rule.enabled;
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled: newEnabled } : r));
    updateEmailRule(ruleId, { enabled: newEnabled }).catch(() => {
      // Revert on failure
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled: !newEnabled } : r));
    });
  };

  const handleOpenEditRule = (rule: EmailRuleMetadata) => {
    setEditingRule(rule);
    setEditRuleEnabled(rule.enabled);
    setEditRuleCooldown(rule.cooldownDays);
    setEditRuleThreshold(Number(rule.config.thresholdDays) || 0);
    setEditRuleMaxRec(Number(rule.config.maxRecommendations) || 3);
    setEditRuleOpen(true);
  };

  const handleSaveRule = () => {
    if (!editingRule) return;
    const newConfig = {
      ...editingRule.config,
      ...(editRuleThreshold > 0 ? { thresholdDays: editRuleThreshold } : {}),
      ...(editRuleMaxRec > 0 ? { maxRecommendations: editRuleMaxRec } : {}),
      cooldownDays: editRuleCooldown,
    };
    setRules(prev => prev.map(r => {
      if (r.id !== editingRule.id) return r;
      return { ...r, enabled: editRuleEnabled, cooldownDays: editRuleCooldown, config: newConfig };
    }));
    // Persist to DB
    updateEmailRule(editingRule.id, {
      enabled: editRuleEnabled,
      cooldownDays: editRuleCooldown,
      config: newConfig as Record<string, unknown>,
    }).catch(console.error);
    setEditRuleOpen(false);
  };

  const handleOpenEditTemplate = (tpl: EmailTemplateRow) => {
    setEditingTemplate(tpl);
    setEditTplRuleId(tpl.ruleId);
    setEditTplVariant(tpl.variantKey);
    setEditTplSubject(tpl.subject);
    setEditTplBody(tpl.body);
    setEditTplActive(tpl.isActive);
    setEditTemplateOpen(true);
  };

  const handleSaveTemplate = async () => {
    try {
      if (!editingTemplate) {
        await createEmailTemplate({
          ruleId: editTplRuleId,
          variantKey: editTplVariant,
          subject: editTplSubject,
          body: editTplBody,
          isActive: editTplActive,
        });
      } else {
        await updateEmailTemplate(editingTemplate.id, {
          ruleId: editTplRuleId,
          variantKey: editTplVariant,
          subject: editTplSubject,
          body: editTplBody,
          isActive: editTplActive,
        });
      }
      setEditTemplateOpen(false);
      loadTemplates();
    } catch (e) {
      console.error('Failed to save template:', e);
    }
  };

  const handleDeleteTemplate = async (tpl: EmailTemplateRow) => {
    try {
      await deleteEmailTemplate(tpl.id);
      setDeleteConfirm(null);
      loadTemplates();
    } catch (e) {
      console.error('Failed to delete template:', e);
    }
  };

  const handleQueueAction = (id: string, action: 'pause' | 'resume' | 'cancel') => {
    if (action === 'cancel') {
      setQueuedEmails(prev => prev.filter(e => e.id !== id));
    } else {
      setQueuedEmails(prev => prev.map(e => e.id !== id ? e : {
        ...e,
        status: action === 'pause' ? 'paused' as const : 'queued' as const,
        scheduledAt: action === 'pause' ? '(已暂停)' : '明天 09:00 EST',
      }));
    }
  };

  const handleRemoveSuppressed = (id: string) => {
    setSuppressedEmails(prev => prev.filter(e => e.id !== id));
  };

  const handleAddSuppressed = () => {
    if (!addSuppressedEmail) return;
    setSuppressedEmails(prev => [...prev, {
      id: `s${prev.length + 1}`,
      email: addSuppressedEmail,
      reason: addSuppressedReason || '手动添加',
      addedAt: new Date().toISOString().slice(0, 10),
      source: 'admin',
    }]);
    setAddSuppressedEmail('');
    setAddSuppressedReason('');
    setAddSuppressedOpen(false);
  };

  const filteredLogs = emailLogs.filter(l => {
    if (logFilterRuleId && l.ruleId !== logFilterRuleId) return false;
    if (logSearch && !l.user.name.toLowerCase().includes(logSearch.toLowerCase()) && !l.user.email.toLowerCase().includes(logSearch.toLowerCase())) return false;
    return true;
  });

  const filteredQueue = queuedEmails.filter(q => {
    if (queueFilterRuleId && q.ruleId !== queueFilterRuleId) return false;
    if (queueSearch && !q.userName.toLowerCase().includes(queueSearch.toLowerCase())) return false;
    return true;
  });

  const filteredUsers = allUsers.filter(u => {
    if (userStatusFilter && u.emailState !== userStatusFilter) return false;
    if (userSearch && !u.name.toLowerCase().includes(userSearch.toLowerCase()) && !u.email.toLowerCase().includes(userSearch.toLowerCase())) return false;
    return true;
  });

  const filteredTemplates = templates.filter(t => {
    if (templateFilterRuleId && t.ruleId !== templateFilterRuleId) return false;
    return true;
  });

  // Unsubscribe reason stats
  const unsubReasons = placeholderUnsubscribes.reduce<Record<string, number>>((acc, u) => {
    acc[u.reason] = (acc[u.reason] || 0) + 1;
    return acc;
  }, {});
  const totalUnsubs = placeholderUnsubscribes.length;

  const txnRules = rules.filter(r => r.category === 'txn');
  const dailyRules = rules.filter(r => r.category === 'daily');

  const replaceVars = (text: string, user?: UserEmailStatus | null) => {
    return text
      .replace(/\{userName\}/g, user?.name ?? '小明')
      .replace(/\{eventTitle\}/g, '电影夜·花样年华')
      .replace(/\{eventDate\}/g, '2026-02-22 19:00')
      .replace(/\{eventLocation\}/g, '白开水家')
      .replace(/\{hostName\}/g, 'Yuan')
      .replace(/\{postcardFrom\}/g, '星星')
      .replace(/\{postcardMessage\}/g, '谢谢你的招待！')
      .replace(/\{titleName\}/g, '社交达人')
      .replace(/\{date\}/g, '2/24')
      .replace(/\{headerText\}/g, digestConfig.headerText.replace(/\{userName\}/g, user?.name ?? '小明'))
      .replace(/\{footerText\}/g, digestConfig.footerText)
      .replace(/\{digestContent\}/g, '• 新活动：电影夜·花样年华\n• 星星 报名了 High Point 徒步\n• 新感谢卡：大橙子 → Yuan');
  };

  /* ═══════════════════════════════════════════════
     Render: Rule Card
     ═══════════════════════════════════════════════ */
  const renderRuleCard = (rule: EmailRuleMetadata) => (
    <Card key={rule.id} variant="outlined" sx={{ opacity: rule.enabled ? 1 : 0.6 }}>
      <CardContent sx={{ py: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1 }}>
            <Switch
              checked={rule.enabled}
              onChange={() => handleToggleRule(rule.id)}
              size="small"
            />
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={rule.id} size="small" variant="outlined" color={rule.category === 'txn' ? 'error' : 'primary'} />
                <Typography fontWeight={700}>{rule.name}</Typography>
              </Stack>
            </Box>
          </Stack>
          <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => handleOpenEditRule(rule)}>
            编辑
          </Button>
        </Stack>

        <Stack spacing={0.5} sx={{ mt: 1.5, ml: 5.5 }}>
          <Typography variant="body2" color="text.secondary">
            <b>触发时机:</b> {rule.triggerDescription}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <b>收件人:</b> {rule.recipientDescription}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <b>冷却期:</b> {rule.cooldownDays === 0 ? '无（每次触发都发送）' : `${rule.cooldownDays} 天内不重复发送`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <b>用户可控:</b> {rule.userControllable ? `可通过「${rule.userToggleLabel}」toggle 关闭` : '不可关闭（事务性邮件，确保用户收到关键变更）'}
          </Typography>
          {!rule.enabled && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              关闭影响: {rule.disableImpact}
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );

  /* ═══════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════ */

  return (
    <Stack spacing={2}>
      {/* === Global Paused Alert === */}
      {globalConfig.systemPaused && (
        <Alert severity="error" variant="filled">
          邮件系统已暂停，所有自动邮件停发中。手动发送仍可用。事务性邮件（活动取消、候补转正等）不受影响。
        </Alert>
      )}

      {/* === Top Action Bar === */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={1}>
        <Box />
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">邮件系统:</Typography>
          <Chip
            label={globalConfig.systemPaused ? '已暂停' : '运行中'}
            color={globalConfig.systemPaused ? 'error' : 'success'}
            size="small"
            onClick={handleTogglePause}
            sx={{ cursor: 'pointer' }}
          />
        </Stack>
        <Button
          variant="outlined"
          startIcon={<SendRoundedIcon />}
          onClick={() => {
            setManualSendTarget('active_all');
            setManualSendUsers([]);
            setManualSendEvent('');
            setManualSendTemplateId('');
            setManualSendSubject('');
            setManualSendBody('');
            setManualSendOpen(true);
          }}
        >
          手动发送邮件
        </Button>
      </Stack>

      {/* === Main Tabs === */}
      <Tabs
        value={mainTab}
        onChange={(_, v) => setMainTab(v)}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="规则管理" />
        <Tab label="每日摘要" />
        <Tab label="模板编辑" />
        <Tab label="发送中心" />
        <Tab label="订阅管理" />
        <Tab label="全局配置" />
      </Tabs>

      {/* ═══════════════════════════════════════════════
         Tab 0: 规则管理
         ═══════════════════════════════════════════════ */}
      {mainTab === 0 && (
        <Stack spacing={3}>
          <Alert severity="info">
            邮件系统分两大类：事务性邮件（TXN）在事件发生时立即发送，不受用户频率偏好限制；
            日常邮件（P0-P4）按优先级排序，每天最多发一封合并邮件。关闭某条规则 = 该类邮件对所有用户停发。
          </Alert>

          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
              事务性邮件（TXN）— 即时触发，不受频率限制
            </Typography>
            <Stack spacing={1.5}>
              {txnRules.map(renderRuleCard)}
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
              日常邮件（P0-P4）— 每天批量发送，按优先级合并
            </Typography>
            <Stack spacing={1.5}>
              {dailyRules.map(renderRuleCard)}
            </Stack>
          </Box>
        </Stack>
      )}

      {/* ═══════════════════════════════════════════════
         Tab 1: 每日摘要
         ═══════════════════════════════════════════════ */}
      {mainTab === 1 && (
        <Stack spacing={3}>
          {/* Digest Sources */}
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>摘要内容来源（拖拽排序）</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary">每封最多:</Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={digestConfig.maxTotalItems}
                    onChange={e => setDigestConfig(c => ({ ...c, maxTotalItems: Number(e.target.value) }))}
                    sx={{ width: 70 }}
                    slotProps={{ htmlInput: { min: 1, max: 30 } }}
                  />
                  <Typography variant="body2" color="text.secondary">条</Typography>
                </Stack>
              </Stack>
              <Stack spacing={1}>
                {digestConfig.sources
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map(src => (
                    <Stack key={src.key} direction="row" alignItems="center" spacing={1.5}
                      sx={{ py: 0.75, px: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <DragIndicatorRoundedIcon sx={{ color: 'text.secondary', cursor: 'grab' }} fontSize="small" />
                      <Switch
                        checked={src.enabled}
                        size="small"
                        onChange={() => {
                          setDigestConfig(c => ({
                            ...c,
                            sources: c.sources.map(s => s.key === src.key ? { ...s, enabled: !s.enabled } : s),
                          }));
                        }}
                      />
                      <Typography variant="body2" sx={{ flex: 1 }}>{src.label}</Typography>
                      <Typography variant="body2" color="text.secondary">最多:</Typography>
                      <TextField
                        size="small"
                        type="number"
                        value={src.maxItems}
                        onChange={e => {
                          setDigestConfig(c => ({
                            ...c,
                            sources: c.sources.map(s => s.key === src.key ? { ...s, maxItems: Number(e.target.value) } : s),
                          }));
                        }}
                        sx={{ width: 60 }}
                        slotProps={{ htmlInput: { min: 1, max: 10 } }}
                      />
                      <Typography variant="body2" color="text.secondary">条</Typography>
                    </Stack>
                  ))}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                排在上方的内容优先出现在邮件中，当总条数达到上限时下方内容被截断。
              </Typography>
            </CardContent>
          </Card>

          {/* Send Time */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>发送时间</Typography>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="发送时间"
                    type="time"
                    size="small"
                    value={digestConfig.sendTime}
                    onChange={e => setDigestConfig(c => ({ ...c, sendTime: e.target.value }))}
                    sx={{ width: 150 }}
                  />
                  <TextField
                    label="时区"
                    select
                    size="small"
                    value={digestConfig.timezone}
                    onChange={e => setDigestConfig(c => ({ ...c, timezone: e.target.value }))}
                    sx={{ width: 220 }}
                  >
                    {timezoneOptions.map(tz => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
                  </TextField>
                </Stack>
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>频率</Typography>
                  <RadioGroup
                    row
                    value={digestConfig.frequency}
                    onChange={e => setDigestConfig(c => ({ ...c, frequency: e.target.value as DigestConfig['frequency'] }))}
                  >
                    <FormControlLabel value="daily" control={<Radio size="small" />} label="每天" />
                    <FormControlLabel value="weekdays" control={<Radio size="small" />} label="仅工作日" />
                    <FormControlLabel value="custom" control={<Radio size="small" />} label="自定义" />
                  </RadioGroup>
                  {digestConfig.frequency === 'custom' && (
                    <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                      {dayLabels.map((d, i) => (
                        <Chip
                          key={d}
                          label={d}
                          size="small"
                          color={digestConfig.customDays[i] ? 'primary' : 'default'}
                          variant={digestConfig.customDays[i] ? 'filled' : 'outlined'}
                          onClick={() => {
                            setDigestConfig(c => ({
                              ...c,
                              customDays: c.customDays.map((v, j) => j === i ? !v : v),
                            }));
                          }}
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Stack>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Smart Rules */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>智能规则</Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>空内容处理</Typography>
                  <RadioGroup
                    row
                    value={digestConfig.skipIfEmpty ? 'skip' : 'send'}
                    onChange={e => setDigestConfig(c => ({ ...c, skipIfEmpty: e.target.value === 'skip' }))}
                  >
                    <FormControlLabel value="skip" control={<Radio size="small" />} label="跳过不发" />
                    <FormControlLabel value="send" control={<Radio size="small" />} label='发送"本日无新动态"' />
                  </RadioGroup>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2">最少内容数:</Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={digestConfig.minItems}
                    onChange={e => setDigestConfig(c => ({ ...c, minItems: Number(e.target.value) }))}
                    sx={{ width: 60 }}
                  />
                  <Typography variant="body2" color="text.secondary">条 — 不足时跳过</Typography>
                </Stack>
                <FormControlLabel
                  control={
                    <Switch
                      checked={digestConfig.personalized}
                      onChange={e => setDigestConfig(c => ({ ...c, personalized: e.target.checked }))}
                      size="small"
                    />
                  }
                  label="根据用户历史偏好调整顺序"
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2">去重窗口:</Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={digestConfig.dedupeWindowHours}
                    onChange={e => setDigestConfig(c => ({ ...c, dedupeWindowHours: Number(e.target.value) }))}
                    sx={{ width: 60 }}
                  />
                  <Typography variant="body2" color="text.secondary">小时</Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Digest Template */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>摘要模板</Typography>
              <Stack spacing={2}>
                <TextField
                  label="邮件主题"
                  size="small"
                  fullWidth
                  value={digestConfig.subjectTemplate}
                  onChange={e => setDigestConfig(c => ({ ...c, subjectTemplate: e.target.value }))}
                />
                <TextField
                  label="头部文案"
                  size="small"
                  fullWidth
                  value={digestConfig.headerText}
                  onChange={e => setDigestConfig(c => ({ ...c, headerText: e.target.value }))}
                />
                <TextField
                  label="尾部文案"
                  size="small"
                  fullWidth
                  value={digestConfig.footerText}
                  onChange={e => setDigestConfig(c => ({ ...c, footerText: e.target.value }))}
                />
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="CTA 按钮"
                    size="small"
                    value={digestConfig.ctaLabel}
                    onChange={e => setDigestConfig(c => ({ ...c, ctaLabel: e.target.value }))}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="CTA 链接"
                    size="small"
                    value={digestConfig.ctaUrl}
                    onChange={e => setDigestConfig(c => ({ ...c, ctaUrl: e.target.value }))}
                    sx={{ flex: 2 }}
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Preview & Test */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>预览 & 测试</Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <Button variant="outlined" startIcon={<VisibilityRoundedIcon />}>
                  预览摘要邮件
                </Button>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button variant="outlined" startIcon={<VisibilityRoundedIcon />}>
                    以用户身份预览
                  </Button>
                  <Autocomplete
                    size="small"
                    options={allUsers.filter(u => u.emailState !== 'unsubscribed')}
                    getOptionLabel={o => `${o.name} (${o.email})`}
                    sx={{ width: 200 }}
                    renderInput={p => <TextField {...p} placeholder="选择用户" />}
                  />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button variant="contained" startIcon={<SendRoundedIcon />}>
                    发送测试摘要
                  </Button>
                  <TextField size="small" placeholder="test@email.com" sx={{ width: 180 }} />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* ═══════════════════════════════════════════════
         Tab 2: 模板编辑
         ═══════════════════════════════════════════════ */}
      {mainTab === 2 && (
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
            <TextField
              select
              size="small"
              value={templateFilterRuleId}
              onChange={e => setTemplateFilterRuleId(e.target.value)}
              label="筛选规则"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">全部规则</MenuItem>
              {allRuleIds.map(id => <MenuItem key={id} value={id}>{id}</MenuItem>)}
            </TextField>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => {
                setEditingTemplate(null);
                setEditTplRuleId('');
                setEditTplVariant('default');
                setEditTplSubject('');
                setEditTplBody('');
                setEditTplActive(true);
                setEditTemplateOpen(true);
              }}
            >
              新建模板
            </Button>
          </Stack>

          {templatesLoading && (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={28} />
            </Stack>
          )}

          {!templatesLoading && filteredTemplates.length === 0 && (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>暂无模板</Typography>
          )}

          {filteredTemplates.map(tpl => (
            <Card key={tpl.id} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Chip label={tpl.ruleId} size="small" variant="outlined" />
                      <Chip label={tpl.variantKey} size="small" />
                      {tpl.isActive && <Chip label="启用" size="small" color="success" variant="outlined" />}
                    </Stack>
                    <Typography fontWeight={600} variant="body2">主题: {tpl.subject}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {tpl.body.slice(0, 80)}...
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} alignItems="flex-start">
                    <Tooltip title="以用户预览">
                      <IconButton size="small" onClick={() => {
                        setUserPreviewTemplate(tpl);
                        setUserPreviewUser(null);
                        setUserPreviewOpen(true);
                      }}>
                        <SearchRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="编辑">
                      <IconButton size="small" onClick={() => handleOpenEditTemplate(tpl)}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="预览">
                      <IconButton size="small" onClick={async () => {
                        setPreviewingTemplate(tpl);
                        setPreviewHtml('');
                        setPreviewLoading(true);
                        setPreviewTemplateOpen(true);
                        try {
                          const sampleVars: Record<string, string> = {
                            userName: '小明', eventTitle: '电影夜·花样年华',
                            eventDate: '2026-02-22 19:00', eventLocation: '白开水家',
                            hostName: 'Yuan', postcardFrom: '星星',
                            postcardMessage: '谢谢你的招待！', titleName: '社交达人',
                            date: '2/24',
                          };
                          const res = await previewEmailTemplate(tpl.subject, tpl.body, sampleVars);
                          setPreviewHtml(res.html);
                        } catch (e) {
                          console.error('Preview failed:', e);
                        } finally {
                          setPreviewLoading(false);
                        }
                      }}>
                        <VisibilityRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton size="small" color="error" onClick={() => setDeleteConfirm(tpl)}>
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* ═══════════════════════════════════════════════
         Tab 3: 发送中心
         ═══════════════════════════════════════════════ */}
      {mainTab === 3 && (
        <Stack spacing={2}>
          <Tabs value={sendCenterSubTab} onChange={(_, v) => setSendCenterSubTab(v)}>
            <Tab label={`待发送 (${queuedEmails.length})`} />
            <Tab label="已发送" />
            <Tab label="Bounce & 投诉" />
          </Tabs>

          {/* 3a: Queued */}
          {sendCenterSubTab === 0 && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PauseRoundedIcon />}
                  onClick={() => setQueuedEmails(prev => prev.map(e => ({ ...e, status: 'paused' as const, scheduledAt: '(已暂停)' })))}
                >
                  暂停全部
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PlayArrowRoundedIcon />}
                  onClick={() => setQueuedEmails(prev => prev.map(e => ({ ...e, status: 'queued' as const, scheduledAt: '明天 09:00 EST' })))}
                >
                  恢复全部
                </Button>
                <TextField
                  select
                  size="small"
                  value={queueFilterRuleId}
                  onChange={e => setQueueFilterRuleId(e.target.value)}
                  label="规则类型"
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="">全部</MenuItem>
                  {allRuleIds.map(id => <MenuItem key={id} value={id}>{id}</MenuItem>)}
                </TextField>
                <TextField
                  size="small"
                  placeholder="搜索收件人"
                  value={queueSearch}
                  onChange={e => setQueueSearch(e.target.value)}
                  sx={{ minWidth: 150 }}
                />
              </Stack>

              {/* Queue header */}
              <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '80px 1fr 100px 160px 140px', gap: 1, px: 2, py: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" fontWeight={700}>状态</Typography>
                <Typography variant="caption" fontWeight={700}>收件人</Typography>
                <Typography variant="caption" fontWeight={700}>规则ID</Typography>
                <Typography variant="caption" fontWeight={700}>预定发送时间</Typography>
                <Typography variant="caption" fontWeight={700}>操作</Typography>
              </Box>

              {filteredQueue.map(q => (
                <Box key={q.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '80px 1fr 100px 160px 140px' }, gap: 1, px: 2, py: 1, borderBottom: 1, borderColor: 'divider', alignItems: 'center' }}>
                  <Chip
                    label={q.status === 'queued' ? '排队' : '已暂停'}
                    size="small"
                    color={q.status === 'queued' ? 'info' : 'warning'}
                    variant="outlined"
                    sx={{ width: 'fit-content' }}
                  />
                  <Typography variant="body2">{q.userName}</Typography>
                  <Typography variant="body2">{q.ruleId}</Typography>
                  <Typography variant="body2" color="text.secondary">{q.scheduledAt}</Typography>
                  <Stack direction="row" spacing={0.5}>
                    {q.status === 'queued' ? (
                      <Button size="small" onClick={() => handleQueueAction(q.id, 'pause')}>暂停</Button>
                    ) : (
                      <Button size="small" onClick={() => handleQueueAction(q.id, 'resume')}>恢复</Button>
                    )}
                    <Button size="small" color="error" onClick={() => handleQueueAction(q.id, 'cancel')}>取消</Button>
                  </Stack>
                </Box>
              ))}
              {filteredQueue.length === 0 && (
                <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>队列为空</Typography>
              )}
            </Stack>
          )}

          {/* 3b: Sent */}
          {sendCenterSubTab === 1 && (
            <Stack spacing={2}>
              {/* Stats */}
              <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                <StatCard label="总发送" value={342} />
                <StatCard label="今日" value={28} />
                <StatCard label="打开率" value="71%" color="success.main" />
                <StatCard label="点击率" value="34%" color="primary.main" />
              </Stack>

              {/* Filters */}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                <TextField
                  select
                  size="small"
                  value={logFilterRuleId}
                  onChange={e => setLogFilterRuleId(e.target.value)}
                  label="规则类型"
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="">全部</MenuItem>
                  {allRuleIds.map(id => <MenuItem key={id} value={id}>{id}</MenuItem>)}
                </TextField>
                <TextField
                  select
                  size="small"
                  value={logFilterEvent}
                  onChange={e => setLogFilterEvent(e.target.value)}
                  label="关联活动"
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="">全部活动</MenuItem>
                  {eventNames.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                </TextField>
                <TextField
                  size="small"
                  placeholder="搜索收件人"
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  sx={{ minWidth: 150 }}
                />
              </Stack>

              {/* Log header */}
              <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '100px 100px 160px 140px 80px 80px', gap: 1, px: 2, py: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" fontWeight={700}>收件人</Typography>
                <Typography variant="caption" fontWeight={700}>规则</Typography>
                <Typography variant="caption" fontWeight={700}>关联活动</Typography>
                <Typography variant="caption" fontWeight={700}>发送时间</Typography>
                <Typography variant="caption" fontWeight={700}>打开</Typography>
                <Typography variant="caption" fontWeight={700}>点击</Typography>
              </Box>

              {filteredLogs.map(log => (
                <Box key={log.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '100px 100px 160px 140px 80px 80px' }, gap: 1, px: 2, py: 1, borderBottom: 1, borderColor: 'divider', alignItems: 'center' }}>
                  <Typography variant="body2">{log.user.name}</Typography>
                  <Chip label={log.ruleId} size="small" variant="outlined" />
                  <Typography variant="body2" color="text.secondary">{log.refId || '—'}</Typography>
                  <Typography variant="body2">{new Date(log.sentAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}</Typography>
                  <Typography variant="body2">{log.openedAt ? '✅' : '❌'}</Typography>
                  <Typography variant="body2">{log.clickedAt ? '✅' : '❌'}</Typography>
                </Box>
              ))}
            </Stack>
          )}

          {/* 3c: Bounce & Complaint */}
          {sendCenterSubTab === 2 && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                <StatCard label="弹回率" value="1.2%" />
                <StatCard label="投诉率" value="0.1%" />
                <StatCard label="本月弹回" value={3} />
                <StatCard label="本月投诉" value={0} />
              </Stack>

              {/* Header */}
              <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '100px 180px 100px 140px 1fr', gap: 1, px: 2, py: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" fontWeight={700}>类型</Typography>
                <Typography variant="caption" fontWeight={700}>邮箱</Typography>
                <Typography variant="caption" fontWeight={700}>规则</Typography>
                <Typography variant="caption" fontWeight={700}>时间</Typography>
                <Typography variant="caption" fontWeight={700}>原因</Typography>
              </Box>

              {placeholderBounces.map(b => (
                <Box key={b.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '100px 180px 100px 140px 1fr' }, gap: 1, px: 2, py: 1, borderBottom: 1, borderColor: 'divider', alignItems: 'center' }}>
                  <Chip
                    label={b.type === 'hard_bounce' ? '硬弹回' : b.type === 'soft_bounce' ? '软弹回' : '投诉'}
                    size="small"
                    color={b.type === 'hard_bounce' ? 'error' : b.type === 'soft_bounce' ? 'warning' : 'error'}
                    variant="outlined"
                    sx={{ width: 'fit-content' }}
                  />
                  <Typography variant="body2">{b.email}</Typography>
                  <Typography variant="body2">{b.ruleId}</Typography>
                  <Typography variant="body2" color="text.secondary">{b.occurredAt}</Typography>
                  <Typography variant="body2">{b.reason}</Typography>
                </Box>
              ))}

              <Typography variant="caption" color="text.secondary">
                硬弹回地址自动加入抑制名单（订阅管理 → 抑制名单）。
              </Typography>
            </Stack>
          )}
        </Stack>
      )}

      {/* ═══════════════════════════════════════════════
         Tab 4: 订阅管理
         ═══════════════════════════════════════════════ */}
      {mainTab === 4 && (
        <Stack spacing={2}>
          <Tabs value={subscriptionSubTab} onChange={(_, v) => setSubscriptionSubTab(v)}>
            <Tab label="用户状态" />
            <Tab label="退订分析" />
            <Tab label="抑制名单" />
          </Tabs>

          {/* 4a: User Status */}
          {subscriptionSubTab === 0 && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                <StatCard label="active" value={`${activeCount}人`} color="success.main" />
                <StatCard label="weekly" value={`${weeklyCount}人`} color="warning.main" />
                <StatCard label="stopped" value={`${stoppedCount}人`} color="error.main" />
                <StatCard label="unsubscribed" value={`${unsubCount}人`} />
              </Stack>

              <Stack direction="row" spacing={1}>
                <TextField
                  select
                  size="small"
                  value={userStatusFilter}
                  onChange={e => setUserStatusFilter(e.target.value)}
                  label="状态"
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="weekly">weekly</MenuItem>
                  <MenuItem value="stopped">stopped</MenuItem>
                  <MenuItem value="unsubscribed">unsubscribed</MenuItem>
                </TextField>
                <TextField
                  size="small"
                  placeholder="搜索用户"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
              </Stack>

              {/* Header */}
              <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '100px 180px 100px 80px 100px 100px', gap: 1, px: 2, py: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" fontWeight={700}>用户</Typography>
                <Typography variant="caption" fontWeight={700}>邮箱</Typography>
                <Typography variant="caption" fontWeight={700}>状态</Typography>
                <Typography variant="caption" fontWeight={700}>未打开</Typography>
                <Typography variant="caption" fontWeight={700}>上次发送</Typography>
                <Typography variant="caption" fontWeight={700}>操作</Typography>
              </Box>

              {filteredUsers.map(u => (
                <Box key={u.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '100px 180px 100px 80px 100px 100px' }, gap: 1, px: 2, py: 1, borderBottom: 1, borderColor: 'divider', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight={600}>{u.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{u.email}</Typography>
                  <Chip label={emailStateLabels[u.emailState]} size="small" color={emailStateColors[u.emailState]} variant="outlined" sx={{ width: 'fit-content' }} />
                  <Typography variant="body2">{u.unopenedStreak}</Typography>
                  <Typography variant="body2" color="text.secondary">{u.lastDailySentAt || '—'}</Typography>
                  <TextField
                    select
                    size="small"
                    value=""
                    onChange={e => {
                      if (e.target.value) setChangeStatusConfirm({ user: u, newState: e.target.value });
                    }}
                    label="修改"
                    sx={{ minWidth: 90 }}
                  >
                    <MenuItem value="" disabled>修改</MenuItem>
                    {(['active', 'weekly', 'stopped'] as const)
                      .filter(s => s !== u.emailState)
                      .map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </TextField>
                </Box>
              ))}
            </Stack>
          )}

          {/* 4b: Unsubscribe Analysis */}
          {subscriptionSubTab === 1 && (
            <Stack spacing={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                    退订原因统计（共 {totalUnsubs} 人退订）
                  </Typography>
                  <Stack spacing={1}>
                    {['邮件太频繁', '内容不相关', '其他', '不再参与社群'].map(reason => {
                      const count = unsubReasons[reason] || 0;
                      const pct = totalUnsubs > 0 ? Math.round((count / totalUnsubs) * 100) : 0;
                      const barWidth = totalUnsubs > 0 ? Math.max((count / totalUnsubs) * 100, 2) : 0;
                      return (
                        <Stack key={reason} direction="row" spacing={2} alignItems="center">
                          <Typography variant="body2" sx={{ width: 120, flexShrink: 0 }}>{reason}</Typography>
                          <Box sx={{ flex: 1, height: 16, bgcolor: 'action.hover', borderRadius: 1, position: 'relative' }}>
                            <Box sx={{ width: `${barWidth}%`, height: '100%', bgcolor: 'primary.main', borderRadius: 1 }} />
                          </Box>
                          <Typography variant="body2" sx={{ width: 80, textAlign: 'right' }}>{count}人 {pct}%</Typography>
                        </Stack>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>退订记录</Typography>
                  <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '100px 120px 120px 1fr', gap: 1, px: 1, py: 1, bgcolor: 'action.hover', borderRadius: 1, mb: 1 }}>
                    <Typography variant="caption" fontWeight={700}>用户</Typography>
                    <Typography variant="caption" fontWeight={700}>退订时间</Typography>
                    <Typography variant="caption" fontWeight={700}>原因</Typography>
                    <Typography variant="caption" fontWeight={700}>备注</Typography>
                  </Box>
                  {placeholderUnsubscribes.map(u => (
                    <Box key={u.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '100px 120px 120px 1fr' }, gap: 1, px: 1, py: 1, borderBottom: 1, borderColor: 'divider' }}>
                      <Typography variant="body2">{u.userName}</Typography>
                      <Typography variant="body2" color="text.secondary">{u.unsubscribedAt}</Typography>
                      <Typography variant="body2">{u.reason}</Typography>
                      <Typography variant="body2" color="text.secondary">{u.comment ? `"${u.comment}"` : '—'}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Stack>
          )}

          {/* 4c: Suppression List */}
          {subscriptionSubTab === 2 && (
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  被抑制的邮箱不会收到任何邮件（包括 TXN）。
                </Typography>
                <Button variant="contained" size="small" startIcon={<AddRoundedIcon />} onClick={() => setAddSuppressedOpen(true)}>
                  添加
                </Button>
              </Stack>

              <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '200px 140px 120px 100px 80px', gap: 1, px: 2, py: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" fontWeight={700}>邮箱</Typography>
                <Typography variant="caption" fontWeight={700}>原因</Typography>
                <Typography variant="caption" fontWeight={700}>添加时间</Typography>
                <Typography variant="caption" fontWeight={700}>来源</Typography>
                <Typography variant="caption" fontWeight={700}>操作</Typography>
              </Box>

              {suppressedEmails.map(s => (
                <Box key={s.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '200px 140px 120px 100px 80px' }, gap: 1, px: 2, py: 1, borderBottom: 1, borderColor: 'divider', alignItems: 'center' }}>
                  <Typography variant="body2">{s.email}</Typography>
                  <Typography variant="body2">{s.reason}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.addedAt}</Typography>
                  <Chip label={s.source === 'system' ? '系统' : '管理员'} size="small" variant="outlined" />
                  <IconButton size="small" color="error" onClick={() => handleRemoveSuppressed(s.id)}>
                    <DeleteRoundedIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      )}

      {/* ═══════════════════════════════════════════════
         Tab 5: 全局配置
         ═══════════════════════════════════════════════ */}
      {mainTab === 5 && (
        <Stack spacing={3}>
          {/* Template Management */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>邮件模板管理</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                所有邮件内容通过「模板编辑」Tab 管理。模板正文使用纯文本编写，系统会自动通过 MJML 渲染为品牌化的响应式 HTML 邮件。
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => setMainTab(2)}
                sx={{ mb: 2 }}
              >
                前往模板编辑
              </Button>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>怎么改邮件内容？</Typography>
              <Stack spacing={0.5} sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">1. 切换到「模板编辑」Tab</Typography>
                <Typography variant="body2" color="text.secondary">2. 选择要修改的模板，点击编辑按钮</Typography>
                <Typography variant="body2" color="text.secondary">3. 修改主题和正文，使用 {'{变量名}'} 插入动态内容</Typography>
                <Typography variant="body2" color="text.secondary">4. 保存后点击预览按钮，查看 MJML 渲染后的实际邮件效果</Typography>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>发件信息</Typography>
              <Typography variant="body2" color="text.secondary">发件地址: {globalConfig.fromEmail}</Typography>
              <Typography variant="body2" color="text.secondary">回复地址: {globalConfig.replyTo}</Typography>
              <Alert severity="info" sx={{ mt: 2 }}>
                邮件的外观布局（logo、颜色、间距等）由 MJML 模板统一控制。如需调整整体样式，请联系开发同学修改 MJML 模板代码。
              </Alert>
            </CardContent>
          </Card>

          {/* Send Settings */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>发送设置</Typography>
              <Stack spacing={2}>
                <TextField
                  label="发件人地址"
                  size="small"
                  fullWidth
                  value={globalConfig.fromEmail}
                  onChange={e => setGlobalConfig(c => ({ ...c, fromEmail: e.target.value }))}
                />
                <TextField
                  label="Reply-To"
                  size="small"
                  fullWidth
                  value={globalConfig.replyTo}
                  onChange={e => setGlobalConfig(c => ({ ...c, replyTo: e.target.value }))}
                />
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="每日发送时间"
                    type="time"
                    size="small"
                    value={globalConfig.dailySendTime}
                    onChange={e => setGlobalConfig(c => ({ ...c, dailySendTime: e.target.value }))}
                    sx={{ width: 150 }}
                  />
                  <TextField
                    label="时区"
                    select
                    size="small"
                    value={globalConfig.timezone}
                    onChange={e => setGlobalConfig(c => ({ ...c, timezone: e.target.value }))}
                    sx={{ width: 220 }}
                  >
                    {timezoneOptions.map(tz => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
                  </TextField>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Frequency & Degradation */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>频率与降级</Typography>
              <Stack spacing={2.5}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">每用户每日上限:</Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={globalConfig.maxDailyPerUser}
                      onChange={e => setGlobalConfig(c => ({ ...c, maxDailyPerUser: Number(e.target.value) }))}
                      sx={{ width: 60 }}
                    />
                    <Typography variant="body2">封</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">每个用户每天最多收到此数量的自动邮件（不含事务性邮件）</Typography>
                </Box>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">自动减少频率: 如果用户连续</Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={globalConfig.weeklyDegradeThreshold}
                      onChange={e => setGlobalConfig(c => ({ ...c, weeklyDegradeThreshold: Number(e.target.value) }))}
                      sx={{ width: 60 }}
                    />
                    <Typography variant="body2">次没有打开邮件，自动改为每周发一封</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">避免持续打扰不看邮件的用户</Typography>
                </Box>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">自动停发: 如果用户连续</Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={globalConfig.stoppedDegradeThreshold}
                      onChange={e => setGlobalConfig(c => ({ ...c, stoppedDegradeThreshold: Number(e.target.value) }))}
                      sx={{ width: 60 }}
                    />
                    <Typography variant="body2">次没有打开邮件，自动停止发送</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">长期不看的用户只会收到活动取消等关键通知</Typography>
                </Box>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">每周邮件发送日:</Typography>
                    <TextField
                      select
                      size="small"
                      value={globalConfig.weeklySendDay}
                      onChange={e => setGlobalConfig(c => ({ ...c, weeklySendDay: e.target.value }))}
                      sx={{ width: 100 }}
                    >
                      {weekdayOptions.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                    </TextField>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">被降为「每周一封」的用户在这一天收到邮件</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* CAN-SPAM */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>CAN-SPAM 合规</Typography>
              <Stack spacing={2}>
                <TextField label="组织名称" size="small" fullWidth value={globalConfig.orgName} onChange={e => setGlobalConfig(c => ({ ...c, orgName: e.target.value }))} />
                <TextField label="物理地址" size="small" fullWidth value={globalConfig.physicalAddress} onChange={e => setGlobalConfig(c => ({ ...c, physicalAddress: e.target.value }))} />
                <TextField label="退订链接文案" size="small" fullWidth value={globalConfig.unsubscribeText} onChange={e => setGlobalConfig(c => ({ ...c, unsubscribeText: e.target.value }))} />
                <TextField label="退订页 URL" size="small" fullWidth value={globalConfig.unsubscribeUrl} onChange={e => setGlobalConfig(c => ({ ...c, unsubscribeUrl: e.target.value }))} />
                <TextField
                  label="退订原因选项（逗号分隔）"
                  size="small"
                  fullWidth
                  value={globalConfig.unsubscribeReasons}
                  onChange={e => setGlobalConfig(c => ({ ...c, unsubscribeReasons: e.target.value }))}
                  helperText="对应订阅管理 → 退订分析中的原因分类"
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Domain Health */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>邮件发送健康</Typography>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontWeight={600}>总体状态:</Typography>
                  <Chip label="一切正常" size="small" color="success" />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  最近 30 天: 发送 342 封 · 送达率 99.1% · 投诉 0 次
                </Typography>
                <Button
                  size="small"
                  onClick={() => setDomainHealthExpanded(!domainHealthExpanded)}
                  endIcon={<ExpandMoreRoundedIcon sx={{ transform: domainHealthExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  查看技术详情
                </Button>
                <Collapse in={domainHealthExpanded}>
                  <Stack spacing={0.5} sx={{ pl: 1, pt: 1 }}>
                    <Typography variant="body2">SPF: ✅ 已配置</Typography>
                    <Typography variant="body2">DKIM: ✅ 已配置</Typography>
                    <Typography variant="body2" color="warning.main">DMARC: ⚠️ 未配置（建议联系开发配置）</Typography>
                  </Stack>
                </Collapse>
              </Stack>
            </CardContent>
          </Card>

          {/* Test Email */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>测试邮件</Typography>
              <Stack spacing={2}>
                <TextField
                  label="测试收件邮箱（多个用逗号分隔）"
                  size="small"
                  fullWidth
                  value={globalConfig.testEmails}
                  onChange={e => setGlobalConfig(c => ({ ...c, testEmails: e.target.value }))}
                />
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button variant="outlined" startIcon={sending ? <CircularProgress size={18} /> : <SendRoundedIcon />} disabled={sending} onClick={() => handleSendTestEmail('template', testRuleId)}>发送测试 · 规则模板</Button>
                    <TextField
                      select
                      size="small"
                      value={testRuleId}
                      onChange={e => setTestRuleId(e.target.value)}
                      sx={{ width: 130 }}
                    >
                      {allRuleIds.map(id => <MenuItem key={id} value={id}>{id}</MenuItem>)}
                    </TextField>
                  </Stack>
                  <Button variant="outlined" startIcon={sending ? <CircularProgress size={18} /> : <SendRoundedIcon />} disabled={sending} onClick={() => handleSendTestEmail('digest')}>发送测试 · 每日摘要</Button>
                  <Button variant="outlined" startIcon={sending ? <CircularProgress size={18} /> : <SendRoundedIcon />} disabled={sending} onClick={() => handleSendTestEmail('plain')}>发送纯文本测试</Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Button variant="contained" size="large" sx={{ alignSelf: 'flex-end' }}>
            保存全局配置
          </Button>
        </Stack>
      )}

      {/* ═══════════════════════════════════════════════
         Dialogs
         ═══════════════════════════════════════════════ */}

      {/* Pause Confirm */}
      <ConfirmDialog
        open={pauseConfirmOpen}
        title="确认暂停邮件系统"
        message="确认暂停所有自动邮件？事务性邮件（活动取消、候补转正等）不受影响。"
        confirmLabel="确认暂停"
        confirmColor="warning"
        onConfirm={handleConfirmPause}
        onCancel={() => setPauseConfirmOpen(false)}
      />

      {/* Change User Status Confirm */}
      <ConfirmDialog
        open={!!changeStatusConfirm}
        title="修改用户邮件状态"
        message={changeStatusConfirm
          ? `确认将 ${changeStatusConfirm.user.name} 的邮件状态从 ${changeStatusConfirm.user.emailState} 改为 ${changeStatusConfirm.newState}？`
          : ''}
        confirmLabel="确认修改"
        confirmColor="primary"
        onConfirm={() => setChangeStatusConfirm(null)}
        onCancel={() => setChangeStatusConfirm(null)}
      />

      {/* Edit Rule Dialog */}
      <Dialog open={editRuleOpen} onClose={() => setEditRuleOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑规则: {editingRule?.id} · {editingRule?.name}</DialogTitle>
        <DialogContent>
          {editingRule && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <FormControlLabel
                control={<Switch checked={editRuleEnabled} onChange={e => setEditRuleEnabled(e.target.checked)} />}
                label={editRuleEnabled ? '已启用' : '已停用'}
              />

              <Divider />
              <Typography variant="body2" fontWeight={700}>基本信息（只读）</Typography>
              <Typography variant="body2" color="text.secondary">触发条件: {editingRule.triggerDescription}</Typography>
              <Typography variant="body2" color="text.secondary">收件人: {editingRule.recipientDescription}</Typography>
              {editingRule.userControllable && (
                <Typography variant="body2" color="text.secondary">用户可通过「{editingRule.userToggleLabel}」toggle 关闭</Typography>
              )}

              <Divider />
              <Typography variant="body2" fontWeight={700}>可调参数</Typography>

              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2">冷却期:</Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={editRuleCooldown}
                    onChange={e => setEditRuleCooldown(Number(e.target.value))}
                    sx={{ width: 70 }}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                  <Typography variant="body2">天</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  同一用户 {editRuleCooldown} 天内不重复发送{editRuleCooldown === 0 ? '（每次触发都发送）' : ''}
                </Typography>
              </Box>

              {editingRule.config.thresholdDays !== undefined && (
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">触发阈值:</Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={editRuleThreshold}
                      onChange={e => setEditRuleThreshold(Number(e.target.value))}
                      sx={{ width: 70 }}
                      slotProps={{ htmlInput: { min: 1 } }}
                    />
                    <Typography variant="body2">天</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    超过此天数未参加活动视为流失
                  </Typography>
                </Box>
              )}

              {editingRule.config.maxRecommendations !== undefined && (
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">最大推荐数:</Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={editRuleMaxRec}
                      onChange={e => setEditRuleMaxRec(Number(e.target.value))}
                      sx={{ width: 70 }}
                      slotProps={{ htmlInput: { min: 1 } }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    邮件中推荐的活动数量
                  </Typography>
                </Box>
              )}

              <Alert severity="warning" sx={{ mt: 1 }}>
                关闭影响: {editingRule.disableImpact}
              </Alert>

              {templates.filter(t => t.ruleId === editingRule.id).length > 0 && (
                <Typography variant="body2" color="primary.main" sx={{ cursor: 'pointer' }}
                  onClick={() => { setEditRuleOpen(false); setMainTab(2); setTemplateFilterRuleId(editingRule.id); }}>
                  关联模板: {templates.filter(t => t.ruleId === editingRule.id).length} 个 → 查看模板
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRuleOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveRule}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={editTemplateOpen} onClose={() => setEditTemplateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingTemplate ? '编辑模板' : '新建模板'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="规则 ID"
                select
                size="small"
                value={editTplRuleId}
                onChange={e => setEditTplRuleId(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                {allRuleIds.map(id => <MenuItem key={id} value={id}>{id}</MenuItem>)}
              </TextField>
              <TextField
                label="变体 Key"
                size="small"
                value={editTplVariant}
                onChange={e => setEditTplVariant(e.target.value)}
                placeholder="default / host / A / B"
                sx={{ minWidth: 150 }}
              />
              <FormControlLabel
                control={<Switch checked={editTplActive} onChange={e => setEditTplActive(e.target.checked)} />}
                label="启用"
              />
            </Stack>
            <TextField
              label="邮件主题"
              size="small"
              fullWidth
              value={editTplSubject}
              onChange={e => setEditTplSubject(e.target.value)}
            />
            <TextField
              label="邮件正文"
              size="small"
              fullWidth
              multiline
              rows={10}
              value={editTplBody}
              onChange={e => setEditTplBody(e.target.value)}
            />
            <Collapse in={true}>
              <Alert severity="info">
                <Typography variant="caption">
                  可用变量: {'{userName}'} {'{eventTitle}'} {'{eventDate}'} {'{eventLocation}'} {'{hostName}'} {'{postcardFrom}'} {'{postcardMessage}'} {'{titleName}'} {'{unsubscribeUrl}'} {'{preferencesUrl}'} {'{date}'}
                </Typography>
              </Alert>
            </Collapse>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTemplateOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveTemplate}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* Preview Template Dialog */}
      <Dialog open={previewTemplateOpen} onClose={() => setPreviewTemplateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>模板预览（MJML 渲染）</DialogTitle>
        <DialogContent>
          {previewingTemplate && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={1}>
                <Chip label={previewingTemplate.ruleId} size="small" variant="outlined" />
                <Chip label={previewingTemplate.variantKey} size="small" />
              </Stack>
              <Box>
                <Typography variant="caption" color="text.secondary">主题</Typography>
                <Typography fontWeight={600}>{replaceVars(previewingTemplate.subject)}</Typography>
              </Box>
              <Divider />
              {previewLoading && (
                <Stack alignItems="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </Stack>
              )}
              {!previewLoading && previewHtml && (
                <Box
                  component="iframe"
                  srcDoc={previewHtml}
                  sandbox="allow-same-origin"
                  sx={{ width: '100%', height: 500, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                />
              )}
              {!previewLoading && !previewHtml && (
                <Typography variant="body2" color="text.secondary">预览加载失败</Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewTemplateOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* User Preview Dialog */}
      <Dialog open={userPreviewOpen} onClose={() => setUserPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>以用户身份预览</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              size="small"
              options={allUsers}
              getOptionLabel={o => `${o.name} (${o.email})`}
              value={userPreviewUser}
              onChange={async (_, v) => {
                setUserPreviewUser(v);
                if (v && userPreviewTemplate) {
                  setPreviewHtml('');
                  setPreviewLoading(true);
                  try {
                    const vars: Record<string, string> = {
                      userName: v.name, eventTitle: '电影夜·花样年华',
                      eventDate: '2026-02-22 19:00', eventLocation: '白开水家',
                      hostName: 'Yuan', postcardFrom: '星星',
                      postcardMessage: '谢谢你的招待！', titleName: '社交达人',
                      date: '2/24',
                    };
                    const res = await previewEmailTemplate(userPreviewTemplate.subject, userPreviewTemplate.body, vars);
                    setPreviewHtml(res.html);
                  } catch (e) {
                    console.error('User preview failed:', e);
                  } finally {
                    setPreviewLoading(false);
                  }
                }
              }}
              renderInput={p => <TextField {...p} label="选择用户" />}
            />
            {userPreviewTemplate && userPreviewUser && (
              <>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">主题</Typography>
                  <Typography fontWeight={600}>{replaceVars(userPreviewTemplate.subject, userPreviewUser)}</Typography>
                </Box>
                {previewLoading && (
                  <Stack alignItems="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </Stack>
                )}
                {!previewLoading && previewHtml && (
                  <Box
                    component="iframe"
                    srcDoc={previewHtml}
                    sandbox="allow-same-origin"
                    sx={{ width: '100%', height: 500, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                  />
                )}
                <Button variant="outlined" size="small" startIcon={<SendRoundedIcon />}>
                  发送此预览到测试邮箱
                </Button>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserPreviewOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Template Confirm */}
      <ConfirmDialog
        open={!!deleteConfirm}
        title="删除模板"
        message={deleteConfirm ? `确认删除模板「${deleteConfirm.ruleId} · ${deleteConfirm.variantKey}」？此操作不可撤销。` : ''}
        confirmLabel="删除"
        confirmColor="error"
        onConfirm={() => deleteConfirm && handleDeleteTemplate(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Manual Send Dialog */}
      <Dialog open={manualSendOpen} onClose={() => setManualSendOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>手动发送邮件</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" fontWeight={600}>收件人选择</Typography>
            <RadioGroup value={manualSendTarget} onChange={e => setManualSendTarget(e.target.value)}>
              <FormControlLabel value="active_all" control={<Radio size="small" />} label={`全部活跃成员 (active + weekly) — ${activeCount + weeklyCount}人`} />
              <FormControlLabel value="active_only" control={<Radio size="small" />} label={`仅 active 成员 — ${activeCount}人`} />
              <FormControlLabel value="hosts" control={<Radio size="small" />} label={`所有 Host — ${hostCount}人`} />
              <FormControlLabel value="new_members" control={<Radio size="small" />} label={`新成员（30 天内）— ${newMemberCount}人`} />
              <FormControlLabel value="specific_users" control={<Radio size="small" />} label="指定用户" />
              {manualSendTarget === 'specific_users' && (
                <Box sx={{ pl: 4 }}>
                  <Autocomplete
                    multiple
                    size="small"
                    options={allUsers}
                    getOptionLabel={o => `${o.name} (${o.email})`}
                    value={manualSendUsers}
                    onChange={(_, v) => setManualSendUsers(v)}
                    renderInput={p => <TextField {...p} placeholder="搜索用户" />}
                  />
                </Box>
              )}
              <FormControlLabel value="event_participants" control={<Radio size="small" />} label="指定活动的参与者" />
              {manualSendTarget === 'event_participants' && (
                <Box sx={{ pl: 4 }}>
                  <Autocomplete
                    size="small"
                    options={eventNames}
                    value={manualSendEvent || null}
                    onChange={(_, v) => setManualSendEvent(v || '')}
                    renderInput={p => <TextField {...p} placeholder="搜索活动" />}
                  />
                </Box>
              )}
            </RadioGroup>

            <Chip label={`选中: ${manualSendRecipientCount} 人`} color="primary" variant="outlined" />

            <Divider />
            <Typography variant="body2" fontWeight={600}>邮件内容</Typography>

            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2">使用模板:</Typography>
              <TextField
                select
                size="small"
                value={manualSendTemplateId}
                onChange={e => {
                  setManualSendTemplateId(e.target.value);
                  const tpl = templates.find(t => t.id === e.target.value);
                  if (tpl) {
                    setManualSendSubject(tpl.subject);
                    setManualSendBody(tpl.body);
                  }
                }}
                sx={{ flex: 1 }}
              >
                <MenuItem value="">自定义内容</MenuItem>
                {templates.map(t => (
                  <MenuItem key={t.id} value={t.id}>{t.ruleId} · {t.subject.slice(0, 30)}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              label="主题"
              size="small"
              fullWidth
              value={manualSendSubject}
              onChange={e => setManualSendSubject(e.target.value)}
            />
            <TextField
              label="正文"
              size="small"
              fullWidth
              multiline
              rows={6}
              value={manualSendBody}
              onChange={e => setManualSendBody(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualSendOpen(false)}>取消</Button>
          <Button variant="outlined" startIcon={<VisibilityRoundedIcon />}>预览</Button>
          <Button
            variant="contained"
            startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <SendRoundedIcon />}
            onClick={() => setSendConfirmOpen(true)}
            disabled={manualSendRecipientCount === 0 || !manualSendSubject || sending}
          >
            确认发送
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual Send Confirm */}
      <ConfirmDialog
        open={sendConfirmOpen}
        title="确认发送邮件"
        message={`即将向 ${manualSendRecipientCount} 人发送邮件「${manualSendSubject}」，确认发送？`}
        confirmLabel="确认发送"
        confirmColor="primary"
        onConfirm={handleSendEmails}
        onCancel={() => setSendConfirmOpen(false)}
      />

      {/* Add Suppressed Dialog */}
      <Dialog open={addSuppressedOpen} onClose={() => setAddSuppressedOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>添加抑制邮箱</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="邮箱地址"
              size="small"
              fullWidth
              value={addSuppressedEmail}
              onChange={e => setAddSuppressedEmail(e.target.value)}
            />
            <TextField
              label="原因"
              size="small"
              fullWidth
              value={addSuppressedReason}
              onChange={e => setAddSuppressedReason(e.target.value)}
              placeholder="手动添加"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddSuppressedOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleAddSuppressed} disabled={!addSuppressedEmail}>添加</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for send feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
