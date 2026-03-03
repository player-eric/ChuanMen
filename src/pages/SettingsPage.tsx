import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { ImageUpload } from '@/components/ImageUpload';
import { updateUserSettings, fetchPostcardsApi, fetchTitleRules, fetchMembersWithTitles } from '@/lib/domainApi';
import type { AuthUser } from '@/types/auth';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  // Profile fields
  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [selfAsFriend, setSelfAsFriend] = useState(user?.selfAsFriend ?? '');
  const [idealFriend, setIdealFriend] = useState(user?.idealFriend ?? '');
  const [participationPlan, setParticipationPlan] = useState<string[]>(
    user?.participationPlan ? user.participationPlan.split(', ').filter(Boolean) : [],
  );
  const [email, setEmail] = useState(user?.email ?? '');
  const [defaultHouseRules, setDefaultHouseRules] = useState(user?.defaultHouseRules ?? '');
  const [homeAddress, setHomeAddress] = useState(user?.homeAddress ?? '');

  // Media
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar ?? '');
  const [coverUrl, setCoverUrl] = useState(user?.coverImageUrl ?? '');

  // Birthday
  const [birthday, setBirthday] = useState(user?.birthday ? user.birthday.slice(0, 10) : '');
  const [hideBirthday, setHideBirthday] = useState(user?.hideBirthday ?? false);

  // Privacy
  const [hideEmail, setHideEmail] = useState(user?.hideEmail ?? false);
  const [hideActivity, setHideActivity] = useState(user?.hideActivity ?? false);
  const [hideStats, setHideStats] = useState(user?.hideStats ?? false);
  const [hiddenTitleIds, setHiddenTitleIds] = useState<string[]>(user?.hiddenTitleIds ?? []);

  // Earned titles for display control
  const [earnedTitles, setEarnedTitles] = useState<{ id: string; value: string }[]>([]);
  useEffect(() => {
    if (!user?.id) return;
    // Fetch member's titles from the members-with-titles endpoint
    fetchMembersWithTitles()
      .then((members: any[]) => {
        const me = members.find((m: any) => m.id === user.id);
        if (me?.titles) {
          setEarnedTitles(
            me.titles.map((t: any) => typeof t === 'string' ? { id: t, value: t } : { id: t.id ?? t.value, value: t.value ?? t }),
          );
        }
      })
      .catch(() => {});
  }, [user?.id]);

  // Notification (read from persisted preferences)
  const prefs = user?.preferences;
  const emailStateToFreq = (s?: string) => {
    if (s === 'weekly') return 'weekly';
    if (s === 'stopped' || s === 'unsubscribed') return 'off';
    return 'daily'; // active or default
  };
  const [emailFreq, setEmailFreq] = useState(emailStateToFreq(prefs?.emailState));
  const [notifyEvents, setNotifyEvents] = useState(prefs?.notifyEvents ?? true);
  const [notifyCards, setNotifyCards] = useState(prefs?.notifyCards ?? true);
  const [notifyOps, setNotifyOps] = useState(prefs?.notifyOps ?? true);
  const [notifyAnnounce, setNotifyAnnounce] = useState(prefs?.notifyAnnounce ?? true);

  // Card credits
  const [cardCredits, setCardCredits] = useState<number | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    fetchPostcardsApi(user.id)
      .then((data) => setCardCredits(data.credits ?? 0))
      .catch(() => setCardCredits(null));
  }, [user?.id]);

  // Save state
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState('');

  // Google binding
  const hasGoogle = !!user?.googleId;

  if (!user) {
    return (
      <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
        <Typography color="text.secondary">请先登录</Typography>
        <Button variant="contained" onClick={() => navigate('/login')}>去登录</Button>
      </Stack>
    );
  }

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const freqToEmailState = (f: string) => {
        if (f === 'weekly') return 'weekly' as const;
        if (f === 'off') return 'stopped' as const;
        return 'active' as const;
      };
      const payload = {
        name: displayName || undefined,
        avatar: avatarUrl || undefined,
        coverImageUrl: coverUrl || undefined,
        location: location || undefined,
        bio: bio || undefined,
        selfAsFriend: selfAsFriend || undefined,
        idealFriend: idealFriend || undefined,
        participationPlan: participationPlan.length > 0 ? participationPlan.join(', ') : undefined,
        email: email || undefined,
        defaultHouseRules: defaultHouseRules || undefined,
        homeAddress: homeAddress || undefined,
        hideEmail,
        hideActivity,
        hideStats,
        hiddenTitleIds,
        birthday: birthday || undefined,
        hideBirthday,
        // Notification preferences
        emailState: freqToEmailState(emailFreq),
        notifyEvents,
        notifyCards,
        notifyOps,
        notifyAnnounce,
      };
      const res = await updateUserSettings(user.id, payload);
      // Update local auth context so avatar/cover show immediately
      setUser({
        ...user,
        ...payload,
        name: displayName || user.name,
        email: email || user.email,
        preferences: res.user?.preferences as AuthUser['preferences'] ?? {
          emailState: freqToEmailState(emailFreq),
          notifyEvents, notifyCards, notifyOps, notifyAnnounce,
        },
      });
      setSnack('设置已保存');
    } catch (err) {
      console.error('保存失败', err);
      setSnack('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3} sx={{ pb: 4 }}>
      {/* ── 个人资料编辑 ── */}
      <Typography variant="h6" fontWeight={700}>个人资料</Typography>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            {/* Avatar & Cover Image Upload */}
            <Typography variant="subtitle2" fontWeight={600}>头像</Typography>
            <ImageUpload
              value={avatarUrl}
              onChange={setAvatarUrl}
              category="avatar"
              ownerId={user.id}
              width={96}
              height={96}
              shape="circle"
              maxSize={5 * 1024 * 1024}
            />

            <Typography variant="subtitle2" fontWeight={600}>封面图</Typography>
            <ImageUpload
              value={coverUrl}
              onChange={setCoverUrl}
              category="cover"
              ownerId={user.id}
              width="100%"
              height={160}
              shape="rect"
              maxSize={10 * 1024 * 1024}
            />

            <TextField label="显示名" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <TextField label="城市/地区" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="如 Edison, NJ" />
            <TextField label="自我介绍" multiline minRows={2} value={bio} onChange={(e) => setBio(e.target.value)} />
            <TextField label="你觉得自己是一个什么样的朋友？" multiline minRows={2} value={selfAsFriend} onChange={(e) => setSelfAsFriend(e.target.value)} />
            <TextField label="你最好的朋友是什么样子的？" multiline minRows={2} value={idealFriend} onChange={(e) => setIdealFriend(e.target.value)} />
            <FormControl>
              <FormLabel sx={{ fontWeight: 600, mb: 0.5 }}>你可能会怎样参与串门儿？</FormLabel>
              <FormGroup>
                {[
                  '仅参加活动',
                  '参加活动，提供反馈',
                  '可以做Host组织活动，家里客厅还不太想开放',
                  '可以做Host组织活动，让朋友们来家里串门',
                  '可以做志愿者或其他（比如拍照摄影、视频剪辑、活动支持等）',
                ].map((option) => (
                  <FormControlLabel
                    key={option}
                    control={
                      <Checkbox
                        checked={participationPlan.includes(option)}
                        onChange={(e) => {
                          setParticipationPlan((prev) =>
                            e.target.checked
                              ? [...prev, option]
                              : prev.filter((v) => v !== option),
                          );
                        }}
                      />
                    }
                    label={option}
                  />
                ))}
              </FormGroup>
            </FormControl>
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField
              label="生日"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              helperText="用于社区生日祝福"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* ── Host 专属字段 ── */}
      <Typography variant="h6" fontWeight={700}>Host 设置</Typography>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              label="我家的 House Rules"
              multiline
              minRows={2}
              value={defaultHouseRules}
              onChange={(e) => setDefaultHouseRules(e.target.value)}
              helperText="发起在家活动时自动填入，可在活动创建时修改"
            />
            <TextField
              label="家庭地址"
              value={homeAddress}
              onChange={(e) => setHomeAddress(e.target.value)}
              helperText="仅在你作为 Host 发起在家活动时，向报名成功的参与者公开"
            />
          </Stack>
        </CardContent>
      </Card>

      {/* ── 账号管理 ── */}
      <Typography variant="h6" fontWeight={700}>账号管理</Typography>
      <Card>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              当前登录方式：{hasGoogle ? 'Google 登录' : 'Email 登录'}
            </Typography>
            {hasGoogle ? (
              <Box>
                <Typography variant="body2">已绑定: {user.email}</Typography>
                <Tooltip title="即将开放" arrow>
                  <span>
                    <Button size="small" color="error" sx={{ mt: 0.5 }} disabled>解绑 Google 账号</Button>
                  </span>
                </Tooltip>
              </Box>
            ) : (
              <Tooltip title="即将开放" arrow>
                <span>
                  <Button variant="outlined" size="small" disabled>绑定 Google 账号</Button>
                </span>
              </Tooltip>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* ── 通知偏好 ── */}
      <Typography variant="h6" fontWeight={700}>通知偏好</Typography>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              select
              label="Email 频率"
              value={emailFreq}
              onChange={(e) => setEmailFreq(e.target.value)}
            >
              <MenuItem value="daily">每天</MenuItem>
              <MenuItem value="weekly">每周汇总</MenuItem>
              <MenuItem value="off">关闭</MenuItem>
            </TextField>

            <Divider />

            <FormControlLabel control={<Switch checked={notifyEvents} onChange={() => setNotifyEvents(!notifyEvents)} />} label="活动通知" />
            <FormControlLabel control={<Switch checked={notifyCards} onChange={() => setNotifyCards(!notifyCards)} />} label="感谢卡通知" />
            <FormControlLabel control={<Switch checked={notifyOps} onChange={() => setNotifyOps(!notifyOps)} />} label="运营引导" />
            <FormControlLabel control={<Switch checked={notifyAnnounce} onChange={() => setNotifyAnnounce(!notifyAnnounce)} />} label="社群公告" />

            <Alert severity="info" variant="outlined">免打扰时段设置即将上线（默认 22:00 - 08:00）</Alert>
          </Stack>
        </CardContent>
      </Card>

      {/* ── 隐私控制 ── */}
      <Typography variant="h6" fontWeight={700}>隐私控制</Typography>
      <Card>
        <CardContent>
          <Stack spacing={1}>
            <FormControlLabel
              control={<Switch checked={!hideBirthday} onChange={() => setHideBirthday(!hideBirthday)} />}
              label="显示生日（关闭后其他成员不可见）"
            />
            <FormControlLabel
              control={<Switch checked={hideEmail} onChange={() => setHideEmail(!hideEmail)} />}
              label="隐藏 Email（关闭后对其他成员不可见）"
            />
            <FormControlLabel
              control={<Switch checked={hideActivity} onChange={() => setHideActivity(!hideActivity)} />}
              label="隐藏参与记录"
            />
            <FormControlLabel
              control={<Switch checked={hideStats} onChange={() => setHideStats(!hideStats)} />}
              label="隐藏贡献统计"
            />
          </Stack>
        </CardContent>
      </Card>

      {/* ── 称号显示控制 ── */}
      {earnedTitles.length > 0 && (
        <>
          <Typography variant="h6" fontWeight={700}>称号显示</Typography>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                选择要在个人页面展示的称号，隐藏不影响获取记录
              </Typography>
              <Stack spacing={1}>
                {earnedTitles.map((t) => {
                  const isHidden = hiddenTitleIds.includes(t.id);
                  return (
                    <FormControlLabel
                      key={t.id}
                      control={
                        <Switch
                          checked={!isHidden}
                          onChange={() => {
                            setHiddenTitleIds((prev) =>
                              isHidden ? prev.filter((id) => id !== t.id) : [...prev, t.id],
                            );
                          }}
                        />
                      }
                      label={<Chip label={t.value} size="small" color="warning" variant={isHidden ? 'outlined' : 'filled'} />}
                    />
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── 感谢卡余额 ── */}
      <Typography variant="h6" fontWeight={700}>感谢卡额度</Typography>
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body1">当前可寄: <b>{cardCredits ?? '...'}</b> 张</Typography>
            <Button variant="outlined" size="small" disabled>购买感谢卡 · 暂未开放</Button>
          </Stack>
        </CardContent>
      </Card>

      <Button
        variant="contained"
        size="large"
        onClick={handleSaveProfile}
        disabled={saving}
        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
      >
        {saving ? '保存中…' : '保存设置'}
      </Button>

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Stack>
  );
}
