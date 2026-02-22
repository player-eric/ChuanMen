import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Profile fields
  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [bio, setBio] = useState('');
  const [selfAsFriend, setSelfAsFriend] = useState(user?.selfAsFriend ?? '');
  const [idealFriend, setIdealFriend] = useState(user?.idealFriend ?? '');
  const [participationPlan, setParticipationPlan] = useState(user?.participationPlan ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [defaultHouseRules, setDefaultHouseRules] = useState(user?.defaultHouseRules ?? '');
  const [homeAddress, setHomeAddress] = useState(user?.homeAddress ?? '');

  // Privacy
  const [hideEmail, setHideEmail] = useState(user?.hideEmail ?? false);
  const [hideActivity, setHideActivity] = useState(false);
  const [hideStats, setHideStats] = useState(false);

  // Notification
  const [emailFreq, setEmailFreq] = useState('daily');
  const [notifyEvents, setNotifyEvents] = useState(true);
  const [notifyCards, setNotifyCards] = useState(true);
  const [notifyOps, setNotifyOps] = useState(true);
  const [notifyAnnounce, setNotifyAnnounce] = useState(true);

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

  const handleSaveProfile = () => {
    // TODO: PATCH /api/users/me/settings
    alert('已保存');
  };

  return (
    <Stack spacing={3} sx={{ pb: 4 }}>
      {/* ── 个人资料编辑 ── */}
      <Typography variant="h6" fontWeight={700}>个人资料</Typography>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField label="显示名" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <TextField label="城市/地区" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="如 Edison, NJ" />
            <TextField label="自我介绍" multiline minRows={2} value={bio} onChange={(e) => setBio(e.target.value)} />
            <TextField label="你觉得自己是一个什么样的朋友？" multiline minRows={2} value={selfAsFriend} onChange={(e) => setSelfAsFriend(e.target.value)} />
            <TextField label="你最好的朋友是什么样子的？" multiline minRows={2} value={idealFriend} onChange={(e) => setIdealFriend(e.target.value)} />
            <TextField label="你可能会怎样参与串门儿？" multiline minRows={2} value={participationPlan} onChange={(e) => setParticipationPlan(e.target.value)} />
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {/* TODO: Avatar & cover image upload */}
            <Alert severity="info" variant="outlined">头像和封面图上传功能即将上线</Alert>
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
                <Button size="small" color="error" sx={{ mt: 0.5 }}>解绑 Google 账号</Button>
              </Box>
            ) : (
              <Button variant="outlined" size="small">绑定 Google 账号</Button>
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
            {/* TODO: 称号显示控制 - list all earned titles with individual toggles */}
          </Stack>
        </CardContent>
      </Card>

      {/* ── 感谢卡余额 ── */}
      <Typography variant="h6" fontWeight={700}>感谢卡额度</Typography>
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body1">当前可寄: <b>6</b> 张</Typography>
            <Button variant="outlined" size="small">购买感谢卡 · $5/张</Button>
          </Stack>
        </CardContent>
      </Card>

      <Button variant="contained" size="large" onClick={handleSaveProfile}>保存设置</Button>
    </Stack>
  );
}
